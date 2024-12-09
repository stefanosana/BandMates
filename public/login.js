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
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include' // Importante per gestire i cookie di sessione
            });

            if (response.redirected) {
                // Il server ha reindirizzato, seguiamo il reindirizzamento
                window.location.href = response.url;
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Errore durante il login');
            }

            // Se la risposta è ok ma non c'è stato un reindirizzamento,
            // possiamo assumere che il login sia avvenuto con successo
            window.location.href = '/home';
        } catch (error) {
            console.error('Errore durante il login:', error.message);
            alert(`Errore durante il login: ${error.message}`);
        }
    });
});