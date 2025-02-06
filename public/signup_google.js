document.addEventListener("DOMContentLoaded", async function () {
    let params = new URLSearchParams(window.location.search);
    let email = params.get("email");
    let name = params.get("name");

    if (!email || !name) {
        // Recupera i dati della sessione se non presenti nella URL
        try {
            const response = await fetch('http://localhost:3000/session-user');
            if (response.ok) {
                const userData = await response.json();
                email = userData.email;
                name = userData.full_name;
            }
        } catch (error) {
            console.error("Errore nel recupero dell'utente dalla sessione", error);
        }
    }

    document.getElementById("email").value = email;
    document.getElementById("name").value = name;

    document.getElementById("signupGoogleForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        const data = {
            email,
            full_name: name,
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
                alert("Errore durante la registrazione.");
            }
        } catch (error) {
            console.error("Errore:", error);
            alert("Errore di connessione al server.");
        }
    });
});
