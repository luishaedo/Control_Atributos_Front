import React, { useEffect, useRef, useState } from 'react'
import { Card, Form, Button, Row, Col, Table, Alert } from 'react-bootstrap'
import StatusBadge from './StatusBadge.jsx'
import SuggestionForm from './SuggestionForm.jsx'
import { cleanSku, pad2 } from '../utils/sku.js'
import { getDictionaries, getMasterBySku, saveScan, getNombre } from '../services/api.js'

export default function ScanBox({ user, campania }) {
  const [dic, setDic] = useState(null)
  const [skuRaw, setSkuRaw] = useState('')
  const [sku, setSku] = useState('')
  const [resultado, setResultado] = useState(null) // { estado, maestro?, asumidos? }
  const [sugeridos, setSugeridos] = useState({})
  const [guardadoOK, setGuardadoOK] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    getDictionaries().then(setDic)
  }, [])

  useEffect(() => {
    // Reset al cambiar campaña
    setResultado(null)
    setSugeridos({})
    setSku('')
    setSkuRaw('')
  }, [campania?.id])

  function cumpleObjetivos(maestro) {
    if (!campania || !maestro) return true
    const catOK = !campania.categoria_objetivo_cod || pad2(maestro.categoria_cod) === pad2(campania.categoria_objetivo_cod)
    const tipoOK = !campania.tipo_objetivo_cod || pad2(maestro.tipo_cod) === pad2(campania.tipo_objetivo_cod)
    const claOK = !campania.clasif_objetivo_cod || pad2(maestro.clasif_cod) === pad2(campania.clasif_objetivo_cod)
    return catOK && tipoOK && claOK
  }

  async function procesar(e) {
    e.preventDefault()
    setGuardadoOK(false)
    const limpio = cleanSku(skuRaw)
    setSku(limpio)
    if (!limpio) return

    const maestro = await getMasterBySku(limpio)
    if (!maestro) {
      setResultado({ estado: 'NO_MAESTRO', maestro: null, asumidos: null })
      setSugeridos({})
      return
    }

    if (cumpleObjetivos(maestro)) {
      setResultado({ estado: 'OK', maestro, asumidos: maestro })
      setSugeridos({})
    } else {
      setResultado({ estado: 'REVISAR', maestro, asumidos: maestro })
    }
  }

  async function guardarYContinuar() {
    if (!resultado) return
    if (!campania?.id) {
      alert('Seleccioná una campaña activa antes de guardar.')
      return
    }
    if (resultado.estado === 'NO_MAESTRO') {
      const req = ['categoria_cod', 'tipo_cod', 'clasif_cod']
      const faltan = req.filter(k => !sugeridos?.[k])
      if (faltan.length) {
        alert('Completa los 3 campos (Categoría, Tipo, Clasificación) para guardar.')
        return
      }
    }
    const asumidos = {
      categoria_cod: sugeridos?.categoria_cod || resultado?.maestro?.categoria_cod || '',
      tipo_cod: sugeridos?.tipo_cod || resultado?.maestro?.tipo_cod || '',
      clasif_cod: sugeridos?.clasif_cod || resultado?.maestro?.clasif_cod || '',
    }
    const payload = {
      skuRaw,
      sku,
      email: user?.email || '',
      sucursal: user?.sucursal || '',
      campaniaId: campania?.id || null,
      estado: resultado.estado,
      sugeridos,
      asumidos,
    }
    const resp = await saveScan(payload)
    if (resp?.ok) {
      setGuardadoOK(true)
      setSkuRaw('')
      setSku('')
      setSugeridos({})
      setResultado(null)
      inputRef.current?.focus()
    }
  }

  function fila(nombre, maestroValor, asumidoValor, arr) {
    const mNombre = maestroValor ? `${pad2(maestroValor)} · ${getNombre(arr, maestroValor)}` : '—'
    const aNombre = asumidoValor ? `${pad2(asumidoValor)} · ${getNombre(arr, asumidoValor)}` : '—'
    return (
      <tr>
        <td>{nombre}</td>
        <td>{mNombre}</td>
        <td>{aNombre}</td>
      </tr>
    )
  }

  return (
    <Card>
      <Card.Header>
        <strong>Escaneo</strong>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={procesar}>
          <Row className="g-2 align-items-end">
            <Col md={7}>
              <Form.Group>
                <Form.Label>Código / SKU</Form.Label>
                <Form.Control
                  inputMode="text"
                  pattern="^[A-Za-z0-9]+([#$].*)?$"
                  placeholder="Ej: THJ00406207 o ABC123#loquesea"
                  value={skuRaw}
                  onChange={(e) => setSkuRaw(e.target.value)}
                  ref={inputRef}
                  autoFocus
                  required
                />
                <Form.Text>Se toma sólo el prefijo alfanumérico y se normaliza en MAYÚSCULA.</Form.Text>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Button type="submit" className="w-100">Procesar</Button>
            </Col>
            <Col md={2} className="text-md-end mt-2 mt-md-0">
              <div><small className="text-muted">SKU limpio:</small></div>
              <div className="fw-bold">{sku || '—'}</div>
            </Col>
          </Row>
        </Form>

        {resultado && (
          <div className="mt-3">
            <Row className="mb-2">
              <Col>
                <div className="d-flex align-items-center gap-2">
                  <span>Estado:</span>
                  <StatusBadge estado={resultado.estado} />
                </div>
              </Col>
            </Row>

            {resultado.estado !== 'NO_MAESTRO' && resultado.maestro && (
              <Table striped bordered size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Dragonfish</th>
                    <th>Sugeridos</th>
                  </tr>
                </thead>
                <tbody>
                  {fila('Categoría', resultado.maestro.categoria_cod, (sugeridos.categoria_cod || resultado.maestro.categoria_cod), dic?.categorias || [])}
                  {fila('Tipo', resultado.maestro.tipo_cod, (sugeridos.tipo_cod || resultado.maestro.tipo_cod), dic?.tipos || [])}
                  {fila('Clasificación', resultado.maestro.clasif_cod, (sugeridos.clasif_cod || resultado.maestro.clasif_cod), dic?.clasif || [])}
                </tbody>
              </Table>
            )}

            {(resultado.estado === 'REVISAR' || resultado.estado === 'NO_MAESTRO') && (
              <SuggestionForm
                dic={dic}
                estado={resultado.estado}
                sugeridos={sugeridos}
                maestro={resultado.maestro || {}}
                onChange={setSugeridos}
              />
            )}

            <div className="d-flex justify-content-end">
              <Button variant="primary" onClick={guardarYContinuar}>
                Guardar sugerencia y continuar
              </Button>
            </div>

            {guardadoOK && (
              <Alert variant="success" className="mt-3 mb-0">
                Guardado ✔️ — listo para el próximo código.
              </Alert>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
