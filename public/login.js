document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');

    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
});

async function login(event) {
    event.preventDefault();

    // Recupero dei valori di email e password
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Effettua la richiesta POST al server
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            // Legge il messaggio di errore dal server
            const errorMessage = await response.json();
            alert(`Errore durante il login: ${errorMessage.error}`);
            return;
        }

        // Recupera i dati della risposta
        const data = await response.json();

        let dataString = data.stringify();

        // Mostra un alert con il messaggio di successo
        alert(`Login effettuato correttamente: ${data.user}`);

        // Reindirizza alla pagina principale
        window.location.href = '/static/index.html'; // Modifica il percorso se necessario
    } catch (error) {
        // Gestione degli errori non previsti
        console.error('Errore durante il login:', error);
        alert('Si è verificato un errore durante il login.');
    }
}