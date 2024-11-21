document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Evita il comportamento predefinito del form (refresh della pagina)

    // Recupera i dati dal form
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        // Effettua una richiesta POST al server
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        // Controlla la risposta del server
        if (!response.ok) {
            const errorData = await response.json();
            alert(`Errore: ${errorData.error}`);
            return;
        }

        // Se il login è riuscito, elabora la risposta
        const data = await response.json();
        alert(`Benvenuto, ${data.fullName}! Sei loggato come ${data.userType}.`);

        // Esempio: reindirizza l'utente a un'altra pagina
        window.location.href = 'index.html'; // Modifica con il percorso corretto
    } catch (error) {
        console.error('Errore durante il login:', error);
        alert('Si è verificato un errore. Riprova più tardi.');
    }
});