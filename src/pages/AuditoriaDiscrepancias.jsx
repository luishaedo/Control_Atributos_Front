// src/pages/AuditoriaDiscrepancias.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Form, Button, Table, Badge, Collapse } from 'react-bootstrap'
import { getDictionaries } from '../services/api'
import { getDiscrepancias, exportDiscrepanciasCSV } from '../services/adminApi'
import { pad2 } from '../utils/sku'

function et(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr||[]).find(x => x.cod === c)
  return it ? `${c} · ${it.nombre}` : c
}

export default function AuditoriaDiscrepancias({ campanias, campaniaIdDefault, authOK }) {
  const [dic, setDic] = useState(null)
  const [campaniaId, setCampaniaId] = useState(String(campaniaIdDefault || ''))
  const [skuQ, setSkuQ] = useState('')
  const [sucQ, setSucQ] = useState('')
  const [minVotos, setMinVotos] = useState(1)
  const [soloConflicto, setSoloConflicto] = useState(false)
  const [items, setItems] = useState([])
  const [open, setOpen] = useState({}) // sku -> bool

  useEffect(() => { getDictionaries().then(setDic).catch(()=>{}) }, [])

  async function cargar() {
    const qs = { campaniaId, sku: skuQ, minVotos }
    const data = await getDiscrepancias(qs)
    let arr = data.items || []
    if (soloConflicto) {
      arr = arr.filter(it => {
        const m = it.maestro
        const top = it.topPropuesta
        if (!m || !top) return true // sin maestro o sin top => considerar conflicto
        return (m.categoria_cod !== top.categoria_cod) ||
               (m.tipo_cod      !== top.tipo_cod) ||
               (m.clasif_cod    !== top.clasif_cod)
      })
    }
    if (sucQ.trim()) {
      const q = sucQ.trim().toLowerCase()
      arr = arr.filter(it => it.porSucursal.some(ps => ps.sucursal.toLowerCase().includes(q)))
    }
    setItems(arr)
  }

  useEffect(() => {
    if (!authOK || !campaniaId) return
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaniaId, authOK])

  const totalEsc = useMemo(()=>items.reduce((s,it)=>s+it.totalEscaneos,0), [items])

  return (
    <>
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={3}>
              <Form.Label>Campaña</Form.Label>
              <Form.Select value={campaniaId} onChange={e=>setCampaniaId(e.target.value)}>
                {campanias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>SKU (contiene)</Form.Label>
              <Form.Control value={skuQ} onChange={e=>setSkuQ(e.target.value)} placeholder="ABC..." />
            </Col>
            <Col md={3}>
              <Form.Label>Sucursal (contiene)</Form.Label>
              <Form.Control value={sucQ} onChange={e=>setSucQ(e.target.value)} placeholder="Centro, Norte..." />
            </Col>
            <Col md={2}>
              <Form.Label>Mín. votos top</Form.Label>
              <Form.Control type="number" min={1} value={minVotos} onChange={e=>setMinVotos(Number(e.target.value||1))} />
            </Col>
            <Col md={1}>
              <Form.Check type="switch" id="solo-conf"
                label="Conflicto"
                checked={soloConflicto}
                onChange={e=>setSoloConflicto(e.target.checked)} />
            </Col>

            <Col md="12" className="d-flex gap-2 mt-2">
              <Button onClick={cargar} disabled={!authOK}>Buscar</Button>
              <Button variant="outline-secondary" onClick={()=>exportDiscrepanciasCSV(Number(campaniaId)).then(b=>{
                const url = URL.createObjectURL(b); const a=document.createElement('a'); a.href=url; a.download='discrepancias.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
              })} disabled={!authOK}>
                Exportar CSV
              </Button>
              <div className="ms-auto text-muted small">
                {items.length} SKUs · {totalEsc} escaneos
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Table size="sm" bordered hover responsive>
        <thead className="table-light">
          <tr>
            <th style={{width:40}}></th>
            <th>SKU</th>
            <th>Maestro</th>
            <th>Mayoritaria</th>
            <th className="text-center">#Escaneos</th>
            <th className="text-center">#Sucursales</th>
            <th>Último</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it=>{
            const m = it.maestro
            const top = it.topPropuesta
            const conflicto = m && top && (
              m.categoria_cod !== top.categoria_cod ||
              m.tipo_cod      !== top.tipo_cod ||
              m.clasif_cod    !== top.clasif_cod
            )
            const rowClass = conflicto ? 'table-warning' : ''
            return (
              <React.Fragment key={it.sku}>
                <tr className={rowClass}>
                  <td className="text-center">
                    <Button size="sm" variant="outline-secondary"
                      onClick={()=>setOpen(o=>({...o, [it.sku]: !o[it.sku]}))}>
                      {open[it.sku] ? '−' : '+'}
                    </Button>
                  </td>
                  <td><strong>{it.sku}</strong></td>
                  <td className="small">
                    <div>Cat: {et(dic?.categorias, m?.categoria_cod)}</div>
                    <div>Tipo: {et(dic?.tipos, m?.tipo_cod)}</div>
                    <div>Clasif: {et(dic?.clasif, m?.clasif_cod)}</div>
                  </td>
                  <td className="small">
                    {top ? (
                      <>
                        <div><Badge bg={conflicto ? 'danger' : 'success'}>{Math.round((top.pct||0)*100)}%</Badge> · {top.count} votos</div>
                        <div>Cat: {et(dic?.categorias, top.categoria_cod)}</div>
                        <div>Tipo: {et(dic?.tipos, top.tipo_cod)}</div>
                        <div>Clasif: {et(dic?.clasif, top.clasif_cod)}</div>
                      </>
                    ) : '—'}
                  </td>
                  <td className="text-center">{it.totalEscaneos}</td>
                  <td className="text-center">{it.sucursales?.length || 0}</td>
                  <td className="small">{it.ultimoTs ? new Date(it.ultimoTs).toLocaleString() : '—'}</td>
                </tr>

                <tr>
                  <td colSpan={7} className="p-0">
                    <Collapse in={!!open[it.sku]}>
                      <div className="p-2 bg-light">
                        <div className="fw-bold mb-2">Detalle por sucursal (quién dijo qué)</div>
                        <Table size="sm" bordered hover className="mb-0">
                          <thead>
                            <tr>
                              <th>Sucursal</th>
                              <th>Cat</th>
                              <th>Tipo</th>
                              <th>Clasif</th>
                              <th className="text-center">Count</th>
                              <th>Último</th>
                              <th>Usuarios</th>
                            </tr>
                          </thead>
                          <tbody>
                            {it.porSucursal.map(ps=>(
                              <tr key={`${it.sku}-${ps.sucursal}`}>
                                <td>{ps.sucursal}</td>
                                <td>{et(dic?.categorias, ps.categoria_cod)}</td>
                                <td>{et(dic?.tipos, ps.tipo_cod)}</td>
                                <td>{et(dic?.clasif, ps.clasif_cod)}</td>
                                <td className="text-center">{ps.count}</td>
                                <td className="small">{ps.ultimoTs ? new Date(ps.ultimoTs).toLocaleString() : '—'}</td>
                                <td className="small">
                                  {(ps.usuarios||[]).slice(0,3).map(u=><Badge bg="secondary" key={u} className="me-1">{u}</Badge>)}
                                  {(ps.usuarios||[]).length>3 && <Badge bg="secondary">+{ps.usuarios.length-3}</Badge>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Collapse>
                  </td>
                </tr>
              </React.Fragment>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
