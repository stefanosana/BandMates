const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const hbs = require("hbs");
const path = require('path');
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
app.use(session({ secret: 'session' }));
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const router = express.Router();
require('dotenv').config();
const passport = require('passport');
const socketIo = require('socket.io');
const http = require('http');
const server = http.createServer(app);

const port = 3000; // Usa la tua porta definita
const httpServerInstance = app.listen(port, () => {
    console.log(`Server Express in ascolto http://localhost:${port}`);
});

const io = socketIo(httpServerInstance);


hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

hbs.registerHelper("neq", function (a, b) {
    return a !== b;
});


app.use(session({
    secret: 'tuoSegretoSuperSicuro',
    resave: false,  // Aggiunto per evitare il warning
    saveUninitialized: false  // Aggiunto per evitare il warning
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'session', // Cambia questo con una stringa segreta robusta
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production", // Usa HTTPS in produzione
        maxAge: 1000 * 60 * 60 * 24 // 24 ore
    }
}));

app.set("views", path.join(__dirname, "views"));
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
//google 
// Inizializza Passport e sessioni
app.use(passport.initialize());
app.use(passport.session());
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(passport.initialize());
app.use(passport.session());



passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
    console.log('Google profile:', profile);

    // Estrai email e nome dal profilo
    const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName
    };

    // Salva direttamente nella sessione
    done(null, user);
}));

// Salvataggio nella sessione
passport.serializeUser((user, done) => {
    done(null, user);
});

// Recupero dalla sessione
passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: true,
        prompt: 'consent'
    })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Prima verifica se req.user esiste
        if (!req.user) {
            console.error("Errore: req.user non definito nel callback di Google");
            return res.redirect('/login');
        }

        // Controlla la struttura dell'oggetto user e ottieni l'email in modo sicuro
        let email = null;
        let full_name = null;

        if (req.user.emails && req.user.emails.length > 0) {
            email = req.user.emails[0].value;
        } else if (req.user.email) {
            // Alcune implementazioni di Passport potrebbero avere l'email direttamente nell'oggetto user
            email = req.user.email;
        }

        if (req.user.displayName) {
            full_name = req.user.displayName;
        } else if (req.user.name) {
            full_name = req.user.name;
        }

        // Verifica che abbiamo ottenuto l'email
        if (!email) {
            console.error("Errore: impossibile ottenere l'email dell'utente Google");
            return res.redirect('/login');
        }

        // Stampa l'oggetto user per debug
        console.log("Oggetto user ricevuto da Google:", JSON.stringify(req.user, null, 2));

        // Verifica se l'utente esiste già nel database
        db.get(`SELECT * FROM USERS WHERE email = ?`, [email], (err, user) => {
            if (err) {
                console.error("Errore durante la ricerca dell'utente:", err.message);
                return res.redirect('/login');
            }

            if (user) {
                // L'utente esiste già, imposta la sessione e vai alla home
                req.session.loggedIn = true;
                req.session.user_id = user.user_id;
                req.session.email = email;
                req.session.full_name = user.full_name || full_name;
                req.session.userType = user.userType;
                req.session.role = user.role || 'user';

                req.session.save((err) => {
                    if (err) {
                        console.error("Errore nel salvare la sessione:", err);
                    }
                    res.redirect('/home');
                });
            } else {
                // L'utente non esiste, memorizza i dati di base nella sessione
                // e reindirizza alla pagina di registrazione
                req.session.email = email;
                req.session.full_name = full_name;

                req.session.save((err) => {
                    if (err) {
                        console.error("Errore nel salvare la sessione:", err);
                    }
                    res.redirect('/signup_google.html');
                });
            }
        });
    }
);

app.get('/session-user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            email: req.user.email,
            name: req.user.name
        });
    } else {
        res.status(401).json({ error: 'Utente non autenticato' });
    }
});

function ensureUserIsAuthenticated(req, res, next) {
    if (req.session.loggedIn && req.session.user_id) {
        return next();
    }
    res.status(401).redirect("/login.html?message=Devi effettuare l'accesso per visualizzare questa pagina.");
}

