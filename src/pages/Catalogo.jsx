import React, { useEffect, useState } from 'react'
import { Card, Form, Button, Table, Row, Col, Pagination, Badge } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { getDictionaries } from '../services/api'
import { getMaestroList } from '../services/api'
import { pad2 } from '../utils/sku'
import { EmptyState } from '../components/ui.jsx'

export default function Catalogo() {
  const [dic, setDic] = useState(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [catalogError, setCatalogError] = useState('')
  const [dictionaryError, setDictionaryError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)
  const pages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    let current = true
    getDictionaries().then((data) => { if (current) { setDic(data); setDictionaryError('') } })
      .catch(() => { if (current) setDictionaryError('No pudimos cargar los diccionarios.') })
    return () => { current = false }
  }, [retryKey])

  useEffect(() => {
    let current = true
    setLoading(true)
    getMaestroList({ q, page, pageSize })
      .then(r => { if (current) { setRows(r.items || []); setTotal(r.total || 0); setCatalogError('') } })
      .catch(() => { if (current) { setRows([]); setTotal(0); setCatalogError('No pudimos cargar el maestro. Verificá la conexión y reintentá.') } })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [q, page, pageSize, retryKey])

  return (
    <div className="container py-4 app-page">
      <div className="app-page-heading">
        <div><div className="app-eyebrow">Consulta</div><h1>Catálogo</h1><p>Explorá el maestro y los códigos disponibles.</p></div>
        <Link className="btn btn-outline-secondary" to="/">Volver al escaneo</Link>
      </div>
      <Row className="g-3">
        <Col md={4}>
          <Card className="app-surface">
            <Card.Header><strong>Diccionarios</strong></Card.Header>
            <Card.Body className="small">
              {dictionaryError && <div className="alert alert-warning" role="alert">{dictionaryError} <Button size="sm" variant="outline-secondary" onClick={() => setRetryKey(k => k + 1)}>Reintentar</Button></div>}
              <div className="mb-3">
                <div className="fw-semibold mb-1">Categorías</div>
                <Table responsive size="sm" bordered hover>
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
                <Table responsive size="sm" bordered hover>
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
                <Table responsive size="sm" bordered hover>
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
          <Card className="app-surface">
            <Card.Header className="d-flex align-items-center flex-wrap gap-2">
              <div className="fw-semibold">Maestro</div>
              <div className="ms-auto d-flex gap-2">
                <Form.Control
                  aria-label="Buscar SKU o descripción en el maestro"
                  size="sm"
                  placeholder="Buscar SKU o descripción"
                  value={q}
                  onChange={e => { setPage(1); setQ(e.target.value) }}
                  style={{ maxWidth: 280 }}
                />
              </div>
            </Card.Header>
            <Card.Body>
              {catalogError && <div className="alert alert-warning" role="alert">{catalogError} <Button size="sm" variant="outline-secondary" onClick={() => setRetryKey(k => k + 1)}>Reintentar</Button></div>}
              {loading && <p role="status" className="text-muted">Cargando artículos…</p>}
              {!loading && !catalogError && <div className="mb-2 text-muted small">Total: {total}</div>}
              {!loading && !catalogError && !rows.length && <EmptyState title="Sin artículos" subtitle={q ? 'No hay resultados para esta búsqueda.' : 'El maestro aún no contiene artículos.'} />}
              {!loading && !catalogError && rows.length > 0 && <Table responsive size="sm" bordered hover className="align-middle">
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
              </Table>}

              {!loading && !catalogError && rows.length > 0 && <div className="d-flex justify-content-center">
                <Pagination size="sm">
                  <Pagination.First onClick={()=>setPage(1)} disabled={page===1}/>
                  <Pagination.Prev onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}/>
                  <Pagination.Item active>{page}</Pagination.Item>
                  <Pagination.Next onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}/>
                  <Pagination.Last onClick={()=>setPage(pages)} disabled={page===pages}/>
                </Pagination>
              </div>}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
