const USER_STORAGE_KEY = 'cc_user'
const USER_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const USER_STORAGE_VERSION = 1

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null

  const parsed = safeParse(raw)
  if (!parsed || typeof parsed !== 'object') {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }

  // Backward compatibility: old shape { email, sucursal }
  const hasLegacyShape = isNonEmptyString(parsed.email) && isNonEmptyString(parsed.sucursal)
  if (hasLegacyShape && !parsed.user) {
    const migratedUser = {
      email: parsed.email.trim(),
      sucursal: parsed.sucursal.trim(),
    }
    setStoredUser(migratedUser)
    return migratedUser
  }

  const user = parsed.user
  const savedAt = Number(parsed.savedAt || 0)
  const isValidEnvelope =
    parsed.version === USER_STORAGE_VERSION &&
    savedAt > 0 &&
    Number.isFinite(savedAt) &&
    user &&
    isNonEmptyString(user.email) &&
    isNonEmptyString(user.sucursal)

  if (!isValidEnvelope) {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }

  if (Date.now() - savedAt > USER_STORAGE_TTL_MS) {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }

  return {
    email: user.email.trim(),
    sucursal: user.sucursal.trim(),
  }
}

export function setStoredUser(user) {
  const normalized = {
    email: String(user?.email || '').trim(),
    sucursal: String(user?.sucursal || '').trim(),
  }

  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({
      version: USER_STORAGE_VERSION,
      savedAt: Date.now(),
      user: normalized,
    })
  )
}

export function clearStoredUser() {
  localStorage.removeItem(USER_STORAGE_KEY)
}
