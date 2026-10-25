import app from './app.js'
import connectDatabase from './config/database.js'

export default async function handleApiRequest(request, response) {
  try {
    await connectDatabase()
    return app(request, response)
  } catch (error) {
    console.error('Unable to connect to the database:', error.message)
    return response.status(503).json({ message: 'The database is unavailable. Please try again later.' })
  }
}
