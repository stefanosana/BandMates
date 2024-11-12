document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Ottieni i dati dal form
    const userType = document.getElementById('userType').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const instrument = userType === 'musician' ? document.getElementById('instrument').value : '';
    const skillLevel = userType === 'musician' ? document.getElementById('skillLevel').value : '';
    const description = document.getElementById('description').value;
    const lookingFor = userType === 'band' ? document.getElementById('lookingFor').value : '';
    const location = document.getElementById('location').value;

    // Oggetto con i dati da inviare
    const data = {
        userType,
        name,
        email,
        password,
        instrument,
        skillLevel,
        description,
        lookingFor,
        location
    };

    try {
        // Effettua la richiesta POST al server
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);
        } else {
            alert('Errore durante la registrazione. Riprova più tardi.');
        }
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        alert('Errore durante la registrazione. Verifica la connessione al server.');
    }
});
