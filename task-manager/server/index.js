import express from 'express'
import db from './db.js'

const app = express()
const port = 3001

app.use(express.json())

function toTask(row) {
  return { ...row, done: Boolean(row.done) }
}

app.get('/api/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC, id DESC').all()
  res.json(rows.map(toTask))
})

app.post('/api/tasks', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) {
    return res.status(400).json({ error: 'Task text cannot be empty.' })
  }

  const result = db.prepare('INSERT INTO tasks (text) VALUES (?)').run(text)
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  return res.status(201).json(toTask(task))
})

app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1 || typeof req.body?.done !== 'boolean') {
    return res.status(400).json({ error: 'A valid task ID and done value are required.' })
  }

  const result = db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(Number(req.body.done), id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Task not found.' })
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  return res.json(toTask(task))
})

app.delete('/api/tasks/completed', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE done = 1').run()
  res.json({ deleted: result.changes })
})

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'A valid task ID is required.' })
  }

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Task not found.' })
  }

  return res.status(204).end()
})

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) {
    return next(error)
  }
  return res.status(500).json({ error: 'An unexpected server error occurred.' })
})

app.listen(port, () => {
  console.log(`Task Manager API listening at http://localhost:${port}`)
})
