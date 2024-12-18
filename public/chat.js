// Gestione della ricerca utenti e creazione nuova chat
let users = [];

function openNewChat() {
    const modal = new bootstrap.Modal(document.getElementById('newChatModal'));
    loadUsers();
    modal.show();
}

async function loadUsers() {
    try {
        const response = await fetch('/usersList');
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

        if (!response.ok) throw new Error('Errore nell\'avvio della chat');
        
        const result = await response.json();
        
        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newChatModal'));
        modal.hide();

        // Redirect alla chat con l'utente selezionato
        window.location.href = `/chat?room=${result.chatRoomId}`;
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nell\'avvio della chat');
    }
}