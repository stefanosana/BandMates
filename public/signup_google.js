document.addEventListener("DOMContentLoaded", async function () {
    let userData = null;
    
    try {
        // Recupera i dati della sessione
        const response = await fetch('http://localhost:3000/session-user');
        if (response.ok) {
            userData = await response.json();

            // Precompila i campi della form con i dati recuperati
            document.getElementById("email").value = userData.email || '';
            document.getElementById("name").value = userData.name || '';
        } else {
            console.error("Errore nel recupero dell'utente dalla sessione");
        }
    } catch (error) {
        console.error("Errore di connessione al server:", error);
    }

    // Gestione del cambio di tipo utente per mostrare/nascondere campi specifici
    document.getElementById('userType').addEventListener('change', function() {
        const userType = this.value;
        const musicianFields = document.getElementById('musicianFields');
        const bandFields = document.getElementById('bandFields');
        
        if (userType === 'musician') {
            musicianFields.style.display = 'block';
            bandFields.style.display = 'none';
        } else if (userType === 'band') {
            musicianFields.style.display = 'none';
            bandFields.style.display = 'block';
        }
    });

    // Trigger iniziale per impostare i campi visibili in base al valore selezionato
    const initialUserType = document.getElementById('userType').value;
    if (initialUserType === 'musician') {
        document.getElementById('musicianFields').style.display = 'block';
        document.getElementById('bandFields').style.display = 'none';
    } else if (initialUserType === 'band') {
        document.getElementById('musicianFields').style.display = 'none';
        document.getElementById('bandFields').style.display = 'block';
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
        const lookingFor = userType === 'band' ? document.getElementById('lookingFor').value : '';
        const genre = userType === 'band' ? document.getElementById('genre').value : '';
        const description = document.getElementById("description").value;
        const location = document.getElementById("location").value;

        // Validazione campi obbligatori
        if (!location) {
            alert("Il campo località è obbligatorio.");
            return;
        }

        if (userType === 'musician' && !instrument) {
            alert("Il campo strumento è obbligatorio per i musicisti.");
            return;
        }

        if (userType === 'band' && !genre) {
            alert("Il campo genere è obbligatorio per le band.");
            return;
        }

        // Oggetto con i dati da inviare al server
        const data = {
            email: userData.email,
            full_name: userData.name,
            description: description,
            location: location,
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
                const result = await response.json();
                console.log("Risposta dal server:", result);
                
                if (result.redirect) {
                    window.location.href = result.redirect;
                } else {
                    window.location.href = '/home';
                }
            } else {
                const errorData = await response.json();
                alert(`Errore durante la registrazione: ${errorData.error || 'Errore sconosciuto'}`);
            }
        } catch (error) {
            console.error("Errore di connessione al server:", error);
            alert("Errore di connessione al server. Riprova più tardi.");
        }
    });
});