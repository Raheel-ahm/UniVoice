import crypto from 'node:crypto'
import multer from 'multer'
import { config } from '../config.js'
import { db } from '../supabase.js'
import { HttpError } from '../lib/errors.js'

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxImageBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) cb(null, true)
    else cb(new HttpError(400, 'Photo must be a JPEG, PNG or WebP image'))
  },
})

// Paths are random so they reveal nothing about who uploaded the photo.
export async function storeImage(file) {
  const path = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`
  const { error } = await db.storage
    .from(config.imageBucket)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false })
  if (error) {
    console.error('Image upload failed:', error)
    throw new HttpError(500, 'Could not upload the photo')
  }
  return path
}

export async function removeImage(path) {
  if (path) await db.storage.from(config.imageBucket).remove([path])
}

export async function signedImageUrl(path) {
  if (!path) return null
  const { data, error } = await db.storage.from(config.imageBucket).createSignedUrl(path, 60 * 30)
  return error ? null : data.signedUrl
}
