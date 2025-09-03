import React from 'react'
import { Row, Col, Form } from 'react-bootstrap'
import { getNombre } from '../utils/texto.js'

export default function SuggestionForm({ dic, estado, sugeridos, onChange, maestro }) {
  if (!dic) return null

  const obligatorio = estado === 'NO_MAESTRO'

  function renderSelect(label, name, opciones) {
    return (
      <Form.Group className="mb-2">
        <Form.Label>{label} {obligatorio ? <span className="text-danger">*</span> : null}</Form.Label>
        <Form.Select
          value={sugeridos?.[name] || ''}
          onChange={(e) => onChange?.({ ...sugeridos, [name]: e.target.value })}
          required={obligatorio}
        >
          <option value="">— Seleccionar —</option>
          {opciones.map(o => (
            <option key={o.cod} value={o.cod}>
              {o.cod} · {o.nombre}
            </option>
          ))}
        </Form.Select>
        <Form.Text muted>
          Maestro: <strong>{maestro?.[name] || '—'}</strong>
          {maestro?.[name] ? ` · ${getNombre(opciones, maestro?.[name])}` : ''}
        </Form.Text>
      </Form.Group>
    )
  }

  return (
    <Form>
      <Row>
        <Col md={4}>
          {renderSelect('Categoría', 'categoria_cod', dic.categorias)}
        </Col>
        <Col md={4}>
          {renderSelect('Tipo', 'tipo_cod', dic.tipos)}
        </Col>
        <Col md={4}>
          {renderSelect('Clasificación', 'clasif_cod', dic.clasif)}
        </Col>
      </Row>
    </Form>
  )
}
