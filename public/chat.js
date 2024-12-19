// Gestione della ricerca utenti e creazione nuova chat
let users = [];

function openNewChat() {
    const modal = new bootstrap.Modal(document.getElementById('newChatModal'));
    loadUsers();
    modal.show();
}

async function loadUsers() {
    try {
        const response = await fetch('/users/list');
        if (!response.ok) throw new Error('Errore nel caricamento degli utenti');

        users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel caricamento degli utenti');
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = users.map(user => `
    <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
            onclick="startChat(${user.user_id})">
        <div>
            <h6 class="mb-0">${user.full_name}</h6>
            <small class="text-muted">${user.email}</small>
        </div>
        <i class="fas fa-chevron-right"></i>
    </button>
`).join('');
}

// Gestione della ricerca in tempo reale
document.getElementById('userSearchInput')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
});

async function startChat(userId) {
    try {
        const response = await fetch('/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Errore nell\'avvio della chat');
        }
        
        const result = await response.json();

        console.log(result);
        
        if (!result.chatRoomId) {
            throw new Error('ID della chat room non ricevuto dal server' + result);
        }

        console.log('Chat room creata/recuperata:', result);

        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newChatModal'));
        modal.hide();

        // Aggiorna l'URL e carica la nuova chat
        window.history.pushState({}, '', `/chat?room=${result.chatRoomId}`);
        loadChatRoom(result.chatRoomId);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nell\'avvio della chat: ' + error.message);
    }
}

/*
onst socket = io();

// Variabili globali
let currentRoomId = null;
let users = [];

// Funzione per aprire il modal di nuova chat
function openNewChat() {
    const modal = new bootstrap.Modal(document.getElementById('newChatModal'));
    loadUsers();
    modal.show();
}

// Funzione per caricare gli utenti
async function loadUsers() {
    try {
        const response = await fetch('/users/list');
        if (!response.ok) throw new Error('Errore nel caricamento degli utenti');
        
        users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel caricamento degli utenti');
    }
}

// Funzione per visualizzare gli utenti nel modal
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = users.map(user => `
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                onclick="startChat(${user.user_id})">
            <div>
                <h6 class="mb-0">${user.full_name}</h6>
                <small class="text-muted">${user.email}</small>
            </div>
            <i class="fas fa-chevron-right"></i>
        </button>
    `).join('');
}

// Funzione per avviare una nuova chat
async function startChat(userId) {
    try {
        const response = await fetch('/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Errore nell\'avvio della chat');
        }
        
        const result = await response.json();
        
        if (!result.chatRoomId) {
            throw new Error('ID della chat room non ricevuto dal server');
        }

        console.log('Chat room creata/recuperata:', result);

        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newChatModal'));
        modal.hide();

        // Aggiorna l'URL e carica la nuova chat
        window.history.pushState({}, '', `/chat?room=${result.chatRoomId}`);
        loadChatRoom(result.chatRoomId);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nell\'avvio della chat: ' + error.message);
    }
}

// Funzione per caricare una chat room
async function loadChatRoom(roomId) {
    try {
        currentRoomId = roomId;
        const response = await fetch(`/chat/messages/${roomId}`);
        if (!response.ok) {
            throw new Error('Errore nel caricamento dei messaggi');
        }
        const messages = await response.json();
        displayMessages(messages);
        
        // Unisciti alla room di Socket.IO
        socket.emit('join room', roomId);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel caricamento dei messaggi: ' + error.message);
    }
}

// Funzione per visualizzare i messaggi
function displayMessages(messages) {
    const chatMessagesElement = document.querySelector('.chat-messages');
    chatMessagesElement.innerHTML = messages.map(message => `
        <div class="mb-3">
            <div class="chat-message p-3 ${message.isSent ? 'message-sent' : 'message-received'}">
                ${message.content}
            </div>
            <div class="${message.isSent ? 'text-end' : ''}">
                <small class="text-muted">${new Date(message.timestamp).toLocaleString()}</small>
            </div>
        </div>
    `).join('');
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

*/