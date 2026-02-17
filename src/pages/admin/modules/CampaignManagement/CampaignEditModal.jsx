import React from 'react'
import { Modal, Form, Button } from 'react-bootstrap'

export default function CampaignEditModal({ show, authOK, campaign, onClose, onChange, onSave }) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Editar campaña</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form className="row g-2">
          <div className="col-12">
            <Form.Label>Nombre</Form.Label>
            <Form.Control value={campaign?.nombre || ''} onChange={(e) => onChange((state) => ({ ...state, nombre: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <Form.Label>Inicia</Form.Label>
            <Form.Control type="date" value={campaign?.inicia || ''} onChange={(e) => onChange((state) => ({ ...state, inicia: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <Form.Label>Termina</Form.Label>
            <Form.Control type="date" value={campaign?.termina || ''} onChange={(e) => onChange((state) => ({ ...state, termina: e.target.value }))} />
          </div>
          <div className="col-md-4">
            <Form.Label>Cat objetivo</Form.Label>
            <Form.Control value={campaign?.categoria_objetivo_cod || ''} onChange={(e) => onChange((state) => ({ ...state, categoria_objetivo_cod: e.target.value }))} />
          </div>
          <div className="col-md-4">
            <Form.Label>Tipo objetivo</Form.Label>
            <Form.Control value={campaign?.tipo_objetivo_cod || ''} onChange={(e) => onChange((state) => ({ ...state, tipo_objetivo_cod: e.target.value }))} />
          </div>
          <div className="col-md-4">
            <Form.Label>Clasif objetivo</Form.Label>
            <Form.Control value={campaign?.clasif_objetivo_cod || ''} onChange={(e) => onChange((state) => ({ ...state, clasif_objetivo_cod: e.target.value }))} />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onSave} disabled={!authOK}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
