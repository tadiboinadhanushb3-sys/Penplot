import { Router } from 'express'
import mongoose from 'mongoose'
import Blog from '../models/Blog.js'
import User from '../models/User.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'

const router = Router()

function cleanTags(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean))].slice(0, 8)
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'story'
}

function validateStory(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.'
  }
  const { title, description, body: content, status } = body
  if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 120) {
    return 'Title must be between 5 and 120 characters.'
  }
  if (typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 240) {
    return 'Description must be between 10 and 240 characters.'
  }
  if (typeof content !== 'string' || content.trim().length < 40 || content.length > 50000) {
    return 'Story must be between 40 and 50,000 characters.'
  }
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 8
    || body.tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 24))) {
    return 'Provide up to 8 topic tags, each 24 characters or fewer.'
  }
  if (status !== undefined && !['draft', 'published'].includes(status)) {
    return 'Status must be draft or published.'
  }
  return null
}

router.get('/', async (request, response) => {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
  const limit = Math.min(20, Math.max(1, Number.parseInt(request.query.limit, 10) || 6))
  const filter = { status: 'published' }
  if (typeof request.query.tag === 'string' && request.query.tag.trim()) {
    filter.tags = request.query.tag.trim().toLowerCase()
  }
  if (typeof request.query.q === 'string' && request.query.q.trim()) {
    const escaped = request.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const expression = new RegExp(escaped, 'i')
    const authors = await User.distinct('_id', {
      $or: [{ name: expression }, { username: expression }],
    })
    filter.$or = [
      { title: expression }, { description: expression }, { body: expression },
      { tags: expression }, { author: { $in: authors } },
    ]
  }
  const [stories, total, tags] = await Promise.all([
    Blog.find(filter).sort({ publishedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('author', 'name username'),
    Blog.countDocuments(filter),
    Blog.distinct('tags', { status: 'published' }),
  ])
  return response.json({
    stories,
    tags: tags.sort(),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})

router.get('/mine', requireAuth, async (request, response) => {
  const stories = await Blog.find({ author: request.userId })
    .sort({ updatedAt: -1 }).populate('author', 'name username')
  return response.json({ stories })
})

router.post('/', requireAuth, async (request, response) => {
  const error = validateStory(request.body)
  if (error) return response.status(400).json({ message: error })
  const status = request.body.status || 'draft'
  const story = await Blog.create({
    title: request.body.title.trim(),
    description: request.body.description.trim(),
    body: request.body.body,
    tags: cleanTags(request.body.tags),
    status,
    publishedAt: status === 'published' ? new Date() : null,
    author: request.userId,
    slug: `${slugify(request.body.title)}-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
  })
  await story.populate('author', 'name username')
  return response.status(201).json({ story })
})

router.get('/:identifier', optionalAuth, async (request, response) => {
  const query = mongoose.isValidObjectId(request.params.identifier)
    ? { _id: request.params.identifier }
    : { slug: request.params.identifier }
  const story = await Blog.findOne(query).populate('author', 'name username bio')
  if (!story) return response.status(404).json({ message: 'Story not found.' })
  if (story.status !== 'published' && story.author.id !== request.userId) {
    return response.status(404).json({ message: 'Story not found.' })
  }
  return response.json({ story })
})

router.patch('/:id', requireAuth, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid story identifier.' })
  }
  const error = validateStory(request.body)
  if (error) return response.status(400).json({ message: error })
  const story = await Blog.findOne({ _id: request.params.id, author: request.userId })
  if (!story) return response.status(404).json({ message: 'Story not found.' })
  const wasPublished = story.status === 'published'
  story.title = request.body.title.trim()
  story.description = request.body.description.trim()
  story.body = request.body.body
  story.tags = cleanTags(request.body.tags)
  story.status = request.body.status || 'draft'
  if (story.status === 'published' && !wasPublished) story.publishedAt = new Date()
  await story.save()
  await story.populate('author', 'name username')
  return response.json({ story })
})

router.delete('/:id', requireAuth, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid story identifier.' })
  }
  const story = await Blog.findOneAndDelete({ _id: request.params.id, author: request.userId })
  if (!story) return response.status(404).json({ message: 'Story not found.' })
  return response.json({ message: 'Story deleted.' })
})

export default router
