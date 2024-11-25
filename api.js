const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();
const { swaggerUi, swaggerSpec } = require('./swagger');
const { urlencoded } = require('body-parser');

const corsOptions = {
    origin: "*", // Consenti tutte le origini (solo per scopi di test)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
};

app.use(cors(corsOptions));
const port = 3000;

app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Configurazione Swagger

app.use(express.json())
// Connessione al database SQLite
const db = new sqlite3.Database('bandmates.db');

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next(); // L'utente è admin, prosegui
    } else {
        res.status(403).json({ error: "Accesso negato. Solo gli admin possono accedere." });
    }
}

// Usa il middleware su tutte le route dell'admin
app.use('/admin', isAdmin);

app.post('/signup', async (req, res) => {
    const { userType, full_name, email, password, instrument, experience, description, location, looking_for, genre } = req.body;

    // Verifica che tutti i campi comuni siano presenti
    if (!userType || !full_name || !email || !password || !location) {
        return res.status(400).json({ error: "I campi userType, full_name, email, password e location sono obbligatori" });
    }

    // Controllo che la password abbia almeno 6 caratteri
    if (password.length < 6) {
        return res.status(400).json({ error: "La password deve avere almeno 6 caratteri" });
    }

    // Verifica che il campo `userType` sia valido
    if (userType !== "musician" && userType !== "band") {
        return res.status(400).json({ error: "Il campo userType deve essere 'musician' o 'band'" });
    }

    // Verifica che i campi specifici siano presenti in base al tipo di utente
    if (userType === "musician" && !instrument) {
        return res.status(400).json({ error: "Il campo instrument è obbligatorio per i musicisti" });
    }
    if (userType === "band" && !genre) {
        return res.status(400).json({ error: "Il campo genre è obbligatorio per le band" });
    }


    try {
        // Hash della password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Verifica se l'email è già presente
        db.get(`SELECT email FROM musicians WHERE email = ? UNION SELECT email FROM bands WHERE email = ?`, [email, email], (err, row) => {
            if (err) {
                console.error("Errore durante il controllo dell'email:", err.message);
                return res.status(500).json({ error: "Errore durante il controllo dell'email" });
            }
            if (row) {
                return res.status(400).json({ error: "Email già registrata" });
            }

            // Inserimento nel database basato su userType
            if (userType === "musician") {
                db.run(
                    `INSERT INTO musicians (userType, full_name, email, password, instrument, experience, description, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userType, full_name, email, hashedPassword, instrument, experience, description, location],
                    function (err) {
                        if (err) {
                            console.error("Errore durante la registrazione del musicista:", err.message);
                            return res.status(500).json({ error: "Errore durante la registrazione del musicista" });
                        }
                        res.json({ message: 'Registrazione avvenuta con successo come musicista', id: this.lastID });
                    }
                );
            } else if (userType === "band") {
                db.run(
                    `INSERT INTO bands (userType, full_name, email, password, description, looking_for, location, genre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userType, full_name, email, hashedPassword, description, looking_for, location, genre],
                    function (err) {
                        if (err) {
                            console.error("Errore durante la registrazione della band:", err.message);  // Aggiunto messaggio di errore completo
                            return res.status(500).json({ error: "Errore durante la registrazione della band" });
                        }
                        res.json({ message: 'Registrazione avvenuta con successo come band', id: this.lastID });
                    }
                );
            }
        });
    } catch (error) {
        console.error("Errore interno del server:", error.message);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e password sono obbligatorie" });
    }

    try {
        const user = await new Promise((resolve, reject) => {
            db.get(
                `SELECT userType, id, full_name, email, password 
                 FROM (
                     SELECT 'musician' AS userType, musician_id AS id, full_name, email, password FROM musicians 
                     UNION 
                     SELECT 'band' AS userType, band_id AS id, full_name, email, password FROM bands
                 )
                 WHERE email = ?`,
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!user) {
            return res.status(401).json({ error: "Email o password errati" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Email o password errati" });
        }

        const token = jwt.sign(
            { userId: user.id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: "Accesso effettuato con successo",
            userType: user.userType,
            fullName: user.full_name,
            email: user.email,
            token: token
        });
    } catch (error) {
        console.error('Errore durante il login:', error);
        res.status(500).json({ error: "Errore durante l'accesso" });
    }
});

app.get('/search', (req, res) => {
    const { query, type, location, genre, instrument, experience } = req.query;

    let sqlQuery = `
      SELECT 
        'musician' AS type,
        musician_id AS id,
        full_name,
        email,
        location,
        instrument,
        experience,
        NULL AS genre
      FROM 
        musicians
      WHERE 1=1
  
      UNION ALL
  
      SELECT 
        'band' AS type,
        band_id AS id,
        full_name,
        email,
        location,
        NULL AS instrument,
        NULL AS experience,
        genre
      FROM 
        bands
      WHERE 1=1
    `;

    const params = [];

    if (query) {
        sqlQuery = sqlQuery.replace('WHERE 1=1', `WHERE (full_name LIKE ? OR email LIKE ?)`);
        params.push(`%${query}%`, `%${query}%`);
        params.push(`%${query}%`, `%${query}%`); // Ripetuto per la parte UNION
    }

    if (type) {
        sqlQuery += ` AND type = ?`;
        params.push(type);
    }

    if (location) {
        sqlQuery += ` AND location LIKE ?`;
        params.push(`%${location}%`);
    }

    if (genre) {
        sqlQuery += ` AND (genre LIKE ? OR genre IS NULL)`;
        params.push(`%${genre}%`);
    }

    if (instrument) {
        sqlQuery += ` AND (instrument LIKE ? OR instrument IS NULL)`;
        params.push(`%${instrument}%`);
    }

    if (experience) {
        sqlQuery += ` AND (experience >= ? OR experience IS NULL)`;
        params.push(parseInt(experience));
    }

    db.all(sqlQuery, params, (err, results) => {
        if (err) {
            console.error("Errore durante la ricerca:", err.message);
            return res.status(500).json({
                status: 500,
                message: "Errore interno del server durante la ricerca",
                data: null
            });
        }

        res.json({
            status: 200,
            message: "Ricerca avvenuta con successo",
            data: {
                results: results,
                total_results: results.length
            }
        });
    });
});

app.get('/bands', (req, res) => {
    const query = `SELECT * FROM bands`;

    db.all(query, (err, bands) => {
        if (err) {
            res.status(500).json({ error: "Errore durante il recupero delle band." });
            return;
        }

        res.status(200).json(bands);
    });
});

app.get('/bands/location/:location', (req, res) => {
    const location = req.params.location;
    const query = `SELECT * FROM bands WHERE location = ?`;

    db.all(query, [location], (err, bands) => {
        if (err) {
            res.status(500).json({ error: "Errore durante il recupero delle band." });
            return;
        }

        res.status(200).json(bands);
    });
});

app.get('/admin/users', isAdmin, (req, res) => {
    db.all(`SELECT * FROM musicians UNION SELECT * FROM bands`, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore nel recupero degli utenti' });
        }
        res.json(rows);
    });
});

app.delete('/admin/delete-user/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM musicians WHERE musician_id = ?`, [id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore durante l\'eliminazione dell\'utente' });
        }
        res.json({ message: `Utente con ID ${id} eliminato.` });
    });
});
 
module.exports = app;
app.use('/static', express.static('public')); // Servi i file statici dalla cartella 'public'
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});
