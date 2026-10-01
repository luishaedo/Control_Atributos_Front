import React, { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import Topbar from '../components/Topbar.jsx'
import CampaignSelector from '../components/CampaignSelector.jsx'
import ScanBox from '../components/ScanBox.jsx'
import IdentityModal from '../components/IdentityModal.jsx'
import { AppAlert } from '../components/ui.jsx'
import { getCurrentSession, loginSession, logoutSession } from '../services/sessionApi.js'

export default function Home() {
  const [user, setUser] = useState(null)
  const [campania, setCampania] = useState(null)
  const [showIdentityModal, setShowIdentityModal] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const isIdentityRequired = !user

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        setUser(session?.user || null)
        setShowIdentityModal(!session?.user)
      })
      .catch(() => {
        setUser(null)
        setShowIdentityModal(true)
      })
  }, [])

  async function guardarIdentificacion(credentials) {
    try {
      setLoginBusy(true)
      setLoginError('')
      const session = await loginSession(credentials)
      setUser(session?.user || null)
      setShowIdentityModal(!session?.user)
    } catch (error) {
      setLoginError(error?.message || 'No se pudo iniciar sesión')
    } finally {
      setLoginBusy(false)
    }
  }

  function cambiarIdentificacion() {
    setShowIdentityModal(true)
  }

  async function limpiarIdentificacion() {
    try {
      await logoutSession()
    } catch {
      // La sesión local se limpia igual aunque el backend no responda.
    }
    setUser(null)
    setShowIdentityModal(true)
  }

  return (
    <div>
      <div className={isIdentityRequired ? 'admin-content-locked' : ''}>
        <Topbar user={user} onChangeUser={cambiarIdentificacion} onClearUser={limpiarIdentificacion} />
      </div>
      <Container className={`pb-4 ${isIdentityRequired ? 'admin-content-locked' : ''}`}>
        <CampaignSelector onSelect={setCampania} />
        {!campania?.activa && (
          <AppAlert
            variant="warning"
            title="Campaña no activa"
            message="No hay una campaña activa seleccionada."
            actionHint="Seleccioná y activá una campaña para comenzar a escanear."
          />
        )}
        <ScanBox campania={campania} />
      </Container>
      <IdentityModal
        show={showIdentityModal}
        initialUsername={user?.username || ''}
        error={loginError}
        busy={loginBusy}
        onSave={guardarIdentificacion}
        onClose={() => setShowIdentityModal(false)}
        requireCompletion={isIdentityRequired}
      />
    </div>
  )
}
