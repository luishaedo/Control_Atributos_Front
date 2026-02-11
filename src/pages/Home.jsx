import React, { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import Topbar from '../components/Topbar.jsx'
import CampaignSelector from '../components/CampaignSelector.jsx'
import ScanBox from '../components/ScanBox.jsx'
import IdentityModal from '../components/IdentityModal.jsx'
import { AppAlert } from '../components/ui.jsx'

function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem('cc_user') || 'null')
  } catch {
    return null
  }
}

function setUserLS(u) {
  localStorage.setItem('cc_user', JSON.stringify(u || {}))
}

export default function Home() {
  const [user, setUser] = useState(getUserLS() || { email: '', sucursal: '' })
  const [campania, setCampania] = useState(null)
  const [showIdentityModal, setShowIdentityModal] = useState(false)

  useEffect(() => {
    if (!user?.email || !user?.sucursal) {
      setShowIdentityModal(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function guardarIdentificacion(nuevo) {
    setUser(nuevo)
    setUserLS(nuevo)
    setShowIdentityModal(false)
  }

  function cambiarIdentificacion() {
    setShowIdentityModal(true)
  }

  return (
    <div>
      <Topbar user={user} onChangeUser={cambiarIdentificacion} />
      <Container className="pb-4">
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
      />
    </div>
  )
}
