import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Table } from 'react-bootstrap'
import { listarSucursales, crearSucursal, actualizarSucursal, listarUsuarios, crearUsuario, actualizarUsuario, listarAuditoriaCuentas } from '../../../../services/adminApi.js'

const emptyBranch = { codigo: '', nombre: '' }
const emptyUser = { username: '', nombre: '', rol: 'OPERADOR', sucursalId: '', password: '' }
const auditLabels = { nombre: 'Nombre', codigo: 'Código', rol: 'Rol', activo: 'Estado de usuario', activa: 'Estado de sucursal', sucursalId: 'Sucursal', mustChangePassword: 'Cambio obligatorio de clave' }

function auditSummary(cambios = {}) {
  const descriptions = Object.entries(cambios).filter(([field]) => auditLabels[field]).map(([field, change]) =>
    change && typeof change === 'object' && 'nuevo' in change
      ? `${auditLabels[field]}: ${String(change.anterior ?? '—')} → ${String(change.nuevo ?? '—')}`
      : `${auditLabels[field]}: ${String(change ?? '—')}`)
  if (cambios.passwordReset) descriptions.push('Contraseña restablecida')
  if (cambios.passwordChanged) descriptions.push('Contraseña cambiada por el usuario')
  if (cambios.username) descriptions.push(`Usuario: ${cambios.username}`)
  return descriptions.join(' · ') || 'Sin cambios de datos'
}