/**
 * @swagger
 * /api/search/advanced:
 *   get:
 *     summary: Ricerca avanzata di musicisti e band
 *     description: Restituisce musicisti o band in base ai filtri forniti.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [musician, band]
 *         required: true
 *         description: Tipo di ricerca (musicista o band).
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Località (es. Milano).
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Genere musicale.
 *       - in: query
 *         name: instrument
 *         schema:
 *           type: string
 *         description: Strumento musicale (solo per musicisti).
 *       - in: query
 *         name: experience
 *         schema:
 *           type: string
 *         description: Anni di esperienza (solo per musicisti, es. "5" o "5+").
 *     responses:
 *       200:
 *         description: Risultati della ricerca.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Parametro 'type' mancante o non valido.
 *       500:
 *         description: Errore interno del server.
 */
app.get('/api/search/advanced', (req, res) => {
    const { type, location, genre, instrument, experience } = req.query;

    if (!type || (type !== 'musician' && type !== 'band')) {
        return res.status(400).json({ error: "Il parametro 'type' è obbligatorio e deve essere 'musician' o 'band'." });
    }

    let query_select_base = '';
    let query_from_join = '';
    let query_conditions = ' WHERE 1=1 ';
    const params = [];

    if (type === 'musician') {
        query_select_base = `SELECT U.user_id, U.full_name, U.email, U.location, U.userType, M.instrument, M.experience, M.description AS musician_description`;
        query_from_join = `FROM USERS U JOIN MUSICIANS M ON U.user_id = M.user_id`;
        query_conditions += ` AND U.userType = 'musician'`;

        if (location) {
            query_conditions += ' AND U.location LIKE ?';
            params.push(`%${location}%`);
        }
        if (instrument) {
            query_conditions += ' AND M.instrument LIKE ?';
            params.push(`%${instrument}%`);
        }
        if (experience) {
            query_conditions += ' AND M.experience LIKE ?'; 
            params.push(`%${experience}%`);
        }
        if (genre) {
            query_conditions += ' AND (M.description LIKE ?)';
            params.push(`%${genre}%`);
        }

    } else if (type === 'band') {
        query_select_base = `SELECT U.user_id, U.full_name, U.email, U.location, U.userType, B.genre, B.description AS band_description, B.looking_for`;
        query_from_join = `FROM USERS U JOIN BANDS B ON U.user_id = B.user_id`;
        query_conditions += ` AND U.userType = 'band'`;

        if (location) {
            query_conditions += ' AND U.location LIKE ?';
            params.push(`%${location}%`);
        }
        if (genre) {
            query_conditions += ' AND B.genre LIKE ?';
            params.push(`%${genre}%`);
        }
        if (instrument) {
            query_conditions += ' AND B.looking_for LIKE ?';
            params.push(`%${instrument}%`);
        }
    }

    const final_query = query_select_base + ' ' + query_from_join + ' ' + query_conditions;

    db.all(final_query, params, (err, rows) => {
        if (err) {
            console.error('Errore durante la ricerca avanzata:', err.message);
            return res.status(500).json({ error: 'Errore interno del server durante la ricerca.' });
        }
        res.json(rows);
    });
});

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Registrazione utente
 *     description: Permette a un utente di registrarsi come musicista o band.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [musician, band]
 *                 description: Tipo di utente
 *                 example: musician
 *               full_name:
 *                 type: string
 *                 description: Nome completo
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 description: Password (minimo 6 caratteri)
 *                 example: password123
 *               location:
 *                 type: string
 *                 description: Posizione geografica
 *                 example: Milano
 *               instrument:
 *                 type: string
 *                 description: Strumento (solo per musicians)
 *                 example: Chitarra
 *               genre:
 *                 type: string
 *                 description: Genere musicale (solo per bands)
 *                 example: Rock
 *     responses:
 *       200:
 *         description: Registrazione avvenuta con successo.
 *       400:
 *         description: Errore nella richiesta.
 *       500:
 *         description: Errore interno del server.
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

