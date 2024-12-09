const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const hbs = require("handlebars");
const path = require('path');
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
app.use(session({
    secret: 'session',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }
}));

//const mock = require('./DBMock.js');
//const db = new mock();
const port = 3000;
app.set('view engine', 'hbs')

app.use(cors(corsOptions));
// Middleware di gestione degli errori
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Si è verificato un errore interno del server' });
});
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

app.get('/login', (req, res) => {
    if (req.session.loggedin) {
        res.redirect('/home');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// POST endpoint per il login
app.post('/login', async (req, res) => {
    if (req.body === undefined) {
        return res.status(400).render('error', { message: 'Undefined body' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('error', { message: 'Email e password sono obbligatorie' });
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
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!user) {
            return res.status(401).render('error', { message: 'Email o password errati' });
        }

        // Verifica la password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).render('error', { message: 'Password Errata' });
        }

        // Imposta i dati di sessione
        req.session.loggedin = true;
        req.session.name = user.full_name;
        req.session.role = user.userType;
        req.session.userId = user.id;

        // Determina la destinazione del reindirizzamento
        let redirectUrl = '/home';
        if (user.userType === 'admin') {
            redirectUrl = '/admin/dashboard';
        }

        // Reindirizza alla destinazione appropriata dopo il login riuscito
        return res.redirect(redirectUrl);

    } catch (error) {
        console.error('Errore durante il login:', error);
        return res.status(500).render('error', { message: "Errore durante l'accesso" });
    }
});

app.get('/logout', (req, res) => {
    req.session.loggedin = false;
    res.redirect('/login');
});

//rotta get per la pagina di area personale
app.get('/area-personale', (req, res) => {
    // Verifica se l'utente è autenticato
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }

    // Renderizza la vista dell'area personale
    res.render('areapersonale', {
        title: 'Area Personale',
        loggedin: true,
        user: req.session.user // Passa i dati dell'utente alla vista
    });
    
});

app.get('/admin/dashboard', (req, res) => {
    if (req.session.role === 'admin') {
        res.render('admin/dashboard');
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.get('/admin/users', (req, res) => {
    if (req.session.role === 'admin') {
        // Recupera utenti dal database
        db.all('SELECT * FROM musicians UNION SELECT * FROM bands', [], (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero utenti');
            }
            res.render('admin/users', { users: rows });
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.get('/admin/users/add', (req, res) => {
    if (req.session.role === 'admin') {
        res.render('admin/addUser');
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.post('/admin/users/add', async (req, res) => {
    const { userType, fullName, email, password } = req.body;

    if (!userType || !fullName || !email || !password) {
        return res.status(400).send('Tutti i campi sono obbligatori.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        if (userType === 'musician') {
            db.run(
                `INSERT INTO musicians (full_name, email, password) VALUES (?, ?, ?)`,
                [fullName, email, hashedPassword],
                (err) => {
                    if (err) return res.status(500).send('Errore nel salvataggio');
                    res.redirect('/admin/users');
                }
            );
        } else if (userType === 'band') {
            db.run(
                `INSERT INTO bands (full_name, email, password) VALUES (?, ?, ?)`,
                [fullName, email, hashedPassword],
                (err) => {
                    if (err) return res.status(500).send('Errore nel salvataggio');
                    res.redirect('/admin/users');
                }
            );
        } else {
            res.status(400).send('Tipo utente non valido.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Errore nel salvataggio.');
    }
});

app.get('/admin/users/edit/:id', (req, res) => {
    if (req.session.role === 'admin') {
        const { id } = req.params;

        db.get(
            `SELECT 'musician' AS userType, musician_id AS id, full_name, email FROM musicians WHERE musician_id = ?
             UNION
             SELECT 'band' AS userType, band_id AS id, full_name, email FROM bands WHERE band_id = ?`,
            [id, id],
            (err, row) => {
                if (err || !row) return res.status(404).send('Utente non trovato');
                res.render('admin/editUser', { user: row });
            }
        );
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.post('/admin/users/edit/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, email, userType } = req.body;

    if (!fullName || !email) {
        return res.status(400).send('Tutti i campi sono obbligatori.');
    }

    const updateQuery = userType === 'musician'
        ? `UPDATE musicians SET full_name = ?, email = ? WHERE musician_id = ?`
        : `UPDATE bands SET full_name = ?, email = ? WHERE band_id = ?`;

    db.run(updateQuery, [fullName, email, id], (err) => {
        if (err) return res.status(500).send('Errore nella modifica');
        res.redirect('/admin/users');
    });
});

app.get('/admin/users/delete/:id', (req, res) => {
    if (req.session.role === 'admin') {
        const { id } = req.params;

        db.run(
            `DELETE FROM musicians WHERE musician_id = ?`,
            [id],
            function (err) {
                if (!this.changes) {
                    // Se non trova in musicians, tenta di eliminare in bands
                    db.run(
                        `DELETE FROM bands WHERE band_id = ?`,
                        [id],
                        function (err) {
                            if (!this.changes) {
                                return res.status(404).send('Utente non trovato');
                            }
                            res.redirect('/admin/users');
                        }
                    );
                } else if (err) {
                    return res.status(500).send('Errore nella cancellazione');
                } else {
                    res.redirect('/admin/users');
                }
            }
        );
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.get('/admin/feedback', (req, res) => {
    if (req.session.role === 'admin') {
        // Recupera feedback dal database
        db.all('SELECT * FROM feedback', [], (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero feedback');
            }
            res.render('admin/feedback', { feedbacks: rows });
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.get('/home', (req, res) => {
    if (req.session.loggedin) {
        if (req.session.userType === 'admin') {
            res.render('admin/home', {
                fullName: req.session.fullName,
                userType: req.session.userType,
                message: req.session.message
            });
        } else {
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
app.use(express.static('public'));
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});
