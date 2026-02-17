import { useNavigate } from 'react-router-dom'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from 'react-bootstrap'
import DiscrepanciasTabla from '../components/DiscrepanciasTabla'
import DiscrepanciasSucursalesTabla from '../components/DiscrepanciasSucursalesTabla'
import { AppButton } from '../components/ui.jsx'
import { getCampaigns } from '../services/api'
import { getDiscrepancias, getDiscrepanciasSucursales, exportDiscrepanciasCSV, getAuditoriaResumen } from '../services/adminApi'
import { buildActionableError } from '../utils/uiFeedback.js'

export default function AuditoriaPage() {
  const [campaniaId, setCampaniaId] = useState('')
  const [campanias, setCampanias] = useState([])
  const [sku, setSku] = useState('')
  const [minVotos, setMinVotos] = useState(1)
  const [minSucursales, setMinSucursales] = useState(2)
  const [tab, setTab] = useState('maestro')
  const [loading, setLoading] = useState(false)
  const [dataM, setDataM] = useState([])
  const [dataS, setDataS] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [refreshBtnState, setRefreshBtnState] = useState('default')

  const resetRefreshState = useCallback((ms = 1800) => {
    window.setTimeout(() => setRefreshBtnState('default'), ms)
  }, [])

  const navigate = useNavigate()

  const fetchCampaigns = useCallback(async () => {
    try {
      const list = await getCampaigns()
      setCampanias(list || [])
      const activeCampaign = (list || []).find((campaign) => campaign.activa)
      if (activeCampaign) setCampaniaId((prev) => prev || String(activeCampaign.id))
    } catch (error) {
      console.warn('No se pudo listar campañas', error)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const fetchData = useCallback(async () => {
    if (!campaniaId) {
      setError(buildActionableError({
        what: 'No pudimos actualizar la auditoría.',
        why: 'No hay campaña seleccionada.',
        how: 'Ingresá un ID de campaña o elegí una activa y reintentá.',
      }))
      return
    }
    setRefreshBtnState('loading')
    setLoading(true); setError('')
    try {
      const [m, s, resumen] = await Promise.all([
        getDiscrepancias(Number(campaniaId), { sku, minVotos }),
        getDiscrepanciasSucursales(Number(campaniaId), { sku, minSucursales }),
        getAuditoriaResumen(Number(campaniaId)),
      ])
      setDataM(m.items || [])
      setDataS(s.items || [])
      setSummary(resumen || null)
      if (!(m.items?.length || s.items?.length)) {
        setError(buildActionableError({
          what: 'No encontramos resultados para esta auditoría.',
          why: 'La campaña no tiene discrepancias con los filtros actuales.',
          how: 'Escaneá SKUs o ajustá filtros para ampliar resultados.',
        }))
      }
      setRefreshBtnState('success')
      resetRefreshState()
    } catch (e) {
      const msg = String(e?.message || e)
      if (msg.includes('401')) {
        setError(buildActionableError({
          what: 'No pudimos cargar la auditoría.',
          why: 'La sesión admin no está autorizada (401).',
          how: 'Iniciá sesión en /admin con ADMIN_TOKEN y volvé a intentar.',
        }))
      } else if (msg.includes('400')) {
        setError(buildActionableError({
          what: 'No pudimos cargar la auditoría.',
          why: 'Hay parámetros inválidos en la consulta (400).',
          how: 'Revisá campaniaId y filtros mínimos, luego reintentá.',
        }))
      } else {
        setError(buildActionableError({
          what: 'No pudimos cargar la auditoría.',
          why: msg,
          how: 'Verificá red/backend y reintentá en unos segundos.',
        }))
      }
      setRefreshBtnState('error')
      resetRefreshState(2200)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [campaniaId, minSucursales, minVotos, resetRefreshState, sku])

  // si detectamos activa, precargar
  useEffect(() => {
    if (campaniaId) fetchData()
  }, [campaniaId, fetchData])

  const kpis = useMemo(() => {
    const discrepancias = (dataM || []).filter(it => {
      const m = it.maestro; const p = it.topPropuesta
      return p && (!m || m.categoria_cod !== p.categoria_cod || m.tipo_cod !== p.tipo_cod || m.clasif_cod !== p.clasif_cod)
    }).length
    const conflictoSuc = (dataS || []).filter(x => x.conflicto).length
    return {
      skuEscaneados: summary?.kpis?.skuEscaneados ?? 0,
      skuVerificados: summary?.kpis?.skuVerificados ?? 0,
      skuConSugerencias: summary?.kpis?.skuConSugerencias ?? 0,
      atributosAceptados: summary?.kpis?.atributosAceptados ?? 0,
      discrepancias,
      totalM: dataM?.length || 0,
      conflictoSuc,
      totalS: dataS?.length || 0,
    }
  }, [dataM, dataS, summary])

  const topScans = summary?.top?.escaneos || []
  const topSuggestions = summary?.top?.sugerencias || []
  const topAccepted = summary?.top?.aceptadas || []
  const topRates = summary?.top?.tasaAceptacion || []

  function renderBarList(title, items, valueKey = 'count', valueLabel) {
    const max = Math.max(1, ...items.map(i => i[valueKey] || 0))
    return (
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <div className="fw-semibold mb-2">{title}</div>
          {!items.length && <div className="text-muted small">Sin datos.</div>}
          {items.map((item) => {
            const value = item[valueKey] || 0
            const pct = Math.round((value / max) * 100)
            return (
              <div className="mb-2" key={item.user}>
                <div className="d-flex justify-content-between small">
                  <span>{item.user}</span>
                  <span>{valueLabel ? valueLabel(item) : value}</span>
                </div>
                <div className="progress" style={{ height: 6 }}>
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4 u-section-stack">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 u-header-main">
        <div>
          <button className="btn btn-light border mb-2" onClick={() => navigate('/admin')}>
            ← Volver al Admin
          </button>
          <h4 className="mb-1">Auditoría</h4>
          <p className="text-muted mb-0">
            Monitoreá discrepancias versus Maestro y conflictos entre sucursales para una campaña específica.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setDetailsOpen(true)}>
            Ver detalles
          </button>
          <AppButton
            type="button"
            className="btn btn-primary"
            state={loading ? 'loading' : refreshBtnState}
            onClick={fetchData}
            label="Actualizar"
            loadingLabel="Actualizando…"
            successLabel="Actualizado"
            errorLabel="Con error"
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label mb-1">Campaña</label>
              <div className="d-flex gap-2 flex-wrap">
                <input className="form-control" placeholder="ID de campaña"
                  value={campaniaId} onChange={e=>setCampaniaId(e.target.value)} />
                <select className="form-select" value={campaniaId} onChange={e=>setCampaniaId(e.target.value)}>
                  <option value="">Elegir activa o por ID…</option>
                  {campanias.map(c => <option key={c.id} value={c.id}>{c.id} — {c.nombre}{c.activa ? ' (activa)' : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label mb-1">SKU (opcional)</label>
              <input className="form-control" placeholder="Buscar SKU"
                value={sku} onChange={e=>setSku(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1">Min. votos (Maestro)</label>
              <input type="number" min={1} className="form-control"
                value={minVotos} onChange={e=>setMinVotos(Number(e.target.value||1))} />
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1">Min. sucursales</label>
              <input type="number" min={2} className="form-control"
                value={minSucursales} onChange={e=>setMinSucursales(Number(e.target.value||2))} />
            </div>
          </div>
          <div className="alert alert-info py-2 mt-3 mb-0">
            Usá estos filtros para detectar dónde hay discrepancias y definir prioridades de revisión.
          </div>
        </div>
      </div>

      {error && <div className="alert alert-warning py-2">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">SKUs escaneados</div>
            <div className="fs-4">{kpis.skuEscaneados}</div>
          </div></div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">SKUs verificados</div>
            <div className="fs-4">{kpis.skuVerificados}</div>
          </div></div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">SKUs con sugerencias</div>
            <div className="fs-4">{kpis.skuConSugerencias}</div>
          </div></div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">Atributos aceptados</div>
            <div className="fs-4">{kpis.atributosAceptados}</div>
          </div></div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">Discrepancias vs Maestro</div>
            <div className="fs-4">{kpis.discrepancias} <span className="text-muted fs-6">/ {kpis.totalM}</span></div>
          </div></div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">Conflictos entre sucursales</div>
            <div className="fs-4">{kpis.conflictoSuc} <span className="text-muted fs-6">/ {kpis.totalS}</span></div>
          </div></div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          {renderBarList('Usuarios con más escaneos', topScans)}
        </div>
        <div className="col-lg-6">
          {renderBarList('Usuarios con más sugerencias', topSuggestions)}
        </div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          {renderBarList('Sugerencias aceptadas (por usuario)', topAccepted)}
        </div>
        <div className="col-lg-6">
          {renderBarList(
            'Índice de aceptación',
            topRates,
            'rate',
            (item) => `${Math.round((item.rate || 0) * 100)}% (${item.count}/${item.base})`
          )}
        </div>
      </div>

      <Modal show={detailsOpen} onHide={() => setDetailsOpen(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalles de auditoría</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button className={`nav-link ${tab === 'maestro' ? 'active' : ''}`} onClick={() => setTab('maestro')}>Vs Maestro</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${tab === 'sucursales' ? 'active' : ''}`} onClick={() => setTab('sucursales')}>Entre Sucursales</button>
            </li>
          </ul>

          {tab === 'maestro'
            ? (
              <DiscrepanciasTabla
                data={dataM}
                loading={loading}
                onExportCSV={async () => {
                  const blob = await exportDiscrepanciasCSV(Number(campaniaId))
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `discrepancias_campania_${campaniaId}.csv`
                  document.body.appendChild(link)
                  link.click()
                  link.remove()
                  URL.revokeObjectURL(url)
                }}
                exportLabel="Exportar discrepancias vs maestro (CSV)"
              />
            )
            : (
              <>
                <div className="alert alert-info py-2">
                  La exportación CSV sólo está disponible en la pestaña “Vs Maestro”.
                </div>
                <DiscrepanciasSucursalesTabla data={dataS} loading={loading} />
              </>
            )
          }
        </Modal.Body>
      </Modal>
    </div>
  )
}
