import React, { useEffect, useMemo, useState } from 'react'
import DiscrepanciasTabla from '../components/DiscrepanciasTabla'
import DiscrepanciasSucursalesTabla from '../components/DiscrepanciasSucursalesTabla'
import { apiGetDiscrepancias, apiGetDiscrepanciasSucursales } from '../api/auditoria'

export default function AuditoriaPage({ adminToken = '' }) {
  const [campaniaId, setCampaniaId] = useState('')
  const [sku, setSku] = useState('')
  const [minVotos, setMinVotos] = useState(1)
  const [minSucursales, setMinSucursales] = useState(2)
  const [tab, setTab] = useState('maestro') // maestro | sucursales

  const [loading, setLoading] = useState(false)
  const [dataM, setDataM] = useState([])
  const [dataS, setDataS] = useState([])

  const disabled = !campaniaId || loading

  async function fetchData() {
    if (!campaniaId) return
    setLoading(true)
    try {
      const [m, s] = await Promise.all([
        apiGetDiscrepancias({ campaniaId, sku, minVotos, token: adminToken }),
        apiGetDiscrepanciasSucursales({ campaniaId, sku, minSucursales, token: adminToken }),
      ])
      setDataM(m.items || [])
      setDataS(s.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { /* opcional: carga auto al elegir campaña */ }, [])

  const kpis = useMemo(() => ({
    discrepancias: (dataM||[]).filter(it => {
      const m = it.maestro; const p = it.topPropuesta
      return p && (!m || m.categoria_cod!==p.categoria_cod || m.tipo_cod!==p.tipo_cod || m.clasif_cod!==p.clasif_cod)
    }).length,
    totalM: dataM?.length || 0,
    conflictoSuc: (dataS||[]).filter(x => x.conflicto).length,
    totalS: dataS?.length || 0,
  }), [dataM, dataS])

  function handleExportCSV() {
    if (!campaniaId) return
    const url = `/api/admin/export/discrepancias.csv?campaniaId=${campaniaId}`
    window.open(url, '_blank')
  }

  return (
    <div className="container py-3">
      <div className="d-flex align-items-end gap-2 flex-wrap mb-3">
        <div>
          <label className="form-label mb-1">Campaña</label>
          <input className="form-control" placeholder="ID de campaña" value={campaniaId} onChange={e=>setCampaniaId(e.target.value)} style={{ width: 200 }}/>
        </div>
        <div>
          <label className="form-label mb-1">SKU (opcional)</label>
          <input className="form-control" placeholder="Buscar SKU" value={sku} onChange={e=>setSku(e.target.value)} style={{ width: 220 }}/>
        </div>
        <div>
          <label className="form-label mb-1">Min. votos (Maestro)</label>
          <input type="number" min={1} className="form-control" value={minVotos} onChange={e=>setMinVotos(Number(e.target.value||1))} style={{ width: 140 }}/>
        </div>
        <div>
          <label className="form-label mb-1">Min. sucursales</label>
          <input type="number" min={2} className="form-control" value={minSucursales} onChange={e=>setMinSucursales(Number(e.target.value||2))} style={{ width: 160 }}/>
        </div>
        <button className="btn btn-primary ms-auto" disabled={disabled} onClick={fetchData}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Discrepancias (vs Maestro)</div>
              <div className="fs-4">{kpis.discrepancias} <span className="text-muted fs-6">/ {kpis.totalM}</span></div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted small">SKUs con conflicto entre sucursales</div>
              <div className="fs-4">{kpis.conflictoSuc} <span className="text-muted fs-6">/ {kpis.totalS}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab==='maestro'? 'active': ''}`} onClick={()=>setTab('maestro')}>Vs Maestro</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab==='sucursales'? 'active': ''}`} onClick={()=>setTab('sucursales')}>Entre Sucursales</button>
        </li>
      </ul>

      {tab==='maestro' ? (
        <DiscrepanciasTabla data={dataM} loading={loading} onExportCSV={handleExportCSV} />
      ) : (
        <DiscrepanciasSucursalesTabla data={dataS} loading={loading} />
      )}
    </div>
  )
}
