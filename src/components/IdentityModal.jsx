import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'

export default function IdentityModal({
  show,
  initialEmail = '',
  initialSucursal = '',
  onSave,
  onClose,
  requireCompletion = false,
}) {
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

  const canClose = useMemo(
    () => !requireCompletion || (Boolean(initialEmail.trim()) && Boolean(initialSucursal.trim())),
    [requireCompletion, initialEmail, initialSucursal],
  )

  function handleHide() {
    if (!canClose) return
    onClose?.()
  }

  return (
    <Modal
      show={show}
      onHide={handleHide}
      centered
      backdrop={canClose ? true : 'static'}
      keyboard={canClose}
    >
      <Modal.Header closeButton={canClose}>
        <Modal.Title>Identificación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Nombre</Form.Label>
          <Form.Control
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Ej: Juan Pérez"
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
        {canClose && (
          <Button variant="outline-secondary" onClick={handleHide}>
            Cancelar
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={!isValid}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
