// src/pages/AuditoriaSucursales.jsx
import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Form, Button, Table, Badge } from 'react-bootstrap'
import { getDictionaries } from '../services/api'
import { getDiscrepanciasSucursales, exportDiscrepanciasSucursalesCSV } from '../services/adminApi'
import { pad2 } from '../utils/sku'

function et(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr||[]).find(x => x.cod === c)
  return it ? `${c} · ${it.nombre}` : c
}

export default function AuditoriaSucursales({ campanias, campaniaIdDefault, authOK }) {
  const [dic, setDic] = useState(null)
  const [campaniaId, setCampaniaId] = useState(String(campaniaIdDefault || ''))
  const [skuQ, setSkuQ] = useState('')
  const [items, setItems] = useState([])

  useEffect(()=>{ getDictionaries().then(setDic).catch(()=>{}) },[])

  async function cargar() {
    const qs = { campaniaId, sku: skuQ, minSucursales: 2 }
    const data = await getDiscrepanciasSucursales(qs)
    setItems(data.items || [])
  }

  useEffect(()=>{
    if (!authOK || !campaniaId) return
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaniaId, authOK])

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
            <Col md={4}>
              <Form.Label>SKU (contiene)</Form.Label>
              <Form.Control value={skuQ} onChange={e=>setSkuQ(e.target.value)} placeholder="ABC..." />
            </Col>
            <Col md="auto" className="d-flex gap-2">
              <Button onClick={cargar} disabled={!authOK}>Buscar</Button>
              <Button variant="outline-secondary" onClick={()=>{
                exportDiscrepanciasSucursalesCSV(Number(campaniaId)).then(b=>{
                  const url = URL.createObjectURL(b); const a=document.createElement('a'); a.href=url; a.download='discrepancias_sucursales.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                })
              }} disabled={!authOK}>
                Exportar CSV
              </Button>
            </Col>
            <Col className="ms-auto text-muted small text-end">
              {items.length} SKUs con conflicto
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {items.map(it=>{
        const badge = it.conflicto ? <Badge bg="warning" text="dark">Conflicto</Badge> : <Badge bg="success">OK</Badge>
        return (
          <Card key={it.sku} className="mb-3 border-start border-4 border-warning">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div><strong>{it.sku}</strong></div>
              <div>{badge} · {it.firmasDistintas} firmas</div>
            </Card.Header>
            <Card.Body className="pt-2">
              <Table size="sm" bordered hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Sucursal</th>
                    <th>Cat</th>
                    <th>Tipo</th>
                    <th>Clasif</th>
                    <th className="text-center">Count</th>
                    <th>Último</th>
                    <th>Usuarios (muestra)</th>
                  </tr>
                </thead>
                <tbody>
                  {it.sucursales.map(s=>(
                    <tr key={`${it.sku}-${s.sucursal}`}>
                      <td>{s.sucursal}</td>
                      <td>{et(dic?.categorias, s.categoria_cod)}</td>
                      <td>{et(dic?.tipos, s.tipo_cod)}</td>
                      <td>{et(dic?.clasif, s.clasif_cod)}</td>
                      <td className="text-center">{s.count}</td>
                      <td className="small">{s.ultimoTs ? new Date(s.ultimoTs).toLocaleString() : '—'}</td>
                      <td className="small">
                        {(s.usuarios||[]).slice(0,3).map(u=><Badge bg="secondary" key={u} className="me-1">{u}</Badge>)}
                        {(s.usuarios||[]).length>3 && <Badge bg="secondary">+{s.usuarios.length-3}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="text-muted small mt-1">* Cada sucursal muestra su opción mayoritaria (si reportó varias, las otras quedan registradas como variantes)</div>
            </Card.Body>
          </Card>
        )
      })}
    </>
  )
}
