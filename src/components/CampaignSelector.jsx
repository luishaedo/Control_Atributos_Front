import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, ButtonGroup, Badge, Stack, Spinner } from 'react-bootstrap'
import { getCampaigns, getDictionaries } from '../services/api.js'
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
  const navigate = useNavigate()
  const [listado, setListado] = useState([])
  const [dic, setDic] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dictionaryWarning, setDictionaryWarning] = useState(null)
  const activa = listado.find((c) => c.activa)
  const [selectedId, setSelectedId] = useState(null)
  const seleccionada = listado.find((c) => c.id === selectedId) || null

  useEffect(() => {
    const abortController = new AbortController()

    async function loadCampaigns() {
      const startedAt = performance.now()
      const camps = await getCampaigns({ signal: abortController.signal })
      if (import.meta.env.DEV) {
        console.info(`[perf] /campanias loaded in ${Math.round(performance.now() - startedAt)}ms`)
      }
      return camps
    }

    async function loadDictionariesInBackground() {
      const startedAt = performance.now()
      try {
        const dictionaries = await getDictionaries({ signal: abortController.signal })
        if (abortController.signal.aborted) return
        setDic(dictionaries)
        setDictionaryWarning(null)
        if (import.meta.env.DEV) {
          console.info(`[perf] /diccionarios loaded in ${Math.round(performance.now() - startedAt)}ms`)
        }
      } catch (e) {
        if (abortController.signal.aborted) return
        setDictionaryWarning('No pudimos cargar los diccionarios. Las campañas siguen disponibles.')
        if (import.meta.env.DEV) {
          console.warn(`[perf] /diccionarios failed after ${Math.round(performance.now() - startedAt)}ms`, e)
        }
      }
    }

    async function cargar() {
      try {
        setLoading(true)
        setError(null)
        setDictionaryWarning(null)
        const camps = await loadCampaigns()
        if (abortController.signal.aborted) return
        setListado(camps || [])
        const saved = Number(localStorage.getItem(LS_KEY) || 0)
        const savedObj = (camps || []).find((c) => c.id === saved && c.activa) || null
        const elegida = savedObj || (camps || []).find((c) => c.activa) || null
        const defaultSelected = elegida?.id || (camps || [])[0]?.id || null
        setSelectedId(defaultSelected)

        loadDictionariesInBackground()
      } catch (e) {
        if (abortController.signal.aborted) return
        setError(buildActionableError({
          what: 'No pudimos cargar las campañas.',
          why: e?.message || 'Falló la carga inicial de campañas.',
          how: 'Reintentá en unos segundos o verificá la conexión con el backend.',
        }))
      } finally {
        if (!abortController.signal.aborted) setLoading(false)
      }
    }

    cargar()

    return () => {
      abortController.abort()
    }
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
        {dictionaryWarning && !error && <div className="alert alert-warning mb-2">{dictionaryWarning}</div>}
        {loading && (
          <div className="d-flex align-items-center gap-2 text-muted">
            <Spinner animation="border" size="sm" />
            <span>Cargando campañas...</span>
          </div>
        )}

        {!loading && listado.length === 0 && (
          <EmptyState
            title="No hay campañas disponibles"
            subtitle="Todavía no existe una campaña activa para operar."
            ctaLabel="Ir a Admin > Crear campaña"
            onCta={() => navigate('/admin')}
            secondaryAction={<small className="text-muted">Luego activala para habilitar escaneo.</small>}
          />
        )}

        {!loading && listado.length > 0 && (
          <>
            <div className="campaign-active-pill u-mb-8">
              <div className="campaign-active-pill__label">Campaña activa</div>
              <div className="campaign-active-pill__name">{activa?.nombre || '-'}</div>
              <div className="campaign-active-pill__range">
                Vigencia {formatCampaignRange(activa?.inicia, activa?.termina)}
              </div>
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
