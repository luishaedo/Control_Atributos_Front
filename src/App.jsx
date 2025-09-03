import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import AuditoriaPage from './pages/AuditoriaPage.jsx'
import Catalogo from './pages/Catalogo.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/auditoria" element={<AuditoriaPage />} />
      <Route path="/catalogo" element={<Catalogo />} />

    </Routes>
  )
}
