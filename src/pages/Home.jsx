import React, { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import Topbar from '../components/Topbar.jsx'
import CampaignSelector from '../components/CampaignSelector.jsx'
import ScanBox from '../components/ScanBox.jsx'

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

  useEffect(() => {
    if (!user?.email || !user?.sucursal) {
      cambiarIdentificacion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cambiarIdentificacion() {
    const email = window.prompt('Ingresá tu email', user?.email || '')
    if (email === null) return
    const sucursal = window.prompt('Ingresá tu sucursal', user?.sucursal || '')
    if (sucursal === null) return
    const nuevo = { email: (email || '').trim(), sucursal: (sucursal || '').trim() }
    setUser(nuevo)
    setUserLS(nuevo)
  }

  return (
    <div>
      <Topbar user={user} onChangeUser={cambiarIdentificacion} />
      <Container className="pb-4">
        <CampaignSelector onSelect={setCampania} />
        <ScanBox user={user} campania={campania} />
      </Container>
    </div>
  )
}
