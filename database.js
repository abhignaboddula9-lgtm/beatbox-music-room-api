const path = require("node:path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

async function initializeDatabase(
  filename = process.env.DATABASE_PATH || path.join(__dirname, "music-room.sqlite")
) {
  const db = await open({
    filename,
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS musicians (
      musician_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      department TEXT NOT NULL CHECK (length(trim(department)) > 0)
    );

    CREATE TABLE IF NOT EXISTS instruments (
      instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(trim(name)) > 0),
      family TEXT NOT NULL CHECK (length(trim(family)) > 0)
    );

    CREATE TABLE IF NOT EXISTS loans (
      loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      musician_id INTEGER NOT NULL REFERENCES musicians(musician_id),
      instrument_id INTEGER NOT NULL REFERENCES instruments(instrument_id),
      loan_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'returned'))
    );
  `);

  return db;
}

module.exports = { initializeDatabase };
