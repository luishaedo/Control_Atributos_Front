import React, { useMemo, useState } from 'react'
import { ConsensusBar, DiffPill, MaestroPill, MiniChips, fmtDate, EmptyState } from './ui'

export default function DiscrepanciasTabla({ data = [], loading, onExportCSV }) {
  const [buscar, setBuscar] = useState('')
  const [soloConflicto, setSoloConflicto] = useState(false)
  const canExport = Boolean(onExportCSV)
  const handleExport = () => {
    if (!canExport) return
    onExportCSV()
  }

  const rows = useMemo(() => {
    let r = data || []
    if (buscar) r = r.filter(x => String(x.sku).toUpperCase().includes(buscar.trim().toUpperCase()))
    if (soloConflicto) r = r.filter(x => {
      const m = x.maestro
      const p = x.topPropuesta
      if (!p) return false
      return !m || m.categoria_cod!==p.categoria_cod || m.tipo_cod!==p.tipo_cod || m.clasif_cod!==p.clasif_cod
    })
    return r
  }, [data, buscar, soloConflicto])

  if (!loading && (!rows || rows.length === 0)) {
    return <EmptyState title="Sin discrepancias" subtitle="No hay diferencias con el maestro para los filtros dados." />
  }

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap align-items-center gap-2">
        <strong>Discrepancias vs. Maestro</strong>
        <div className="ms-auto d-flex gap-2">
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar SKU" className="form-control form-control-sm" style={{ maxWidth: 200 }}/>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="soloConf" checked={soloConflicto} onChange={e=>setSoloConflicto(e.target.checked)} />
            <label className="form-check-label" htmlFor="soloConf">Sólo con diferencias</label>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={handleExport} disabled={!canExport}>
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table align-middle table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>SKU</th>
              <th>Maestro</th>
              <th>Propuesta Top</th>
              <th>Consenso</th>
              <th>Votos</th>
              <th>Sucursales</th>
              <th>Último</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const top = it.topPropuesta
              return (
                <tr key={it.sku}>
                  <td className="fw-bold">{it.sku}</td>
                  <td><MaestroPill maestro={it.maestro} /></td>
                  <td><DiffPill maestro={it.maestro} propuesta={top} /></td>
                  <td style={{ minWidth: 160 }}>
                    <ConsensusBar value={it.consensoVotos || 0} total={it.totalVotos || 0} />
                  </td>
                  <td>{it.totalVotos || 0}</td>
                  <td><MiniChips items={it.sucursales || []} emptyLabel="—" /></td>
                  <td>{fmtDate(it.updatedAt || it.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
