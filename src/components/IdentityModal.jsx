import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'

export default function IdentityModal({
  show,
  initialUsername = '',
  error = '',
  busy = false,
  onSave,
  onClose,
  requireCompletion = false,
}) {
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (show) {
      setUsername(initialUsername)
      setPassword('')
    }
  }, [show, initialUsername])

  const isValid = Boolean(username.trim()) && Boolean(password)

  function handleSave() {
    if (!isValid || busy) return
    onSave?.({ username: username.trim(), password })
  }

  const canClose = useMemo(
    () => !requireCompletion,
    [requireCompletion],
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
        <Modal.Title>Iniciar sesión</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Usuario</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Usuario"
            autoFocus
            autoComplete="username"
            disabled={busy}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Contraseña</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            disabled={busy}
          />
        </Form.Group>
        {error && <div className="text-danger small mt-2">{error}</div>}
        {!isValid && (
          <div className="text-muted small mt-2">
            Completá usuario y contraseña para continuar.
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
          {busy ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
