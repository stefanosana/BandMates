document.addEventListener('DOMContentLoaded', function() {
    // Funzione per creare la connessione WebSocket
    function connectWebSocket() {
        // Creazione della connessione WebSocket con percorso specifico
        const socket = new WebSocket('ws://' + window.location.host + '/ws');
        
        // Elementi nella navbar dove mostrare il contatore
        const contatoreDom = document.getElementById('contatore-visitatori');
        const testoVisitatori = document.getElementById('testo-visitatori');

        // Gestione degli eventi WebSocket
        socket.onopen = function() {
            console.log('Connessione WebSocket stabilita');
        };

        socket.onmessage = function(event) {
            console.log('Messaggio ricevuto:', event.data);
            try {
                const data = JSON.parse(event.data);
                
                // Aggiornamento del contatore nella navbar
                if (data.tipo === 'aggiornamento-visitatori') {
                    contatoreDom.textContent = data.numeroVisitatori;
                    
                    // Aggiorna il testo (singolare/plurale)
                    if (data.numeroVisitatori === 1) {
                        testoVisitatori.textContent = 'visitatore';
                    } else {
                        testoVisitatori.textContent = 'visitatori';
                    }
                }
            } catch (e) {
                console.error('Errore nel parsing del messaggio:', e);
            }
        };

        socket.onclose = function(event) {
            console.log('Connessione WebSocket chiusa', event.code, event.reason);
            // Tentativo di riconnessione dopo 5 secondi
            setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = function(error) {
            console.error('Errore WebSocket:', error);
        };

        // Notifica il server quando l'utente lascia la pagina
        window.addEventListener('beforeunload', function() {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ tipo: 'disconnessione' }));
            }
        });
        
        return socket;
    }
    
    // Inizia la connessione
    connectWebSocket();
});