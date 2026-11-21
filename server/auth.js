import 'dotenv/config'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from './db.js'

const router = Router()
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set in the .env file.')
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}

function createToken(user) {
  return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' })
}

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  try {
    const payload = jwt.verify(token, jwtSecret)
    if (typeof payload !== 'object' || !Number.isSafeInteger(payload.id)) {
      return res.status(401).json({ error: 'Invalid or expired token.' })
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(payload.id)
    if (!user) return res.status(401).json({ error: 'Invalid or expired token.' })

    req.user = publicUser(user)
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

router.post('/register', async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
    return res.status(400).json({ error: 'Enter a name, valid email, and password of at least 6 characters.' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ).run(name, email, passwordHash)
    const user = { id: Number(result.lastInsertRowid), name, email }
    return res.status(201).json({ token: createToken(user), user })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    return next(error)
  }
})

router.post('/login', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

  try {
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const safeUser = publicUser(user)
    return res.json({ token: createToken(safeUser), user: safeUser })
  } catch (error) {
    return next(error)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
