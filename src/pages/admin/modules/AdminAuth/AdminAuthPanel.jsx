import React from 'react'
import { Card, Form, Button, Alert } from 'react-bootstrap'

export default function AdminAuthPanel({ credentials, authOK, error, user, onCredentialsChange, onSubmit, onLogout }) {
  function update(field, value) {
    onCredentialsChange?.({ ...credentials, [field]: value })
  }

  return (
    <Card className="u-mb-16">
      <Card.Body>
        <Form onSubmit={onSubmit} className="d-flex flex-column flex-md-row gap-2">
          <Form.Control
            type="text"
            placeholder="Usuario"
            value={credentials.username}
            onChange={(e) => update('username', e.target.value)}
            autoComplete="username"
            disabled={authOK}
          />
          <Form.Control
            type="password"
            placeholder="Contraseña"
            value={credentials.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="current-password"
            disabled={authOK}
          />
          <Button type="submit" variant={authOK ? 'success' : 'primary'}>
            {authOK ? 'Autenticado' : 'Ingresar'}
          </Button>
          {authOK && (
            <Button type="button" variant="outline-secondary" onClick={onLogout}>
              Salir
            </Button>
          )}
        </Form>
        <Form.Text className="text-muted">
          {authOK && user ? `${user.nombre || user.username} · ${user.rol}` : 'La sesión se guarda en cookie segura (HttpOnly).'}
        </Form.Text>
        {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
      </Card.Body>
    </Card>
  )
}
