import { useEffect, useState } from 'react'
import { adminLogin, adminPing } from '../../../../services/adminApi.js'

export function useAdminAuth() {
  const [token, setToken] = useState('')
  const [authOK, setAuthOK] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminPing().then(() => setAuthOK(true)).catch(() => setAuthOK(false))
  }, [])

  async function login(e) {
    e.preventDefault()
    try {
      setError(null)
      await adminLogin(token)
      await adminPing()
      setAuthOK(true)
    } catch {
      setAuthOK(false)
      setError('Token inválido o el servidor no respondió')
    }
  }

  return {
    token,
    setToken,
    authOK,
    error,
    setError,
    login,
  }
}
