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
const db = new sqlite3.Database('./db/bandmates.db', (err) => {
    if (err) {
        console.error('Errore di connessione al database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');
    }
});

// Rotta per gestire la richiesta POST dalla pagina di signup
app.post('/signup', (req, res) => {
    const { nome, cognome, email, password, tipoUtente, livelloMusicale, strumenti, genereBand, citta } = req.body;

    // SQL query per inserire i dati dell'utente nel database
    const query = `INSERT INTO utenti (nome, cognome, email, password, tipo_utente, livello_musicale, strumenti, genere_band, citta)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [nome, cognome, email, password, tipoUtente, livelloMusicale, strumenti, genereBand, citta], function(err) {
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




//DA PROVARE 