const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const hbs = require("handlebars");
const path = require('path');
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
app.use(session({ secret: 'session' }));
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const router = express.Router();



app.use(session({
    secret: 'session',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" }
}));

//const mock = require('./DBMock.js');
//const db = new mock();
const port = 3000;
app.set('view engine', 'hbs')

//app.use(cors(corsOptions));
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
    if (req.session.role === 'admin') {
        next(); // L'utente è admin, prosegui
    } else {
        res.status(403).json({ error: "Accesso negato. Solo gli admin possono accedere." });
    }
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BandMates API',
            version: '1.0.0',
            description: 'API per la piattaforma BandMates, un social per musicisti e band',
        },
        servers: [
            {
                url: 'http://localhost:3000', // Cambia con l'URL del tuo server
            },
        ],
    },
    apis: ['api.js'], // Specifica i file che contengono la documentazione delle API
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Registra un nuovo utente (musicista o band)
 *     description: Permette la registrazione di un musicista o di una band sulla piattaforma BandMates.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userType
 *               - full_name
 *               - email
 *               - password
 *               - location
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [musician, band]
 *                 description: Tipo di utente (musicista o band).
 *                 example: musician
 *               full_name:
 *                 type: string
 *                 description: Nome completo dell'utente.
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Indirizzo email unico.
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password di almeno 6 caratteri.
 *                 example: password123
 *               location:
 *                 type: string
 *                 description: Località dell'utente.
 *                 example: New York
 *               instrument:
 *                 type: string
 *                 description: Strumento musicale suonato (solo per musicisti).
 *                 example: Guitar
 *               experience:
 *                 type: string
 *                 description: Livello di esperienza musicale (solo per musicisti).
 *                 example: Intermediate
 *               description:
 *                 type: string
 *                 description: Breve descrizione dell'utente.
 *                 example: Chitarrista con 5 anni di esperienza, amante del rock.
 *               looking_for:
 *                 type: string
 *                 description: Tipo di musicisti ricercati (solo per band).
 *                 example: Vocalist
 *               genre:
 *                 type: string
 *                 description: Genere musicale della band (solo per band).
 *                 example: Rock
 *     responses:
 *       200:
 *         description: Registrazione avvenuta con successo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Messaggio di conferma.
 *                   example: Registrazione avvenuta con successo come musicista
 *                 id:
 *                   type: integer
 *                   description: ID dell'utente registrato.
 *                   example: 1
 *       400:
 *         description: Errore di input nei dati forniti.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Dettagli dell'errore.
 *                   example: Email già registrata
 *       500:
 *         description: Errore interno del server.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Dettagli dell'errore.
 *                   example: Errore durante la registrazione del musicista
 */
