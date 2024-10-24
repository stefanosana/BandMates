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
    }
});

module.exports = db;
