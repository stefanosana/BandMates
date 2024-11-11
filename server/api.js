const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const port = 3000;

// Configurazione avanzata del CORS
const corsOptions = {
    origin: 'http://localhost:3001/client/signup.html', // Sostituisci con il dominio che vuoi consentire
    methods: ['GET', 'POST'], // Metodi consentiti
    allowedHeaders: ['Content-Type', 'Authorization'] // Intestazioni consentite
};

app.use(cors(corsOptions)); // Abilita il CORS con le opzioni specificate
app.use(express.json());

// Connessione al database SQLite
const db = new sqlite3.Database('bandmates.db');

// SINGUP
// Funzione per creare l'utente
function createUser(table, data, res) {
    let query;
    let params;

    if (table === 'musicians') {
        const { full_name, email, password, instrument, experience_level, description, location } = data;

        // Controllo che tutti i campi necessari siano presenti
        if (!full_name || !email || !password || !instrument || !experience_level || !description || !location) {
            res.status(400).json({ error: "Tutti i campi sono obbligatori." });
            return;
        }

        const hashedPassword = bcrypt.hashSync(password, 10); // Crittografia della password

        query = `
            INSERT INTO musicians (full_name, email, password, instrument, experience_level, description, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        params = [full_name, email, hashedPassword, instrument, experience_level, description, location];
    } else if (table === 'bands') {
        const { full_name, email, password, description, looking_for, location } = data;

        // Controllo che tutti i campi necessari siano presenti
        if (!full_name || !email || !password || !description || !looking_for || !location) {
            res.status(400).json({ error: "Tutti i campi sono obbligatori." });
            return;
        }

        const hashedPassword = bcrypt.hashSync(password, 10); // Crittografia della password

        query = `
            INSERT INTO bands (full_name, email, password, description, looking_for, location)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        params = [full_name, email, hashedPassword, description, looking_for, location];
    }

    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: "Errore durante la registrazione." });
            return;
        }
        res.status(201).json({ message: "Registrazione completata con successo!", userId: this.lastID });
    });
}

// Endpoint per la registrazione
app.post('/signup', (req, res) => {
    const { userType, ...data } = req.body;

    console.log(req.body);

    if (userType === 'musician') {
        createUser('musicians', data, res);
    } else if (userType === 'band') {
        createUser('bands', data, res);
    } else {
        res.status(400).json({ error: "Tipo di utente non valido." });
    }
});

//LOGIN
// Funzione per effettuare il login
function loginUser(table, email, password, res) {
    const query = `SELECT * FROM ${table} WHERE email = ?`;

    db.get(query, [email], (err, user) => {
        if (err) {
            res.status(500).json({ error: "Errore del server durante il login." });
            return;
        }
        
        // Verifica se l'utente esiste e la password è corretta
        if (user && bcrypt.compareSync(password, user.password)) {
            res.status(200).json({ message: "Login effettuato con successo!", userId: user.id });
        } else {
            res.status(401).json({ error: "Email o password non corretti." });
        }
    });
}

// Endpoint per il login
app.post('/login', (req, res) => {
    const { userType, email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email e password sono obbligatori." });
        return;
    }

    if (userType === 'musician') {
        loginUser('musicians', email, password, res);
    } else if (userType === 'band') {
        loginUser('bands', email, password, res);
    } else {
        res.status(400).json({ error: "Tipo di utente non valido." });
    }
});


app.use('/static', express.static('public')); // Servi i file statici dalla cartella 'public'
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});
