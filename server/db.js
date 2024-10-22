const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Percorso corretto del file di database
const dbPath = path.resolve(__dirname, 'bandmates.db'); // Elimina lo "/" iniziale

// Crea la connessione al database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(`Errore durante la connessione al database ${dbPath}:`, err.message);
    } else {
        console.log(`Connesso al database SQLite al percorso: ${dbPath}`);

        // Creazione delle tabelle se non esistono
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_band INTEGER DEFAULT 0,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS instruments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS user_instruments (
                user_id INTEGER,
                instrument_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (instrument_id) REFERENCES instruments(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                level TEXT CHECK( level IN ('Beginner', 'Intermediate', 'Advanced') ) NOT NULL,
                experience_years INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER,
                receiver_id INTEGER,
                message TEXT NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            )
        `);
    }
});

module.exports = db;
