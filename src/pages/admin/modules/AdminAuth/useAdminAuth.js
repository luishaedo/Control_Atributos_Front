import { useEffect, useState } from 'react'
import { adminLogin, adminLogout, adminPing } from '../../../../services/adminApi.js'

export function useAdminAuth() {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [user, setUser] = useState(null)
  const [authOK, setAuthOK] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminPing()
      .then((session) => {
        setUser(session?.user || null)
        setAuthOK(true)
      })
      .catch(() => {
        setUser(null)
        setAuthOK(false)
      })
  }, [])

  async function login(e) {
    e.preventDefault()
    try {
      setError(null)
      await adminLogin(credentials)
      const session = await adminPing()
      setUser(session?.user || null)
      setAuthOK(true)
    } catch {
      setUser(null)
      setAuthOK(false)
      setError('Usuario, contraseña o permisos inválidos')
    }
  }

  async function logout() {
    try {
      await adminLogout()
    } finally {
      setUser(null)
      setAuthOK(false)
      setCredentials((current) => ({ ...current, password: '' }))
    }
  }

  return {
    credentials,
    setCredentials,
    user,
    authOK,
    error,
    setError,
    login,
    logout,
  }
}
