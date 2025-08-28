import React from 'react'
import { Navbar, Container, Badge, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

export default function Topbar({ user, onChangeUser }) {
  return (
    <Navbar bg="dark" data-bs-theme="dark" className="mb-3">
      <Container>
        <Navbar.Brand as={Link} to="/">🧪 Control de Campaña</Navbar.Brand>
        <div className="d-flex align-items-center gap-3">
          <Link to="/admin" className="btn btn-outline-warning btn-sm">Admin</Link>
          <span className="text-light small">
            {user?.email || 'sin email'}
          </span>
          <Badge bg="info">{user?.sucursal || 'sin sucursal'}</Badge>
          <Button variant="outline-light" size="sm" onClick={onChangeUser}>
            Cambiar identificación
          </Button>
        </div>
      </Container>
    </Navbar>
  )
}
