import React, { useEffect, useState } from 'react'
import { Card, Button, ButtonGroup, Badge, Stack } from 'react-bootstrap'
import { getCampaigns, getDictionaries } from '../services/api'
import { getNombre } from '../utils/texto.js'
import { EmptyState } from './ui.jsx'
import { buildActionableError } from '../utils/uiFeedback.js'

const LS_KEY = 'cc_last_active_campaign_id'


function formatCampaignDate(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

function formatCampaignRange(start, end) {
  return `${formatCampaignDate(start)} → ${formatCampaignDate(end)}`
}

export default function CampaignSelector({ onSelect }) {
  const [listado, setListado] = useState([])
  const [dic, setDic] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const activa = listado.find((c) => c.activa)
  const [selectedId, setSelectedId] = useState(null)
  const seleccionada = listado.find((c) => c.id === selectedId) || null

  useEffect(() => {
    async function cargar() {
      try {
        setLoading(true)
        setError(null)
        const [camps, d] = await Promise.all([getCampaigns(), getDictionaries()])
        setListado(camps || [])
        setDic(d)
        const saved = Number(localStorage.getItem(LS_KEY) || 0)
        const savedObj = (camps || []).find((c) => c.id === saved && c.activa) || null
        const elegida = savedObj || (camps || []).find((c) => c.activa) || null
        const defaultSelected = elegida?.id || (camps || [])[0]?.id || null
        setSelectedId(defaultSelected)
      } catch (e) {
        setError(buildActionableError({
          what: 'No pudimos cargar las campañas.',
          why: e?.message || 'Falló la carga inicial de campañas o diccionarios.',
          how: 'Recargá la página o verificá la conexión con el backend.',
        }))
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  useEffect(() => {
    if (!listado.length || !selectedId) {
      onSelect?.(null)
      localStorage.removeItem(LS_KEY)
      return
    }
    const selected = listado.find((c) => c.id === selectedId) || null
    onSelect?.(selected)
    if (selected?.activa) localStorage.setItem(LS_KEY, String(selected.id))
  }, [listado, selectedId, onSelect])

  function chipObjetivo(c) {
    if (!dic) return null
    const chips = []
    if (c.categoria_objetivo_cod) {
      const nombre = getNombre(dic.categorias, c.categoria_objetivo_cod)
      chips.push(<Badge key="cat" bg="primary">Cat {c.categoria_objetivo_cod} - {nombre}</Badge>)
    }
    if (c.tipo_objetivo_cod) {
      const nombre = getNombre(dic.tipos, c.tipo_objetivo_cod)
      chips.push(<Badge key="tipo" bg="secondary">Tipo {c.tipo_objetivo_cod} - {nombre}</Badge>)
    }
    if (c.clasif_objetivo_cod) {
      const nombre = getNombre(dic.clasif, c.clasif_objetivo_cod)
      chips.push(<Badge key="clasif" bg="info">Clasif {c.clasif_objetivo_cod} - {nombre}</Badge>)
    }
    if (chips.length === 0) chips.push(<Badge key="none" bg="dark">Sin filtros</Badge>)
    return <Stack direction="horizontal" gap={2}>{chips}</Stack>
  }

  return (
    <Card className="u-mb-16">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>Campañas</strong>
        <ButtonGroup>
          {listado.map((c) => (
            <Button
              key={c.id}
              variant={c.id === selectedId ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setSelectedId(c.id)}
              disabled={loading}
            >
              {c.nombre}{' '}
              {c.activa ? <Badge bg="light" text="dark">Activa</Badge> : <Badge bg="secondary">Inactiva</Badge>}
            </Button>
          ))}
        </ButtonGroup>
      </Card.Header>
      <Card.Body>
        {error && <div className="alert alert-danger mb-2">{error}</div>}
        {loading && <em>Cargando campañas...</em>}

        {!loading && listado.length === 0 && (
          <EmptyState
            title="No hay campañas disponibles"
            subtitle="Todavía no existe una campaña activa para operar."
            ctaLabel="Ir a Admin > Crear campaña"
            onCta={() => { window.location.href = '/admin' }}
            secondaryAction={<small className="text-muted">Luego activala para habilitar escaneo.</small>}
          />
        )}

        {!loading && listado.length > 0 && (
          <>
            <div className="u-mb-8">
              <small>
                Activa: {activa?.nombre || '-'} · Vigencia {formatCampaignRange(activa?.inicia, activa?.termina)}
              </small>
            </div>
            {activa ? chipObjetivo(activa) : null}
            {seleccionada && seleccionada.id !== activa?.id && (
              <div className="u-mt-8">
                <small className="text-muted">
                  Seleccionada: {seleccionada.nombre} · Vigencia {formatCampaignRange(seleccionada.inicia, seleccionada.termina)}
                </small>
              </div>
            )}
            {seleccionada && !seleccionada.activa && (
              <div className="alert alert-warning u-mt-8 mb-0">
                La campaña seleccionada está inactiva. Activala desde el panel Admin.
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  )
}
