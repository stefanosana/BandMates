/*const socket = new WebSocket('ws://' + window.location.host + '/ws');

    // Elemento nella navbar dove mostrare il contatore
    const contatoreDom = document.getElementById('contatore-visitatori');

    // Gestione degli eventi WebSocket
    socket.onopen = function() {
        console.log('Connessione WebSocket stabilita');
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        // Aggiornamento del contatore nella navbar
        if (data.tipo === 'aggiornamento-visitatori') {
            contatoreDom.textContent = data.numeroVisitatori;
        }
    };

    socket.onclose = function() {
        console.log('Connessione WebSocket chiusa');
        // Tentativo di riconnessione dopo 3 secondi
        setTimeout(function() {
            window.location.reload();
        }, 3000);
    };

    // Notifica il server quando l'utente lascia la pagina
    window.addEventListener('beforeunload', function() {
        socket.send(JSON.stringify({ tipo: 'disconnessione' }));
    });


    */