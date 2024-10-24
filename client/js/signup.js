document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Ottieni i valori dai campi del form
    const full_name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const user_type = document.getElementById('userType').value;
    const instrument = user_type === 'musician' ? document.getElementById('instrument').value : null;
    const experience = user_type === 'musician' ? document.getElementById('skillLevel').value : null;
    const description = document.getElementById('description').value;
    const location = document.getElementById('location').value;
    const looking_for = user_type === 'band' ? document.getElementById('lookingFor').value : null;

    try {
        // Invia la richiesta al server
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                full_name,
                email,
                password,
                user_type,
                instrument,
                experience,
                description,
                location,
                looking_for,
            }),
        });

        const result = await response.text();

        if (response.ok) {
            alert(result); // Mostra un messaggio di successo
            window.location.href = '/login.html'; // Redirigi alla pagina di login dopo il successo
        } else {
            alert('Errore durante la registrazione: ' + result); // Mostra l'errore
        }
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        alert('Errore durante la registrazione. Riprova più tardi.');
    }
});
