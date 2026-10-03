import React, { useEffect, useState } from 'react'
import { Navbar, Container, Badge, Button } from 'react-bootstrap'
import { Link, NavLink } from 'react-router-dom'
import { AppIcon } from './ui.jsx'
import ChangePasswordModal from './ChangePasswordModal.jsx'

export default function Topbar({ user, onChangeUser, onClearUser }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const mustChangePassword = Boolean(user?.mustChangePassword)
  useEffect(() => { if (mustChangePassword) setShowPasswordModal(true) }, [mustChangePassword])
  const displayName = user?.nombre || user?.username || ''
  const branch = user?.sucursal?.codigo || user?.sucursal?.nombre || ''
  return (
    <Navbar className="app-topbar mb-4">
      <Container className="app-topbar__inner">
        <Navbar.Brand as={Link} to="/" className="app-brand">
          <span className="app-brand__mark"><AppIcon name="flask" size={19} /></span>
          <span>Control de Atributos</span>
        </Navbar.Brand>
        <nav className="app-topbar__links" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => `app-topbar__link ${isActive ? 'app-topbar__link--active' : ''}`}>Escaneo</NavLink>
          <NavLink to="/catalogo" className={({ isActive }) => `app-topbar__link ${isActive ? 'app-topbar__link--active' : ''}`}>Catálogo</NavLink>
          <NavLink to="/admin" className={({ isActive }) => `app-topbar__link ${isActive ? 'app-topbar__link--active' : ''}`}>Administración</NavLink>
        </nav>
        {user && <div className="app-topbar__account">
          <span className="app-topbar__user" title={displayName}>{displayName}</span>
          {branch && <Badge bg="light" text="dark">{branch}</Badge>}
          {onChangeUser && onChangeUser !== onClearUser && <Button variant="outline-secondary" size="sm" onClick={onChangeUser}>Cambiar</Button>}
          <Button variant="outline-secondary" size="sm" onClick={() => setShowPasswordModal(true)}>Cambiar clave</Button>
          <Button variant="outline-secondary" size="sm" onClick={onClearUser}>Salir</Button>
        </div>}
      </Container>
      <ChangePasswordModal show={showPasswordModal} required={mustChangePassword} onHide={() => setShowPasswordModal(false)} onChanged={() => window.location.reload()} />
    </Navbar>
  )
}
