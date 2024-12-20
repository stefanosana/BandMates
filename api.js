const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const hbs = require("handlebars");
const path = require('path');
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
app.use(session({ secret: 'session' }));
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const router = express.Router();


app.use(session({
    secret: 'session', // Cambia questo con una stringa segreta robusta
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production", // Usa HTTPS in produzione
      maxAge: 1000 * 60 * 60 * 24 // 24 ore
    }
  }));

//const mock = require('./DBMock.js');
//const db = new mock();
const port = 3000;
app.set('view engine', 'hbs')

//app.use(cors(corsOptions));
// Middleware di gestione degli errori
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Si è verificato un errore interno del server' });
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json())
const db = new sqlite3.Database('bandmates.db');

function isAdmin(req, res, next) {
    if (req.session.role === 'admin') {
        next(); // L'utente è admin, prosegui
    } else {
        res.status(403).json({ error: "Accesso negato. Solo gli admin possono accedere." });
    }
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BandMates API',
            version: '1.0.0',
            description: 'API per la piattaforma BandMates, un social per musicisti e band',
        },
        servers: [
            {
                url: 'http://localhost:3000', // Cambia con l'URL del tuo server
            },
        ],
    },
    apis: ['api.js'], // Specifica i file che contengono la documentazione delle API
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const validateEmail = async (email) => {
    try {
        const apiKey = '7ffd7f1771bc4f8e882b3b6cc61f03ae'; // Chiave API per Abstract API
        const response = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`);
        const data = await response.json();

        if (data.is_valid_format && data.is_valid_format.value) {
            console.log('Email valida:', email);
            return true; // Email valida
        } else {
            console.error('Email non valida:', data);
            return false; // Email non valida
        }
    } catch (error) {
        console.error('Errore durante la validazione dell\'email:', error);
        return false; // Tratta errori API come email non valida
    }
};


/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Registrazione utente
 *     description: Permette a un utente di registrarsi come musicista o band.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [musician, band]
 *                 description: Tipo di utente
 *                 example: musician
 *               full_name:
 *                 type: string
 *                 description: Nome completo
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 description: Password (minimo 6 caratteri)
 *                 example: password123
 *               location:
 *                 type: string
 *                 description: Posizione geografica
 *                 example: Milano
 *               instrument:
 *                 type: string
 *                 description: Strumento (solo per musicians)
 *                 example: Chitarra
 *               genre:
 *                 type: string
 *                 description: Genere musicale (solo per bands)
 *                 example: Rock
 *     responses:
 *       200:
 *         description: Registrazione avvenuta con successo.
 *       400:
 *         description: Errore nella richiesta.
 *       500:
 *         description: Errore interno del server.
 */  
app.post('/signup', async (req, res) => {
    const { userType, full_name, email, password, instrument, experience, description, location, looking_for, genre } = req.body;

    // Verifica dei campi obbligatori comuni
    if (!userType || !full_name || !email || !password || !location) {
        return res.status(400).json({ error: "I campi userType, full_name, email, password e location sono obbligatori" });
    }

    // Controllo che la password abbia almeno 6 caratteri
    if (password.length < 6) {
        return res.status(400).json({ error: "La password deve avere almeno 6 caratteri" });
    }

    // Verifica che il campo `userType` sia valido
    if (userType !== "musician" && userType !== "band") {
        return res.status(400).json({ error: "Il campo userType deve essere 'musician' o 'band'" });
    }

    // Verifica email tramite Abstract API
    const isEmailValid = await validateEmail(email);
    if (!isEmailValid) {
        return res.status(400).json({ error: "L'indirizzo email non è valido." });
    }

    // Verifica dei campi specifici in base al tipo di utente
    if (userType === "musician" && !instrument) {
        return res.status(400).json({ error: "Il campo instrument è obbligatorio per i musicisti" });
    }
    if (userType === "band" && !genre) {
        return res.status(400).json({ error: "Il campo genre è obbligatorio per le band" });
    }

    try {
        // Hash della password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Verifica se l'email è già presente nella tabella USERS
        db.get(`SELECT email FROM USERS WHERE email = ?`, [email], (err, row) => {
            if (err) {
                console.error("Errore durante il controllo dell'email:", err.message);
                return res.status(500).json({ error: "Errore durante il controllo dell'email" });
            }
            if (row) {
                return res.status(400).json({ error: "Email già registrata" });
            }

            // Inserimento dell'utente nella tabella USERS
            db.run(
                `INSERT INTO users (userType, full_name, email, password, location) VALUES (?, ?, ?, ?, ?)`,
                [userType, full_name, email, hashedPassword, location],
                function (err) {
                    if (err) {
                        console.error("Errore durante la registrazione dell'utente:", err.message);
                        return res.status(500).json({ error: "Errore durante la registrazione dell'utente" });
                    }

                    const userId = this.lastID; // ID dell'utente appena creato

                    // Inserimento nei dati specifici (MUSICIANS o BANDS) basato su userType
                    if (userType === "musician") {
                        db.run(
                            `INSERT INTO MUSICIANS (user_id, instrument, experience, description) VALUES (?, ?, ?, ?)`,
                            [userId, instrument, experience, description],
                            function (err) {
                                if (err) {
                                    console.error("Errore durante la registrazione del musicista:", err.message);
                                    return res.status(500).json({ error: "Errore durante la registrazione del musicista" });
                                }
                                res.json({ message: 'Registrazione avvenuta con successo come musicista', id: userId });
                            }
                        );
                    } else if (userType === "band") {
                        db.run(
                            `INSERT INTO BANDS (user_id, description, looking_for, genre) VALUES (?, ?, ?, ?)`,
                            [userId, description, looking_for, genre],
                            function (err) {
                                if (err) {
                                    console.error("Errore durante la registrazione della band:", err.message);
                                    return res.status(500).json({ error: "Errore durante la registrazione della band" });
                                }
                                res.json({ message: 'Registrazione avvenuta con successo come band', id: userId });
                            }
                        );
                    }
                }
            );
        });
    } catch (error) {
        console.error("Errore interno del server:", error.message);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

/**
 * @swagger
 * /login:
 *   get:
 *     summary: Mostra la pagina di login o reindirizza l'utente autenticato alla home.
 *     description: Se l'utente è già autenticato, viene reindirizzato alla home. Altrimenti, viene visualizzata la pagina di login.
 *     responses:
 *       200:
 *         description: Pagina di login mostrata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della pagina di login.
 *       302:
 *         description: Reindirizzamento alla pagina home per utenti autenticati.
 *         headers:
 *           Location:
 *             description: URL della home page.
 *             schema:
 *               type: string
 *               example: /home
 */
app.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        res.redirect('/home');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login utente
 *     description: Consente a un utente registrato di effettuare l'accesso al sistema.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email dell'utente.
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 description: Password dell'utente.
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login riuscito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login effettuato con successo"
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: "John Doe"
 *                     userType:
 *                       type: string
 *                       example: "musician"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     loggedIn:
 *                       type: boolean
 *                       example: true
 *                     additionalDetails:
 *                       type: object
 *       400:
 *         description: Errore nella richiesta.
 *       401:
 *         description: Credenziali errate.
 *       500:
 *         description: Errore interno del server.
 */
app.post('/login', (req, res) => {
    if (!req.body) {
        return res.status(400).render('error', { message: 'Undefined body' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('error', { message: 'Email e password sono obbligatorie' });
    }

    // Recupera l'utente dal database USERS
    db.get(
        `SELECT * FROM USERS WHERE email = ?`,
        [email],
        async (err, user) => {
            if (err) {
                console.error('Errore durante il login:', err.message);
                return res.status(500).render('error', { message: "Errore durante l'accesso" });
            }

            if (!user) {
                return res.status(401).render('error', { message: 'Credenziali errate' });
            }

            try {
                // Verifica la password
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).render('error', { message: 'Credenziali errate' });
                }

                // Login riuscito
                req.session.loggedIn = true;
                req.session.userId = user.user_id;
                req.session.full_name = user.full_name;
                req.session.userType = user.userType;
                req.session.role = user.role;

                if (user.role === 'admin') {
                    // Renderizza il dashboard dell'admin
                    return res.render('admin/dashboard', {
                        full_name: user.full_name,
                        userType: user.userType,
                        role: user.role,
                        loggedIn: true,
                    });
                }

                // Recupera dati aggiuntivi in base al tipo di utente
                const table = user.userType === 'musician' ? 'MUSICIANS' : 'BANDS';

                db.get(
                    `SELECT * FROM ${table} WHERE user_id = ?`,
                    [user.user_id],
                    (err, userDetails) => {
                        if (err) {
                            console.error(`Errore durante il recupero dei dettagli da ${table}:`, err.message);
                            return res.status(500).render('error', { message: "Errore durante l'accesso" });
                        }

                        res.render('home', {
                            full_name: user.full_name,
                            userType: user.userType,
                            role: user.role,
                            loggedIn: true,
                            additionalDetails: userDetails,
                        });
                    }
                );
            } catch (error) {
                console.error('Errore durante la verifica della password:', error.message);
                res.status(500).render('error', { message: "Errore durante l'accesso" });
            }
        }
    );
});

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Effettua il logout dell'utente.
 *     description: Questa API permette all'utente di disconnettersi, terminando la sessione attiva, e reindirizzandolo alla pagina di login.
 *     responses:
 *       200:
 *         description: Logout avvenuto con successo, l'utente è stato reindirizzato alla pagina di login.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout effettuato con successo"
 *                 redirectUrl:
 *                   type: string
 *                   example: "/login"  # URL della pagina di login
 *       500:
 *         description: Errore interno del server durante il logout.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Errore durante il logout"
 */
app.get('/logout', (req, res) => {
    req.session.loggedIn = false;
    res.redirect('/login');
});

/**
 * @swagger
 * /area-personale:
 *   get:
 *     summary: Visualizza l'area personale dell'utente.
 *     description: Se l'utente è autenticato, viene mostrata l'area personale. Se l'utente è un admin, viene reindirizzato alla dashboard dell'admin. Se l'utente non è autenticato, viene reindirizzato alla pagina di login.
 *     responses:
 *       200:
 *         description: Area personale visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML dell'area personale.
 *       302:
 *         description: Reindirizzamento alla pagina di login per utenti non autenticati.
 *         headers:
 *           Location:
 *             description: URL della pagina di login.
 *             schema:
 *               type: string
 *               example: /login
 *       302:
 *         description: Reindirizzamento alla dashboard dell'admin per utenti con ruolo "admin".
 *         headers:
 *           Location:
 *             description: URL della dashboard dell'admin.
 *             schema:
 *               type: string
 *               example: /admin/dashboard
 */
app.get('/area-personale', (req, res) => {
    // Verifica se l'utente è autenticato
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    if (req.session.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }

    // Renderizza la vista dell'area personale
    res.render('areapersonale', {
        title: 'Area Personale',
        loggedIn: true,
        full_name: req.session.full_name,
        userType: req.session.userType,
        role: req.session.role
    });

});

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Visualizza la dashboard dell'amministratore.
 *     description: Se l'utente ha il ruolo di "admin", viene visualizzata la dashboard dell'amministratore. Altrimenti, viene restituito un errore di accesso negato.
 *     responses:
 *       200:
 *         description: Dashboard dell'amministratore visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della dashboard dell'amministratore.
 *       403:
 *         description: Accesso negato per utenti non amministratori.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Accesso negato'
 */
app.get('/admin/dashboard', (req, res) => {
    if (req.session.role === 'admin') {
        res.render('admin/dashboard', {
            full_name: req.session.full_name,
            role: req.session.role,
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Visualizza la lista degli utenti per l'amministratore.
 *     description: Se l'utente ha il ruolo di "admin", vengono recuperati e visualizzati tutti gli utenti (musicisti e band) dal database. Se l'utente non ha il ruolo di "admin", viene restituito un errore di accesso negato.
 *     responses:
 *       200:
 *         description: Lista degli utenti visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della lista degli utenti.
 *       403:
 *         description: Accesso negato per utenti non amministratori.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Accesso negato'
 *       500:
 *         description: Errore durante il recupero degli utenti dal database.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Errore nel recupero utenti'
 */
app.get('/admin/users', (req, res) => {
    if (req.session.role === 'admin') {
        // Recupera utenti dal database
        db.all('SELECT * FROM USERS', [], (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero utenti');
            }
            res.render('admin/users', { users: rows });
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.get('/admin/users/edit/:id', (req, res) => {
    if (req.session.role === 'admin') {
        const { id } = req.params;

        db.get(
            `SELECT 'musician' AS userType, musician_id AS id, full_name, email FROM musicians WHERE musician_id = ?
             UNION
             SELECT 'band' AS userType, band_id AS id, full_name, email FROM bands WHERE band_id = ?`,
            [id, id],
            (err, row) => {
                if (err || !row) return res.status(404).send('Utente non trovato');
                res.render('admin/editUser', { user: row });
            }
        );
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.post('/admin/users/edit/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, email, userType } = req.body;

    if (!fullName || !email) {
        return res.status(400).send('Tutti i campi sono obbligatori.');
    }

    const updateQuery = userType === 'musician'
        ? `UPDATE musicians SET full_name = ?, email = ? WHERE musician_id = ?`
        : `UPDATE bands SET full_name = ?, email = ? WHERE band_id = ?`;

    db.run(updateQuery, [fullName, email, id], (err) => {
        if (err) return res.status(500).send('Errore nella modifica');
        res.redirect('/admin/users');
    });
});

app.get('/admin/users/edit/:id', (req, res) => {
    const userId = req.params.id;

    db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Errore nel recupero dell\'utente:', err);
            return res.status(500).render('error', { message: 'Errore nel recupero dell\'utente' });
        }

        if (!user) {
            return res.status(404).render('error', { message: 'Utente non trovato' });
        }

        // Renderizza la pagina di modifica con i dati dell'utente
        res.render('admin/editUser', { user });
    });
});

app.post('/admin/users/edit/:id', (req, res) => {
    const userId = req.params.id;
    const { full_name, email, userType, location, description } = req.body;

    const updateQuery = `
        UPDATE users 
        SET full_name = ?, email = ?, userType = ?, location = ?, description = ? 
        WHERE user_id = ?
    `;

    db.run(updateQuery, [full_name, email, userType, location, description, userId], function (err) {
        if (err) {
            console.error('Errore nell\'aggiornamento dell\'utente:', err);
            return res.status(500).render('error', { message: 'Errore nell\'aggiornamento dell\'utente' });
        }

        // Reindirizza alla pagina di gestione utenti con un messaggio di successo
        res.redirect('/admin/users?message=Utente aggiornato con successo');
    });
});

app.get('/admin/feedback', (req, res) => {
    if (req.session.role === 'admin') {
        // Recupera feedback dal database
        db.all('SELECT * FROM feedback', [], (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero feedback');
            }
            res.render('admin/feedback', { feedbacks: rows });
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

/**
 * @swagger
 * /home:
 *   get:
 *     summary: Home utente
 *     description: Visualizza la home page basata sul ruolo dell'utente autenticato. Gli utenti non autenticati vengono reindirizzati alla pagina di login.
 *     responses:
 *       200:
 *         description: Home page caricata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html> <html> <head> <title>Home</title> </head> <body>...</body></html>"
 *       302:
 *         description: Reindirizzamento alla pagina di login per utenti non autenticati.
 */
app.get('/home', (req, res) => {
    if (req.session.loggedIn === true) {
        if (req.session.role === 'admin') {
            res.render('admin/home', {
                fullName: req.session.full_name,
                userType: req.session.userType,
                role: req.session.role,
            });
        } else {
            res.render('home', {
                full_name: req.session.full_name,
                userType: req.session.userType,
                role: req.session.role,
                loggedIn: true
            });
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/bands', (req, res) => {
    const sql = `
        SELECT U.full_name, U.location, B.genre
        FROM BANDS B
        JOIN USERS U ON B.user_id = U.user_id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero delle band:', err.message);
            return res.status(500).json({ error: 'Errore nel recupero delle band' });
        }
        res.json(rows);
    });
});

