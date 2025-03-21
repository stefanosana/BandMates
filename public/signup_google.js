//const { use } = require("passport");

let userData = null;

document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Recupera i dati della sessione
        const response = await fetch('http://localhost:3000/session-user');
        if (response.ok) {
            userData = await response.json(); // ✅ Assegna alla variabile globale

            // Precompila i campi della form con i dati recuperati
            document.getElementById("email").value = userData.email || '';
            document.getElementById("name").value = userData.name || '';
        } else {
            console.error("Errore nel recupero dell'utente dalla sessione");
        }
    } catch (error) {
        console.error("Errore di connessione al server:", error);
    }

    // Gestione dell'invio della form
    document.getElementById("signupGoogleForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!userData) {
            alert("Errore: dati utente non disponibili.");
            return;
        }

        const userType = document.getElementById('userType').value;
        const instrument = userType === 'musician' ? document.getElementById('instrument').value : '';
        const skillLevel = userType === 'musician' ? document.getElementById('skillLevel').value : '';
        const lookingFor = userType === 'band' ? document.getElementById('lookingFor').value : ''; // Corretto
        const genre = userType === 'band' ? document.getElementById('genre').value : '';

        // Oggetto con i dati da inviare al server

        const data = {
            email: userData.email,
            full_name: userData.name,
            description: document.getElementById("description").value,
            location: document.getElementById("location").value, // Added missing comma
            userType: userType,
            instrument: instrument,
            skillLevel: skillLevel,
            lookingFor: lookingFor,
            genre: genre
        };

        console.log('Dati inviati:', data);

        try {
            const response = await fetch('/completa-profilo', {
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