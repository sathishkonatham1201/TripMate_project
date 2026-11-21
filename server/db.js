import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'

const db = new Database(fileURLToPath(new URL('./tripmate.db', import.meta.url)))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trip_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    share REAL NOT NULL
  );
`)

// Repair/add the new budget column without touching existing rows.
const tripColumns = db.prepare('PRAGMA table_info(trips)').all()
if (!tripColumns.some((column) => column.name === 'total_budget')) {
  db.exec('ALTER TABLE trips ADD COLUMN total_budget REAL NOT NULL DEFAULT 0')
  const migrate = db.prepare('UPDATE trips SET total_budget = ? WHERE id = ?')
  const rows = db.prepare('SELECT id, details FROM trips').all()
  const migrateAll = db.transaction(() => {
    for (const row of rows) {
      let budget = 0
      try { budget = Number(JSON.parse(row.details)?.budget) || 0 } catch { budget = 0 }
      migrate.run(Math.max(0, budget), row.id)
    }
  })
  migrateAll()
}

// Give legacy trips a valid owner member so they still display consistently.
const addLegacyMember = db.prepare('INSERT INTO trip_members (trip_id, name, share) VALUES (?, ?, ?)')
const legacyTrips = db.prepare(`
  SELECT t.id, t.total_budget, u.name
  FROM trips t JOIN users u ON u.id = t.user_id
  WHERE NOT EXISTS (SELECT 1 FROM trip_members m WHERE m.trip_id = t.id)
`).all()
const migrateMembers = db.transaction(() => {
  for (const trip of legacyTrips) addLegacyMember.run(trip.id, trip.name.trim() || 'Traveller', trip.total_budget || 0)
})
migrateMembers()

export default db