app.get('/bands/rock', (req, res) => {
    const sql = `
        SELECT U.full_name, U.location, B.genre
        FROM BANDS B
        JOIN USERS U ON B.user_id = U.user_id
        WHERE B.genre = 'rock' OR B.genre = 'Rock'
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero delle band rock:', err.message);
            return res.status(500).json({ error: 'Errore nel recupero delle band rock' });
        }
        res.json(rows);
    });
});

app.get('/admin/users', isAdmin, (req, res) => {
    db.all(`SELECT * FROM musicians UNION SELECT * FROM bands`, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore nel recupero degli utenti' });
        }
        res.json(rows);
    });
});

app.get('/admin/delete-user/:id', isAdmin, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT * FROM users WHERE user_id = ?`, [id], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore durante il recupero delle informazioni dell\'utente' });
        }

        if (!row) {
            return res.status(404).json({ error: `Utente con ID ${id} non trovato.` });
        }

        res.json({ user: row });
    });
});

app.delete('/admin/delete-user/:id', isAdmin, (req, res) => {
    const id = parseInt(req.params.id); // Convertiamo l'ID in numero

    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID utente non valido' });
    }

    // Inizia una transazione
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
            console.error('Errore nell\'iniziare la transazione:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }

        /*
        // Prima elimina tutti i messaggi dell'utente
        db.run('DELETE FROM MESSAGES WHERE sender_id = ? OR receiver_id = ?', [id, id], (err) => {
            if (err) {
                console.error('Errore nell\'eliminazione dei messaggi:', err);
                return db.run('ROLLBACK', () => {
                    res.status(500).json({ error: 'Errore nell\'eliminazione dei messaggi' });
                });
            } */


        /*
                    // Poi elimina tutte le chat room dell'utente
                    db.run('DELETE FROM CHAT_ROOMS WHERE sender_id = ? OR receiver_id = ?', [id, id], (err) => {
                        if (err) {
                            console.error('Errore nell\'eliminazione delle chat room:', err);
                            return db.run('ROLLBACK', () => {
                                res.status(500).json({ error: 'Errore nell\'eliminazione delle chat room' });
                            });
                        } */

        // Infine elimina l'utente
        db.run('DELETE FROM USERS WHERE user_id = ?', [id], function (err) {
            if (err) {
                console.error('Errore nell\'eliminazione dell\'utente:', err);
                return db.run('ROLLBACK', () => {
                    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'utente' });
                });
            }

            // Verifica se l'utente è stato effettivamente eliminato
            if (this.changes === 0) {
                return db.run('ROLLBACK', () => {
                    res.status(404).json({ error: `Utente con ID ${id} non trovato` });
                });
            }

            // Se tutto è andato bene, conferma la transazione
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Errore nel confermare la transazione:', err);
                    return db.run('ROLLBACK', () => {
                        res.status(500).json({ error: 'Errore nel confermare l\'eliminazione' });
                    });
                }
                res.json({
                    message: `Utente con ID ${id} eliminato con successo`,
                    deletedUserId: id
                });
            });
        });
    });
});
    

