import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AccountsPanel from './AccountsPanel.jsx'
import * as api from '../../../../services/adminApi.js'

vi.mock('../../../../services/adminApi.js', () => ({
  listarSucursales: vi.fn(), crearSucursal: vi.fn(), actualizarSucursal: vi.fn(),
  listarUsuarios: vi.fn(), crearUsuario: vi.fn(), actualizarUsuario: vi.fn(), listarAuditoriaCuentas: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  api.listarSucursales.mockResolvedValue({ items: [{ id: 's1', codigo: 'CENTRO', nombre: 'Centro', activa: true }] })
  api.listarUsuarios.mockResolvedValue({ items: [{ id: 'u1', username: 'ana', nombre: 'Ana', rol: 'OPERADOR', activo: true, sucursal: { id: 's1' } }] })
  api.listarAuditoriaCuentas.mockResolvedValue({ items: [{ id: 'a1', entidad: 'USUARIO', entidadId: 'u1', actor: 'admin', createdAt: '2026-10-03T12:00:00.000Z', cambios: { passwordReset: true } }] })
  api.actualizarUsuario.mockResolvedValue({ ok: true })
  api.actualizarSucursal.mockResolvedValue({ ok: true })
  api.crearUsuario.mockResolvedValue({ ok: true })
})

afterEach(() => cleanup())

it('muestra la actividad sin exponer la contraseña', async () => {
  render(<AccountsPanel />)
  expect(await screen.findByText('Contraseña restablecida')).toBeInTheDocument()
  expect(screen.getByText('admin')).toBeInTheDocument()
})

it('edita el nombre de una sucursal desde el formulario y envía el valor recortado', async () => {
  const prompt = vi.spyOn(window, 'prompt')
  render(<AccountsPanel />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0])
  fireEvent.change(screen.getByLabelText('Nuevo nombre de sucursal'), { target: { value: ' Centro Norte ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar sucursal' }))
  await waitFor(() => expect(api.actualizarSucursal).toHaveBeenCalledWith('s1', { nombre: 'Centro Norte' }))
  await waitFor(() => expect(screen.queryByLabelText('Nuevo nombre de sucursal')).not.toBeInTheDocument())
  expect(prompt).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})

it('permite cancelar la edición de usuario y rechaza un nombre vacío', async () => {
  render(<AccountsPanel />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[1])
  expect(screen.getByLabelText('Nuevo nombre del usuario')).toHaveValue('Ana')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(api.actualizarUsuario).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1])
  fireEvent.change(screen.getByLabelText('Nuevo nombre del usuario'), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  expect(await screen.findByText('Ingresá un nombre de usuario')).toBeInTheDocument()
  expect(api.actualizarUsuario).not.toHaveBeenCalled()
})

it('conserva el formulario de edición si el servidor rechaza el nombre', async () => {
  api.actualizarUsuario.mockRejectedValueOnce(new Error('Nombre no permitido'))
  render(<AccountsPanel />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[1])
  fireEvent.change(screen.getByLabelText('Nuevo nombre del usuario'), { target: { value: 'Nombre propuesto' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  expect(await screen.findByText('Nombre no permitido')).toBeInTheDocument()
  expect(screen.getByLabelText('Nuevo nombre del usuario')).toHaveValue('Nombre propuesto')
})

it('informa que el cambio se guardó si la sesión se revoca antes de recargar', async () => {
  api.listarAuditoriaCuentas.mockResolvedValueOnce({ items: [] }).mockRejectedValueOnce(new Error('No autorizado'))
  render(<AccountsPanel />)
  fireEvent.change(await screen.findByLabelText('Rol de ana'), { target: { value: 'REVISOR' } })
  expect(await screen.findByText(/Rol actualizado\. Si se cerró tu sesión/)).toBeInTheDocument()
  expect(api.actualizarUsuario).toHaveBeenCalledWith('u1', { rol: 'REVISOR' })
})

it('restablece la contraseña de la cuenta elegida tras confirmar y limpia el campo', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<AccountsPanel />)
  fireEvent.click(await screen.findByRole('button', { name: 'Restablecer clave' }))
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevaClave123' } })
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'nuevaClave123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y cerrar sesiones' }))
  await waitFor(() => expect(api.actualizarUsuario).toHaveBeenCalledWith('u1', { password: 'nuevaClave123' }))
  await waitFor(() => expect(screen.queryByText('Restablecer contraseña de ana')).not.toBeInTheDocument())
  expect(screen.queryByDisplayValue('nuevaClave123')).not.toBeInTheDocument()
  vi.restoreAllMocks()
})

it('no crea un usuario si la contraseña inicial y su confirmación difieren', async () => {
  render(<AccountsPanel />)
  fireEvent.change(await screen.findByLabelText('Usuario', { exact: true }), { target: { value: 'nuevo' } })
  fireEvent.change(screen.getAllByLabelText('Nombre', { exact: true })[1], { target: { value: 'Nuevo' } })
  fireEvent.change(screen.getByLabelText('Sucursal', { exact: true }), { target: { value: 's1' } })
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'claveInicial123' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña inicial'), { target: { value: 'otraClave123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
  expect(await screen.findByText('La confirmación no coincide con la contraseña inicial')).toBeInTheDocument()
  expect(api.crearUsuario).not.toHaveBeenCalled()
})

it('crea el usuario sin enviar la confirmación de contraseña al servidor', async () => {
  render(<AccountsPanel />)
  fireEvent.change(await screen.findByLabelText('Usuario', { exact: true }), { target: { value: 'nuevo' } })
  fireEvent.change(screen.getAllByLabelText('Nombre', { exact: true })[1], { target: { value: 'Nuevo' } })
  fireEvent.change(screen.getByLabelText('Sucursal', { exact: true }), { target: { value: 's1' } })
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: 'claveInicial123' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña inicial'), { target: { value: 'claveInicial123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
  await waitFor(() => expect(api.crearUsuario).toHaveBeenCalledWith({
    username: 'nuevo', nombre: 'Nuevo', rol: 'OPERADOR', sucursalId: 's1', password: 'claveInicial123',
  }))
  expect(screen.getByLabelText('Confirmar contraseña inicial')).toHaveValue('')
})

it('no restablece una contraseña si la confirmación difiere', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<AccountsPanel />)
  fireEvent.click(await screen.findByRole('button', { name: 'Restablecer clave' }))
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevaClave123' } })
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'otraClave123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y cerrar sesiones' }))
  expect(await screen.findByText('La confirmación no coincide con la nueva contraseña')).toBeInTheDocument()
  expect(confirm).not.toHaveBeenCalled()
  expect(api.actualizarUsuario).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})

it('pide confirmación antes de desactivar una cuenta o sucursal y explica la revocación', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<AccountsPanel />)
  const deactivateButtons = await screen.findAllByRole('button', { name: 'Desactivar' })
  fireEvent.click(deactivateButtons[0])
  fireEvent.click(deactivateButtons[1])
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('sesiones de sus usuarios'))
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('cerrarán sus sesiones'))
  expect(api.actualizarSucursal).not.toHaveBeenCalled()
  expect(api.actualizarUsuario).not.toHaveBeenCalled()

  confirm.mockReturnValue(true)
  fireEvent.click(deactivateButtons[0])
  await waitFor(() => expect(api.actualizarSucursal).toHaveBeenCalledWith('s1', { activa: false }))
  vi.restoreAllMocks()
})
