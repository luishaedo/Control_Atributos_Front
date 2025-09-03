import React, { useMemo, useState } from 'react'
import { MiniChips, EmptyState } from './ui'

function FirmaPill({ c, t, cl }) {
  return (
    <div className="d-inline-flex gap-1">
      <span className="badge text-bg-secondary">Cat: {c||'—'}</span>
      <span className="badge text-bg-secondary">Tipo: {t||'—'}</span>
      <span className="badge text-bg-secondary">Clasif: {cl||'—'}</span>
    </div>
  )
}

export default function DiscrepanciasSucursalesTabla({ data = [], loading }) {
  const [buscar, setBuscar] = useState('')
  const [soloConflicto, setSoloConflicto] = useState(true)

  const rows = useMemo(() => {
    let r = data
    if (buscar) r = r.filter(x => String(x.sku).toUpperCase().includes(buscar.trim().toUpperCase()))
    if (soloConflicto) r = r.filter(x => x.conflicto)
    return r
  }, [data, buscar, soloConflicto])

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap align-items-center gap-2">
        <strong>Entre Sucursales</strong>
        <div className="ms-auto d-flex gap-2">
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar SKU" className="form-control form-control-sm" style={{ maxWidth: 200 }}/>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="soloConf2" checked={soloConflicto} onChange={e=>setSoloConflicto(e.target.checked)} />
            <label className="form-check-label" htmlFor="soloConf2">Sólo con conflicto</label>
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table align-middle table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>SKU</th>
              <th>Conflicto</th>
              <th>Detalle por Sucursal (mayoritaria)</th>
              <th>Variantes (si las hay)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr key={it.sku}>
                <td className="fw-bold">{it.sku}</td>
                <td>{it.conflicto ? <span className="badge text-bg-danger">Sí</span> : <span className="badge text-bg-success">No</span>}</td>
                <td>
                  <div className="d-flex flex-column gap-2">
                    {it.sucursales.map(s => (
                      <div key={s.sucursal} className="d-flex flex-wrap align-items-center gap-2">
                        <span className="badge text-bg-primary">{s.sucursal || '—'}</span>
                        <FirmaPill c={s.categoria_cod} t={s.tipo_cod} cl={s.clasif_cod} />
                        <span className="badge text-bg-light border">votos: {s.count}</span>
                        <MiniChips items={s.usuarios} max={3} emptyLabel="sin usuarios" />
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  {it.sucursales.some(s => (s.variantes||[]).length) ? (
                    <div className="small text-muted">
                      {it.sucursales.map(s => (
                        (s.variantes||[]).length ? (
                          <div key={'var-'+s.sucursal} className="mb-1">
                            <span className="me-2">{s.sucursal}:</span>
                            {(s.variantes||[]).slice(0,2).map((v,idx)=>(
                              <span key={idx} className="me-2">
                                <FirmaPill c={v.categoria_cod} t={v.tipo_cod} cl={v.clasif_cod} />
                                <span className="ms-1">({v.count})</span>
                              </span>
                            ))}
                          </div>
                        ) : null
                      ))}
                    </div>
                  ) : <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={4}><EmptyState/></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
