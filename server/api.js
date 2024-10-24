const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

// Connettiti al database SQLite
const db = new sqlite3.Database('./bandmates.db');

// Middleware per gestire i dati JSON
app.use(express.json());

app.post('/signup', async (req, res) => {
    const { email, password, user_type, instrument, experience_level, genre, location, availability } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userQuery = `INSERT INTO users (user_id, email, password, user_type, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;

        db.run(userQuery, [email, hashedPassword, user_type], function(err) {
            if (err) {
                console.error('Errore durante l\'inserimento nella tabella users:', err.message);
                return res.status(500).send('Errore durante la registrazione dell\'utente');
            }

            const user_id = this.lastID;

            if (user_type === 'musician') {
                const musicianQuery = `
                    INSERT INTO musicians (musician_id, user_id, experience_level, location, availability)
                    VALUES (?, ?, ?, ?, ?)
                `;
                db.run(musicianQuery, [user_id, instrument_id, experience_level, genre_id, location, availability], function(err) {
                    if (err) {
                        console.error('Errore durante l\'inserimento nella tabella musicians:', err.message);
                        return res.status(500).send('Errore durante la registrazione del musicista');
                    }
                    res.status(200).send('Registrazione del musicista completata con successo!');
                });
            } else if (user_type === 'band') {
                const bandQuery = `
                    INSERT INTO bands (band_id, user_id, location, looking_for)
                    VALUES (?, ?, ?, ?)
                `;
                db.run(bandQuery, [user_id, genre_id, location, looking_for], function(err) {
                    if (err) {
                        console.error('Errore durante l\'inserimento nella tabella bands:', err.message);
                        return res.status(500).send('Errore durante la registrazione della band');
                    }
                    res.status(200).send('Registrazione della band completata con successo!');
                });
            } else {
                res.status(400).send('Tipo di utente non valido');
            }
        });
    } catch (error) {
        console.error('Errore generale:', error);
        res.status(500).send('Errore durante la registrazione');
    }
});

// Avvia il server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
