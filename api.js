const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');

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

/*
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://cuddly-space-fortnight-4jqgxrvjpqxw37xgv-3000.app.github.dev/");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
*/

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Configurazione Swagger

app.use(express.json())
// Connessione al database SQLite
const db = new sqlite3.Database('bandmates.db');

// Endpoint per il signup
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
        console.log("Tutti i campi sono obbligatori")
        return res.status(400).json({ success: false, message: "Tutti i campi sono obbligatori" });
    }

    try {
        db.get(
            `SELECT * FROM musicians WHERE email = ? UNION SELECT * FROM bands WHERE email = ?`,
            [email, email],
            async (err, user) => {
                if (err) {
                    console.error("Errore durante il controllo dell'utente:", err.message);
                    
                    return res.status(500).json({ success: false, message: "Errore interno del server" });
                }

                if (!user) {
                    return res.status(400).json({ success: false, message: "Credenziali errate" });
                }

                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return res.status(400).json({ success: false, message: "Credenziali errate" });
                }

                // Login effettuato con successo
                console.log(`Login effettuato correttamente ${user.full_name}`)
                res.json({ success: true, message: `Login effettuato correttamente ${user.full_name}` });
            }
        );
    } catch (error) {
        console.error("Errore interno del server:", error.message);
        res.status(500).json({ success: false, message: "Errore interno del server" });
    }
});




//Endpoint per trovare tutte le band
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

// Endpoint per ottenere band filtrate per location
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


app.use('/static', express.static('public')); // Servi i file statici dalla cartella 'public'
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});
