document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    if (!loginForm) {
        console.error('Form di login non trovato');
        return;
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value.trim();

        if (!email || !password) {
            alert('Per favore, inserisci sia email che password.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Errore durante il login');
            }

            // Salva il token JWT nel localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userType', data.userType);
            localStorage.setItem('fullName', data.fullName);
            
            alert(`Benvenuto, ${data.fullName}!`);
            window.location.href = '/static/index.html'; // Assicurati che questo percorso sia corretto
        } catch (error) {
            console.error('Errore durante il login:', error.message);
            alert(`Errore durante il login: ${error.message}`);
        }
    });
});