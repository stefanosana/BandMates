const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione del body-parser per gestire i dati JSON
app.use(bodyParser.json());

// Connessione al database SQLite
const db = new sqlite3.Database('./bandmates.db');

// Rotta per gestire la richiesta POST dalla pagina di signup
app.post('/signup', async (req, res) => {
    const { full_name, email, password, user_type, instrument, experience, description, looking_for, location } = req.body;

    // Eseguiamo l'hash della password prima di inserirla nel database
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user_type === 'musician') {
        // Inserisci il musicista nella tabella musicians
        const musicianQuery = `
            INSERT INTO MUSICIANS (full_name, email, password, instrument, experience, description, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(musicianQuery, [full_name, email, hashedPassword, instrument, experience, description, location], function(err) {
            if (err) {
                console.error('Errore durante l\'inserimento nella tabella musicians:', err.message);
                return res.status(500).send('Errore durante la registrazione del musicista');
            }
            res.send('Registrazione del musicista completata con successo!');
        });

    } else if (user_type === 'band') {
        // Inserisci la band nella tabella bands
        const bandQuery = `
            INSERT INTO BANDS (full_name, email, password, description, looking_for, location)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(bandQuery, [full_name, email, hashedPassword, description, looking_for, location], function(err) {
            if (err) {
                console.error('Errore durante l\'inserimento nella tabella bands:', err.message);
                return res.status(500).send('Errore durante la registrazione della band');
            }
            res.send('Registrazione della band completata con successo!');
        });
    } else {
        res.status(400).send('Tipo di utente non valido');
    }
});

// Inizializzazione del server
app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});
