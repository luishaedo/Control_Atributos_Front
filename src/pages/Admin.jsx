
import React, { useEffect, useState } from 'react'
import { Container, Card, Form, Button, Row, Col, Alert, Tab, Tabs, Table, Badge } from 'react-bootstrap'
import Topbar from '../components/Topbar.jsx'
import { getCampaigns, setActiveCampaign, getDictionaries } from '../services/api.js'
import { pad2 } from '../utils/sku.js'
import Revisiones from './Revisiones.jsx'
import {
  adminPing, adminSetToken, adminGetToken,
  importarDiccionariosJSON, importarMaestroJSON,
  crearCampania,
  getDiscrepancias, getDiscrepanciasSucursales, exportDiscrepanciasCSV,
  exportMaestroCSV, exportCategoriasCSV, exportTiposCSV, exportClasifCSV
} from '../services/adminApi.js'

export default function Admin() {
  const [user] = useState({ email: 'admin@local', sucursal: 'Admin' })

  const [token, setToken] = useState(adminGetToken())
  const [authOK, setAuthOK] = useState(false)
  const [error, setError] = useState(null)

  const [dic, setDic] = useState(null)

  const [dicEjemplo, setDicEjemplo] = useState(JSON.stringify({
    categorias: [{ cod: '01', nombre: 'Jean' }],
    tipos: [{ cod: '10', nombre: 'Slim' }],
    clasif: [{ cod: '12', nombre: 'Hombre' }]
  }, null, 2))
  const [maestroEjemplo, setMaestroEjemplo] = useState(JSON.stringify([
    { sku: 'THJ00406207', descripcion: 'Jean Runden Slim Hombre', categoria_cod: '01', tipo_cod: '10', clasif_cod: '12' }
  ], null, 2))

  const [campanias, setCampanias] = useState([])
  const [nuevaCamp, setNuevaCamp] = useState({
    nombre: '', inicia: '', termina: '',
    categoria_objetivo_cod: '', tipo_objetivo_cod: '', clasif_objetivo_cod: ''
  })

  const [campaniaIdAud, setCampaniaIdAud] = useState('')
  const [discrepancias, setDiscrepancias] = useState([])
  const [discrepSuc, setDiscrepSuc] = useState([])

  useEffect(() => {
    if (token) {
      adminSetToken(token)
      adminPing().then(() => setAuthOK(true)).catch(() => setAuthOK(false))
    }
    cargarCampanias()
    getDictionaries().then(setDic).catch(() => {})
  }, [])

  async function cargarCampanias() {
    try {
      const list = await getCampaigns()
      setCampanias(list)
      if (!campaniaIdAud && list.length) {
        setCampaniaIdAud(String(list.find(c => c.activa)?.id || list[0].id))
      }
    } catch (_) { /* noop */ }
  }

  async function doLogin(e) {
    e.preventDefault()
    try {
      setError(null)
      adminSetToken(token)
      await adminPing()
      setAuthOK(true)
    } catch {
      setAuthOK(false)
      setError('Token inválido o el servidor no respondió')
    }
  }

  async function subirDiccionarios() {
    try {
      setError(null)
      const payload = JSON.parse(dicEjemplo)
      const r = await importarDiccionariosJSON(payload)
      alert('OK: ' + JSON.stringify(r))
      getDictionaries().then(setDic)
    } catch (e) {
      setError(e.message || 'Error importando diccionarios (¿JSON válido?)')
    }
  }

  async function subirMaestro() {
    try {
      setError(null)
      const items = JSON.parse(maestroEjemplo)
      const r = await importarMaestroJSON(items)
      alert('OK: ' + JSON.stringify(r))
    } catch (e) {
      setError(e.message || 'Error importando maestro (¿JSON válido?)')
    }
  }

  async function crearNuevaCampania() {
    try {
      setError(null)
      const r = await crearCampania({ ...nuevaCamp, activa: false })
      alert('Campaña creada: ' + r.id)
      setNuevaCamp({
        nombre: '', inicia: '', termina: '',
        categoria_objetivo_cod: '', tipo_objetivo_cod: '', clasif_objetivo_cod: ''
      })
      cargarCampanias()
    } catch (e) {
      setError(e.message || 'Error creando campaña')
    }
  }

  async function activarCamp(id) {
    try {
      await setActiveCampaign(id)
      cargarCampanias()
    } catch (e) {
      setError(e.message || 'No se pudo activar')
    }
  }

  async function cargarDiscrepancias() {
    try {
      if (!campaniaIdAud) { alert('Elegí una campaña primero'); return }
      setError(null)
      const data = await getDiscrepancias(Number(campaniaIdAud))
      setDiscrepancias(data.items || [])
    } catch (e) {
      setError(e.message || 'Error cargando discrepancias')
    }
  }

  async function cargarDiscrepSuc() {
    try {
      if (!campaniaIdAud) { alert('Elegí una campaña primero'); return }
      setError(null)
      const data = await getDiscrepanciasSucursales(Number(campaniaIdAud))
      setDiscrepSuc(data.items || [])
    } catch (e) {
      setError(e.message || 'Error cargando discrepancias entre sucursales')
    }
  }

  async function bajarCSVDiscrepancias() {
    try {
      const blob = await exportDiscrepanciasCSV(Number(campaniaIdAud))
      descargarBlobDirecto(blob, `discrepancias_campania_${campaniaIdAud}.csv`)
    } catch (e) {
      setError(e.message || 'No se pudo exportar CSV')
    }
  }

  function descargarBlobDirecto(blob, nombre) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  async function descargarBlob(promiseBlobFn, nombre) {
    try {
      const blob = await promiseBlobFn()
      descargarBlobDirecto(blob, nombre)
    } catch (e) {
      setError(e.message || 'No se pudo descargar CSV')
    }
  }

  // === Helpers UI ===
  function etiqueta(dicArr, cod) {
    if (!cod) return '—'
    const c = pad2(cod)
    const item = (dicArr || []).find(d => d.cod === c)
    return item ? `${c} · ${item.nombre}` : c
  }
  function etiquetas(dicArr, lista) {
    if (!lista?.length) return '—'
    return lista.map(c => etiqueta(dicArr, c)).join(', ')
  }
  function variantEstado(estado) {
    if (estado === 'OK') return 'success'
    if (estado === 'REVISAR') return 'warning'
    if (estado === 'NO_MAESTRO') return 'danger'
    return 'secondary'
  }
  function BadgeEstado({ estado }) {
    return <Badge bg={variantEstado(estado)}>{estado}</Badge>
  }

  return (
    <div>
      <Topbar user={user} onChangeUser={() => {}} />
      <Container className="pb-5">
        <Card className="mb-3">
          <Card.Body>
            <Form onSubmit={doLogin} className="d-flex gap-2">
              <Form.Control
                type="password"
                placeholder="Token de administrador"
                value={token}
                onChange={e => setToken(e.target.value)}
              />
              <Button type="submit" variant={authOK ? 'success' : 'primary'}>
                {authOK ? 'Autenticado' : 'Ingresar'}
              </Button>
            </Form>
            <Form.Text className="text-muted">
              Se envía en <code>Authorization: Bearer &lt;TOKEN&gt;</code> a /api/admin/*
            </Form.Text>
            {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
          </Card.Body>
        </Card>

        <Tabs defaultActiveKey="import" className="mb-3">
          <Tab eventKey="import" title="Maestro & Diccionarios">
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>Importar Diccionarios (JSON)</Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-2">
                      <Form.Label>Payload ejemplo</Form.Label>
                      <Form.Control as="textarea" rows={10} value={dicEjemplo} onChange={e => setDicEjemplo(e.target.value)} />
                    </Form.Group>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button onClick={subirDiccionarios} disabled={!authOK}>Subir diccionarios</Button>
                      <Button variant="outline-secondary" onClick={() => descargarBlob(exportCategoriasCSV, 'categorias.csv')} disabled={!authOK}>
                        Descargar categorías (CSV)
                      </Button>
                      <Button variant="outline-secondary" onClick={() => descargarBlob(exportTiposCSV, 'tipos.csv')} disabled={!authOK}>
                        Descargar tipos (CSV)
                      </Button>
                      <Button variant="outline-secondary" onClick={() => descargarBlob(exportClasifCSV, 'clasif.csv')} disabled={!authOK}>
                        Descargar clasif (CSV)
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>Importar Maestro (JSON)</Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-2">
                      <Form.Label>Lista de items</Form.Label>
                      <Form.Control as="textarea" rows={10} value={maestroEjemplo} onChange={e => setMaestroEjemplo(e.target.value)} />
                    </Form.Group>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button onClick={subirMaestro} disabled={!authOK}>Subir maestro</Button>
                      <Button variant="outline-secondary" onClick={() => descargarBlob(exportMaestroCSV, 'maestro.csv')} disabled={!authOK}>
                        Descargar Maestro (CSV)
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="campanias" title="Campañas">
            <Row className="g-3">
              <Col md={6}>
                <Card>
                  <Card.Header>Crear campaña</Card.Header>
                  <Card.Body>
                    <Form className="row g-2">
                      <div className="col-12">
                        <Form.Label>Nombre</Form.Label>
                        <Form.Control value={nuevaCamp.nombre} onChange={e => setNuevaCamp({ ...nuevaCamp, nombre: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <Form.Label>Inicia</Form.Label>
                        <Form.Control type="date" value={nuevaCamp.inicia} onChange={e => setNuevaCamp({ ...nuevaCamp, inicia: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <Form.Label>Termina</Form.Label>
                        <Form.Control type="date" value={nuevaCamp.termina} onChange={e => setNuevaCamp({ ...nuevaCamp, termina: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <Form.Label>Cat objetivo</Form.Label>
                        <Form.Control value={nuevaCamp.categoria_objetivo_cod} onChange={e => setNuevaCamp({ ...nuevaCamp, categoria_objetivo_cod: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <Form.Label>Tipo objetivo</Form.Label>
                        <Form.Control value={nuevaCamp.tipo_objetivo_cod} onChange={e => setNuevaCamp({ ...nuevaCamp, tipo_objetivo_cod: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <Form.Label>Clasif objetivo</Form.Label>
                        <Form.Control value={nuevaCamp.clasif_objetivo_cod} onChange={e => setNuevaCamp({ ...nuevaCamp, clasif_objetivo_cod: e.target.value })} />
                      </div>
                    </Form>
                    <div className="mt-3 d-flex gap-2">
                      <Button onClick={crearNuevaCampania} disabled={!authOK}>Crear</Button>
                      <Button variant="secondary" onClick={cargarCampanias}>Refrescar</Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card>
                  <Card.Header>Campañas existentes</Card.Header>
                  <Card.Body>
                    {campanias.map(c => (
                      <div key={c.id} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
                        <div>
                          <div className="fw-bold">{c.nombre} {c.activa ? '✅' : ''}</div>
                          <small className="text-muted">{c.inicia} → {c.termina}</small>
                          <div><small>Filtros: {c.categoria_objetivo_cod || '—'} / {c.tipo_objetivo_cod || '—'} / {c.clasif_objetivo_cod || '—'}</small></div>
                        </div>
                        <Button
                          size="sm"
                          variant={c.activa ? 'success' : 'outline-secondary'}
                          onClick={() => activarCamp(c.id)}
                          disabled={!authOK}
                        >
                          {c.activa ? 'Activa' : 'Activar'}
                        </Button>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="auditoria" title="Auditoría">
            <Card className="mb-3">
              <Card.Body className="row g-2">
                <div className="col-md-4">
                  <Form.Label>Campaña</Form.Label>
                  <Form.Select value={campaniaIdAud} onChange={e => setCampaniaIdAud(e.target.value)}>
                    {campanias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </Form.Select>
                </div>
                <div className="col-md-8 d-flex align-items-end gap-2">
                  <Button onClick={cargarDiscrepancias} disabled={!authOK}>Ver discrepancias vs Maestro</Button>
                  <Button onClick={cargarDiscrepSuc} disabled={!authOK}>Entre sucursales</Button>
                  <Button variant="outline-primary" onClick={bajarCSVDiscrepancias} disabled={!authOK}>Exportar CSV</Button>
                </div>
              </Card.Body>
            </Card>

            <h6 className="mt-3">Discrepancias vs Maestro</h6>
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>SKU</th><th>Sucursal</th><th>Email</th><th>Estado</th>
                  <th>Cat M</th><th>Cat A</th>
                  <th>Tipo M</th><th>Tipo A</th>
                  <th>Clasif M</th><th>Clasif A</th>
                </tr>
              </thead>
              <tbody>
                {discrepancias.map((d,i) => {
                  const rowClass =
                    d.estado === 'REVISAR' ? 'table-warning' :
                    d.estado === 'NO_MAESTRO' ? 'table-danger' : ''
                  return (
                    <tr key={i} className={rowClass}>
                      <td>{d.sku}</td>
                      <td>{d.sucursal || '—'}</td>
                      <td>{d.email || '—'}</td>
                      <td><BadgeEstado estado={d.estado} /></td>
                      <td>{etiqueta(dic?.categorias, d.maestro?.categoria_cod)}</td>
                      <td>{etiqueta(dic?.categorias, d.asumidos?.categoria_cod)}</td>
                      <td>{etiqueta(dic?.tipos, d.maestro?.tipo_cod)}</td>
                      <td>{etiqueta(dic?.tipos, d.asumidos?.tipo_cod)}</td>
                      <td>{etiqueta(dic?.clasif, d.maestro?.clasif_cod)}</td>
                      <td>{etiqueta(dic?.clasif, d.asumidos?.clasif_cod)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>

            <h6 className="mt-4">Discrepancias entre sucursales</h6>
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>SKU</th><th>Cat distintos</th><th>Tipo distintos</th><th>Clasif distintos</th>
                </tr>
              </thead>
              <tbody>
                {discrepSuc.map((r,i) => (
                  <tr key={i}>
                    <td>{r.sku}</td>
                    <td>{etiquetas(dic?.categorias, r.categorias)}</td>
                    <td>{etiquetas(dic?.tipos, r.tipos)}</td>
                    <td>{etiquetas(dic?.clasif, r.clasif)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>

          {/* Nueva pestaña: Revisiones con filtros y cola */}
          <Tab eventKey="revisiones" title="Revisiones">
            <Revisiones
              campanias={campanias}
              campaniaIdDefault={(campanias.find(c=>c.activa)?.id || campanias[0]?.id)}
              authOK={authOK}
            />
          </Tab>
        </Tabs>
      </Container>
    </div>
  )
}
