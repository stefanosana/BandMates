const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione del body-parser per gestire i dati del form
app.use(bodyParser.urlencoded({ extended: true }));

// Configurazione per i file statici
app.use(express.static(path.join(__dirname, 'public')));

// Connessione al database SQLite
const dbPath = path.resolve(__dirname, 'bandmates.db'); // Usa un percorso corretto
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore di connessione al database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');
    }
});

// Rotta per gestire la richiesta POST dalla pagina di signup
app.post('/signup', (req, res) => {
    const { name, email, password, is_band, description } = req.body;

    // Assicurati che il nome venga effettivamente passato al database
    const query = `INSERT INTO users (name, email, password, is_band, description)
                   VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [name, email, password, is_band, description], function(err) {
        if (err) {
            console.error('Errore durante l\'inserimento nel database:', err.message);
            res.status(500).send('Errore durante la registrazione');
        } else {
            console.log(`Utente aggiunto con ID: ${this.lastID}`);
            res.send('Registrazione completata con successo!');
        }
    });
});


// Inizializzazione del server
app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});
