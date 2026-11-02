import { supabase, BUCKET } from './supabase'

/* Accepts JPG, JPEG, PNG, WEBP and HEIC/HEIF (iPhone photos).
   HEIC is converted to JPEG in the browser, then every image is resized and
   re-encoded (WebP, or JPEG as a fallback) so shops load quickly. */

export const ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'
export const MAX_BYTES = 20 * 1024 * 1024

const OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const OK_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

const ext = (name = '') => (name.split('.').pop() || '').toLowerCase()

export function isHeic(file) {
  const t = (file.type || '').toLowerCase()
  const e = ext(file.name)
  return t === 'image/heic' || t === 'image/heif' || e === 'heic' || e === 'heif'
}

export function validateImage(file) {
  if (!file) return 'No file selected.'
  const okType = OK_TYPES.includes((file.type || '').toLowerCase()) || OK_EXT.includes(ext(file.name))
  if (!okType) return 'Unsupported format. Please use JPG, PNG, WEBP or HEIC.'
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_BYTES) return 'That image is larger than 20 MB. Please choose a smaller one.'
  return null
}

async function heicToJpeg(file) {
  const { default: heic2any } = await import('heic2any')
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(out) ? out[0] : out
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' })
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall back to <img> below */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be read. Try a different photo.'))
    }
    img.src = url
  })
}

const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q))

export async function optimizeImage(file, maxSide = 1600) {
  const bmp = await loadBitmap(file)
  const w = bmp.width
  const h = bmp.height
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  if (typeof bmp.close === 'function') bmp.close()
  let blob = await toBlob(canvas, 'image/webp', 0.86)
  if (!blob || blob.type !== 'image/webp') {
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    blob = await toBlob(canvas, 'image/jpeg', 0.88)
  }
  if (!blob) throw new Error('Could not process this image.')
  return blob
}

/** Validate, convert, optimise and upload. Returns the public URL. */
export async function uploadImage(file, userId) {
  const problem = validateImage(file)
  if (problem) throw new Error(problem)
  if (!supabase) throw new Error('The app is not connected to Supabase yet.')
  if (!userId) throw new Error('Please log in to upload images.')

  let working = file
  try {
    if (isHeic(file)) working = await heicToJpeg(file)
  } catch {
    throw new Error('This HEIC photo could not be converted. Try saving it as JPG first.')
  }

  let blob
  try {
    blob = await optimizeImage(working)
  } catch (e) {
    throw new Error(e.message || 'Could not process this image.')
  }

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) {
    const m = error.message || ''
    if (/Bucket not found/i.test(m)) throw new Error('Image storage is not set up yet. Run supabase/schema.sql first.')
    if (/row-level security|not allowed|Unauthorized/i.test(m)) throw new Error('Upload not allowed. Please log in again.')
    if (/Failed to fetch|NetworkError/i.test(m)) throw new Error('Network problem while uploading. Please try again.')
    throw new Error(m || 'Upload failed.')
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Best-effort delete of a file we uploaded (ignored if it fails). */
export async function removeImage(url) {
  if (!supabase || !url) return
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  try {
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    /* ignore */
  }
}
