import React from 'react'
import { Card, Form, Button, Alert } from 'react-bootstrap'

export default function AdminAuthPanel({ token, authOK, error, onTokenChange, onSubmit }) {
  return (
    <Card className="u-mb-16">
      <Card.Body>
        <Form onSubmit={onSubmit} className="d-flex gap-2">
          <Form.Control
            type="password"
            placeholder="Token de administrador"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
          />
          <Button type="submit" variant={authOK ? 'success' : 'primary'}>
            {authOK ? 'Autenticado' : 'Ingresar'}
          </Button>
        </Form>
        <Form.Text className="text-muted">
          Se guarda en cookie segura (HttpOnly) y se envía automáticamente a /api/admin/*
        </Form.Text>
        {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
      </Card.Body>
    </Card>
  )
}
