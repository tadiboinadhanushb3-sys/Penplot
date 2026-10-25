import mongoose from 'mongoose'

let connectionPromise

export default async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.')

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .then(() => console.log('Connected to MongoDB'))
      .finally(() => {
        connectionPromise = undefined
      })
  }

  await connectionPromise
}
