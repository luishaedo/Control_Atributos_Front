import React, { useState } from 'react'
import { Container } from 'react-bootstrap'
import Topbar from '../components/Topbar.jsx'
import CampaignSelector from '../components/CampaignSelector.jsx'
import ScanBox from '../components/ScanBox.jsx'
import IdentityModal from '../components/IdentityModal.jsx'
import { AppAlert } from '../components/ui.jsx'
import { clearStoredUser, getStoredUser, setStoredUser } from '../utils/userStorage.js'

export default function Home() {
  const [user, setUser] = useState(getStoredUser() || { email: '', sucursal: '' })
  const [campania, setCampania] = useState(null)
  const [showIdentityModal, setShowIdentityModal] = useState(!user?.email || !user?.sucursal)
  const isIdentityRequired = !user?.email || !user?.sucursal

  function guardarIdentificacion(nuevo) {
    setUser(nuevo)
    setStoredUser(nuevo)
    setShowIdentityModal(false)
  }

  function cambiarIdentificacion() {
    setShowIdentityModal(true)
  }

  function limpiarIdentificacion() {
    clearStoredUser()
    setUser({ email: '', sucursal: '' })
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
        <ScanBox user={user} campania={campania} />
      </Container>
      <IdentityModal
        show={showIdentityModal}
        initialEmail={user?.email || ''}
        initialSucursal={user?.sucursal || ''}
        onSave={guardarIdentificacion}
        onClose={() => setShowIdentityModal(false)}
        requireCompletion={isIdentityRequired}
      />
    </div>
  )
}
