
document.addEventListener('DOMContentLoaded', function () {
    // Inizializzazione Socket.IO
    const socket = io();

    // Elementi DOM
    const messageForm = document.getElementById('messageForm');
    const messageInput = messageForm.querySelector('input[name="message"]');
    const chatMessages = document.querySelector('.chat-messages');
    const chatPreviews = document.querySelectorAll('.chat-preview');

    let currentChatId = null;
    let typingTimeout = null;

    // Gestione invio messaggi
    messageForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const message = messageInput.value.trim();

        if (message && currentChatId) {
            socket.emit('send_message', {
                chatRoomId: currentChatId,
                message: message
            });
            messageInput.value = '';
        }
    });

    // Gestione digitazione
    messageInput.addEventListener('input', function () {
        if (currentChatId) {
            clearTimeout(typingTimeout);
            socket.emit('typing', { chatRoomId: currentChatId });

            typingTimeout = setTimeout(() => {
                socket.emit('stop_typing', { chatRoomId: currentChatId });
            }, 1000);
        }
    });

    // Gestione click sulle chat
    chatPreviews.forEach(preview => {
        preview.addEventListener('click', function () {
            const chatId = this.dataset.conversationId;
            currentChatId = chatId;

            // Rimuovi classe active da tutte le chat
            chatPreviews.forEach(p => p.classList.remove('active-chat'));
            // Aggiungi classe active alla chat selezionata
            this.classList.add('active-chat');

            // Carica i messaggi della chat
            loadChatMessages(chatId);
        });
    });

    // Ricezione nuovo messaggio
    socket.on('new_message', (data) => {
        if (data.chatRoomId === currentChatId) {
            appendMessage(data);
            scrollToBottom();
        }
        updateChatPreview(data);
    });

    // Messaggio inviato con successo
    socket.on('message_sent', (data) => {
        appendMessage(data);
        scrollToBottom();
        updateChatPreview(data);
    });

    // Gestione stato utente
    socket.on('user_status', (data) => {
        const userStatusEl = document.querySelector(`[data-user-id="${data.userId}"]`);
        if (userStatusEl) {
            userStatusEl.classList.toggle('online', data.status === 'online');
        }
    });

    // Gestione digitazione
    socket.on('user_typing', (data) => {
        if (data.chatRoomId === currentChatId) {
            const typingIndicator = document.querySelector('.typing-indicator');
            typingIndicator.classList.add('active');

            setTimeout(() => {
                typingIndicator.classList.remove('active');
            }, 1000);
        }
    });

    // Funzioni di utilità
function appendMessage(data) {
    const currentUserId = document.body.dataset.userId; // Assumiamo che l'ID dell'utente sia memorizzato come attributo data sul body
    const messageHTML = `
        <div class="mb-3">
            <div class="chat-message p-3 ${data.senderId === currentUserId ? 'message-sent' : 'message-received'}">
                ${escapeHtml(data.message)}
            </div>
            <div class="${data.senderId === currentUserId ? 'text-end' : ''}">
                <small class="text-muted">${formatTime(data.timestamp)}</small>
            </div>
        </div>
    `;
    chatMessages.insertAdjacentHTML('beforeend', messageHTML);
}

function updateChatPreview(data) {
    const preview = document.querySelector(`[data-conversation-id="${data.chatRoomId}"]`);
    if (preview) {
        const lastMessageEl = preview.querySelector('.text-truncate');
        const timeEl = preview.querySelector('.text-muted');
        
        lastMessageEl.textContent = data.message;
        timeEl.textContent = formatTime(data.timestamp);

        // Sposta la chat in cima alla lista
        const parentEl = preview.parentElement;
        parentEl.insertBefore(preview, parentEl.firstChild);
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadChatMessages(chatId) {
    // Pulisci i messaggi esistenti
    chatMessages.innerHTML = '';
    
    // Carica i nuovi messaggi
    fetch(`/messages/chat/${chatId}`)
        .then(response => response.json())
        .then(messages => {
            messages.forEach(msg => appendMessage(msg));
            scrollToBottom();
        })
        .catch(error => console.error('Errore nel caricamento dei messaggi:', error));
}

// Funzioni di supporto
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
});
