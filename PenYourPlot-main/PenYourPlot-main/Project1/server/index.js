import 'dotenv/config'
import app from './app.js'
import connectDatabase from './config/database.js'

const port = Number(process.env.PORT || 5000)

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and configure the database.')
  process.exit(1)
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters.')
  process.exit(1)
}

try {
  await connectDatabase()
  app.listen(port, () => console.log(`Devlog API listening on http://localhost:${port}`))
} catch (error) {
  console.error('Unable to start the API:', error.message)
  process.exit(1)
}
