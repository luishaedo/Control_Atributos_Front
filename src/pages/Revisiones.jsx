// src/pages/Revisiones.jsx
import React, { useEffect, useRef, useState } from 'react'
import { Card, Button, Row, Col, Form, Badge, Stack, Table, Collapse, ButtonGroup } from 'react-bootstrap'
import { getDictionaries } from '../services/api'
import { pad2 } from '../utils/sku'
import {
  getRevisiones, decidirRevision, listarActualizaciones,
  exportActualizacionesCSV, aplicarActualizaciones
} from '../services/adminApi'

function etiqueta(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr||[]).find(x => x.cod === c)
  return it ? `${c} · ${it.nombre}` : c
}

function badgeDecision(estado) {
  if (estado === 'aplicada') return <Badge bg="success">APLICADA</Badge>
  if (estado === 'pendiente') return <Badge bg="warning" text="dark">ACEPTADA (pend.)</Badge>
  if (estado === 'rechazada') return <Badge bg="danger">RECHAZADA</Badge>
  return <Badge bg="secondary">—</Badge>
}

export default function Revisiones({ campanias, campaniaIdDefault, authOK }) {
  const [dic, setDic] = useState(null)
  const [campaniaId, setCampaniaId] = useState(String(campaniaIdDefault || ''))
  const [sku, setSku] = useState('')
  const [consenso, setConsenso] = useState('') // '', 'true', 'false'
  const [soloDif, setSoloDif] = useState(true)
  const [items, setItems] = useState([])
  const [cola, setCola] = useState([])
  const [seleccion, setSeleccion] = useState([])

  // Filtro nuevo: qué propuestas mostrar
  const [filtroDecision, setFiltroDecision] = useState('pendientes') // 'pendientes' | 'aceptadas' | 'rechazadas' | 'todas'
  const [mostrarCola, setMostrarCola] = useState(false)
  const colaRef = useRef(null)

  useEffect(() => { getDictionaries().then(setDic).catch(()=>{}) }, [])

  async function cargar() {
    const data = await getRevisiones({ campaniaId, sku, consenso, soloConDiferencias: String(soloDif) })
    setItems(data.items || [])
    const acts = await listarActualizaciones(Number(campaniaId))
    setCola(acts.items || [])
  }

  async function onAceptar(sku, prop) {
    await decidirRevision({
      campaniaId: Number(campaniaId), sku,
      propuesta: prop,
      decision: 'aceptar',
      decidedBy: 'admin@local',
      aplicarAhora: false
    })
    await cargar()
  }

  async function onRechazar(sku, prop) {
    await decidirRevision({
      campaniaId: Number(campaniaId), sku,
      propuesta: prop,
      decision: 'rechazar',
      decidedBy: 'admin@local'
    })
    await cargar()
  }

  async function onExportCola() {
    const blob = await exportActualizacionesCSV(Number(campaniaId))
    descargarBlobDirecto(blob, 'actualizaciones_pendientes.csv')
  }

  async function onAplicarSeleccion() {
    if (!seleccion.length) return
    await aplicarActualizaciones(seleccion, 'admin@local')
    setSeleccion([])
    await cargar()
  }

  function toggleSel(id) {
    setSeleccion(sel => sel.includes(id) ? sel.filter(x => x!==id) : [...sel, id])
  }

  function descargarBlobDirecto(blob, nombre) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nombre
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  // Contadores rápidos (pendientes / aceptadas / rechazadas)
  const contadores = items.reduce((acc, it) => {
    for (const p of it.propuestas) {
      if (!p.decision) acc.pendientes++
      else if (p.decision.estado === 'rechazada') acc.rechazadas++
      else acc.aceptadas++ // 'pendiente' o 'aplicada'
    }
    return acc
  }, { pendientes:0, aceptadas:0, rechazadas:0 })

  // Aplica filtro de decisión a las propuestas
  function filtrarPropuestas(p) {
    if (filtroDecision === 'todas') return true
    if (filtroDecision === 'pendientes') return !p.decision
    if (filtroDecision === 'rechazadas') return p.decision?.estado === 'rechazada'
    if (filtroDecision === 'aceptadas') return p.decision && p.decision.estado !== 'rechazada'
    return true
  }

  return (
    <>
      <Card className="mb-3">
        <Card.Body className="row g-2">
          <div className="col-md-3">
            <Form.Label>Campaña</Form.Label>
            <Form.Select value={campaniaId} onChange={e => setCampaniaId(e.target.value)}>
              {campanias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Label>SKU (contiene)</Form.Label>
            <Form.Control value={sku} onChange={e=>setSku(e.target.value)} placeholder="ABC" />
          </div>
          <div className="col-md-2">
            <Form.Label>Consenso</Form.Label>
            <Form.Select value={consenso} onChange={e=>setConsenso(e.target.value)}>
              <option value="">Todos</option>
              <option value="true">Sólo con consenso</option>
              <option value="false">Sólo sin consenso</option>
            </Form.Select>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <Form.Check type="switch" id="solo-dif" label="Sólo diferencias" checked={soloDif} onChange={e=>setSoloDif(e.target.checked)} />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <Button onClick={cargar} disabled={!authOK} className="w-100">Buscar</Button>
          </div>
        </Card.Body>
      </Card>

      {/* Filtro por estado de decisión */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <ButtonGroup>
          <Button variant={filtroDecision==='pendientes' ? 'primary' : 'outline-primary'} onClick={()=>setFiltroDecision('pendientes')}>
            Pendientes ({contadores.pendientes})
          </Button>
          <Button variant={filtroDecision==='aceptadas' ? 'success' : 'outline-success'} onClick={()=>setFiltroDecision('aceptadas')}>
            Aceptadas ({contadores.aceptadas})
          </Button>
          <Button variant={filtroDecision==='rechazadas' ? 'danger' : 'outline-danger'} onClick={()=>setFiltroDecision('rechazadas')}>
            Rechazadas ({contadores.rechazadas})
          </Button>
          <Button variant={filtroDecision==='todas' ? 'secondary' : 'outline-secondary'} onClick={()=>setFiltroDecision('todas')}>
            Todas
          </Button>
        </ButtonGroup>

        <div className="d-flex gap-2">
          <Button variant="outline-dark" onClick={() => { setMostrarCola(true); setTimeout(()=>colaRef.current?.scrollIntoView({behavior:'smooth'}), 50) }}>
            Ir a cola de actualizaciones
          </Button>
        </div>
      </div>

      {/* Lista de tarjetas por SKU */}
      {items.map(it => {
        const propsFiltradas = it.propuestas.filter(filtrarPropuestas)
        if (!propsFiltradas.length) return null

        // Color de borde por consenso
        const borde = it.hayConsenso ? 'border-success' : 'border-warning'
        const bordeWidth = 'border-start border-4'

        return (
          <Card key={it.sku} className={`mb-3 ${bordeWidth} ${borde}`}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <strong>{it.sku}</strong>
                {it.hayConsenso && <Badge bg="success">Consenso {Math.round(it.consensoPct*100)}%</Badge>}
                {!it.hayConsenso && <Badge bg="warning" text="dark">Sin consenso</Badge>}
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

                          {/* Acciones / Estado */}
                          <div className="d-flex align-items-center gap-3">
                            {p.decision ? (
                              <div>{badgeDecision(p.decision.estado)}</div>
                            ) : (
                              <>
                                <Button variant="outline-danger" size="sm" onClick={()=>onRechazar(it.sku, p)} disabled={!authOK}>Rechazar</Button>
                                <Button variant="success" size="sm" onClick={()=>onAceptar(it.sku, p)} disabled={!authOK}>Aceptar</Button>
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

      {/* Cola de actualizaciones */}
      <div ref={colaRef} />
      <Card className="mt-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Cola de actualizaciones</span>
          <div className="d-flex gap-2">
            <Button variant={mostrarCola ? 'outline-secondary' : 'secondary'} onClick={()=>setMostrarCola(v=>!v)}>
              {mostrarCola ? 'Ocultar' : 'Mostrar'}
            </Button>
            <Button variant="outline-secondary" onClick={onExportCola} disabled={!authOK}>Exportar pendientes (CSV)</Button>
            <Button variant="primary" onClick={onAplicarSeleccion} disabled={!authOK || !seleccion.length}>Aplicar seleccionadas</Button>
          </div>
        </Card.Header>

        <Collapse in={mostrarCola}>
          <div>
            <Card.Body>
              <Table size="sm" bordered hover>
                <thead>
                  <tr>
                    <th></th>
                    <th>Estado</th><th>SKU</th>
                    <th>Old Cat</th><th>New Cat</th>
                    <th>Old Tipo</th><th>New Tipo</th>
                    <th>Old Clasif</th><th>New Clasif</th>
                    <th>Decidido por</th><th>Decidido en</th>
                  </tr>
                </thead>
                <tbody>
                  {cola.map(a => {
                    const rowClass =
                      a.estado === 'aplicada' ? 'table-success' :
                      a.estado === 'pendiente' ? 'table-warning' :
                      a.estado === 'rechazada' ? 'table-danger' : ''
                    return (
                      <tr key={a.id} className={rowClass}>
                        <td>
                          <Form.Check type="checkbox" disabled={a.estado!=='pendiente'} checked={seleccion.includes(a.id)} onChange={()=>toggleSel(a.id)} />
                        </td>
                        <td>{badgeDecision(a.estado)}</td>
                        <td>{a.sku}</td>
                        <td>{etiqueta(dic?.categorias, a.old_categoria_cod)}</td>
                        <td>{etiqueta(dic?.categorias, a.new_categoria_cod)}</td>
                        <td>{etiqueta(dic?.tipos, a.old_tipo_cod)}</td>
                        <td>{etiqueta(dic?.tipos, a.new_tipo_cod)}</td>
                        <td>{etiqueta(dic?.clasif, a.old_clasif_cod)}</td>
                        <td>{etiqueta(dic?.clasif, a.new_clasif_cod)}</td>
                        <td>{a.decidedBy || '—'}</td>
                        <td>{a.decidedAt ? new Date(a.decidedAt).toLocaleString() : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </div>
        </Collapse>
      </Card>
    </>
  )
}
