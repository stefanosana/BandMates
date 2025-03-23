document.addEventListener('DOMContentLoaded', function() {
    // Connessione WebSocket
    const socket = io();
    
    // Elemento contatore
    const counter = document.getElementById('visitor-counter');
    
    // Aggiornamento contatore quando riceve nuovi dati dal server
    socket.on('userCount', (count) => {
        counter.textContent = count;
    });
    
    // Gestione degli errori di connessione
    socket.on('connect_error', (error) => {
        console.error('Errore di connessione WebSocket:', error);
    });
    
    // Riconnessione
    socket.on('reconnect', (attemptNumber) => {
        console.log('Riconnessione WebSocket riuscita dopo', attemptNumber, 'tentativi');
    });
});