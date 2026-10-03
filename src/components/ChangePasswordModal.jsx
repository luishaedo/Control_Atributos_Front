import { useEffect, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { changeOwnPassword } from '../services/sessionApi.js'

export default function ChangePasswordModal({ show, required = false, onHide, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (show) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setError('')
      setDone(false)
    }
  }, [show])

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (newPassword !== confirmation) return setError('La confirmación no coincide con la nueva contraseña')
    setBusy(true)
    setError('')
    try {
      await changeOwnPassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setDone(true)
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setBusy(false)
    }
  }

  function hide() {
    if (busy) return
    if (done) onChanged?.()
    else if (!required) onHide?.()
  }

  return <Modal show={show} onHide={hide} centered backdrop={done || required ? 'static' : true} keyboard={!required}>
    <Modal.Header closeButton={!busy && !required}><Modal.Title>{required ? 'Definí tu contraseña' : 'Cambiar contraseña'}</Modal.Title></Modal.Header>
    {done ? <Modal.Body>
      <Alert variant="success" role="status">Contraseña actualizada. Se cerraron todas tus sesiones.</Alert>
      <Button type="button" onClick={onChanged}>Volver a ingresar</Button>
    </Modal.Body> : <Form onSubmit={submit}>
      <Modal.Body>
        {required && <p>Para continuar, cambiá la contraseña inicial o restablecida por el administrador.</p>}
        <Form.Group controlId="current-password" className="mb-3"><Form.Label>Contraseña actual</Form.Label><Form.Control required type="password" autoComplete="current-password" value={currentPassword} disabled={busy} onChange={(event) => setCurrentPassword(event.target.value)} /></Form.Group>
        <Form.Group controlId="new-password" className="mb-3"><Form.Label>Nueva contraseña</Form.Label><Form.Control required minLength={8} type="password" autoComplete="new-password" value={newPassword} disabled={busy} onChange={(event) => setNewPassword(event.target.value)} /></Form.Group>
        <Form.Group controlId="confirm-password"><Form.Label>Confirmar nueva contraseña</Form.Label><Form.Control required minLength={8} type="password" autoComplete="new-password" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} /></Form.Group>
        {error && <Alert variant="danger" className="mt-3" role="alert">{error}</Alert>}
      </Modal.Body>
      <Modal.Footer>{!required && <Button type="button" variant="outline-secondary" onClick={hide} disabled={busy}>Cancelar</Button>}<Button type="submit" disabled={busy}>Guardar contraseña</Button></Modal.Footer>
    </Form>}
  </Modal>
}
