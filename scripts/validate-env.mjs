import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readEnvFile(path) {
  if (!existsSync(path)) return {}
  const result = {}
  const content = readFileSync(path, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

const env = {
  ...readEnvFile(resolve(process.cwd(), '.env')),
  ...readEnvFile(resolve(process.cwd(), '.env.local')),
  ...process.env,
}

const rawApiUrl = String(env.VITE_API_URL || '').trim()

if (!rawApiUrl) {
  throw new Error('VITE_API_URL is required before building the frontend.')
}

let parsed
try {
  parsed = new URL(rawApiUrl)
} catch {
  throw new Error('VITE_API_URL must be an absolute HTTP(S) URL.')
}

if (!['http:', 'https:'].includes(parsed.protocol)) {
  throw new Error('VITE_API_URL must use http or https.')
}

if (parsed.username || parsed.password) {
  throw new Error('VITE_API_URL must not include credentials.')
}

const pathname = parsed.pathname.replace(/\/+$/, '')
if (pathname.endsWith('/api')) {
  throw new Error('VITE_API_URL must be the backend origin, without /api.')
}

console.log(`VITE_API_URL ok: ${parsed.origin}${pathname || ''}`)