export default function AccountsPanel() {
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [audit, setAudit] = useState([])
  const [branch, setBranch] = useState(emptyBranch)
  const [account, setAccount] = useState(emptyUser)
  const [resetId, setResetId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function refresh() {
    const [branchResult, userResult, auditResult] = await Promise.all([listarSucursales(), listarUsuarios(), listarAuditoriaCuentas()])
    setBranches(branchResult.items || [])
    setUsers(userResult.items || [])
    setAudit(auditResult.items || [])
  }

  useEffect(() => { refresh().catch((err) => setError(err.message || 'No se pudieron cargar las cuentas')) }, [])

  async function run(action, success) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(success)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el cambio')
      setBusy(false)
      return
    }
    try {
      await refresh()
    } catch {
      setMessage(`${success}. Si se cerró tu sesión, volvé a ingresar para ver los datos actualizados.`)
    } finally {
      setBusy(false)
    }
  }

  function submitBranch(event) {
    event.preventDefault()
    run(async () => {
      await crearSucursal({ codigo: branch.codigo.trim().toUpperCase(), nombre: branch.nombre.trim() })
      setBranch(emptyBranch)
    }, 'Sucursal creada')
  }

  function submitUser(event) {
    event.preventDefault()
    run(async () => {
      await crearUsuario({ ...account, username: account.username.trim(), nombre: account.nombre.trim(), sucursalId: account.sucursalId || null })
      setAccount(emptyUser)
    }, 'Usuario creado')
  }

  function editBranch(item) {
    const nombre = window.prompt('Nombre de la sucursal', item.nombre)
    if (nombre === null || !nombre.trim()) return
    run(() => actualizarSucursal(item.id, { nombre: nombre.trim() }), 'Sucursal actualizada')
  }

  function editUser(item) {
    const nombre = window.prompt('Nombre visible', item.nombre)
    if (nombre === null || !nombre.trim()) return
    run(() => actualizarUsuario(item.id, { nombre: nombre.trim() }), 'Usuario actualizado')
  }

  function toggleBranch(item) {
    if (item.activa && !window.confirm(`¿Desactivar la sucursal ${item.nombre}? Se cerrarán las sesiones de sus usuarios.`)) return
    run(() => actualizarSucursal(item.id, { activa: !item.activa }), 'Estado de sucursal actualizado')
  }

  function toggleUser(item) {
    if (item.activo && !window.confirm(`¿Desactivar al usuario ${item.username}? Se cerrarán sus sesiones.`)) return
    run(() => actualizarUsuario(item.id, { activo: !item.activo }), 'Estado de usuario actualizado')
  }

  function resetPassword(event) {
    event.preventDefault()
    if (newPassword.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (!window.confirm('Se cerrarán todas las sesiones de este usuario. ¿Restablecer la contraseña?')) return
    run(async () => {
      await actualizarUsuario(resetId, { password: newPassword })
      setNewPassword('')
      setResetId('')
    }, 'Contraseña restablecida; sesiones revocadas')
  }

  return <div className="d-grid gap-3">
    <div className="app-page-heading"><div><div className="app-eyebrow">Acceso</div><h2 className="h4">Cuentas y sucursales</h2><p>Administrá quién puede ingresar y desde qué sucursal opera.</p></div></div>
    {error && <Alert variant="danger" role="alert">{error}</Alert>}
    {message && <Alert variant="success" role="status">{message}</Alert>}
    <Card className="app-surface"><Card.Body>
      <h3 className="h5">Sucursales</h3>
      <Form onSubmit={submitBranch} className="row g-2 mb-3">
        <Form.Group controlId="branch-code" className="col-12 col-md-3"><Form.Label>Código</Form.Label><Form.Control required maxLength={32} value={branch.codigo} onChange={(e) => setBranch({ ...branch, codigo: e.target.value })} /></Form.Group>
        <Form.Group controlId="branch-name" className="col-12 col-md-6"><Form.Label>Nombre</Form.Label><Form.Control required value={branch.nombre} onChange={(e) => setBranch({ ...branch, nombre: e.target.value })} /></Form.Group>
        <div className="col-12 col-md-3 d-flex align-items-end"><Button type="submit" disabled={busy} className="w-100">Crear sucursal</Button></div>
      </Form>
      <div className="table-responsive"><Table striped hover><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{branches.map((item) => <tr key={item.id}><td>{item.codigo}</td><td>{item.nombre}</td><td>{item.activa ? 'Activa' : 'Inactiva'}</td><td className="d-flex flex-wrap gap-2"><Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => editBranch(item)}>Editar</Button><Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => toggleBranch(item)}>{item.activa ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></Table></div>
    </Card.Body></Card>
    <Card className="app-surface"><Card.Body>
      <h3 className="h5">Usuarios</h3>
      <Form onSubmit={submitUser} className="row g-2 mb-3">
        <Form.Group controlId="user-username" className="col-12 col-md-2"><Form.Label>Usuario</Form.Label><Form.Control required autoComplete="off" value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} /></Form.Group>
        <Form.Group controlId="user-name" className="col-12 col-md-2"><Form.Label>Nombre</Form.Label><Form.Control required value={account.nombre} onChange={(e) => setAccount({ ...account, nombre: e.target.value })} /></Form.Group>
        <Form.Group controlId="user-role" className="col-12 col-md-2"><Form.Label>Rol</Form.Label><Form.Select value={account.rol} onChange={(e) => setAccount({ ...account, rol: e.target.value })}><option value="OPERADOR">Operador</option><option value="REVISOR">Revisor</option><option value="ADMIN">Administrador</option></Form.Select></Form.Group>
        <Form.Group controlId="user-branch" className="col-12 col-md-2"><Form.Label>Sucursal</Form.Label><Form.Select required={account.rol === 'OPERADOR'} value={account.sucursalId} onChange={(e) => setAccount({ ...account, sucursalId: e.target.value })}><option value="">Seleccionar</option>{branches.filter((item) => item.activa).map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</Form.Select></Form.Group>
        <Form.Group controlId="user-password" className="col-12 col-md-2"><Form.Label>Contraseña inicial</Form.Label><Form.Control required minLength={8} type="password" autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} /></Form.Group>
        <div className="col-12 col-md-2 d-flex align-items-end"><Button type="submit" disabled={busy} className="w-100">Crear usuario</Button></div>
      </Form>
        <div className="table-responsive"><Table striped hover><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Sucursal</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td>{item.username}</td><td>{item.nombre}</td><td><Form.Select aria-label={`Rol de ${item.username}`} size="sm" value={item.rol} disabled={busy} onChange={(e) => run(() => actualizarUsuario(item.id, { rol: e.target.value }), 'Rol actualizado')}><option value="OPERADOR">Operador</option><option value="REVISOR">Revisor</option><option value="ADMIN">Administrador</option></Form.Select></td><td><Form.Select aria-label={`Sucursal de ${item.username}`} size="sm" value={item.sucursal?.id || ''} disabled={busy} onChange={(e) => run(() => actualizarUsuario(item.id, { sucursalId: e.target.value || null }), 'Sucursal asignada')}><option value="">Sin sucursal</option>{branches.filter((branchItem) => branchItem.activa || branchItem.id === item.sucursal?.id).map((branchItem) => <option value={branchItem.id} key={branchItem.id}>{branchItem.nombre}</option>)}</Form.Select></td><td>{item.activo ? 'Activo' : 'Inactivo'}</td><td className="d-flex flex-wrap gap-2"><Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => editUser(item)}>Editar</Button><Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => toggleUser(item)}>{item.activo ? 'Desactivar' : 'Activar'}</Button><Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => { setResetId(item.id); setNewPassword('') }}>Restablecer clave</Button></td></tr>)}</tbody></Table></div>
      {resetId && <Form onSubmit={resetPassword} className="border rounded p-3 mt-3"><h4 className="h6">Restablecer contraseña de {users.find((item) => item.id === resetId)?.username}</h4><Form.Group controlId="reset-password"><Form.Label>Nueva contraseña</Form.Label><Form.Control required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Form.Group><div className="d-flex gap-2 mt-2"><Button type="submit" disabled={busy}>Guardar y cerrar sesiones</Button><Button type="button" variant="outline-secondary" onClick={() => { setResetId(''); setNewPassword('') }}>Cancelar</Button></div></Form>}
    </Card.Body></Card>
    <Card className="app-surface"><Card.Body>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2"><h3 className="h5 mb-0">Actividad de cuentas</h3><Button type="button" size="sm" variant="outline-secondary" disabled={busy} onClick={() => refresh().catch((err) => setError(err.message || 'No se pudo actualizar la actividad'))}>Actualizar</Button></div>
      <p className="text-muted small mt-2">Últimos 50 cambios de usuarios y sucursales.</p>
      <div className="table-responsive"><Table striped hover><thead><tr><th>Fecha</th><th>Administrador</th><th>Cuenta o sucursal</th><th>Cambio</th></tr></thead><tbody>{audit.map((item) => {
        const subject = item.entidad === 'USUARIO' ? users.find((user) => user.id === item.entidadId)?.username : branches.find((branchItem) => branchItem.id === item.entidadId)?.codigo
        return <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('es-AR')}</td><td>{item.actor}</td><td>{subject || item.entidadId}</td><td>{auditSummary(item.cambios)}</td></tr>
      })}</tbody></Table></div>
      {audit.length === 0 && <p className="text-muted mb-0">Todavía no hay cambios registrados.</p>}
    </Card.Body></Card>
  </div>
}