app.post('/completa-profilo', async (req, res) => {
    const { email, full_name, userType, instrument, skillLevel, description, location, lookingFor, genre } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Il campo email è obbligatorio" });
    }

    if (!userType || !location) {
        return res.status(400).json({ error: "I campi userType e location sono obbligatori" });
    }

    if (userType !== 'musician' && userType !== 'band') {
        return res.status(400).json({ error: "Il campo userType deve essere 'musician' o 'band'" });
    }

    console.log('Dati ricevuti:', req.body);

    try {
        // Controlla se l'utente esiste già nel database
        db.get(`SELECT * FROM USERS WHERE email = ?`, [email], (err, user) => {
            if (err) {
                console.error("Errore durante la ricerca dell'utente:", err.message);
                return res.status(500).json({ error: "Errore durante la ricerca dell'utente" });
            }

            let userId;
            let role = 'user'; // Default role

            if (!user) {
                // Utente non trovato, lo creiamo
                db.run(
                    `INSERT INTO USERS (full_name, email, userType, location, role) VALUES (?, ?, ?, ?, ?)`,
                    [full_name, email, userType, location, role],
                    function (err) {
                        if (err) {
                            console.error("Errore durante la creazione dell'utente:", err.message);
                            return res.status(500).json({ error: "Errore durante la creazione dell'utente" });
                        }

                        userId = this.lastID;

                        // Imposta i dati della sessione
                        req.session.loggedIn = true;
                        req.session.user_id = userId;
                        req.session.email = email;
                        req.session.full_name = full_name;
                        req.session.userType = userType;
                        req.session.role = role;

                        proceedWithUserType(userId);
                    }
                );
            } else {
                // Utente trovato, aggiorniamo i dati
                userId = user.user_id;
                role = user.role || 'user';

                db.run(
                    `UPDATE USERS SET userType = ?, location = ? WHERE user_id = ?`,
                    [userType, location, userId],
                    (err) => {
                        if (err) {
                            console.error("Errore durante l'aggiornamento dell'utente:", err.message);
                            return res.status(500).json({ error: "Errore durante l'aggiornamento dell'utente" });
                        }

                        // Imposta i dati della sessione
                        req.session.loggedIn = true;
                        req.session.user_id = userId;
                        req.session.email = email;
                        req.session.full_name = user.full_name || full_name;
                        req.session.userType = userType;
                        req.session.role = role;

                        proceedWithUserType(userId);
                    }
                );
            }

            function proceedWithUserType(userId) {
                if (userType === 'musician') {
                    handleMusician(userId);
                } else if (userType === 'band') {
                    handleBand(userId);
                }
            }

            function handleMusician(userId) {
                // Verifica se esiste già un record in MUSICIANS
                db.get(`SELECT musician_id FROM MUSICIANS WHERE user_id = ?`, [userId], (err, musician) => {
                    if (err) {
                        console.error("Errore durante il controllo del musicista:", err.message);
                        return res.status(500).json({ error: "Errore durante il controllo del musicista" });
                    }

                    if (musician) {
                        // Aggiorna il record in MUSICIANS
                        db.run(
                            `UPDATE MUSICIANS SET instrument = ?, experience = ?, description = ? WHERE user_id = ?`,
                            [instrument, skillLevel, description, userId],
                            (err) => {
                                if (err) {
                                    console.error("Errore durante l'aggiornamento del musicista:", err.message);
                                    return res.status(500).json({ error: "Errore durante l'aggiornamento del musicista" });
                                }
                                // Salva la sessione e invia la risposta
                                req.session.save((err) => {
                                    if (err) {
                                        console.error("Errore nel salvare la sessione:", err);
                                    }
                                    res.json({ message: 'Registrazione completata come musicista', redirect: '/home' });
                                });
                            }
                        );
                    } else {
                        // Crea un nuovo record in MUSICIANS
                        db.run(
                            `INSERT INTO MUSICIANS (user_id, instrument, experience, description) VALUES (?, ?, ?, ?)`,
                            [userId, instrument, skillLevel, description],
                            (err) => {
                                if (err) {
                                    console.error("Errore durante la creazione del musicista:", err.message);
                                    return res.status(500).json({ error: "Errore durante la creazione del musicista" });
                                }
                                // Salva la sessione e invia la risposta
                                req.session.save((err) => {
                                    if (err) {
                                        console.error("Errore nel salvare la sessione:", err);
                                    }
                                    res.json({ message: 'Registrazione completata come musicista', redirect: '/home' });
                                });
                            }
                        );
                    }
                });
            }

            function handleBand(userId) {
                // Verifica se esiste già un record in BANDS
                db.get(`SELECT band_id FROM BANDS WHERE user_id = ?`, [userId], (err, band) => {
                    if (err) {
                        console.error("Errore durante il controllo della band:", err.message);
                        return res.status(500).json({ error: "Errore durante il controllo della band" });
                    }

                    if (band) {
                        // Aggiorna il record in BANDS
                        db.run(
                            `UPDATE BANDS SET description = ?, looking_for = ?, genre = ? WHERE user_id = ?`,
                            [description, lookingFor, genre, userId],
                            (err) => {
                                if (err) {
                                    console.error("Errore durante l'aggiornamento della band:", err.message);
                                    return res.status(500).json({ error: "Errore durante l'aggiornamento della band" });
                                }
                                // Salva la sessione e invia la risposta
                                req.session.save((err) => {
                                    if (err) {
                                        console.error("Errore nel salvare la sessione:", err);
                                    }
                                    res.json({ message: 'Registrazione completata come band', redirect: '/home' });
                                });
                            }
                        );
                    } else {
                        // Crea un nuovo record in BANDS
                        db.run(
                            `INSERT INTO BANDS (user_id, description, looking_for, genre) VALUES (?, ?, ?, ?)`,
                            [userId, description, lookingFor, genre],
                            (err) => {
                                if (err) {
                                    console.error("Errore durante la creazione della band:", err.message);
                                    return res.status(500).json({ error: "Errore durante la creazione della band" });
                                }
                                // Salva la sessione e invia la risposta
                                req.session.save((err) => {
                                    if (err) {
                                        console.error("Errore nel salvare la sessione:", err);
                                    }
                                    res.json({ message: 'Registrazione completata come band', redirect: '/home' });
                                });
                            }
                        );
                    }
                });
            }
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
 *     summary: Login utente
 *     description: Consente a un utente registrato di effettuare l'accesso al sistema.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email dell'utente.
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 description: Password dell'utente.
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login riuscito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login effettuato con successo"
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: "John Doe"
 *                     userType:
 *                       type: string
 *                       example: "musician"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     loggedIn:
 *                       type: boolean
 *                       example: true
 *                     additionalDetails:
 *                       type: object
 *       400:
 *         description: Errore nella richiesta.
 *       401:
 *         description: Credenziali errate.
 *       500:
 *         description: Errore interno del server.
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

app.get("/area-personale", ensureUserIsAuthenticated, (req, res) => {
    const userId = req.session.user_id;
    // Recuperiamo i dati dell'utente loggato per passarli al template
    let query = `
        SELECT U.user_id, U.full_name, U.email, U.location, U.userType, U.profile_image_url,
               M.instrument, M.experience, M.description AS musician_description,
               B.genre, B.description AS band_description, B.looking_for
        FROM USERS U
        LEFT JOIN MUSICIANS M ON U.user_id = M.user_id AND U.userType = 'musician'
        LEFT JOIN BANDS B ON U.user_id = B.user_id AND U.userType = 'band'
        WHERE U.user_id = ?;
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error("Errore nel caricare i dati per /area-personale:", err.message);
            // Potresti voler renderizzare una pagina di errore specifica o reindirizzare
            return res.status(500).render("error", { message: "Impossibile caricare la tua area personale al momento." });
        }
        if (!row) {
            // Questo caso dovrebbe essere raro se ensureUserIsAuthenticated funziona correttamente e l'utente esiste
            return res.status(404).render("error", { message: "Informazioni utente non trovate." });
        }

        const userProfile = {
            user_id: row.user_id,
            full_name: row.full_name,
            email: row.email,
            location: row.location,
            userType: row.userType,
            profile_image_url: row.profile_image_url,
            description: row.userType === 'musician' ? row.musician_description : row.band_description,
            instrument: row.instrument,
            experience: row.experience,
            genre: row.genre,
            looking_for: row.looking_for
        };

        res.render("area_personale", {
            layout: false, // Assumendo che non ci sia un layout hbs globale
            user: userProfile,
            title: "Area Personale",
            loggedInUser: { user_id: req.session.user_id, full_name: req.session.full_name } // Per la navbar, se necessario
        });
    });
});

// Route per visualizzare la pagina del profilo utente
app.get("/profilo/:userId", (req, res) => {
    const userId = req.params.userId;
    const loggedInUser = req.session.loggedIn ? { user_id: req.session.user_id, full_name: req.session.full_name } : null;
    
    // Chiamata all'API interna per ottenere i dati dell'utente
    // In un'architettura più complessa, potresti avere un service layer
    // Per ora, chiamiamo direttamente la logica del DB come nell'API endpoint
    let query = `
        SELECT U.user_id, U.full_name, U.email, U.location, U.userType,
               M.instrument, M.experience, M.description AS musician_description,
               B.genre, B.description AS band_description, B.looking_for
        FROM USERS U
        LEFT JOIN MUSICIANS M ON U.user_id = M.user_id AND U.userType = 'musician'
        LEFT JOIN BANDS B ON U.user_id = B.user_id AND U.userType = 'band'
        WHERE U.user_id = ?;
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error("Errore durante il recupero dei dati per la pagina profilo:", err.message);
            return res.status(500).render("error", { message: "Errore nel caricamento del profilo." });
        }
        if (!row) {
            return res.status(404).render("error", { message: "Profilo non trovato." });
        }

        const userProfile = {
            user_id: row.user_id,
            full_name: row.full_name,
            email: row.email, // Valuta se mostrare l'email
            location: row.location,
            userType: row.userType,
            profile_image_url: row.profile_image_url,
            description: row.userType === 'musician' ? row.musician_description : row.band_description,
            instrument: row.instrument,
            experience: row.experience,
            genre: row.genre,
            looking_for: row.looking_for
        };
        
        res.render("profilo_utente", { 
            layout: false, // Se non usi un layout di default per tutte le pagine hbs
            user: userProfile, 
            loggedInUser: loggedInUser, // Passa info sull'utente loggato per la navbar
            title: `Profilo di ${userProfile.full_name}`
        });
    });
});

app.get("/api/user/:userId", (req, res) => {
    const userId = req.params.userId;
    let query = `
        SELECT U.user_id, U.full_name, U.email, U.location, U.userType, U.profile_image_url,
               M.instrument, M.experience, M.description AS musician_description,
               B.genre, B.description AS band_description, B.looking_for
        FROM USERS U
        LEFT JOIN MUSICIANS M ON U.user_id = M.user_id AND U.userType = 'musician'
        LEFT JOIN BANDS B ON U.user_id = B.user_id AND U.userType = 'band'
        WHERE U.user_id = ?;
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error("Errore durante il recupero del profilo utente:", err.message);
            return res.status(500).json({ error: "Errore interno del server." });
        }
        if (!row) {
            return res.status(404).json({ error: "Utente non trovato." });
        }

        // Unifichiamo la descrizione
        const userProfile = {
            user_id: row.user_id,
            full_name: row.full_name,
            email: row.email, // Considerare se esporre l'email pubblicamente
            location: row.location,
            userType: row.userType,
            profile_image_url: row.profile_image_url,
            description: row.userType === 'musician' ? row.musician_description : row.band_description,
            instrument: row.instrument,
            experience: row.experience,
            genre: row.genre,
            looking_for: row.looking_for
        };
        res.json(userProfile);
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

app.get('/cercaUtenti', (req, res) => {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: "Il parametro 'name' è obbligatorio" });
    }
  
    const searchTerm = `%${name}%`;
    const sql = `
      SELECT
        U.user_id,
        U.full_name,
        U.location,
        U.userType,
        M.instrument,
        M.experience,
        M.description   AS musician_description,
        B.genre,
        B.looking_for,
        B.description   AS band_description
      FROM USERS U
      LEFT JOIN MUSICIANS M
        ON U.user_id = M.user_id
        AND U.userType = 'musician'
      LEFT JOIN BANDS B
        ON U.user_id = B.user_id
        AND U.userType = 'band'
      WHERE U.full_name LIKE ?
    `;
  
    db.all(sql, [searchTerm], (err, rows) => {
      if (err) {
        console.error("Errore in /cercaUtenti:", err.message);
        return res.status(500).json({ error: "Errore interno del server" });
      }
      // rows è un array di oggetti con:
      // { user_id, full_name, location, userType,
      //   instrument, experience, musician_description,
      //   genre, looking_for, band_description }
      res.json(rows);
    });
  });

/**
 * @swagger
 * /home:
 *   get:
 *     summary: Home utente
 *     description: Visualizza la home page basata sul ruolo dell'utente autenticato. Gli utenti non autenticati vengono reindirizzati alla pagina di login.
 *     responses:
 *       200:
 *         description: Home page caricata con successo.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html> <html> <head> <title>Home</title> </head> <body>...</body></html>"
 *       302:
 *         description: Reindirizzamento alla pagina di login per utenti non autenticati.
 */
app.get('/home', (req, res) => {
    if (req.session.loggedIn === true) {
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

app.get('/admin/delete-user/:id', isAdmin, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT * FROM users WHERE user_id = ?`, [id], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore durante il recupero delle informazioni dell\'utente' });
        }

        if (!row) {
            return res.status(404).json({ error: `Utente con ID ${id} non trovato.` });
        }

        res.json({ user: row });
    });
});

