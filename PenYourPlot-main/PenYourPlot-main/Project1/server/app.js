import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth.js'
import blogRoutes from './routes/blogs.js'
import userRoutes from './routes/users.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/auth', authRoutes)
app.use('/api/blogs', blogRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.use((_request, response) => response.status(404).json({ message: 'Route not found.' }))

app.use((error, _request, response, _next) => {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must contain valid JSON.' })
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Request body is too large.' })
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value'
    return response.status(409).json({ message: `That ${field} is already in use.` })
  }
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((item) => item.message).join(' ')
    return response.status(400).json({ message })
  }
  if (error.name === 'CastError') {
    return response.status(400).json({ message: 'Invalid resource identifier.' })
  }
  console.error(error)
  return response.status(error.status || 500).json({
    message: error.status ? error.message : 'An unexpected server error occurred.',
  })
})

export default app
