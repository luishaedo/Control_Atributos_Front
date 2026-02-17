import React from 'react'
import { Row, Col, Card, Form, Button } from 'react-bootstrap'

export default function CampaignManagementPanel({
  authOK,
  campaigns,
  newCampaign,
  onNewCampaignChange,
  onCreateCampaign,
  onRefreshCampaigns,
  onEditCampaign,
  onActivateCampaign,
}) {
  return (
    <Row className="g-3">
      <Col md={6}>
        <Card>
          <Card.Header>Crear campaña</Card.Header>
          <Card.Body>
            <Form className="row g-2">
              <div className="col-12">
                <Form.Label>Nombre</Form.Label>
                <Form.Control value={newCampaign.nombre} onChange={(e) => onNewCampaignChange({ ...newCampaign, nombre: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Inicia</Form.Label>
                <Form.Control type="date" value={newCampaign.inicia} onChange={(e) => onNewCampaignChange({ ...newCampaign, inicia: e.target.value })} />
              </div>
              <div className="col-md-6">
                <Form.Label>Termina</Form.Label>
                <Form.Control type="date" value={newCampaign.termina} onChange={(e) => onNewCampaignChange({ ...newCampaign, termina: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Cat objetivo</Form.Label>
                <Form.Control value={newCampaign.categoria_objetivo_cod} onChange={(e) => onNewCampaignChange({ ...newCampaign, categoria_objetivo_cod: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Tipo objetivo</Form.Label>
                <Form.Control value={newCampaign.tipo_objetivo_cod} onChange={(e) => onNewCampaignChange({ ...newCampaign, tipo_objetivo_cod: e.target.value })} />
              </div>
              <div className="col-md-4">
                <Form.Label>Clasif objetivo</Form.Label>
                <Form.Control value={newCampaign.clasif_objetivo_cod} onChange={(e) => onNewCampaignChange({ ...newCampaign, clasif_objetivo_cod: e.target.value })} />
              </div>
            </Form>
            <div className="mt-3 d-flex gap-2">
              <Button onClick={onCreateCampaign} disabled={!authOK}>Crear</Button>
              <Button variant="secondary" onClick={onRefreshCampaigns}>Refrescar</Button>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6}>
        <Card>
          <Card.Header>Campañas existentes</Card.Header>
          <Card.Body>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
                <div>
                  <div className="fw-bold">{campaign.nombre} {campaign.activa ? '✅' : ''}</div>
                  <small className="text-muted">{campaign.inicia} → {campaign.termina}</small>
                  <div><small>Filtros: {campaign.categoria_objetivo_cod || '—'} / {campaign.tipo_objetivo_cod || '—'} / {campaign.clasif_objetivo_cod || '—'}</small></div>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => onEditCampaign(campaign)}
                    disabled={!authOK || campaign.activatedOnce}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={campaign.activa ? 'success' : 'outline-secondary'}
                    onClick={() => onActivateCampaign(campaign.id)}
                    disabled={!authOK}
                  >
                    {campaign.activa ? 'Activa' : 'Activar'}
                  </Button>
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