//----------------------------------------------------------------------------------| CHAT |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//endpoint get per visualizzare la chat
app.get('/chat', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    res.render('chat', {
        full_name: req.session.full_name,
        userType: req.session.userType,
        role: req.session.role,
    });
});

app.get('/users/list', (req, res) => {
    // Verifica che l'utente sia loggato
    if (!req.session.userId) {
        return res.status(401).send('Non autorizzato');
    }
    
    // Recupera tutti gli utenti tranne l'utente corrente
    db.all('SELECT user_id, full_name, email FROM USERS WHERE user_id != ?', 
        [req.session.userId], 
        (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero utenti');
            }
            res.json(rows);
        });
});

app.post('/chat/start', async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.session.userId; // Assumiamo che l'ID dell'utente corrente sia memorizzato nella sessione

    try {
        // Verifichiamo che l'utente corrente non stia cercando di chattare con se stesso
        if (userId === currentUserId) {
            return res.status(400).json({ error: 'Non puoi avviare una chat con te stesso' });
        }

        // Verifichiamo se esiste già una chat room tra questi due utenti
        const existingRoom = await db.get(
            'SELECT * FROM CHAT_ROOMS WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
            [currentUserId, userId, userId, currentUserId]
        );

        if (existingRoom) {
            // Se esiste già una chat room, restituiamo il suo ID
            return res.json({ chatRoomId: existingRoom.chat_room_id });
        }

        // Se non esiste, creiamo una nuova chat room
        const result = await db.run(
            'INSERT INTO CHAT_ROOMS (sender_id, receiver_id, created_at) VALUES (?, ?, ?)',
            [currentUserId, userId, new Date().toISOString()]
        );

        // Recupera l'ID della chat room appena creata
        const newRoom = await db.get(
            'SELECT chat_room_id FROM CHAT_ROOMS WHERE sender_id = ? AND receiver_id = ?',
            [currentUserId, userId]
        );

        if (newRoom) {
            console.log(newRoom.chat_room_id)
            return res.json({ chatRoomId: newRoom.chat_room_id });
        } else {
            return res.status(500).json({ error: 'Errore durante la creazione della chat room' });
        }
    } catch (error) {
        console.error('Errore durante la gestione della chat:', error.message);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


module.exports = app;
app.use(express.static('public'));
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}: ${"http://localhost:" + port}`);
});
