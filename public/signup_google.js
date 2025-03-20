document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Recupera i dati della sessione
        const response = await fetch('http://localhost:3000/session-user');
        if (response.ok) {
            const userData = await response.json();

            // Precompila i campi della form con i dati recuperati
            document.getElementById("email").value = userData.email;
            document.getElementById("name").value = userData.name;
        } else {
            console.error("Errore nel recupero dell'utente dalla sessione");
        }
    } catch (error) {
        console.error("Errore di connessione al server:", error);
    }

    // Gestione dell'invio della form
    document.getElementById("signupGoogleForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        const data = {
            email: document.getElementById("email").value,
            full_name: document.getElementById("name").value,
            description: document.getElementById("description").value,
            location: document.getElementById("location").value
        };

        try {
            const response = await fetch('http://localhost:3000/completa-profilo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                window.location.href = '/home';
            } else {
                const errorData = await response.json();
                alert(`Errore durante la registrazione: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Errore di connessione al server:", error);
            alert("Errore di connessione al server.");
        }
    });
});
