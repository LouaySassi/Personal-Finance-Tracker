const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get the user's data directory
const getDataPath = () => {
  const userDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME);
  const appDataDir = path.join(userDataPath, 'FinanceTracker');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  
  return path.join(appDataDir, 'finance-tracker.db');
};

const dbPath = getDataPath();
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const initDatabase = () => {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      default_salary REAL NOT NULL DEFAULT 1300,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Monthly data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_data (
      month_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize default settings if not exists
  const settingsExists = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = 1').get();
  if (settingsExists.count === 0) {
    db.prepare('INSERT INTO settings (id, default_salary) VALUES (1, 1300)').run();
  }

  console.log('✅ Database initialized at:', dbPath);
};

// Initialize database
initDatabase();

module.exports = { db, dbPath };