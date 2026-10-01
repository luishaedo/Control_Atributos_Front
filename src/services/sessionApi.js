import { API_BASE } from './apiBase.js'
import { createHttpClient } from './httpClient.js'

const sessionHttp = createHttpClient({
  credentials: 'include',
  onHttpError: ({ status, message }) => new Error(message || `HTTP ${status}`),
})

function api(path) {
  return `${API_BASE}/api${path}`
}

export function getCurrentSession() {
  return sessionHttp.json(api('/session'))
}

export function loginSession({ username, password } = {}) {
  return sessionHttp.json(api('/session/login'), {
    method: 'POST',
    body: JSON.stringify({
      username: String(username || '').trim(),
      password: String(password || ''),
    }),
  })
}

export function logoutSession() {
  return sessionHttp.json(api('/session/logout'), { method: 'POST' })
}
