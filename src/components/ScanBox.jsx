import React, { useEffect, useRef, useState } from 'react'
import { Card, Form, Row, Col, Alert } from 'react-bootstrap'
import StatusBadge from './StatusBadge.jsx'
import SuggestionForm from './SuggestionForm.jsx'
import { AppButton } from './ui.jsx'
import { cleanSku, pad2 } from '../utils/sku.js'
import { getDictionaries, getMasterBySku, getCampaignMasterBySku, saveScan } from '../services/api.js'
import { getNombre } from '../utils/texto.js'
import { hasValidCode } from '../utils/revisionesHelpers.jsx'
import { buildActionableError } from '../utils/uiFeedback.js'

export default function ScanBox({ user, campania }) {
  const [dic, setDic] = useState(null)
  const [skuRaw, setSkuRaw] = useState('')
  const [sku, setSku] = useState('')
  const [resultado, setResultado] = useState(null) // { estado, maestro, asumidos }
  const [sugeridos, setSugeridos] = useState({})
  const [guardadoInfo, setGuardadoInfo] = useState(null)
  const [error, setError] = useState('')
  const [processButtonState, setProcessButtonState] = useState('default')
  const [saveButtonState, setSaveButtonState] = useState('default')
  const inputRef = useRef(null)
  const canScan = Boolean(campania?.activa)

  useEffect(() => {
    getDictionaries()
      .then(setDic)
      .catch(() => {
        setError(buildActionableError({
          what: 'No pudimos cargar los diccionarios.',
          why: 'El servicio no respondió correctamente.',
          how: 'Reintentá en unos segundos o recargá la página.',
        }))
      })
  }, [])

  useEffect(() => {
    setResultado(null)
    setSugeridos({})
    setSku('')
    setSkuRaw('')
    setProcessButtonState('default')
    setSaveButtonState('default')
  }, [campania?.id])

  function resetButtonState(setter, ms = 1800) {
    window.setTimeout(() => setter('default'), ms)
  }

  function cumpleObjetivos(maestro) {
    if (!campania || !maestro) return true
    const catOK = !campania.categoria_objetivo_cod || pad2(maestro.categoria_cod) === pad2(campania.categoria_objetivo_cod)
    const tipoOK = !campania.tipo_objetivo_cod || pad2(maestro.tipo_cod) === pad2(campania.tipo_objetivo_cod)
    const claOK = !campania.clasif_objetivo_cod || pad2(maestro.clasif_cod) === pad2(campania.clasif_objetivo_cod)
    return catOK && tipoOK && claOK
  }

  async function procesar(e) {
    e.preventDefault()
    setProcessButtonState('loading')
    setGuardadoInfo(null)
    setError('')

    if (!canScan) {
      setProcessButtonState('disabled')
      return
    }

    const limpio = cleanSku(skuRaw)
    setSku(limpio)
    if (!limpio) {
      setProcessButtonState('default')
      return
    }

    let maestro = null
    try {
      maestro = campania?.id
        ? await getCampaignMasterBySku(campania.id, limpio)
        : await getMasterBySku(limpio)
    } catch (e) {
      setError(buildActionableError({
        what: 'No pudimos consultar el SKU en el maestro.',
        why: e?.message || 'La consulta falló o el servicio no respondió.',
        how: 'Verificá conexión/campaña activa y reintentá.',
      }))
      setResultado(null)
      setProcessButtonState('error')
      resetButtonState(setProcessButtonState, 2200)
      return
    }

    if (!maestro) {
      setResultado({ estado: 'NO_MAESTRO', maestro: null, asumidos: null })
      setSugeridos({})
      setProcessButtonState('success')
      resetButtonState(setProcessButtonState)
      return
    }

    if (cumpleObjetivos(maestro)) {
      setResultado({ estado: 'OK', maestro, asumidos: maestro })
      setSugeridos({})
    } else {
      setResultado({ estado: 'REVISAR', maestro, asumidos: maestro })
    }

    setProcessButtonState('success')
    resetButtonState(setProcessButtonState)
  }

  async function guardarYContinuar() {
    if (!resultado || !canScan) return

    if (!campania?.id) {
      setError(buildActionableError({
        what: 'No pudimos guardar cambios.',
        why: 'No hay campaña activa seleccionada.',
        how: 'Seleccioná una campaña activa y reintentá.',
      }))
      return
    }

    if (resultado.estado === 'NO_MAESTRO') {
      if (!dic) {
        setError(buildActionableError({
          what: 'No pudimos guardar cambios.',
          why: 'Los diccionarios todavía se están cargando.',
          how: 'Esperá unos segundos y reintentá.',
        }))
        return
      }

      const req = ['categoria_cod', 'tipo_cod', 'clasif_cod']
      const faltan = req.filter((k) => !sugeridos?.[k])
      if (faltan.length) {
        setError(buildActionableError({
          what: 'No pudimos guardar cambios.',
          why: 'Faltan códigos obligatorios.',
          how: 'Completá Categoría/Tipo/Clasificación y reintentá.',
        }))
        return
      }

      const invalidCodes = [
        !hasValidCode(dic?.categorias, sugeridos?.categoria_cod),
        !hasValidCode(dic?.tipos, sugeridos?.tipo_cod),
        !hasValidCode(dic?.clasif, sugeridos?.clasif_cod),
      ]

      if (invalidCodes.some(Boolean)) {
        setError(buildActionableError({
          what: 'No pudimos guardar cambios.',
          why: 'Hay códigos que no existen en diccionarios.',
          how: 'Revisá Categoría/Tipo/Clasificación y usá códigos válidos.',
        }))
        return
      }
    }

    let response = null
    try {
      setSaveButtonState('loading')
      setError('')
      response = await saveScan({
        email: user?.email,
        sucursal: user?.sucursal,
        campaniaId: campania?.id,
        skuRaw,
        skuNormalized: sku,
        sugeridos,
      })
    } catch (e) {
      setError(buildActionableError({
        what: 'No pudimos guardar cambios.',
        why: e?.message || 'El servidor rechazó la operación.',
        how: 'Validá los datos y reintentá.',
      }))
      setSaveButtonState('error')
      resetButtonState(setSaveButtonState, 2200)
      return
    }

    setGuardadoInfo({
      sku,
      at: new Date(),
      skuType: response?.skuType || null,
      unknown: response?.unknown || null,
    })
    setSkuRaw('')
    setSku('')
    setSugeridos({})
    setResultado(null)
    setSaveButtonState('success')
    resetButtonState(setSaveButtonState)
    inputRef.current?.focus()
  }

  function atributoCard(nombre, maestroValor, asumidoValor, arr) {
    const mNombre = maestroValor ? getNombre(arr, maestroValor) : '—'
    const aNombre = asumidoValor ? getNombre(arr, asumidoValor) : '—'
    const same = maestroValor && asumidoValor && pad2(maestroValor) === pad2(asumidoValor)

    return (
      <Card className={`border-0 shadow-sm ${same ? 'bg-light' : 'bg-white'} flex-fill`}>
        <Card.Body className={`py-2 px-3 border-start border-3 ${same ? 'border-success' : 'border-warning'}`}>
          <div className="text-muted small">{nombre}</div>
          <div className="fw-semibold">{aNombre || '—'}</div>
          <div className="small text-muted">Maestro: {mNombre || '—'}</div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card>
      <Card.Header>
        <strong>Escaneo</strong>
      </Card.Header>
      <Card.Body>
        {!canScan && (
          <Alert variant="warning" className="mb-3">
            No hay campaña activa. Activá una campaña para habilitar el escaneo.
          </Alert>
        )}
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
                  disabled={!canScan}
                />
                <Form.Text>
                  Se toma sólo el prefijo alfanumérico y se normaliza en MAYÚSCULA.
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={5}>
              <AppButton
                type="submit"
                className="btn btn-primary me-2"
                state={!canScan ? 'disabled' : processButtonState}
                label="Procesar"
                loadingLabel="Procesando SKU…"
                successLabel="Procesado"
                errorLabel="Error al procesar"
              />
              <AppButton
                type="button"
                className="btn btn-success"
                state={!resultado || !campania?.id || !canScan ? 'disabled' : saveButtonState}
                onClick={guardarYContinuar}
                label="Guardar & Continuar"
                loadingLabel="Guardando…"
                successLabel="Guardado"
                errorLabel="Error al guardar"
              />
            </Col>
          </Row>
        </Form>

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        {guardadoInfo && (
          <Alert variant="success" className="mt-3">
            Guardado OK · SKU {guardadoInfo.sku} · {guardadoInfo.at.toLocaleString()}
            {guardadoInfo.skuType === 'UNKNOWN' && guardadoInfo.unknown && (
              <div className="mt-1 text-muted small">
                Unknown · Estado: {guardadoInfo.unknown.status || '—'}
                {guardadoInfo.unknown.seenCount !== undefined ? ` · Visto ${guardadoInfo.unknown.seenCount} veces` : ''}
              </div>
            )}
          </Alert>
        )}

        {resultado && (
          <div className="mt-3">
            <h6 className="d-flex align-items-center gap-2">
              Resultado: <StatusBadge estado={resultado.estado} />
            </h6>

            <div className="d-flex flex-column flex-md-row gap-3 mt-2">
              {atributoCard('Categoría', resultado?.maestro?.categoria_cod, resultado?.asumidos?.categoria_cod, dic?.categorias || [])}
              {atributoCard('Tipo', resultado?.maestro?.tipo_cod, resultado?.asumidos?.tipo_cod, dic?.tipos || [])}
              {atributoCard('Clasificación', resultado?.maestro?.clasif_cod, resultado?.asumidos?.clasif_cod, dic?.clasif || [])}
            </div>

            <SuggestionForm
              dic={dic}
              estado={resultado.estado}
              sugeridos={sugeridos}
              onChange={setSugeridos}
              maestro={resultado.maestro}
            />
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
