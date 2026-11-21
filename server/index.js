import 'dotenv/config'
import express from 'express'
import authRouter, { requireAuth } from './auth.js'
import db from './db.js'
import splitBudget from './splitBudget.js'

const app = express()
const port = 3001
app.use(express.json())
app.use('/api/auth', authRouter)

function memberRows(tripId) {
  return db.prepare('SELECT name, share FROM trip_members WHERE trip_id = ? ORDER BY id').all(tripId)
}

function toTrip(row) {
  let details = {}
  try { details = JSON.parse(row.details) || {} } catch { details = {} }
  const totalBudget = Number(row.total_budget) || 0
  return {
    id: row.id, name: row.name, destination: row.destination,
    startDate: row.start_date, endDate: row.end_date,
    ...details, budget: totalBudget, total_budget: totalBudget,
    members: memberRows(row.id),
  }
}

function readTrip(body) {
  const { name, destination, startDate, endDate, details, total_budget, members } = body || {}
  const validDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  if (typeof name !== 'string' || !name.trim() || typeof destination !== 'string' || !destination.trim()
    || !validDate(startDate) || !validDate(endDate) || endDate < startDate
    || !details || typeof details !== 'object' || Array.isArray(details)) return { error: 'Enter a valid trip name, destination, and date range.' }
  if (typeof total_budget !== 'number' || !Number.isFinite(total_budget) || total_budget < 0) return { error: 'Total budget must be a number of zero or more.' }
  if (!Array.isArray(members) || members.length < 1 || members.length > 20) return { error: 'Choose between 1 and 20 members.' }
  const names = members.map((name) => typeof name === 'string' ? name.trim() : '')
  if (names.some((name) => !name)) return { error: 'Every member name is required.' }
  const keys = names.map((name) => name.toLowerCase())
  if (new Set(keys).size !== keys.length) return { error: 'Member names must be unique, ignoring case.' }
  return { trip: { name: name.trim(), destination: destination.trim(), startDate, endDate, details, totalBudget: total_budget, names } }
}

function saveMembers(tripId, names, totalBudget) {
  const shares = splitBudget(totalBudget, names.length)
  const insert = db.prepare('INSERT INTO trip_members (trip_id, name, share) VALUES (?, ?, ?)')
  for (let index = 0; index < names.length; index++) insert.run(tripId, names[index], shares[index])
}

app.get('/api/trips', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id)
  res.json(rows.map(toTrip))
})

app.post('/api/trips', requireAuth, (req, res) => {
  const result = readTrip(req.body)
  if (result.error) return res.status(400).json({ error: result.error })
  const { trip } = result
  const details = { ...trip.details, budget: trip.totalBudget }
  const create = db.transaction(() => {
    const inserted = db.prepare(`INSERT INTO trips (user_id, name, destination, start_date, end_date, details, total_budget) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, trip.name, trip.destination, trip.startDate, trip.endDate, JSON.stringify(details), trip.totalBudget)
    saveMembers(inserted.lastInsertRowid, trip.names, trip.totalBudget)
    return inserted.lastInsertRowid
  })
  const id = create()
  const saved = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(id, req.user.id)
  return res.status(201).json(toTrip(saved))
})

app.put('/api/trips/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const result = readTrip(req.body)
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'A valid trip ID is required.' })
  if (result.error) return res.status(400).json({ error: result.error })
  const { trip } = result
  const details = { ...trip.details, budget: trip.totalBudget }
  const update = db.transaction(() => {
    const changed = db.prepare(`UPDATE trips SET name = ?, destination = ?, start_date = ?, end_date = ?, details = ?, total_budget = ? WHERE id = ? AND user_id = ?`).run(trip.name, trip.destination, trip.startDate, trip.endDate, JSON.stringify(details), trip.totalBudget, id, req.user.id)
    if (!changed.changes) return false
    db.prepare('DELETE FROM trip_members WHERE trip_id = ?').run(id)
    saveMembers(id, trip.names, trip.totalBudget)
    return true
  })
  if (!update()) return res.status(404).json({ error: 'Trip not found.' })
  const saved = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(id, req.user.id)
  return res.json(toTrip(saved))
})

app.delete('/api/trips/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'A valid trip ID is required.' })
  const result = db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(id, req.user.id)
  if (!result.changes) return res.status(404).json({ error: 'Trip not found.' })
  return res.status(204).end()
})

app.use((error, req, res, next) => { console.error(error); if (res.headersSent) return next(error); return res.status(500).json({ error: 'An unexpected server error occurred.' }) })
app.listen(port, () => console.log(`TripMate API listening at http://localhost:${port}`))
