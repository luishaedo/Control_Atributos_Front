import React from 'react'
import { Accordion, Button, Col, Form, Pagination, Row, Table } from 'react-bootstrap'

export default function ExportsPanel({
  authOK,
  dictionaryPreview,
  masterPreview,
  masterQuery,
  onMasterQueryChange,
  masterPage,
  onMasterPageChange,
  masterPageSize,
  onExportCategories,
  onExportTypes,
  onExportClassifications,
  onExportMaster,
}) {
  const maxPage = Math.max(1, Math.ceil(masterPreview.total / masterPageSize))

  return (
    <Accordion className="mb-3">
      <Accordion.Item eventKey="diccionarios">
        <Accordion.Header>Ver diccionarios cargados</Accordion.Header>
        <Accordion.Body>
          <div className="d-flex gap-2 flex-wrap mb-3">
            <Button variant="outline-secondary" onClick={onExportCategories} disabled={!authOK}>
              Descargar categorías (CSV)
            </Button>
            <Button variant="outline-secondary" onClick={onExportTypes} disabled={!authOK}>
              Descargar tipos (CSV)
            </Button>
            <Button variant="outline-secondary" onClick={onExportClassifications} disabled={!authOK}>
              Descargar clasif (CSV)
            </Button>
          </div>
          <Row className="g-3">
            <Col md={4}>
              <div className="fw-semibold mb-2">Categorías</div>
              <Table size="sm" bordered hover>
                <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                <tbody>
                  {(dictionaryPreview?.categorias || []).map((item) => (
                    <tr key={item.cod}><td>{item.cod}</td><td>{item.nombre}</td></tr>
                  ))}
                </tbody>
              </Table>
            </Col>
            <Col md={4}>
              <div className="fw-semibold mb-2">Tipos</div>
              <Table size="sm" bordered hover>
                <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                <tbody>
                  {(dictionaryPreview?.tipos || []).map((item) => (
                    <tr key={item.cod}><td>{item.cod}</td><td>{item.nombre}</td></tr>
                  ))}
                </tbody>
              </Table>
            </Col>
            <Col md={4}>
              <div className="fw-semibold mb-2">Clasif</div>
              <Table size="sm" bordered hover>
                <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                <tbody>
                  {(dictionaryPreview?.clasif || []).map((item) => (
                    <tr key={item.cod}><td>{item.cod}</td><td>{item.nombre}</td></tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="maestro">
        <Accordion.Header>Ver maestro cargado</Accordion.Header>
        <Accordion.Body>
          <div className="d-flex gap-2 flex-wrap mb-3 align-items-center">
            <Button variant="outline-secondary" onClick={onExportMaster} disabled={!authOK}>
              Descargar Maestro (CSV)
            </Button>
            <div className="text-muted small">Total: {masterPreview.total}</div>
            <Form.Control
              size="sm"
              placeholder="Buscar SKU o descripción"
              value={masterQuery}
              onChange={(e) => {
                onMasterPageChange(1)
                onMasterQueryChange(e.target.value)
              }}
              style={{ maxWidth: 260 }}
            />
          </div>
          <Table size="sm" bordered hover>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción</th>
                <th>Cat</th>
                <th>Tipo</th>
                <th>Clasif</th>
              </tr>
            </thead>
            <tbody>
              {(masterPreview.items || []).map((item) => (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td>{item.descripcion}</td>
                  <td>{item.categoria_cod}</td>
                  <td>{item.tipo_cod}</td>
                  <td>{item.clasif_cod}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="d-flex justify-content-center">
            <Pagination size="sm">
              <Pagination.First onClick={() => onMasterPageChange(1)} disabled={masterPage === 1} />
              <Pagination.Prev onClick={() => onMasterPageChange((page) => Math.max(1, page - 1))} disabled={masterPage === 1} />
              <Pagination.Item active>{masterPage}</Pagination.Item>
              <Pagination.Next
                onClick={() => onMasterPageChange((page) => Math.min(maxPage, page + 1))}
                disabled={masterPage >= maxPage}
              />
              <Pagination.Last
                onClick={() => onMasterPageChange(maxPage)}
                disabled={masterPage >= maxPage}
              />
            </Pagination>
          </div>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  )
}
