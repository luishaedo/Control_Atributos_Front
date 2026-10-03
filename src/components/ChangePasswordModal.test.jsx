import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import Topbar from './Topbar.jsx'
import { changeOwnPassword } from '../services/sessionApi.js'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/sessionApi.js', () => ({ changeOwnPassword: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('cambia la clave propia, limpia los campos y exige volver a ingresar', async () => {
  changeOwnPassword.mockResolvedValue({ ok: true, sessionsRevoked: true })
  const onChanged = vi.fn()
  render(<ChangePasswordModal show onHide={vi.fn()} onChanged={onChanged} />)
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'anterior123' } })
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevaClave456' } })
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'nuevaClave456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
  await waitFor(() => expect(changeOwnPassword).toHaveBeenCalledWith({ currentPassword: 'anterior123', newPassword: 'nuevaClave456' }))
  expect(await screen.findByText('Contraseña actualizada. Se cerraron todas tus sesiones.')).toBeInTheDocument()
  expect(screen.queryByDisplayValue('nuevaClave456')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Volver a ingresar' }))
  expect(onChanged).toHaveBeenCalledOnce()
})

it('rechaza confirmaciones distintas antes de llamar a la API', async () => {
  render(<ChangePasswordModal show onHide={vi.fn()} onChanged={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'anterior123' } })
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevaClave456' } })
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'otraClave456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
  expect(await screen.findByText('La confirmación no coincide con la nueva contraseña')).toBeInTheDocument()
  expect(changeOwnPassword).not.toHaveBeenCalled()
})

it('abre el cambio obligatorio al ingresar y no ofrece cancelarlo', async () => {
  render(<MemoryRouter><Topbar user={{ username: 'ana', mustChangePassword: true }} onClearUser={vi.fn()} /></MemoryRouter>)
  expect(await screen.findByText('Definí tu contraseña')).toBeInTheDocument()
  expect(screen.getByText('Para continuar, cambiá la contraseña inicial o restablecida por el administrador.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
})
