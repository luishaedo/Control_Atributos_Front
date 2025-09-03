import React, { useEffect, useState } from 'react'
import { Card, Form, Button, Table, Row, Col, Pagination, Badge } from 'react-bootstrap'
import { getDictionaries } from '../services/api'
import { getMaestroList } from '../services/api'
import { pad2 } from '../utils/sku'

export default function Catalogo() {
  const [dic, setDic] = useState(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const pages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    getDictionaries().then(setDic).catch(()=>{})
  }, [])

  useEffect(() => {
    getMaestroList({ q, page, pageSize })
      .then(r => { setRows(r.items || []); setTotal(r.total || 0) })
      .catch(()=>{})
  }, [q, page, pageSize])

  return (
    <div className="container py-3">
      <Row className="g-3">
        <Col md={4}>
          <Card>
            <Card.Header>Diccionarios</Card.Header>
            <Card.Body className="small">
              <div className="mb-3">
                <div className="fw-semibold mb-1">Categorías</div>
                <Table size="sm" bordered hover>
                  <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                  <tbody>
                    {(dic?.categorias||[]).map((d)=>(
                      <tr key={d.cod}><td>{pad2(d.cod)}</td><td>{d.nombre}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="mb-3">
                <div className="fw-semibold mb-1">Tipos</div>
                <Table size="sm" bordered hover>
                  <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                  <tbody>
                    {(dic?.tipos||[]).map((d)=>(
                      <tr key={d.cod}><td>{pad2(d.cod)}</td><td>{d.nombre}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div>
                <div className="fw-semibold mb-1">Clasificación</div>
                <Table size="sm" bordered hover>
                  <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                  <tbody>
                    {(dic?.clasif||[]).map((d)=>(
                      <tr key={d.cod}><td>{pad2(d.cod)}</td><td>{d.nombre}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card>
            <Card.Header className="d-flex align-items-center gap-2">
              <div className="fw-semibold">Maestro</div>
              <div className="ms-auto d-flex gap-2">
                <Form.Control
                  size="sm"
                  placeholder="Buscar SKU o descripción"
                  value={q}
                  onChange={e => { setPage(1); setQ(e.target.value) }}
                  style={{ maxWidth: 280 }}
                />
              </div>
            </Card.Header>
            <Card.Body>
              <div className="mb-2 text-muted small">Total: {total}</div>
              <Table size="sm" bordered hover className="align-middle">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Clasif</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.sku}>
                      <td className="fw-semibold">{r.sku}</td>
                      <td>{r.descripcion}</td>
                      <td><Badge bg="secondary">{pad2(r.categoria_cod)}</Badge></td>
                      <td><Badge bg="secondary">{pad2(r.tipo_cod)}</Badge></td>
                      <td><Badge bg="secondary">{pad2(r.clasif_cod)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div className="d-flex justify-content-center">
                <Pagination size="sm">
                  <Pagination.First onClick={()=>setPage(1)} disabled={page===1}/>
                  <Pagination.Prev onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}/>
                  <Pagination.Item active>{page}</Pagination.Item>
                  <Pagination.Next onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}/>
                  <Pagination.Last onClick={()=>setPage(pages)} disabled={page===pages}/>
                </Pagination>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
