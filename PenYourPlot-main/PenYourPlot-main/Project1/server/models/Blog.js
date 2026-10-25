import mongoose from 'mongoose'

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 240 },
  body: { type: String, required: true, minlength: 40, maxlength: 50000 },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 24 }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  publishedAt: { type: Date, default: null },
}, { timestamps: true })

blogSchema.index({ status: 1, publishedAt: -1 })
blogSchema.index({ title: 'text', description: 'text', body: 'text', tags: 'text' })

export default mongoose.model('Blog', blogSchema)
