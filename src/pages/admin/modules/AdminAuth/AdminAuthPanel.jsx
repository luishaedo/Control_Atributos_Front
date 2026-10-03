import React from 'react'
import { Card, Form, Button, Alert } from 'react-bootstrap'

export default function AdminAuthPanel({ credentials, authOK, error, user, onCredentialsChange, onSubmit, onLogout }) {
  function update(field, value) {
    onCredentialsChange?.({ ...credentials, [field]: value })
  }

  return (
    <Card className="u-mb-16 app-surface">
      <Card.Body>
        {authOK ? (
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div><div className="app-eyebrow">Sesión activa</div><strong>{user?.nombre || user?.username || 'Usuario'}</strong><span className="text-muted ms-2 small">{user?.rol}</span></div>
            <Button type="button" variant="outline-secondary" onClick={onLogout}>Cerrar sesión</Button>
          </div>
        ) : (
          <>
            <h2 className="h5 mb-3">Ingresá para administrar</h2>
            <Form onSubmit={onSubmit} className="row g-2 align-items-end">
              <Form.Group className="col-12 col-md-4" controlId="admin-username">
                <Form.Label>Usuario</Form.Label>
                <Form.Control type="text" placeholder="Usuario" value={credentials.username} onChange={(e) => update('username', e.target.value)} autoComplete="username" />
              </Form.Group>
              <Form.Group className="col-12 col-md-4" controlId="admin-password">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control type="password" placeholder="Contraseña" value={credentials.password} onChange={(e) => update('password', e.target.value)} autoComplete="current-password" />
              </Form.Group>
              <div className="col-12 col-md-4"><Button type="submit" variant="primary" className="w-100">Ingresar</Button></div>
            </Form>
            <Form.Text className="text-muted">La sesión se guarda en una cookie segura.</Form.Text>
          </>
        )}
        {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
      </Card.Body>
    </Card>
  )
}
