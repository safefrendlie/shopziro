import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key && /^https?:\/\//.test(url))

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export const BUCKET = 'media'

/** Turn any Supabase / network error into a short, human sentence. */
export function errText(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  const msg = (err.message || String(err)).trim()
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'No internet connection. Please check your network and try again.'
  if (/row-level security|permission denied/i.test(msg)) return 'You do not have permission to do that.'
  if (/duplicate key|already exists|23505/i.test(msg)) return 'That already exists. Please choose a different value.'
  if (/JWT expired/i.test(msg)) return 'Your session expired. Please log in again.'
  return msg || fallback
}
