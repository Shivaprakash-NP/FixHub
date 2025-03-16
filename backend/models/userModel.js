const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DATABASE, (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `);
        console.log("Database connected and Users table ready.");
    }
});

module.exports = db;
