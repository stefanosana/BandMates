document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const userType = document.getElementById('userType').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const data = { userType, email, password };

    try {
        const response = await fetch('http://localhost:3001/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            // Logica aggiuntiva per il successo del login, come il reindirizzamento
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Errore durante il login:', error);
        alert('Errore durante il login. Verifica la connessione al server.');
    }
});
