import { useNavigate } from 'react-router-dom'
import React, { useEffect, useMemo, useState } from 'react'
import DiscrepanciasTabla from '../components/DiscrepanciasTabla'
import DiscrepanciasSucursalesTabla from '../components/DiscrepanciasSucursalesTabla'
import {
  apiGetDiscrepancias,
  apiGetDiscrepanciasSucursales,
  apiListCampanias,
  apiExportDiscrepanciasCSV
} from '../api/auditoria'

export default function AuditoriaPage({ adminToken = '' }) {
  const [campaniaId, setCampaniaId] = useState('')
  const [campanias, setCampanias] = useState([])
  const [sku, setSku] = useState('')
  const [minVotos, setMinVotos] = useState(1)
  const [minSucursales, setMinSucursales] = useState(2)
  const [tab, setTab] = useState('maestro')
  const [loading, setLoading] = useState(false)
  const [dataM, setDataM] = useState([])
  const [dataS, setDataS] = useState([])
  const [error, setError] = useState('')

  const navigate = useNavigate()

  // token: prop -> localStorage
  const token = adminToken || localStorage.getItem('cc_admin_token') || ''

  // detectar campaña activa al montar
  useEffect(() => {
    (async () => {
      try {
        const list = await apiListCampanias()
        setCampanias(list || [])
        const activa = (list || []).find(c => c.activa)
        if (activa && !campaniaId) setCampaniaId(String(activa.id))
      } catch (e) {
        console.warn('No se pudo listar campañas', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData() {
    if (!campaniaId) { setError('Ingresá un ID de campaña o activá una campaña.'); return }
    setLoading(true); setError('')
    try {
      const [m, s] = await Promise.all([
        apiGetDiscrepancias({ campaniaId, sku, minVotos, token }),
        apiGetDiscrepanciasSucursales({ campaniaId, sku, minSucursales, token }),
      ])
      setDataM(m.items || [])
      setDataS(s.items || [])
      if (!(m.items?.length || s.items?.length)) {
        setError('No hay datos para esta campaña. Escaneá algunos SKUs o revisá los filtros.')
      }
    } catch (e) {
      const msg = String(e?.message || e)
      if (msg.includes('401')) setError('No autorizado: cargá el ADMIN_TOKEN en /admin.')
      else if (msg.includes('400')) setError('Parámetros inválidos (revisá campaniaId).')
      else setError('No se pudo cargar auditoría. Ver consola y red.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // si detectamos activa, precargar
  useEffect(() => {
    if (campaniaId) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaniaId])

  const kpis = useMemo(() => ({
    discrepancias: (dataM||[]).filter(it => {
      const m = it.maestro; const p = it.topPropuesta
      return p && (!m || m.categoria_cod!==p.categoria_cod || m.tipo_cod!==p.tipo_cod || m.clasif_cod!==p.clasif_cod)
    }).length,
    totalM: dataM?.length || 0,
    conflictoSuc: (dataS||[]).filter(x => x.conflicto).length,
    totalS: dataS?.length || 0,
  }), [dataM, dataS])

  return (
    <div className="container py-3">
      <div className="d-flex align-items-end gap-2 flex-wrap mb-3">
        <div className="d-flex align-items-center gap-2 mb-3">
  <button className="btn btn-light border" onClick={() => navigate('/admin')}>
    ← Volver al Admin
  </button>
  <h5 className="mb-0">Auditoría</h5>
</div>
        <div>
          <label className="form-label mb-1">Campaña</label>
          <div className="d-flex gap-2">
            <input className="form-control" placeholder="ID de campaña"
              value={campaniaId} onChange={e=>setCampaniaId(e.target.value)} style={{ width: 200 }}/>
            <select className="form-select" value={campaniaId} onChange={e=>setCampaniaId(e.target.value)} style={{ width: 260 }}>
              <option value="">Elegir activa o por ID…</option>
              {campanias.map(c => <option key={c.id} value={c.id}>{c.id} — {c.nombre}{c.activa ? ' (activa)' : ''}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="form-label mb-1">SKU (opcional)</label>
          <input className="form-control" placeholder="Buscar SKU"
            value={sku} onChange={e=>setSku(e.target.value)} style={{ width: 220 }}/>
        </div>
        <div>
          <label className="form-label mb-1">Min. votos (Maestro)</label>
          <input type="number" min={1} className="form-control"
            value={minVotos} onChange={e=>setMinVotos(Number(e.target.value||1))} style={{ width: 140 }}/>
        </div>
        <div>
          <label className="form-label mb-1">Min. sucursales</label>
          <input type="number" min={2} className="form-control"
            value={minSucursales} onChange={e=>setMinSucursales(Number(e.target.value||2))} style={{ width: 160 }}/>
        </div>
        <button className="btn btn-primary ms-auto" disabled={loading} onClick={fetchData}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && <div className="alert alert-warning py-2">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">Discrepancias (vs Maestro)</div>
            <div className="fs-4">{kpis.discrepancias} <span className="text-muted fs-6">/ {kpis.totalM}</span></div>
          </div></div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm"><div className="card-body">
            <div className="text-muted small">SKUs con conflicto entre sucursales</div>
            <div className="fs-4">{kpis.conflictoSuc} <span className="text-muted fs-6">/ {kpis.totalS}</span></div>
          </div></div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab==='maestro'? 'active': ''}`} onClick={()=>setTab('maestro')}>Vs Maestro</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab==='sucursales'? 'active': ''}`} onClick={()=>setTab('sucursales')}>Entre Sucursales</button>
        </li>
      </ul>

      {tab==='maestro'
        ? (
          <DiscrepanciasTabla
            data={dataM}
            loading={loading}
            onExportCSV={() => apiExportDiscrepanciasCSV(campaniaId)}
            exportLabel="Exportar discrepancias vs maestro (CSV)"
          />
        )
        : <DiscrepanciasSucursalesTabla data={dataS} loading={loading} />
      }
    </div>
  )
}
