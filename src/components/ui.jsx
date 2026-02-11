// src/components/ui.jsx
import React from 'react'

const ICON_PATHS = {
  flask: 'M9.5 1.5v1.59l-4.74 8.29A2.5 2.5 0 0 0 6.93 15h2.57a2.5 2.5 0 0 0 2.17-3.62L7.5 3.09V1.5h2zM6.93 14a1.5 1.5 0 0 1-1.3-2.17l4.87-8.52 4.86 8.52A1.5 1.5 0 0 1 14.07 14H6.93z',
  inbox: 'M4.98 3a2 2 0 0 0-1.98 1.8L2 12l1.01 1.2A2 2 0 0 0 4.98 15h6.04a2 2 0 0 0 1.97-1.8L14 5a2 2 0 0 0-1.98-2H4.98zm0 1h7.04a1 1 0 0 1 .99 1.1L12 12.1a1 1 0 0 1-.99.9H4.98a1 1 0 0 1-.99-.9L3 5.1A1 1 0 0 1 3.98 4z',
  checkCircle: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm2.97-8.53a.75.75 0 0 1 .08 1.06l-3.5 4a.75.75 0 0 1-1.12.02l-1.5-1.6a.75.75 0 0 1 1.1-1.02l.94 1 2.95-3.37a.75.75 0 0 1 1.05-.09z',
  exclamationTriangle: 'M7.938 2.016a.13.13 0 0 1 .125 0l6.857 3.955c.11.064.11.22 0 .284L8.063 10.21a.13.13 0 0 1-.126 0L1.08 6.255a.164.164 0 0 1 0-.284l6.857-3.955zM8 11.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V12.25A.75.75 0 0 1 8 11.5zm0-5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 6.5z',
  infoCircle: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM7.25 7h1.5v4h-1.5V7z',
  arrowClockwise: 'M8 3a5 5 0 1 0 4.546 2.916.5.5 0 1 1 .908-.418A6 6 0 1 1 8 2v1l2-1.5L8 0v1z',
  save: 'M2 2.5A1.5 1.5 0 0 1 3.5 1h7.379a1.5 1.5 0 0 1 1.06.44l1.621 1.621A1.5 1.5 0 0 1 14 4.121V12.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-10zM3.5 2a.5.5 0 0 0-.5.5V4h8V2.707a.5.5 0 0 0-.146-.353L10.146 2H3.5zM11 5H3v7.5a.5.5 0 0 0 .5.5H4V9.5A1.5 1.5 0 0 1 5.5 8h3A1.5 1.5 0 0 1 10 9.5V13h2.5a.5.5 0 0 0 .5-.5V5h-2z',
}

export function AppIcon({ name, size = 16, className = '', title }) {
  const path = ICON_PATHS[name]
  if (!path) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`app-icon ${className}`.trim()}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      <path d={path} />
    </svg>
  )
}

export function AppAlert({
  variant = 'info',
  title,
  message,
  actionHint,
  className = '',
  children,
  dismissible = false,
  onClose,
}) {
  const iconMap = {
    info: 'infoCircle',
    success: 'checkCircle',
    warning: 'exclamationTriangle',
    danger: 'exclamationTriangle',
  }

  return (
    <div className={`alert alert-${variant} ${className}`.trim()} role="alert">
      <div className="d-flex gap-2">
        <AppIcon name={iconMap[variant] || 'infoCircle'} size={16} className="mt-1" />
        <div className="flex-grow-1">
          {title && <div className="fw-semibold">{title}</div>}
          {message && <div>{message}</div>}
          {children}
          {actionHint && <div className="small mt-1">Sugerencia: {actionHint}</div>}
        </div>
        {dismissible && (
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
        )}
      </div>
    </div>
  )
}

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
        <div className={`progress-bar ${pct >= 60 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${pct}%` }} />
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
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EmptyState({
  title = 'Sin datos',
  subtitle = 'No hay información para mostrar',
  ctaLabel,
  onCta,
  secondaryAction,
}) {
  return (
    <div className="text-center text-muted p-4 app-empty-state">
      <div className="u-mb-8">
        <AppIcon name="inbox" size={28} />
      </div>
      <div className="fw-semibold app-section-title">{title}</div>
      <div className="u-mb-16">{subtitle}</div>
      {(ctaLabel || secondaryAction) && (
        <div className="d-flex justify-content-center gap-2 flex-wrap">
          {ctaLabel && onCta && (
            <button type="button" className="btn btn-sm btn-primary" onClick={onCta}>
              {ctaLabel}
            </button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export function AppButton({
  state = 'default',
  label,
  loadingLabel = 'Procesando…',
  successLabel = 'Completado',
  errorLabel = 'Error',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const effectiveState = disabled ? 'disabled' : state
  const isDisabled = effectiveState === 'disabled' || effectiveState === 'loading'
  const isBusy = effectiveState === 'loading'
  const content =
    effectiveState === 'loading' ? loadingLabel
      : effectiveState === 'success' ? successLabel
        : effectiveState === 'error' ? errorLabel
          : (label || children)

  const icon = effectiveState === 'loading'
    ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
    : effectiveState === 'success'
      ? <AppIcon name="checkCircle" size={14} />
      : effectiveState === 'error'
        ? <AppIcon name="exclamationTriangle" size={14} />
        : null

  return (
    <button
      {...props}
      className={className}
      disabled={isDisabled}
      aria-busy={isBusy}
      data-state={effectiveState}
    >
      <span className="d-inline-flex align-items-center gap-2">
        {icon}
        <span>{content}</span>
      </span>
    </button>
  )
}
