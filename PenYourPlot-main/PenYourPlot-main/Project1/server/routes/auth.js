import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function publicUser(user) {
  return { id: user.id, name: user.name, username: user.username, email: user.email, bio: user.bio }
}

router.post('/register', async (request, response) => {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ message: 'Request body must be a JSON object.' })
  }
  const { name, username, email, password } = request.body
  if (![name, username, email, password].every((value) => typeof value === 'string')) {
    return response.status(400).json({ message: 'Name, username, email, and password are required.' })
  }
  if (password.length < 8 || password.length > 72) {
    return response.status(400).json({ message: 'Password must be between 8 and 72 characters.' })
  }
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username.trim())) {
    return response.status(400).json({ message: 'Username must be 3–24 characters and use only letters, numbers, underscores, or hyphens.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return response.status(400).json({ message: 'Enter a valid email address.' })
  }
  const user = await User.create({ name, username: username.toLowerCase(), email, password })
  return response.status(201).json({ user: publicUser(user), token: createToken(user) })
})

router.post('/login', async (request, response) => {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ message: 'Request body must be a JSON object.' })
  }
  const { email, password } = request.body
  if (typeof email !== 'string' || typeof password !== 'string') {
    return response.status(400).json({ message: 'Email and password are required.' })
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    return response.status(401).json({ message: 'Email or password is incorrect.' })
  }
  return response.json({ user: publicUser(user), token: createToken(user) })
})

router.get('/me', requireAuth, async (request, response) => {
  const user = await User.findById(request.userId)
  if (!user) return response.status(401).json({ message: 'Your account could not be found. Please log in again.' })
  return response.json({ user: publicUser(user) })
})

export default router