app.delete('/admin/delete-user/:id', isAdmin, (req, res) => {
    const id = parseInt(req.params.id); // Convertiamo l'ID in numero

    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID utente non valido' });
    }

    // Inizia una transazione
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
            console.error('Errore nell\'iniziare la transazione:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        db.run('DELETE FROM USERS WHERE user_id = ?', [id], function (err) {
            if (err) {
                console.error('Errore nell\'eliminazione dell\'utente:', err);
                return db.run('ROLLBACK', () => {
                    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'utente' });
                });
            }

            // Verifica se l'utente è stato effettivamente eliminato
            if (this.changes === 0) {
                return db.run('ROLLBACK', () => {
                    res.status(404).json({ error: `Utente con ID ${id} non trovato` });
                });
            }

            // Se tutto è andato bene, conferma la transazione
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Errore nel confermare la transazione:', err);
                    return db.run('ROLLBACK', () => {
                        res.status(500).json({ error: 'Errore nel confermare l\'eliminazione' });
                    });
                }
                res.json({
                    message: `Utente con ID ${id} eliminato con successo`,
                    deletedUserId: id
                });
            });
        });
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

app.get('/users/list', (req, res) => {
    // Verifica che l'utente sia loggato
    if (!req.session.userId) {
        return res.status(401).send('Non autorizzato');
    }

    // Recupera tutti gli utenti tranne l'utente corrente
    db.all('SELECT user_id, full_name, email FROM USERS WHERE user_id != ?',
        [req.session.userId],
        (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero utenti');
            }
            res.json(rows);
        });
});

