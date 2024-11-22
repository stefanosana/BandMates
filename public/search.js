document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const advancedSearchToggle = document.getElementById('toggleAdvanced');
    const advancedSearchFields = document.getElementById('advancedSearch');
    const resultsContainer = document.getElementById('resultsContainer');

    advancedSearchToggle.addEventListener('click', function() {
        if (advancedSearchFields.style.display === 'none' || advancedSearchFields.style.display === '') {
            advancedSearchFields.style.display = 'block';
            advancedSearchToggle.textContent = 'Nascondi Ricerca Avanzata';
        } else {
            advancedSearchFields.style.display = 'none';
            advancedSearchToggle.textContent = 'Ricerca Avanzata';
        }
    });

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(searchForm);
        const searchParams = new URLSearchParams();

        for (let [key, value] of formData.entries()) {
            if (value) {
                searchParams.append(key, value);
            }
        }

        fetch(`http://localhost:3000/search?${searchParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                console.error('Errore durante la ricerca:', error);
                resultsContainer.innerHTML = '<p>Si è verificato un errore durante la ricerca. Riprova più tardi.</p>';
            });
    });

    function displayResults(results) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>Nessun risultato trovato.</p>';
            return;
        }

        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${result.full_name}</h3>
                <p>Tipo: ${result.type === 'musician' ? 'Musicista' : 'Band'}</p>
                <p>Email: ${result.email}</p>
                <p>Località: ${result.location}</p>
                ${result.type === 'musician' ? `
                    <p>Strumento: ${result.instrument || 'Non specificato'}</p>
                    <p>Esperienza: ${result.experience || 'Non specificata'} anni</p>
                ` : `
                    <p>Genere: ${result.genre || 'Non specificato'}</p>
                `}
            `;
            resultsContainer.appendChild(card);
        });
    }
});