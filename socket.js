const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const session = require('express-session');

// Configurazione della sessione
const sessionMiddleware = session({
    secret: 'il_tuo_segreto_qui',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" }
});

app.use(sessionMiddleware);

// Wrapper per utilizzare la sessione con socket.io
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

// Mappa per tenere traccia degli utenti online
const onlineUsers = new Map();

// Gestione delle connessioni WebSocket
io.on('connection', (socket) => {
    const session = socket.request.session;
    
    if (session.loggedin) {
        const userId = session.user.id;
        onlineUsers.set(userId, socket.id);
        
        // Notifica altri utenti che questo utente è online
        io.emit('user_status', { userId, status: 'online' });

        // Gestione invio messaggi
        socket.on('send_message', async (data) => {
            try {
                const { chatRoomId, message } = data;
                const senderId = userId;

                // Salva il messaggio nel database
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO MESSAGES (chat_room_id, sender_id, content, sent_at, read) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)',
                        [chatRoomId, senderId, message],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                });

                // Trova il destinatario
                const receiver = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT 
                            CASE 
                                WHEN sender_id = ? THEN receiver_id
                                ELSE sender_id
                            END as other_user_id
                         FROM CHAT_ROOMS 
                         WHERE chat_room_id = ?`,
                        [senderId, chatRoomId],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

                const messageData = {
                    chatRoomId,
                    message,
                    senderId,
                    senderName: session.user.full_name,
                    timestamp: new Date().toISOString()
                };

                // Invia il messaggio al mittente
                socket.emit('message_sent', messageData);

                // Invia il messaggio al destinatario se online
                const receiverSocket = onlineUsers.get(receiver.other_user_id);
                if (receiverSocket) {
                    io.to(receiverSocket).emit('new_message', messageData);
                }

            } catch (error) {
                console.error('Errore nell\'invio del messaggio:', error);
                socket.emit('error', { message: 'Errore nell\'invio del messaggio' });
            }
        });

        // Gestione digitazione
        socket.on('typing', (data) => {
            const { chatRoomId } = data;
            socket.to(chatRoomId).emit('user_typing', { userId, chatRoomId });
        });

        // Gestione disconnessione
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            io.emit('user_status', { userId, status: 'offline' });
        });
    }
});

// Route per la pagina dei messaggi
app.get('/messages', async (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    try {
        // Recupera tutte le conversazioni dell'utente
        const conversations = await new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT 
                    cr.chat_room_id,
                    CASE 
                        WHEN cr.sender_id = ? THEN cr.receiver_id
                        ELSE cr.sender_id
                    END as other_user_id,
                    u.full_name as other_user_name,
                    u.userType as other_user_type,
                    (
                        SELECT content 
                        FROM MESSAGES m2 
                        WHERE m2.chat_room_id = cr.chat_room_id 
                        ORDER BY sent_at DESC 
                        LIMIT 1
                    ) as last_message,
                    (
                        SELECT sent_at 
                        FROM MESSAGES m3 
                        WHERE m3.chat_room_id = cr.chat_room_id 
                        ORDER BY sent_at DESC 
                        LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) 
                        FROM MESSAGES m4 
                        WHERE m4.chat_room_id = cr.chat_room_id 
                        AND m4.sender_id != ? 
                        AND m4.read = 0
                    ) as unread_count
                FROM CHAT_ROOMS cr
                JOIN USERS u ON (
                    CASE 
                        WHEN cr.sender_id = ? THEN cr.receiver_id
                        ELSE cr.sender_id
                    END = u.user_id
                )
                WHERE cr.sender_id = ? OR cr.receiver_id = ?
                ORDER BY last_message_time DESC
            `, [userId, userId, userId, userId, userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Formatta le conversazioni e verifica lo stato online
        const formattedConversations = conversations.map(conv => ({
            id: conv.chat_room_id,
            otherUser: {
                id: conv.other_user_id,
                name: conv.other_user_name,
                type: conv.other_user_type,
                profileImage: '/placeholder.svg',
                isOnline: onlineUsers.has(conv.other_user_id)
            },
            lastMessage: conv.last_message,
            lastMessageTime: new Date(conv.last_message_time).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            unreadCount: conv.unread_count
        }));

        res.render('messages', {
            title: 'Messaggi',
            user: req.session.user,
            conversations: formattedConversations,
            loggedIn: true
        });

    } catch (error) {
        console.error('Errore nel recupero dei messaggi:', error);
        res.status(500).render('error', { 
            message: 'Si è verificato un errore nel caricamento dei messaggi',
            loggedIn: true
        });
    }
});

// Avvio del server
server.listen(3000, () => {
    console.log('Server in ascolto sulla porta 3000');
});