const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const hbs = require("handlebars");
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
app.use(session({ secret: 'session' }));
const corsOptions = {
    origin: "*", // Consenti tutte le origini (solo per scopi di test)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
};
//const mock = require('./DBMock.js');
//const db = new mock();
app.set('view engine', 'hbs')

app.use(cors(corsOptions));

const port = 3000;
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const db = new sqlite3.Database('bandmates.db');

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next(); // L'utente è admin, prosegui
    } else {
        res.status(403).json({ error: "Accesso negato. Solo gli admin possono accedere." });
    }
}

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

    // Controlla che email e password siano forniti
    if (!email || !password) {
        return res.status(400).json({ error: "Email e password sono obbligatorie" });
    }

    try {
        // Recupera l'utente dal database
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
                    if (err) reject(err); // Gestisce l'errore del database
                    else resolve(row); // Restituisce il risultato
                }
            );
        });

        // Verifica se l'utente esiste
        if (!user) {
            return res.status(401).json({ error: "Email o password errati" });
        }

        // Verifica la password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Password Errata" });
        }

        // Genera un token JWT
        const token = jwt.sign(
            { userId: user.id, userType: user.userType, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Salva i dettagli di sessione
        req.session.loggedIn = true;
        req.session.name = user.full_name;
        req.session.role = user.userType;
        req.session.userId = user.id;
        req.session.token = token;

        res.json({
            message: "Accesso effettuato con successo",
            userType: user.userType,
            fullName: user.full_name,
            email: user.email,
            token: token
        });

        // Reindirizza alla homepage
        return res.redirect('/home');

    } catch (error) {
        console.error('Errore durante il login:', error);
        // Gestione degli errori generici
        return res.status(500).json({ error: "Errore durante l'accesso" });
    }
});



app.get('/logout', (req, res) => {
    req.session.loggedin = false;
    res.redirect('/login');
});

app.get('/home', (req, res) => {
    if (req.session.loggedin) {
        if(req.session.userType === 'admin') {
            res.render('admin/home', {
                fullName: req.session.fullName,
                userType: req.session.userType,
                message: req.session.message
            });
        }else {
            res.render('home', {
                fullName: req.session.name,
                userType: req.session.role,
                message: 'Welcome back, ' + req.session.name + '!'
            });
        }
        //res.send('Welcome back, ' + req.session.name + '!' + '<br>' + '<a href="/logout">Logout</a>');
    } else {
        res.redirect('/login');
    }
});

app.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const filters = {
            type: req.query.type,
            location: req.query.location,
            genre: req.query.genre,
            instrument: req.query.instrument,
            minExperience: req.query.minExperience,
            maxExperience: req.query.maxExperience
        };

        let sqlQuery = `
        SELECT 
          CASE 
            WHEN m.musician_id IS NOT NULL THEN 'musician'
            ELSE 'band'
          END AS type,
          COALESCE(m.musician_id, b.band_id) AS id,
          COALESCE(m.full_name, b.full_name) AS full_name,
          COALESCE(m.email, b.email) AS email,
          COALESCE(m.location, b.location) AS location,
          m.instrument,
          m.experience,
          b.genre
        FROM 
          (SELECT * FROM musicians UNION ALL SELECT * FROM bands) AS combined
        LEFT JOIN musicians m ON combined.musician_id = m.musician_id
        LEFT JOIN bands b ON combined.band_id = b.band_id
        WHERE 1=1
      `;

        const params = [];

        // Text search
        if (query) {
            sqlQuery += ` AND (m.full_name LIKE ? OR b.full_name LIKE ? OR m.instrument LIKE ? OR b.genre LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
        }

        // Apply filters
        if (filters.type) {
            sqlQuery += ` AND (CASE WHEN m.musician_id IS NOT NULL THEN 'musician' ELSE 'band' END) = ?`;
            params.push(filters.type);
        }
        if (filters.location) {
            sqlQuery += ` AND COALESCE(m.location, b.location) LIKE ?`;
            params.push(`%${filters.location}%`);
        }
        if (filters.genre) {
            sqlQuery += ` AND b.genre LIKE ?`;
            params.push(`%${filters.genre}%`);
        }
        if (filters.instrument) {
            sqlQuery += ` AND m.instrument LIKE ?`;
            params.push(`%${filters.instrument}%`);
        }
        if (filters.minExperience) {
            sqlQuery += ` AND m.experience >= ?`;
            params.push(parseInt(filters.minExperience));
        }
        if (filters.maxExperience) {
            sqlQuery += ` AND m.experience <= ?`;
            params.push(parseInt(filters.maxExperience));
        }

        // Count total results
        const countQuery = `SELECT COUNT(*) as total FROM (${sqlQuery})`;
        const totalResults = await new Promise((resolve, reject) => {
            db.get(countQuery, params, (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            });
        });

        // Add pagination
        sqlQuery += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // Execute the search
        const results = await new Promise((resolve, reject) => {
            db.all(sqlQuery, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({
            results,
            currentPage: page,
            totalPages: Math.ceil(totalResults / limit),
            totalResults
        });

    } catch (error) {
        console.error('Error in search endpoint:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
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
    db.run(`DELETE FROM musicians WHERE musician_id = ?`, [id], function (err) {
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