app.post('/chat/start', async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.session.userId; // Assumiamo che l'ID dell'utente corrente sia memorizzato nella sessione

    try {
        // Verifichiamo che l'utente corrente non stia cercando di chattare con se stesso
        if (userId === currentUserId) {
            return res.status(400).json({ error: 'Non puoi avviare una chat con te stesso' });
        }

        // Verifichiamo se esiste già una chat room tra questi due utenti
        const existingRoom = await db.get(
            'SELECT * FROM CHAT_ROOMS WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
            [currentUserId, userId, userId, currentUserId]
        );

        if (existingRoom) {
            // Se esiste già una chat room, restituiamo il suo ID
            return res.json({ chatRoomId: existingRoom.chat_room_id });
        }

        // Se non esiste, creiamo una nuova chat room
        const result = await db.run(
            'INSERT INTO CHAT_ROOMS (sender_id, receiver_id, created_at) VALUES (?, ?, ?)',
            [currentUserId, userId, new Date().toISOString()]
        );

        // Recupera l'ID della chat room appena creata
        const newRoom = await db.get(
            'SELECT chat_room_id FROM CHAT_ROOMS WHERE sender_id = ? AND receiver_id = ?',
            [currentUserId, userId]
        );

        if (newRoom) {
            console.log(newRoom.chat_room_id)
            return res.json({ chatRoomId: newRoom.chat_room_id });
        } else {
            return res.status(500).json({ error: 'Errore durante la creazione della chat room' });
        }
    } catch (error) {
        console.error('Errore durante la gestione della chat:', error.message);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//WEB SOCKET CONTATORE
let visitorCount = 0;

io.on("connection", (socket) => {
    visitorCount++;
    console.log(`BACKEND LOG: Nuovo utente connesso. Conteggio attuale: ${visitorCount}`);
    console.log(`BACKEND LOG: Sto per emettere 'updateVisitorCount' con valore: ${visitorCount}`);
    io.emit("updateVisitorCount", visitorCount); // Assicurati che questa 'io' sia quella inizializzata correttamente
    console.log(`BACKEND LOG: Evento 'updateVisitorCount' emesso con valore: ${visitorCount}`);

    socket.on("disconnect", () => {
        if (visitorCount > 0) {
            visitorCount--;
        }
        console.log(`BACKEND LOG: Utente disconnesso. Conteggio attuale: ${visitorCount}`);
        console.log(`BACKEND LOG: Sto per emettere 'updateVisitorCount' (dopo disconnessione) con valore: ${visitorCount}`);
        io.emit("updateVisitorCount", visitorCount);
        console.log(`BACKEND LOG: Evento 'updateVisitorCount' (dopo disconnessione) emesso con valore: ${visitorCount}`);
    });
});


//------------------------------------------------------------------------| API Terze Parti |------------------------------------------------------------------------------------------
app.get('/marketplace', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    res.render('marketplace', {
        full_name: req.session.full_name,
        userType: req.session.userType,
        role: req.session.role,
    });
});


module.exports = app;
app.use(express.static('public'));