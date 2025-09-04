// src/components/ui.jsx
import React from 'react'

export function DiffPill({ maestro, propuesta }) {
  const difCat = (maestro?.categoria_cod || '') !== (propuesta?.categoria_cod || '')
  const difTip = (maestro?.tipo_cod || '') !== (propuesta?.tipo_cod || '')
  const difCla = (maestro?.clasif_cod || '') !== (propuesta?.clasif_cod || '')
  const sameAll = !difCat && !difTip && !difCla
  return (
    <div className="d-flex flex-wrap gap-2">
      <span className={`badge ${difCat ? 'text-bg-danger' : 'text-bg-secondary'}`}>Cat: {propuesta?.categoria_cod || '—'}</span>
      <span className={`badge ${difTip ? 'text-bg-danger' : 'text-bg-secondary'}`}>Tipo: {propuesta?.tipo_cod || '—'}</span>
      <span className={`badge ${difCla ? 'text-bg-danger' : 'text-bg-secondary'}`}>Clasif: {propuesta?.clasif_cod || '—'}</span>
      {sameAll && <span className="badge text-bg-success">Sin diferencias</span>}
    </div>
  )
}

export function MaestroPill({ maestro }) {
  if (!maestro) return <span className="badge text-bg-warning">No está en Maestro</span>
  return (
    <div className="d-flex flex-wrap gap-2">
      <span className="badge text-bg-secondary">Cat: {maestro.categoria_cod || '—'}</span>
      <span className="badge text-bg-secondary">Tipo: {maestro.tipo_cod || '—'}</span>
      <span className="badge text-bg-secondary">Clasif: {maestro.clasif_cod || '—'}</span>
    </div>
  )
}

export function ConsensusBar({ value, total }) {
  const pct = Math.round(((value || 0) / Math.max(1, total || 0)) * 100)
  return (
    <div className="w-100">
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" style={{ height: 10 }}>
        <div className={`progress-bar ${pct>=60? 'bg-success' : pct>=40? 'bg-warning' : 'bg-danger'}`} style={{ width: `${pct}%` }}/>
      </div>
      <small className="text-muted">{pct}% de {total} votos</small>
    </div>
  )
}

export function MiniChips({ items = [], max = 3, emptyLabel = '—' }) {
  if (!items?.length) return <span className="text-muted">{emptyLabel}</span>
  const extra = items.length - max
  return (
    <div className="d-flex flex-wrap gap-1">
      {items.slice(0, max).map((s, i) => <span key={i} className="badge text-bg-light border">{String(s)}</span>)}
      {extra > 0 && <span className="badge text-bg-secondary">+{extra}</span>}
    </div>
  )
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EmptyState({ title = 'Sin datos', subtitle = 'No hay información para mostrar' }) {
  return (
    <div className="text-center text-muted p-4">
      <div className="display-6">🗂️</div>
      <div className="fw-semibold">{title}</div>
      <div>{subtitle}</div>
    </div>
  )
}
