// src/pages/Revisiones.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Card,
  Button,
  Row,
  Col,
  Form,
  Badge,
  Stack,
  Table,
  Dropdown,
  ButtonGroup,
  Tabs,
  Tab,
  Toast,
  ToastContainer
} from 'react-bootstrap'
import { getDictionaries } from '../services/api'
import { pad2 } from '../utils/sku'
import {
  // Revisiones
  getRevisiones, decidirRevision,
  // Cola
  listarActualizaciones, exportActualizacionesCSV, aplicarActualizaciones,
  archivarActualizaciones, undoActualizacion, revertirActualizacion,
  // TXT
  exportTxtCategoria, exportTxtTipo, exportTxtClasif,
} from '../services/adminApi'

// ===== Helpers =====
function etiqueta(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr || []).find(x => x.cod === c)
  return it ? `${c} · ${it.nombre}` : c
}
function badgeDecision(estado) {
  if (estado === 'aplicada')   return <Badge bg="success">APLICADA</Badge>
  if (estado === 'pendiente')  return <Badge bg="warning" text="dark">ACEPTADA (pend.)</Badge>
  if (estado === 'rechazada')  return <Badge bg="danger">RECHAZADA</Badge>
  return <Badge bg="secondary">—</Badge>
}
function descargarBlobDirecto(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export default function Revisiones({ campanias, campaniaIdDefault, authOK }) {
  // ===== Estado general =====
  const [activeTab, setActiveTab] = useState('revisiones')
  const [dic, setDic] = useState(null)
  const [uiMessage, setUiMessage] = useState(null)
  const messageTimeoutRef = useRef(null)

  // —— Filtros tarjetas (revisiones)
  const [campaniaId, setCampaniaId] = useState(String(campaniaIdDefault || ''))
  const [sku, setSku] = useState('')
  const [consenso, setConsenso] = useState('') // '', 'true', 'false'
  const [soloDif, setSoloDif] = useState(true)
  const [items, setItems] = useState([])
  const [filtroDecision, setFiltroDecision] = useState('pendientes') // 'pendientes'|'aceptadas'|'rechazadas'|'todas'

  // —— Cola
  const [cola, setCola] = useState([])
  const [seleccion, setSeleccion] = useState([])

  // Toolbar de la cola (server-side)
  const [colaEstado, setColaEstado] = useState('')              // '', 'pendiente', 'aplicada', 'rechazada'
  const [colaArchivada, setColaArchivada] = useState('activas') // 'activas'|'archivadas'|'todas'
  const [exportIncludeArchived, setExportIncludeArchived] = useState(false)
  const [toast, setToast] = useState({ show: false, variant: 'success', message: '' })

  // Filtros por columna (client-side)
  const [fSKU, setFSKU] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fOldCat, setFOldCat] = useState('')
  const [fNewCat, setFNewCat] = useState('')
  const [fOldTipo, setFOldTipo] = useState('')
  const [fNewTipo, setFNewTipo] = useState('')
  const [fOldCla, setFOldCla] = useState('')
  const [fNewCla, setFNewCla] = useState('')
  const [fDecideBy, setFDecideBy] = useState('')

  const colaRef = useRef(null)

  // ===== Carga diccionarios =====
  useEffect(() => { getDictionaries().then(setDic).catch(()=>{}) }, [])
  useEffect(() => {
    if (!campaniaIdDefault) return
    setCampaniaId(prev => (prev ? prev : String(campaniaIdDefault)))
  }, [campaniaIdDefault])

  // ===== Carga datos =====
  async function cargar() {
    // Tarjetas
    const data = await getRevisiones({
      campaniaId, sku, consenso, soloConDiferencias: String(soloDif)
    })
    setItems(data.items || [])

    // Cola (server-side filters)
    const arch =
      colaArchivada === 'activas'    ? 'false' :
      colaArchivada === 'archivadas' ? 'true'  : 'todas'
    const acts = await listarActualizaciones(Number(campaniaId), {
      estado: colaEstado || undefined,
      archivada: arch,
    })
    setCola(acts.items || [])
    // sanea selección (por si cambió la vista)
    setSeleccion(sel => sel.filter(id => (acts.items || []).some(a => a.id === id)))
  }

  useEffect(() => {
    if (!authOK || !campaniaId) return
    cargar().catch(e => console.error('[Revisiones] cargar error', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaniaId, authOK, colaEstado, colaArchivada, soloDif, consenso, sku])

  useEffect(() => () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
  }, [])

  // ===== Acciones tarjetas =====
  async function onAceptar(sku, prop) {
    await decidirRevision({
      campaniaId: Number(campaniaId), sku,
      propuesta: prop, decision: 'aceptar',
      decidedBy: 'admin@local', aplicarAhora: false
    })
    await cargar()
    // al aceptar, puede interesar saltar a la cola
    setActiveTab('cola')
    setTimeout(()=>colaRef.current?.scrollIntoView({behavior:'smooth'}), 60)
  }
  async function onRechazar(sku, prop) {
    await decidirRevision({
      campaniaId: Number(campaniaId), sku,
      propuesta: prop, decision: 'rechazar',
      decidedBy: 'admin@local'
    })
    await cargar()
    setActiveTab('cola')
    setTimeout(()=>colaRef.current?.scrollIntoView({behavior:'smooth'}), 60)
  }

  // ===== Acciones cola (masivas) =====
  async function onAplicarSeleccion() {
    const pendientes = cola.filter(a => seleccion.includes(a.id) && a.estado === 'pendiente').map(a => a.id)
    if (!pendientes.length) {
      setToast({
        show: true,
        variant: 'warning',
        message: 'No hay pendientes seleccionadas para aplicar.'
      })
      return
    }
    try {
      await aplicarActualizaciones(pendientes, 'admin@local')
      setSeleccion([])
      setToast({
        show: true,
        variant: 'success',
        message: `Se aplicaron ${pendientes.length} actualizaciones.`
      })
      await cargar()
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudieron aplicar las actualizaciones.'
      })
    }
  }
  async function onArchivarSeleccion() {
    if (!seleccion.length) return
    await archivarActualizaciones(seleccion, true, 'bulk-arch')
    setSeleccion([])
    await cargar()
  }
  async function onDesarchivarSeleccion() {
    if (!seleccion.length) return
    await archivarActualizaciones(seleccion, false, 'bulk-unarch')
    setSeleccion([])
    await cargar()
  }

  // ===== Acciones cola (fila) =====
  async function onUndoRow(id) {
    await undoActualizacion(id)
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
    setUiMessage({
      variant: 'info',
      text: 'Actualización deshecha. Quedó como pendiente nuevamente.'
    })
    messageTimeoutRef.current = setTimeout(() => {
      setUiMessage(null)
      messageTimeoutRef.current = null
    }, 4000)
    await cargar()
  }
  async function onRevertRow(id) {
    await revertirActualizacion(id)
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
    setUiMessage({
      variant: 'warning',
      text: 'Se creó una reversión pendiente. Aplicala desde la cola para impactar Maestro.'
    })
    messageTimeoutRef.current = setTimeout(() => {
      setUiMessage(null)
      messageTimeoutRef.current = null
    }, 4000)
    await cargar()
  }
  async function onToggleArchiveRow(a) {
    await archivarActualizaciones([a.id], !a.archivada, 'row-toggle')
    await cargar()
  }

  // ===== Exportaciones =====
  async function onExportCola() {
    const blob = await exportActualizacionesCSV(Number(campaniaId))
    descargarBlobDirecto(blob, 'actualizaciones_campania.csv')
  }
  async function onExportTxtCat(estado='aceptadas', incluirArchivadas=false) {
    const b = await exportTxtCategoria(Number(campaniaId), estado, incluirArchivadas)
    descargarBlobDirecto(b, `categoria_${campaniaId}_${estado}${incluirArchivadas?'_inclArch':''}.txt`)
  }
  async function onExportTxtTipo(estado='aceptadas', incluirArchivadas=false) {
    const b = await exportTxtTipo(Number(campaniaId), estado, incluirArchivadas)
    descargarBlobDirecto(b, `tipo_${campaniaId}_${estado}${incluirArchivadas?'_inclArch':''}.txt`)
  }
  async function onExportTxtClasif(estado='aceptadas', incluirArchivadas=false) {
    const b = await exportTxtClasif(Number(campaniaId), estado, incluirArchivadas)
    descargarBlobDirecto(b, `clasif_${campaniaId}_${estado}${incluirArchivadas?'_inclArch':''}.txt`)
  }
  function onExportTxtSeleccion(campo) {
    const mapNew = { categoria: 'new_categoria_cod', tipo: 'new_tipo_cod', clasif: 'new_clasif_cod' }
    const mapOld = { categoria: 'old_categoria_cod', tipo: 'old_tipo_cod', clasif: 'old_clasif_cod' }
    const chosen = cola.filter(a => seleccion.includes(a.id))
    const lines = []
    for (const a of chosen) {
      const newCode = a[mapNew[campo]]
      const oldCode = a[mapOld[campo]]
      if (!newCode) continue
      if (oldCode && String(oldCode) === String(newCode)) continue
      lines.push(`${a.sku}\t${newCode}`)
    }
    const body = '\ufeff' + lines.join('\n') + (lines.length ? '\n' : '')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    descargarBlobDirecto(blob, `${campo}_seleccion_camp_${campaniaId}.txt`)
  }

  // ===== Selección en cola =====
  function toggleSel(id) {
    setSeleccion(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  }
  function toggleSelAllVisible(e) {
    const checked = e.target.checked
    const visibles = colaFiltrada.map(a => a.id)
    setSeleccion(sel => checked
      ? Array.from(new Set([...sel, ...visibles]))
      : sel.filter(id => !visibles.includes(id))
    )
  }

  // ===== Contadores tarjetas =====
  const contadores = items.reduce((acc, it) => {
    for (const p of it.propuestas) {
      if (!p.decision) acc.pendientes++
      else if (p.decision.estado === 'rechazada') acc.rechazadas++
      else acc.aceptadas++
    }
    return acc
  }, { pendientes:0, aceptadas:0, rechazadas:0 })

  function filtrarPropuestas(p) {
    if (filtroDecision === 'todas') return true
    if (filtroDecision === 'pendientes') return !p.decision
    if (filtroDecision === 'rechazadas') return p.decision?.estado === 'rechazada'
    if (filtroDecision === 'aceptadas') return p.decision && p.decision.estado !== 'rechazada'
    return true
  }

  // ===== Filtro por columnas (cola) =====
  function incluye(v, term) {
    return String(v || '').toLowerCase().includes(String(term || '').toLowerCase())
  }
  function filtroRow(a) {
    if (colaEstado && a.estado !== colaEstado) return false
    if (fEstado && a.estado !== fEstado) return false

    if (fSKU && !incluye(a.sku, fSKU)) return false
    if (fOldCat && !incluye(a.old_categoria_cod, fOldCat)) return false
    if (fNewCat && !incluye(a.new_categoria_cod, fNewCat)) return false
    if (fOldTipo && !incluye(a.old_tipo_cod, fOldTipo)) return false
    if (fNewTipo && !incluye(a.new_tipo_cod, fNewTipo)) return false
    if (fOldCla && !incluye(a.old_clasif_cod, fOldCla)) return false
    if (fNewCla && !incluye(a.new_clasif_cod, fNewCla)) return false
    if (fDecideBy && !incluye(a.decidedBy, fDecideBy)) return false
    return true
  }
  const colaFiltrada = useMemo(
    () => (cola || []).filter(filtroRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cola, colaEstado, fEstado, fSKU, fOldCat, fNewCat, fOldTipo, fNewTipo, fOldCla, fNewCla, fDecideBy]
  )
  const allVisibleSelected = useMemo(() => {
    const visibles = new Set(colaFiltrada.map(a => a.id))
    if (!visibles.size) return false
    return Array.from(visibles).every(id => seleccion.includes(id))
  }, [colaFiltrada, seleccion])

  function limpiarFiltrosCola() {
    setFSKU(''); setFEstado(''); setFOldCat(''); setFNewCat('')
    setFOldTipo(''); setFNewTipo(''); setFOldCla(''); setFNewCla('')
    setFDecideBy('')
  }

  // ===== UI =====
  return (
    <>
      <Card className="mb-3">
        <Card.Body className="d-flex flex-column flex-lg-row gap-3 align-items-start align-items-lg-center justify-content-between">
          <div>
            <div className="fw-semibold">Flujo guiado</div>
            <div className="text-muted small">
              Paso 1: evaluá discrepancias, Paso 2: confirmá decisiones en la cola, Paso 3: exportá resultados.
            </div>
          </div>
          <ButtonGroup aria-label="Wizard steps">
            <Button
              variant={activeTab === 'revisiones' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('revisiones')}
            >
              1. Evaluar
            </Button>
            <Button
              variant={activeTab === 'cola' ? 'primary' : 'outline-primary'}
              onClick={() => {
                setActiveTab('cola')
                setTimeout(() => colaRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
              }}
            >
              2. Decidir
            </Button>
            <Button
              variant={activeTab === 'export' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('export')}
            >
              3. Exportar
            </Button>
          </ButtonGroup>
        </Card.Body>
      </Card>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg={toast.variant}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
          show={toast.show}
          delay={3500}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Cola</strong>
          </Toast.Header>
          <Toast.Body className={toast.variant === 'warning' ? 'text-dark' : 'text-white'}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Barra superior común */}
      <Card className="mb-3">
        <Card.Body className="row g-2">
          <div className="col-md-3">
            <Form.Label>Campaña</Form.Label>
            <Form.Select value={campaniaId} onChange={e => setCampaniaId(e.target.value)}>
              {campanias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Form.Select>
          </div>

          {activeTab === 'revisiones' && (
            <>
              <div className="col-md-3">
                <Form.Label>SKU (contiene)</Form.Label>
                <Form.Control value={sku} onChange={e=>setSku(e.target.value)} placeholder="ABC" />
              </div>
              <div className="col-md-2">
                <Form.Label>Consenso</Form.Label>
                <Form.Select value={consenso} onChange={e=>setConsenso(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="true">Con consenso</option>
                  <option value="false">Sin consenso</option>
                </Form.Select>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <Form.Check type="switch" id="solo-dif"
                  label="Sólo diferencias"
                  checked={soloDif} onChange={e=>setSoloDif(e.target.checked)} />
              </div>
            </>
          )}

          <div className="col-md-2 d-flex align-items-end">
            <Button onClick={cargar} disabled={!authOK} className="w-100">Buscar</Button>
          </div>
        </Card.Body>
      </Card>

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k || 'revisiones')} className="mb-3">
        {/* ====== TAB: Revisiones (tarjetas) ====== */}
        <Tab eventKey="revisiones" title="Revisiones">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <ButtonGroup>
              <Button variant={filtroDecision==='pendientes' ? 'primary' : 'outline-primary'}
                      onClick={()=>setFiltroDecision('pendientes')}>
                Pendientes ({contadores.pendientes})
              </Button>
              <Button variant={filtroDecision==='aceptadas' ? 'success' : 'outline-success'}
                      onClick={()=>setFiltroDecision('aceptadas')}>
                Aceptadas ({contadores.aceptadas})
              </Button>
              <Button variant={filtroDecision==='rechazadas' ? 'danger' : 'outline-danger'}
                      onClick={()=>setFiltroDecision('rechazadas')}>
                Rechazadas ({contadores.rechazadas})
              </Button>
              <Button variant={filtroDecision==='todas' ? 'secondary' : 'outline-secondary'}
                      onClick={()=>setFiltroDecision('todas')}>
                Todas
              </Button>
            </ButtonGroup>

            <Button
              variant="outline-dark"
              onClick={()=>{ setActiveTab('cola'); setTimeout(()=>colaRef.current?.scrollIntoView({behavior:'smooth'}), 60) }}
            >
              Ir a Paso 2 (Cola)
            </Button>
          </div>

          {/* TARJETAS */}
          {items.map(it => {
            const propsFiltradas = it.propuestas.filter(filtrarPropuestas)
            if (!propsFiltradas.length) return null
            const borde = it.hayConsenso ? 'border-success' : 'border-warning'
            const bordeWidth = 'border-start border-4'
            return (
              <Card key={it.sku} className={`mb-3 ${bordeWidth} ${borde}`}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <strong>{it.sku}</strong>
                    {it.hayConsenso
                      ? <Badge bg="success">Consenso {Math.round(it.consensoPct*100)}%</Badge>
                      : <Badge bg="warning" text="dark">Sin consenso</Badge>}
                  </div>
                  <small className="text-muted">{it.totalVotos} votos</small>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={5}>
                      <h6>Original (snapshot)</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr><td>Categoría</td><td>{etiqueta(dic?.categorias, it.maestro?.categoria_cod)}</td></tr>
                          <tr><td>Tipo</td><td>{etiqueta(dic?.tipos, it.maestro?.tipo_cod)}</td></tr>
                          <tr><td>Clasificación</td><td>{etiqueta(dic?.clasif, it.maestro?.clasif_cod)}</td></tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={7}>
                      <h6>Propuestas de usuarios</h6>
                      {propsFiltradas.map((p, idx) => (
                        <Card key={idx} className="mb-2">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div><strong>{p.count}</strong> votos</div>
                                <div className="small text-muted">
                                  Cat: {etiqueta(dic?.categorias, p.categoria_cod)} ·
                                  Tipo: {etiqueta(dic?.tipos, p.tipo_cod)} ·
                                  Clasif: {etiqueta(dic?.clasif, p.clasif_cod)}
                                </div>
                                <Stack direction="horizontal" gap={2} className="mt-1 flex-wrap">
                                  {p.usuarios.map(u => <Badge bg="secondary" key={u} title="Usuario">{u}</Badge>)}
                                  {p.sucursales.map(s => <Badge bg="info" key={s} title="Sucursal">{s}</Badge>)}
                                </Stack>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {p.decision ? (
                                  <>
                                    {badgeDecision(p.decision.estado)}
                                    {p.decision.estado !== 'aplicada' && (
                                      <Button size="sm" variant="outline-secondary"
                                              onClick={()=>onUndoRow(p.decision.id)} disabled={!authOK}>
                                        Deshacer
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Button variant="outline-danger" size="sm"
                                            onClick={()=>onRechazar(it.sku, p)} disabled={!authOK}>
                                      Rechazar
                                    </Button>
                                    <Button variant="success" size="sm"
                                            onClick={()=>onAceptar(it.sku, p)} disabled={!authOK}>
                                      Aceptar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {p.decision && (
                              <div className="mt-2">
                                <small className="text-muted">
                                  {p.decision.decidedBy || ''} · {p.decision.decidedAt ? new Date(p.decision.decidedAt).toLocaleString() : ''}
                                </small>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )
          })}
          {!items.length && (
            <Card body className="text-center text-muted">No hay resultados con los filtros actuales.</Card>
          )}
        </Tab>

        {/* ====== TAB: Cola ====== */}
        <Tab eventKey="cola" title="Cola">
          <div ref={colaRef} />
          <Card>
            <Card.Header className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <strong>Cola de actualizaciones</strong>

                <Form.Select
                  size="sm" value={colaEstado} onChange={e=>setColaEstado(e.target.value)}
                  title="Estado" style={{minWidth: 160}}
                >
                  <option value="">Estado: Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aplicada">Aplicada</option>
                  <option value="rechazada">Rechazada</option>
                </Form.Select>

                <Form.Select
                  size="sm" value={colaArchivada} onChange={e=>setColaArchivada(e.target.value)}
                  title="Archivadas" style={{minWidth: 160}}
                >
                  <option value="activas">Activas</option>
                  <option value="archivadas">Archivadas</option>
                  <option value="todas">Todas</option>
                </Form.Select>

                <small className="text-muted">
                  Mostrando {colaFiltrada.length} de {cola.length}
                </small>
              </div>

              <Dropdown as={ButtonGroup}>
                <Button variant="primary" disabled={!authOK || !seleccion.length} onClick={onAplicarSeleccion}>
                  Aplicar seleccionadas
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => setActiveTab('export')}
                >
                  Ir a Paso 3
                </Button>
                <Dropdown.Toggle split variant="outline-secondary" />
                <Dropdown.Menu align="end">
                  <Dropdown.Header>Exportar</Dropdown.Header>
                  <Dropdown.Item disabled={!authOK} onClick={onExportCola}>CSV actualizaciones (campaña)</Dropdown.Item>
                  <Dropdown.Item disabled={!authOK} onClick={()=>onExportTxtCat('aceptadas')}>TXT Categoría (aceptadas)</Dropdown.Item>
                  <Dropdown.Item disabled={!authOK} onClick={()=>onExportTxtTipo('aceptadas')}>TXT Tipo (aceptadas)</Dropdown.Item>
                  <Dropdown.Item disabled={!authOK} onClick={()=>onExportTxtClasif('aceptadas')}>TXT Clasif (aceptadas)</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item disabled={!authOK || !seleccion.length} onClick={()=>onExportTxtSeleccion('categoria')}>TXT Categoría (selección)</Dropdown.Item>
                  <Dropdown.Item disabled={!authOK || !seleccion.length} onClick={()=>onExportTxtSeleccion('tipo')}>TXT Tipo (selección)</Dropdown.Item>
                  <Dropdown.Item disabled={!authOK || !seleccion.length} onClick={()=>onExportTxtSeleccion('clasif')}>TXT Clasif (selección)</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item disabled={!authOK || !seleccion.length} onClick={onArchivarSeleccion}>Archivar seleccionadas</Dropdown.Item>
                  <Dropdown.Item disabled={!authOK || !seleccion.length} onClick={onDesarchivarSeleccion}>Desarchivar seleccionadas</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>

            <Card.Body className="pt-0">
              {uiMessage && (
                <Alert variant={uiMessage.variant} className="mt-3">
                  {uiMessage.text}
                </Alert>
              )}
              <Table size="sm" bordered hover className="align-middle">
                <thead>
                  <tr>
                    <th style={{width: 32}}>
                      <Form.Check
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelAllVisible}
                        title="Seleccionar todo (filtrado)"
                      />
                    </th>
                    <th>Estado</th>
                    <th>SKU</th>
                    <th>Old Cat</th><th>New Cat</th>
                    <th>Old Tipo</th><th>New Tipo</th>
                    <th>Old Clasif</th><th>New Clasif</th>
                    <th>Decidido por</th>
                    <th>Decidido en</th>
                    <th style={{width: 190}}>Acciones</th>
                  </tr>
                  {/* filtros por columna */}
                  <tr>
                    <th>
                      <Button size="sm" variant="outline-secondary" onClick={limpiarFiltrosCola}>Limpiar</Button>
                    </th>
                    <th>
                      <Form.Select size="sm" value={fEstado} onChange={e=>setFEstado(e.target.value)}>
                        <option value="">—</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="aplicada">Aplicada</option>
                        <option value="rechazada">Rechazada</option>
                      </Form.Select>
                    </th>
                    <th><Form.Control size="sm" value={fSKU} onChange={e=>setFSKU(e.target.value)} placeholder="SKU" /></th>
                    <th><Form.Control size="sm" value={fOldCat} onChange={e=>setFOldCat(e.target.value)} placeholder="Old cat" /></th>
                    <th><Form.Control size="sm" value={fNewCat} onChange={e=>setFNewCat(e.target.value)} placeholder="New cat" /></th>
                    <th><Form.Control size="sm" value={fOldTipo} onChange={e=>setFOldTipo(e.target.value)} placeholder="Old tipo" /></th>
                    <th><Form.Control size="sm" value={fNewTipo} onChange={e=>setFNewTipo(e.target.value)} placeholder="New tipo" /></th>
                    <th><Form.Control size="sm" value={fOldCla} onChange={e=>setFOldCla(e.target.value)} placeholder="Old clasif" /></th>
                    <th><Form.Control size="sm" value={fNewCla} onChange={e=>setFNewCla(e.target.value)} placeholder="New clasif" /></th>
                    <th><Form.Control size="sm" value={fDecideBy} onChange={e=>setFDecideBy(e.target.value)} placeholder="email" /></th>
                    <th />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {colaFiltrada.map(a => {
                    const rowClass =
                      a.archivada ? 'table-secondary' :
                      (a.estado === 'aplicada' ? 'table-success'
                        : a.estado === 'pendiente' ? 'table-warning'
                        : a.estado === 'rechazada' ? 'table-danger' : '')
                    return (
                      <tr key={a.id} className={rowClass}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={seleccion.includes(a.id)}
                            onChange={()=>toggleSel(a.id)}
                          />
                        </td>
                        <td>
                          {badgeDecision(a.estado)}
                          {a.archivada && <Badge bg="secondary" className="ms-1">Archivada</Badge>}
                        </td>
                        <td>{a.sku}</td>
                        <td>{etiqueta(dic?.categorias, a.old_categoria_cod)}</td>
                        <td>{etiqueta(dic?.categorias, a.new_categoria_cod)}</td>
                        <td>{etiqueta(dic?.tipos, a.old_tipo_cod)}</td>
                        <td>{etiqueta(dic?.tipos, a.new_tipo_cod)}</td>
                        <td>{etiqueta(dic?.clasif, a.old_clasif_cod)}</td>
                        <td>{etiqueta(dic?.clasif, a.new_clasif_cod)}</td>
                        <td>{a.decidedBy || '—'}</td>
                        <td>{a.decidedAt ? new Date(a.decidedAt).toLocaleString() : '—'}</td>
                        <td className="text-nowrap">
                          {a.estado !== 'aplicada' ? (
                            <Button size="sm" variant="outline-secondary" className="me-1"
                                    onClick={()=>onUndoRow(a.id)} disabled={!authOK}>
                              Deshacer
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline-primary" className="me-1"
                                    onClick={()=>onRevertRow(a.id)} disabled={!authOK}>
                              Crear reversión
                            </Button>
                          )}
                          <Button size="sm"
                                  variant={a.archivada ? 'outline-dark' : 'outline-secondary'}
                                  onClick={()=>onToggleArchiveRow(a)} disabled={!authOK}>
                            {a.archivada ? 'Desarchivar' : 'Archivar'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {!colaFiltrada.length && (
                    <tr><td colSpan={12} className="text-center text-muted py-4">Sin resultados</td></tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="export" title="Exportar">
          <Card>
            <Card.Header className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
              <div>
                <strong>Exportación de decisiones</strong>
                <div className="text-muted small">
                  Exportá las decisiones aceptadas para actualizar tu sistema de gestión.
                </div>
              </div>
              <Button
                variant="outline-secondary"
                onClick={() => setActiveTab('cola')}
              >
                Volver a Paso 2
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Body>
                      <h6>Exportación CSV</h6>
                      <p className="text-muted small">
                        Descarga el detalle completo de actualizaciones de la campaña.
                      </p>
                      <Button variant="primary" disabled={!authOK} onClick={onExportCola}>
                        Exportar CSV de actualizaciones
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Body>
                      <h6>Exportación TXT (aceptadas)</h6>
                      <p className="text-muted small">
                        Exporta sólo los cambios aceptados para cada atributo.
                      </p>
                      <Form.Check
                        type="switch"
                        id="export-include-archived"
                        label="Incluir archivadas"
                        checked={exportIncludeArchived}
                        onChange={e => setExportIncludeArchived(e.target.checked)}
                        className="mb-2"
                      />
                      <div className="d-flex flex-wrap gap-2">
                        <Button
                          variant="outline-primary"
                          disabled={!authOK}
                          onClick={() => onExportTxtCat('aceptadas', exportIncludeArchived)}
                        >
                          TXT Categoría
                        </Button>
                        <Button
                          variant="outline-primary"
                          disabled={!authOK}
                          onClick={() => onExportTxtTipo('aceptadas', exportIncludeArchived)}
                        >
                          TXT Tipo
                        </Button>
                        <Button
                          variant="outline-primary"
                          disabled={!authOK}
                          onClick={() => onExportTxtClasif('aceptadas', exportIncludeArchived)}
                        >
                          TXT Clasif
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </>
  )
}
