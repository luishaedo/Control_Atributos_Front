import React, { useEffect, useState } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'

export default function IdentityModal({ show, initialEmail = '', initialSucursal = '', onSave, onClose }) {
  const [email, setEmail] = useState(initialEmail)
  const [sucursal, setSucursal] = useState(initialSucursal)

  useEffect(() => {
    if (show) {
      setEmail(initialEmail)
      setSucursal(initialSucursal)
    }
  }, [show, initialEmail, initialSucursal])

  const isValid = Boolean(email.trim()) && Boolean(sucursal.trim())

  function handleSave() {
    if (!isValid) return
    onSave?.({ email: email.trim(), sucursal: sucursal.trim() })
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Identificación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo@empresa.com"
            autoFocus
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Sucursal</Form.Label>
          <Form.Control
            value={sucursal}
            onChange={e => setSucursal(e.target.value)}
            placeholder="Sucursal"
          />
        </Form.Group>
        {!isValid && (
          <div className="text-muted small mt-2">
            Completá ambos campos para continuar.
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!isValid}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
