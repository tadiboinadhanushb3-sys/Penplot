import { Router } from 'express'
import Blog from '../models/Blog.js'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.patch('/me', requireAuth, async (request, response) => {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ message: 'Request body must be a JSON object.' })
  }
  const { name, bio } = request.body
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
    return response.status(400).json({ message: 'Name must be between 2 and 60 characters.' })
  }
  if (typeof bio !== 'string' || bio.trim().length > 280) {
    return response.status(400).json({ message: 'Bio must be 280 characters or fewer.' })
  }
  const user = await User.findByIdAndUpdate(
    request.userId,
    { name: name.trim(), bio: bio.trim() },
    { new: true, runValidators: true, select: 'name username email bio' },
  )
  if (!user) return response.status(404).json({ message: 'Account not found.' })
  return response.json({
    user: { id: user.id, name: user.name, username: user.username, email: user.email, bio: user.bio },
  })
})

router.get('/:username', async (request, response) => {
  const user = await User.findOne({ username: request.params.username.toLowerCase() })
    .select('name username bio createdAt')
  if (!user) return response.status(404).json({ message: 'Author not found.' })
  const stories = await Blog.find({ author: user._id, status: 'published' })
    .sort({ publishedAt: -1 }).populate('author', 'name username')
  return response.json({ user, stories })
})

export default router
