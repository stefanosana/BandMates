document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // Previeni il comportamento predefinito del form

    console.log("Script signup.js caricato correttamente");

    console.log("Form submitted");  // Debug: verifica se l'evento submit viene intercettato

    const userType = document.getElementById('userType').value;
    const fullName = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const description = document.getElementById('description').value;
    const location = document.getElementById('location').value;

    let data = {
        user_type: userType,
        full_name: fullName,
        email: email,
        password: password,
        description: description,
        location: location
    };

    if (userType === 'musician') {
        data.instrument = document.getElementById('instrument').value;
        data.experience = document.getElementById('skillLevel').value;
    } else if (userType === 'band' && document.getElementById('lookingFor')) {
        data.looking_for = document.getElementById('lookingFor').value;
    }




    try {
        const response = await fetch('http://localhost:3001/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), // Converti i dati in JSON
        });

        if (response.ok) {
            const result = await response.text();
            alert(result); // Mostra il risultato direttamente
            window.location.href = '/login.html'; // Redirigi alla pagina di login
        } else {
            alert('Errore durante la registrazione. Riprova.');
        }
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        alert('Errore durante la registrazione. Controlla la console per dettagli.');
    }
});