app.post('/signup', async (req, res) => {
    const { userType, full_name, email, password, instrument, experience, description, location, looking_for, genre } = req.body;

    // Verifica dei campi obbligatori comuni
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

    // Verifica dei campi specifici in base al tipo di utente
    if (userType === "musician" && !instrument) {
        return res.status(400).json({ error: "Il campo instrument è obbligatorio per i musicisti" });
    }
    if (userType === "band" && !genre) {
        return res.status(400).json({ error: "Il campo genre è obbligatorio per le band" });
    }

    try {
        // Hash della password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Verifica se l'email è già presente nella tabella USERS
        db.get(`SELECT email FROM USERS WHERE email = ?`, [email], (err, row) => {
            if (err) {
                console.error("Errore durante il controllo dell'email:", err.message);
                return res.status(500).json({ error: "Errore durante il controllo dell'email" });
            }
            if (row) {
                return res.status(400).json({ error: "Email già registrata" });
            }

            // Inserimento dell'utente nella tabella USERS
            db.run(
                `INSERT INTO users (userType, full_name, email, password, location) VALUES (?, ?, ?, ?, ?)`,
                [userType, full_name, email, hashedPassword, location],
                function (err) {
                    if (err) {
                        console.error("Errore durante la registrazione dell'utente:", err.message);
                        return res.status(500).json({ error: "Errore durante la registrazione dell'utente" });
                    }

                    const userId = this.lastID; // ID dell'utente appena creato

                    // Inserimento nei dati specifici (MUSICIANS o BANDS) basato su userType
                    if (userType === "musician") {
                        db.run(
                            `INSERT INTO MUSICIANS (user_id, instrument, experience, description) VALUES (?, ?, ?, ?)`,
                            [userId, instrument, experience, description],
                            function (err) {
                                if (err) {
                                    console.error("Errore durante la registrazione del musicista:", err.message);
                                    return res.status(500).json({ error: "Errore durante la registrazione del musicista" });
                                }
                                res.json({ message: 'Registrazione avvenuta con successo come musicista', id: userId });
                            }
                        );
                    } else if (userType === "band") {
                        db.run(
                            `INSERT INTO BANDS (user_id, description, looking_for, genre) VALUES (?, ?, ?, ?)`,
                            [userId, description, looking_for, genre],
                            function (err) {
                                if (err) {
                                    console.error("Errore durante la registrazione della band:", err.message);
                                    return res.status(500).json({ error: "Errore durante la registrazione della band" });
                                }
                                res.json({ message: 'Registrazione avvenuta con successo come band', id: userId });
                            }
                        );
                    }
                }
            );
        });
    } catch (error) {
        console.error("Errore interno del server:", error.message);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

/**
 * @swagger
 * /login:
 *   get:
 *     summary: Mostra la pagina di login o reindirizza l'utente autenticato alla home.
 *     description: Se l'utente è già autenticato, viene reindirizzato alla home. Altrimenti, viene visualizzata la pagina di login.
 *     responses:
 *       200:
 *         description: Pagina di login mostrata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della pagina di login.
 *       302:
 *         description: Reindirizzamento alla pagina home per utenti autenticati.
 *         headers:
 *           Location:
 *             description: URL della home page.
 *             schema:
 *               type: string
 *               example: /home
 */
app.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        res.redirect('/home');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Effettua il login di un utente (musicista o band).
 *     description: Permette a un utente di effettuare il login tramite email e password. Se il login ha successo, l'utente viene rediretto alla home o dashboard. In caso di errore, viene restituito un messaggio di errore.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: L'email dell'utente.
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 description: La password dell'utente.
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login riuscito. L'utente è reindirizzato alla home o dashboard in base al ruolo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login avvenuto con successo"
 *                 redirectUrl:
 *                   type: string
 *                   example: "/home"  # URL della pagina di destinazione
 *       400:
 *         description: Corpo della richiesta o campi obbligatori mancanti.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email e password sono obbligatorie"
 *       401:
 *         description: Credenziali errate (email o password non corrispondono).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Credenziali errate"
 *       500:
 *         description: Errore interno del server durante il login.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Errore durante l'accesso"
 *     security:
 *       - sessionAuth: []  # L'autenticazione è gestita tramite la sessione dell'utente.
 */
app.post('/login', (req, res) => {
    if (!req.body) {
        return res.status(400).render('error', { message: 'Undefined body' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('error', { message: 'Email e password sono obbligatorie' });
    }

    // Recupera l'utente dal database USERS
    db.get(
        `SELECT * FROM USERS WHERE email = ?`,
        [email],
        async (err, user) => {
            if (err) {
                console.error('Errore durante il login:', err.message);
                return res.status(500).render('error', { message: "Errore durante l'accesso" });
            }

            if (!user) {
                return res.status(401).render('error', { message: 'Credenziali errate' });
            }

            try {
                // Verifica la password
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).render('error', { message: 'Credenziali errate' });
                }

                // Login riuscito
                req.session.loggedIn = true;
                req.session.userId = user.user_id;
                req.session.full_name = user.full_name;
                req.session.userType = user.userType;
                req.session.role = user.role;

                if (user.role === 'admin') {
                    // Renderizza il dashboard dell'admin
                    return res.render('admin/dashboard', {
                        full_name: user.full_name,
                        userType: user.userType,
                        role: user.role,
                        loggedIn: true,
                    });
                }

                // Recupera dati aggiuntivi in base al tipo di utente
                const table = user.userType === 'musician' ? 'MUSICIANS' : 'BANDS';

                db.get(
                    `SELECT * FROM ${table} WHERE user_id = ?`,
                    [user.user_id],
                    (err, userDetails) => {
                        if (err) {
                            console.error(`Errore durante il recupero dei dettagli da ${table}:`, err.message);
                            return res.status(500).render('error', { message: "Errore durante l'accesso" });
                        }

                        res.render('home', {
                            full_name: user.full_name,
                            userType: user.userType,
                            role: user.role,
                            loggedIn: true,
                            additionalDetails: userDetails,
                        });
                    }
                );
            } catch (error) {
                console.error('Errore durante la verifica della password:', error.message);
                res.status(500).render('error', { message: "Errore durante l'accesso" });
            }
        }
    );
});

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Effettua il logout dell'utente.
 *     description: Questa API permette all'utente di disconnettersi, terminando la sessione attiva, e reindirizzandolo alla pagina di login.
 *     responses:
 *       200:
 *         description: Logout avvenuto con successo, l'utente è stato reindirizzato alla pagina di login.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout effettuato con successo"
 *                 redirectUrl:
 *                   type: string
 *                   example: "/login"  # URL della pagina di login
 *       500:
 *         description: Errore interno del server durante il logout.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Errore durante il logout"
 */
app.get('/logout', (req, res) => {
    req.session.loggedIn = false;
    res.redirect('/login');
});

/**
 * @swagger
 * /area-personale:
 *   get:
 *     summary: Visualizza l'area personale dell'utente.
 *     description: Se l'utente è autenticato, viene mostrata l'area personale. Se l'utente è un admin, viene reindirizzato alla dashboard dell'admin. Se l'utente non è autenticato, viene reindirizzato alla pagina di login.
 *     responses:
 *       200:
 *         description: Area personale visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML dell'area personale.
 *       302:
 *         description: Reindirizzamento alla pagina di login per utenti non autenticati.
 *         headers:
 *           Location:
 *             description: URL della pagina di login.
 *             schema:
 *               type: string
 *               example: /login
 *       302:
 *         description: Reindirizzamento alla dashboard dell'admin per utenti con ruolo "admin".
 *         headers:
 *           Location:
 *             description: URL della dashboard dell'admin.
 *             schema:
 *               type: string
 *               example: /admin/dashboard
 */
app.get('/area-personale', (req, res) => {
    // Verifica se l'utente è autenticato
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    if (req.session.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }

    // Renderizza la vista dell'area personale
    res.render('areapersonale', {
        title: 'Area Personale',
        loggedIn: true,
        full_name: req.session.full_name,
        userType: req.session.userType,
        role: req.session.role
    });

});

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Visualizza la dashboard dell'amministratore.
 *     description: Se l'utente ha il ruolo di "admin", viene visualizzata la dashboard dell'amministratore. Altrimenti, viene restituito un errore di accesso negato.
 *     responses:
 *       200:
 *         description: Dashboard dell'amministratore visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della dashboard dell'amministratore.
 *       403:
 *         description: Accesso negato per utenti non amministratori.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Accesso negato'
 */
app.get('/admin/dashboard', (req, res) => {
    if (req.session.role === 'admin') {
        res.render('admin/dashboard', {
            full_name: req.session.full_name,
            role: req.session.role,
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Visualizza la lista degli utenti per l'amministratore.
 *     description: Se l'utente ha il ruolo di "admin", vengono recuperati e visualizzati tutti gli utenti (musicisti e band) dal database. Se l'utente non ha il ruolo di "admin", viene restituito un errore di accesso negato.
 *     responses:
 *       200:
 *         description: Lista degli utenti visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della lista degli utenti.
 *       403:
 *         description: Accesso negato per utenti non amministratori.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Accesso negato'
 *       500:
 *         description: Errore durante il recupero degli utenti dal database.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Errore nel recupero utenti'
 */
app.get('/admin/users', (req, res) => {
    if (req.session.role === 'admin') {
        // Recupera utenti dal database
        db.all('SELECT * FROM USERS', [], (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero utenti');
            }
            res.render('admin/users', { users: rows });
        });
    } else {
        res.status(403).send('Accesso negato');
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

app.get('/admin/users/edit/:id', (req, res) => {
    const userId = req.params.id;

    db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Errore nel recupero dell\'utente:', err);
            return res.status(500).render('error', { message: 'Errore nel recupero dell\'utente' });
        }

        if (!user) {
            return res.status(404).render('error', { message: 'Utente non trovato' });
        }

        // Renderizza la pagina di modifica con i dati dell'utente
        res.render('admin/editUser', { user });
    });
});

app.post('/admin/users/edit/:id', (req, res) => {
    const userId = req.params.id;
    const { full_name, email, userType, location, description } = req.body;

    const updateQuery = `
        UPDATE users 
        SET full_name = ?, email = ?, userType = ?, location = ?, description = ? 
        WHERE user_id = ?
    `;

    db.run(updateQuery, [full_name, email, userType, location, description, userId], function (err) {
        if (err) {
            console.error('Errore nell\'aggiornamento dell\'utente:', err);
            return res.status(500).render('error', { message: 'Errore nell\'aggiornamento dell\'utente' });
        }

        // Reindirizza alla pagina di gestione utenti con un messaggio di successo
        res.redirect('/admin/users?message=Utente aggiornato con successo');
    });
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

/**
 * @swagger
 * /home:
 *   get:
 *     summary: Visualizza la homepage per l'utente autenticato.
 *     description: Se l'utente è autenticato, viene reindirizzato alla homepage in base al suo ruolo. Gli amministratori vengono reindirizzati alla home amministratore, mentre gli altri utenti (musicisti o band) vedono la loro homepage personalizzata. Se l'utente non è autenticato, viene reindirizzato alla pagina di login.
 *     responses:
 *       200:
 *         description: Pagina della home visualizzata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Contenuto HTML della homepage per l'utente.
 *       302:
 *         description: Reindirizzamento alla pagina di login per gli utenti non autenticati.
 *         headers:
 *           Location:
 *             description: URL della pagina di login.
 *             schema:
 *               type: string
 *               example: /login
 *       403:
 *         description: Accesso negato se l'utente non ha il ruolo di amministratore.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Messaggio di errore che indica accesso negato.
 */
app.get('/home', (req, res) => {
    if (req.session.loggedIn) {
        if (req.session.role === 'admin') {
            res.render('admin/home', {
                fullName: req.session.full_name,
                userType: req.session.userType,
                role: req.session.role,
            });
        } else {
            res.render('home', {
                full_name: req.session.full_name,
                userType: req.session.userType,
                role: req.session.role,
                loggedIn: true
            });
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/bands', (req, res) => {
    const sql = `
        SELECT U.full_name, U.location, B.genre
        FROM BANDS B
        JOIN USERS U ON B.user_id = U.user_id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero delle band:', err.message);
            return res.status(500).json({ error: 'Errore nel recupero delle band' });
        }
        res.json(rows);
    });
});

app.get('/bands/rock', (req, res) => {
    const sql = `
        SELECT U.full_name, U.location, B.genre
        FROM BANDS B
        JOIN USERS U ON B.user_id = U.user_id
        WHERE B.genre = 'rock' OR B.genre = 'Rock'
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero delle band rock:', err.message);
            return res.status(500).json({ error: 'Errore nel recupero delle band rock' });
        }
        res.json(rows);
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

//----------------------------------------------------------------------------------| CHAT |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//endpoint get per visualizzare la chat
app.get('/chat', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    res.render('chat', {
        full_name: req.session.full_name,
        userType: req.session.userType,
        role: req.session.role,
    });
});

// Endpoint per la visualizzazione dei messaggi
app.get('/messages', async (req, res) => {
    // Verifica se l'utente è loggato
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;
    const userType = req.session.user.userType;

    try {
        // Recupera tutte le conversazioni dell'utente
        const conversations = await new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT 
                    cr.chat_room_id,
                    CASE 
                        WHEN cr.sender_id = ? THEN cr.receiver_id
                        ELSE cr.sender_id
                    END as other_user_id,
                    u.full_name as other_user_name,
                    u.userType as other_user_type,
                    (
                        SELECT content 
                        FROM MESSAGES m2 
                        WHERE m2.chat_room_id = cr.chat_room_id 
                        ORDER BY sent_at DESC 
                        LIMIT 1
                    ) as last_message,
                    (
                        SELECT sent_at 
                        FROM MESSAGES m3 
                        WHERE m3.chat_room_id = cr.chat_room_id 
                        ORDER BY sent_at DESC 
                        LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) 
                        FROM MESSAGES m4 
                        WHERE m4.chat_room_id = cr.chat_room_id 
                        AND m4.sender_id != ? 
                        AND m4.read = 0
                    ) as unread_count
                FROM CHAT_ROOMS cr
                JOIN USERS u ON (
                    CASE 
                        WHEN cr.sender_id = ? THEN cr.receiver_id
                        ELSE cr.sender_id
                    END = u.user_id
                )
                WHERE cr.sender_id = ? OR cr.receiver_id = ?
                ORDER BY last_message_time DESC
            `, [userId, userId, userId, userId, userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Se è stata selezionata una conversazione specifica
        let activeConversation = null;
        if (req.query.chatId) {
            // Recupera i messaggi della conversazione selezionata
            const messages = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        m.message_id,
                        m.sender_id,
                        m.content,
                        m.sent_at,
                        u.full_name as sender_name
                    FROM MESSAGES m
                    JOIN USERS u ON m.sender_id = u.user_id
                    WHERE m.chat_room_id = ?
                    ORDER BY m.sent_at ASC
                `, [req.query.chatId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Trova i dettagli dell'altro utente nella conversazione
            const otherUser = conversations.find(conv => conv.chat_room_id.toString() === req.query.chatId);

            if (otherUser) {
                activeConversation = {
                    chatId: req.query.chatId,
                    otherUser: {
                        id: otherUser.other_user_id,
                        name: otherUser.other_user_name,
                        type: otherUser.other_user_type,
                        profileImage: '/placeholder.svg', // Placeholder per l'immagine profilo
                        isOnline: false, // Implementare la logica per lo stato online
                        lastSeen: 'Offline' // Implementare la logica per l'ultimo accesso
                    },
                    messages: messages.map(msg => ({
                        id: msg.message_id,
                        message: msg.content,
                        time: new Date(msg.sent_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        isSent: msg.sender_id === userId
                    }))
                };

                // Marca i messaggi come letti
                db.run(`
                    UPDATE MESSAGES 
                    SET read = 1 
                    WHERE chat_room_id = ? AND sender_id != ?
                `, [req.query.chatId, userId]);
            }
        }

        // Formatta le conversazioni per il template
        const formattedConversations = conversations.map(conv => ({
            id: conv.chat_room_id,
            isActive: req.query.chatId === conv.chat_room_id.toString(),
            otherUser: {
                id: conv.other_user_id,
                name: conv.other_user_name,
                type: conv.other_user_type,
                profileImage: '/placeholder.svg' // Placeholder per l'immagine profilo
            },
            lastMessage: conv.last_message,
            lastMessageTime: new Date(conv.last_message_time).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            unreadCount: conv.unread_count
        }));

        // Renderizza il template con i dati
        res.render('messages', {
            title: 'Messaggi',
            user: req.session.user,
            conversations: formattedConversations,
            activeConversation: activeConversation,
            loggedIn: true
        });

    } catch (error) {
        console.error('Errore nel recupero dei messaggi:', error);
        res.status(500).render('error', { 
            message: 'Si è verificato un errore nel caricamento dei messaggi',
            loggedIn: true
        });
    }
});

// Endpoint per l'invio di un nuovo messaggio
app.post('/messages/send', async (req, res) => {
    if (!req.session.loggedin) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { chatRoomId, message } = req.body;
    const senderId = req.session.user.id;

    if (!chatRoomId || !message) {
        return res.status(400).json({ error: 'Dati mancanti' });
    }

    try {
        // Verifica che l'utente sia parte della chat room
        const chatRoom = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM CHAT_ROOMS WHERE chat_room_id = ? AND (sender_id = ? OR receiver_id = ?)',
                [chatRoomId, senderId, senderId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!chatRoom) {
            return res.status(403).json({ error: 'Non autorizzato ad inviare messaggi in questa chat' });
        }

        // Inserisce il nuovo messaggio
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO MESSAGES (chat_room_id, sender_id, content, sent_at, read) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)',
                [chatRoomId, senderId, message],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Errore nell\'invio del messaggio:', error);
        res.status(500).json({ error: 'Errore nell\'invio del messaggio' });
    }
});

// Endpoint per creare una nuova chat room
app.post('/messages/create', async (req, res) => {
    if (!req.session.loggedin) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { receiverId } = req.body;
    const senderId = req.session.user.id;

    if (!receiverId) {
        return res.status(400).json({ error: 'Destinatario mancante' });
    }

    try {
        // Verifica se esiste già una chat room tra questi utenti
        const existingChatRoom = await new Promise((resolve, reject) => {
            db.get(
                `SELECT chat_room_id FROM CHAT_ROOMS 
                 WHERE (sender_id = ? AND receiver_id = ?) 
                 OR (sender_id = ? AND receiver_id = ?)`,
                [senderId, receiverId, receiverId, senderId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingChatRoom) {
            return res.json({ chatRoomId: existingChatRoom.chat_room_id });
        }

        // Crea una nuova chat room
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO CHAT_ROOMS (sender_id, receiver_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [senderId, receiverId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        res.json({ chatRoomId: result });

    } catch (error) {
        console.error('Errore nella creazione della chat room:', error);
        res.status(500).json({ error: 'Errore nella creazione della chat room' });
    }
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = app;
app.use(express.static('public'));
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}: ${"http://localhost:" + port}`);
});
