document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Ottieni i dati dal form
    const userType = document.getElementById('userType').value;
    const full_name = document.getElementById('name').value; 
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const instrument = userType === 'musician' ? document.getElementById('instrument').value : '';
    const skillLevel = userType === 'musician' ? document.getElementById('skillLevel').value : ''; 
    const description = document.getElementById('description').value;
    const lookingFor = userType === 'band' ? document.getElementById('lookingFor').value : ''; // Corretto
    const location = document.getElementById('location').value;
    const genre = userType === 'band' ? document.getElementById('genre').value : '';

    // Oggetto con i dati da inviare
    const data = {
        userType,
        full_name,  
        email,
        password,
        instrument,
        skillLevel,
        experience: skillLevel, // Mappato correttamente
        description,
        looking_for: lookingFor, // Mappato correttamente
        location,
        genre
    };

    try {
        // Effettua la richiesta POST al server
        const response = await fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            window.location.href = '/login';
        } else {
            const errorData = await response.json();
            alert(`Errore durante la registrazione: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        alert('Errore durante la registrazione. Verifica la connessione al server.');
    }
});
