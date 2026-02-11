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

function SucursalChips({ items }) {
  if (!items || items.length === 0) return <span className="text-muted">—</span>
  return <MiniChips items={items} max={5} emptyLabel="—" />
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
                  {it.mayoritaria ? (
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <FirmaPill
                        c={it.mayoritaria.categoria_cod}
                        t={it.mayoritaria.tipo_cod}
                        cl={it.mayoritaria.clasif_cod}
                      />
                      <span className="badge text-bg-light border">Sucursales:</span>
                      <SucursalChips items={it.mayoritaria.sucursales} />
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {it.variantes && it.variantes.length > 0 ? (
                    <div className="small text-muted">
                      {it.variantes.map((v, idx) => (
                        <div key={`var-${it.sku}-${idx}`} className="mb-1 d-flex flex-wrap align-items-center gap-2">
                          <FirmaPill c={v.categoria_cod} t={v.tipo_cod} cl={v.clasif_cod} />
                          <span className="badge text-bg-light border">Sucursales:</span>
                          <SucursalChips items={v.sucursales} />
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    title="Sin discrepancias entre sucursales"
                    subtitle="No encontramos conflictos con los filtros actuales."
                    ctaLabel="Ajustar filtros"
                    onCta={() => {
                      setBuscar('')
                      setSoloConflicto(false)
                    }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
