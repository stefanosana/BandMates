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
                // Otteniamo l'errore come testo per mostrarlo meglio all'utente
                await response.json();
                const errorElement = document.getElementById('error');
                errorElement.innerText = "Email o password errati";
                errorElement.style.display = 'block';
                errorElement.style.color = 'red';
            }

            // Se la risposta è ok ma non c'è stato un reindirizzamento
            window.location.href = '/home';
        } catch (error) {
            console.error('Errore durante il login:', error.message);
            const errorElement = document.getElementById('error');
            errorElement.innerText = "Email o password errati";
            errorElement.style.display = 'block';
            errorElement.style.color = 'red';
        }
    });
});
