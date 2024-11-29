document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const resultsContainer = document.getElementById('resultsContainer');
    const advancedSearch = document.getElementById('advancedSearch');
    let currentPage = 1;
    const limit = 10; // Numero di risultati per pagina

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        currentPage = 1; // Resetta la pagina corrente quando si effettua una nuova ricerca
        performSearch();
    });

    function performSearch() {
        const formData = new FormData(searchForm);
        const searchParams = new URLSearchParams(formData);
        searchParams.append('page', currentPage);
        searchParams.append('limit', limit);

        // Aggiungi i parametri della ricerca avanzata solo se la sezione è visibile
        if (advancedSearch.style.display !== 'none') {
            const searchType = document.querySelector('input[name="searchType"]:checked').value;
            searchParams.append('type', searchType);
        }

        fetch(`http://localhost:3000/search?${searchParams.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Errore nella richiesta di ricerca');
                }
                return response.json();
            })
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                console.error('Errore:', error);
                resultsContainer.innerHTML = '<p>Si è verificato un errore durante la ricerca. Riprova più tardi.</p>';
            });
    }

    function displayResults(data) {
        resultsContainer.innerHTML = ''; // Pulisci i risultati precedenti

        if (data.results.length === 0) {
            resultsContainer.innerHTML = '<p>Nessun risultato trovato.</p>';
            return;
        }

        const resultsList = document.createElement('div');
        resultsList.className = 'row';

        data.results.forEach(result => {
            const resultCard = document.createElement('div');
            resultCard.className = 'col-md-4 mb-4';
            resultCard.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${result.full_name}</h5>
                        <p class="card-text">Tipo: ${result.type === 'musician' ? 'Musicista' : 'Band'}</p>
                        <p class="card-text">Email: ${result.email}</p>
                        <p class="card-text">Località: ${result.location}</p>
                        ${result.instrument ? `<p class="card-text">Strumento: ${result.instrument}</p>` : ''}
                        ${result.genre ? `<p class="card-text">Genere: ${result.genre}</p>` : ''}
                        ${result.experience ? `<p class="card-text">Esperienza: ${result.experience} anni</p>` : ''}
                        <a href="#" class="btn btn-primary">Visualizza Profilo</a>
                    </div>
                </div>
            `;
            resultsList.appendChild(resultCard);
        });

        resultsContainer.appendChild(resultsList);

        // Aggiungi la paginazione
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination justify-content-center mt-4';
        paginationContainer.innerHTML = `
            <button class="btn btn-secondary me-2" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Precedente</button>
            <span class="align-self-center">Pagina ${currentPage} di ${data.totalPages}</span>
            <button class="btn btn-secondary ms-2" ${currentPage === data.totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Successiva</button>
        `;
        resultsContainer.appendChild(paginationContainer);
    }

    // Funzione globale per cambiare pagina
    window.changePage = function(newPage) {
        currentPage = newPage;
        performSearch();
    };

    // Gestione del toggle per la ricerca avanzata
    const toggleButton = document.getElementById('toggleAdvanced');
    toggleButton.addEventListener('click', function() {
        if (advancedSearch.style.display === 'none' || advancedSearch.style.display === '') {
            advancedSearch.style.display = 'block';
            toggleButton.textContent = 'Nascondi Ricerca Avanzata';
        } else {
            advancedSearch.style.display = 'none';
            toggleButton.textContent = 'Ricerca Avanzata';
        }
    });
});
