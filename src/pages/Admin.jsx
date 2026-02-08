import { useNavigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { Container, Card, Form, Button, Row, Col, Alert, Tab, Tabs, Table, Spinner, Accordion, Modal, Pagination } from 'react-bootstrap'
import Topbar from '../components/Topbar.jsx'
import IdentityModal from '../components/IdentityModal.jsx'
import { getCampaigns, getDictionaries, getMaestroList } from '../services/api.js'
import Revisiones from './Revisiones.jsx'
import {
  adminPing, adminLogin,
  crearCampania, actualizarCampania, activarCampania,
  exportMaestroCSV, exportCategoriasCSV, exportTiposCSV, exportClasifCSV
} from '../services/adminApi.js'
import { uploadDiccionarios, uploadMaestro } from '../services/adminImportApi.js'


function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem('cc_user') || 'null')
  } catch {
    return null
  }
}

function setUserLS(u) {
  localStorage.setItem('cc_user', JSON.stringify(u || {}))
}

export default function Admin() {
  const [user, setUser] = useState(getUserLS() || { email: 'admin@local', sucursal: 'Admin' })

  const [token, setToken] = useState('')
  const [authOK, setAuthOK] = useState(false)
  const [error, setError] = useState(null)
  const [filesDic, setFilesDic] = useState({ categorias: null, tipos: null, clasif: null })
  const [fileMae, setFileMae] = useState(null)
  const [importMsg, setImportMsg] = useState('')
  const [isUploadingDic, setIsUploadingDic] = useState(false)
  const [isUploadingMae, setIsUploadingMae] = useState(false)
  const [dicPreview, setDicPreview] = useState(null)
  const [maestroPreview, setMaestroPreview] = useState({ items: [], total: 0 })
  const [maestroQuery, setMaestroQuery] = useState('')
  const [maestroPage, setMaestroPage] = useState(1)
  const maestroPageSize = 20

  const [campanias, setCampanias] = useState([])
  const [nuevaCamp, setNuevaCamp] = useState({
    nombre: '', inicia: '', termina: '',
    categoria_objetivo_cod: '', tipo_objetivo_cod: '', clasif_objetivo_cod: ''
  })
  const navigate = useNavigate()
  const isUploading = isUploadingDic || isUploadingMae
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editCamp, setEditCamp] = useState(null)

  useEffect(() => {
    adminPing().then(() => setAuthOK(true)).catch(() => setAuthOK(false))
    cargarCampanias()
    cargarPreview()
  }, [])

  useEffect(() => {
    cargarPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maestroQuery, maestroPage])

  function guardarIdentificacion(nuevo) {
    setUser(nuevo)
    setUserLS(nuevo)
    setShowIdentityModal(false)
  }

  function cambiarIdentificacion() {
    setShowIdentityModal(true)
  }

  async function importarDicPorArchivo() {
    if (isUploadingDic) return
    const hasFiles = Boolean(filesDic.categorias || filesDic.tipos || filesDic.clasif)
    if (!hasFiles) {
      setError('Seleccioná al menos un archivo de diccionario antes de subir.')
      return
    }
    try {
      setIsUploadingDic(true)
      setError(null)
      setImportMsg('')
      const r = await uploadDiccionarios(filesDic)
      setImportMsg(`Diccionarios OK → categorías=${r.categorias}, tipos=${r.tipos}, clasif=${r.clasif}`)
      cargarPreview()
    } catch (e) {
      setError(e.message || 'Error importando diccionarios (archivo)')
    } finally {
      setIsUploadingDic(false)
    }
  }
  async function importarMaePorArchivo() {
    if (isUploadingMae) return
    if (!fileMae) {
      setError('Seleccioná un archivo maestro antes de subir.')
      return
    }
    try {
      setIsUploadingMae(true)
      setError(null)
      setImportMsg('')
      const r = await uploadMaestro({ maestro: fileMae })
      setImportMsg(`Maestro OK → ${r.count} items`)
      cargarPreview()
    } catch (e) {
      setError(e.message || 'Error importando maestro (archivo)')
    } finally {
      setIsUploadingMae(false)
    }
  }

  async function cargarCampanias() {
    try {
      const list = await getCampaigns()
      setCampanias(list)
    } catch (_) { /* noop */ }
  }

  async function cargarPreview() {
    try {
      const [dic, maestro] = await Promise.all([
        getDictionaries(),
        getMaestroList({ q: maestroQuery, page: maestroPage, pageSize: maestroPageSize }),
      ])
      setDicPreview(dic)
      setMaestroPreview({
        items: maestro?.items || [],
        total: maestro?.total || 0,
      })
    } catch (_) { /* noop */ }
  }

  async function doLogin(e) {
    e.preventDefault()
    try {
      setError(null)
      await adminLogin(token)
      await adminPing()
      setAuthOK(true)
    } catch {
      setAuthOK(false)
      setError('Token inválido o el servidor no respondió')
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
      await activarCampania(id)
      cargarCampanias()
    } catch (e) {
      setError(e.message || 'No se pudo activar')
    }
  }

  function abrirEdicion(c) {
    setEditCamp({
      id: c.id,
      nombre: c.nombre || '',
      inicia: c.inicia ? String(c.inicia).slice(0, 10) : '',
      termina: c.termina ? String(c.termina).slice(0, 10) : '',
      categoria_objetivo_cod: c.categoria_objetivo_cod || '',
      tipo_objetivo_cod: c.tipo_objetivo_cod || '',
      clasif_objetivo_cod: c.clasif_objetivo_cod || ''
    })
    setShowEditModal(true)
  }

  async function guardarEdicionCampania() {
    if (!editCamp?.id) return
    try {
      await actualizarCampania(editCamp.id, {
        nombre: editCamp.nombre,
        inicia: editCamp.inicia,
        termina: editCamp.termina,
        categoria_objetivo_cod: editCamp.categoria_objetivo_cod,
        tipo_objetivo_cod: editCamp.tipo_objetivo_cod,
        clasif_objetivo_cod: editCamp.clasif_objetivo_cod,
      })
      setShowEditModal(false)
      setEditCamp(null)
      cargarCampanias()
    } catch (e) {
      setError(e.message || 'No se pudo actualizar la campaña')
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

  const [activeAdminTab, setActiveAdminTab] = useState('revisiones')

  return (
    <div>
      <Topbar user={user} onChangeUser={cambiarIdentificacion} />
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
              Se guarda en cookie segura (HttpOnly) y se envía automáticamente a /api/admin/*
            </Form.Text>
            {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
          </Card.Body>
        </Card>
        <div className="d-flex justify-content-end mb-2 gap-2">
          <Button variant="outline-secondary" onClick={() => setActiveAdminTab('campanias')}>
            Campaña
          </Button>
          <Button variant="outline-secondary" onClick={() => setActiveAdminTab('import')}>
            Maestro
          </Button>
          <Button variant="outline-primary" onClick={() => navigate('/auditoria')}>
            Auditoría
          </Button>
        </div>
        <Tabs activeKey={activeAdminTab} onSelect={(k) => setActiveAdminTab(k || 'revisiones')} className="mb-3">
           <Tab eventKey="revisiones" title="Acciones">
            <Revisiones
              campanias={campanias}
              campaniaIdDefault={(campanias.find(c=>c.activa)?.id || campanias[0]?.id)}
              authOK={authOK}
            />
          </Tab>
          <Tab eventKey="import" title="Maestro & Diccionarios">
            <Card className="mb-3">
  <Card.Header>Importar por Archivo (CSV)</Card.Header>
  <Card.Body>
    <Row className="g-3">
      <Col md={6}>
        <div className="mb-2 fw-semibold">Diccionarios</div>

        <Form.Group className="mb-2">
          <Form.Label>Categorías (CSV)</Form.Label>
          <Form.Control
            type="file"
            accept=".csv"
            disabled={!authOK || isUploading}
            onChange={e => setFilesDic(s => ({ ...s, categorias: e.target.files?.[0] || null }))}
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>Tipos (CSV)</Form.Label>
          <Form.Control
            type="file"
            accept=".csv"
            disabled={!authOK || isUploading}
            onChange={e => setFilesDic(s => ({ ...s, tipos: e.target.files?.[0] || null }))}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Clasificaciones (CSV)</Form.Label>
          <Form.Control
            type="file"
            accept=".csv"
            disabled={!authOK || isUploading}
            onChange={e => setFilesDic(s => ({ ...s, clasif: e.target.files?.[0] || null }))}
          />
        </Form.Group>

        <Button
          onClick={importarDicPorArchivo}
          disabled={!authOK || isUploading || !(filesDic.categorias || filesDic.tipos || filesDic.clasif)}
        >
          Subir diccionarios
        </Button>
      </Col>

      <Col md={6}>
        <div className="mb-2 fw-semibold">Maestro</div>

        <Form.Group className="mb-3">
          <Form.Label>Archivo maestro (CSV)</Form.Label>
          <Form.Control
            type="file"
            accept=".csv"
            disabled={!authOK || isUploading}
            onChange={e => setFileMae(e.target.files?.[0] || null)}
          />
        </Form.Group>

        <Button onClick={importarMaePorArchivo} disabled={!authOK || isUploading || !fileMae}>
          Subir maestro
        </Button>
      </Col>
    </Row>

    {isUploading && (
      <div className="mt-3 text-muted d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
        <span>Cargando…</span>
      </div>
    )}
    {importMsg && <Alert variant="success" className="mt-3">{importMsg}</Alert>}

    <div className="mt-3 small text-muted">
      <div>Encabezados esperados:</div>
      <ul className="mb-0">
        <li>Diccionarios: <code>Código,Descripción</code></li>
        <li>Maestro: <code>Código,Descripción,Categoría,Tipo,Clasificación</code></li>
      </ul>
      <div>Los códigos 1..9 se normalizan automáticamente a 2 dígitos (01..09).</div>
    </div>
  </Card.Body>
</Card>
            <div className="d-flex justify-content-end mb-2">
              <Button variant="outline-secondary" size="sm" onClick={cargarPreview}>
                Actualizar vista
              </Button>
            </div>
            <Accordion className="mb-3">
              <Accordion.Item eventKey="diccionarios">
                <Accordion.Header>Ver diccionarios cargados</Accordion.Header>
                <Accordion.Body>
                  <div className="d-flex gap-2 flex-wrap mb-3">
                    <Button variant="outline-secondary" onClick={() => descargarBlob(exportCategoriasCSV, "categorias.csv")} disabled={!authOK}>
                      Descargar categorías (CSV)
                    </Button>
                    <Button variant="outline-secondary" onClick={() => descargarBlob(exportTiposCSV, "tipos.csv")} disabled={!authOK}>
                      Descargar tipos (CSV)
                    </Button>
                    <Button variant="outline-secondary" onClick={() => descargarBlob(exportClasifCSV, "clasif.csv")} disabled={!authOK}>
                      Descargar clasif (CSV)
                    </Button>
                  </div>
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="fw-semibold mb-2">Categorías</div>
                      <Table size="sm" bordered hover>
                        <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                        <tbody>
                          {(dicPreview?.categorias || []).map((c) => (
                            <tr key={c.cod}><td>{c.cod}</td><td>{c.nombre}</td></tr>
                          ))}
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={4}>
                      <div className="fw-semibold mb-2">Tipos</div>
                      <Table size="sm" bordered hover>
                        <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                        <tbody>
                          {(dicPreview?.tipos || []).map((c) => (
                            <tr key={c.cod}><td>{c.cod}</td><td>{c.nombre}</td></tr>
                          ))}
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={4}>
                      <div className="fw-semibold mb-2">Clasif</div>
                      <Table size="sm" bordered hover>
                        <thead><tr><th>Cod</th><th>Nombre</th></tr></thead>
                        <tbody>
                          {(dicPreview?.clasif || []).map((c) => (
                            <tr key={c.cod}><td>{c.cod}</td><td>{c.nombre}</td></tr>
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
                    <Button variant="outline-secondary" onClick={() => descargarBlob(exportMaestroCSV, "maestro.csv")} disabled={!authOK}>
                      Descargar Maestro (CSV)
                    </Button>
                    <div className="text-muted small">Total: {maestroPreview.total}</div>
                    <Form.Control
                      size="sm"
                      placeholder="Buscar SKU o descripción"
                      value={maestroQuery}
                      onChange={e => { setMaestroPage(1); setMaestroQuery(e.target.value) }}
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
                      {(maestroPreview.items || []).map((m) => (
                        <tr key={m.sku}>
                          <td>{m.sku}</td>
                          <td>{m.descripcion}</td>
                          <td>{m.categoria_cod}</td>
                          <td>{m.tipo_cod}</td>
                          <td>{m.clasif_cod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="d-flex justify-content-center">
                    <Pagination size="sm">
                      <Pagination.First onClick={() => setMaestroPage(1)} disabled={maestroPage === 1} />
                      <Pagination.Prev onClick={() => setMaestroPage(p => Math.max(1, p - 1))} disabled={maestroPage === 1} />
                      <Pagination.Item active>{maestroPage}</Pagination.Item>
                      <Pagination.Next
                        onClick={() => setMaestroPage(p => Math.min(Math.max(1, Math.ceil(maestroPreview.total / maestroPageSize)), p + 1))}
                        disabled={maestroPage >= Math.max(1, Math.ceil(maestroPreview.total / maestroPageSize))}
                      />
                      <Pagination.Last
                        onClick={() => setMaestroPage(Math.max(1, Math.ceil(maestroPreview.total / maestroPageSize)))}
                        disabled={maestroPage >= Math.max(1, Math.ceil(maestroPreview.total / maestroPageSize))}
                      />
                    </Pagination>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
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
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => abrirEdicion(c)}
                            disabled={!authOK || c.activatedOnce}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant={c.activa ? 'success' : 'outline-secondary'}
                            onClick={() => activarCamp(c.id)}
                            disabled={!authOK}
                          >
                            {c.activa ? 'Activa' : 'Activar'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>
      </Container>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar campaña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="row g-2">
            <div className="col-12">
              <Form.Label>Nombre</Form.Label>
              <Form.Control value={editCamp?.nombre || ''} onChange={e => setEditCamp(s => ({ ...s, nombre: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>Inicia</Form.Label>
              <Form.Control type="date" value={editCamp?.inicia || ''} onChange={e => setEditCamp(s => ({ ...s, inicia: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>Termina</Form.Label>
              <Form.Control type="date" value={editCamp?.termina || ''} onChange={e => setEditCamp(s => ({ ...s, termina: e.target.value }))} />
            </div>
            <div className="col-md-4">
              <Form.Label>Cat objetivo</Form.Label>
              <Form.Control value={editCamp?.categoria_objetivo_cod || ''} onChange={e => setEditCamp(s => ({ ...s, categoria_objetivo_cod: e.target.value }))} />
            </div>
            <div className="col-md-4">
              <Form.Label>Tipo objetivo</Form.Label>
              <Form.Control value={editCamp?.tipo_objetivo_cod || ''} onChange={e => setEditCamp(s => ({ ...s, tipo_objetivo_cod: e.target.value }))} />
            </div>
            <div className="col-md-4">
              <Form.Label>Clasif objetivo</Form.Label>
              <Form.Control value={editCamp?.clasif_objetivo_cod || ''} onChange={e => setEditCamp(s => ({ ...s, clasif_objetivo_cod: e.target.value }))} />
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={guardarEdicionCampania} disabled={!authOK}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
      <IdentityModal
        show={showIdentityModal}
        initialEmail={user?.email || ''}
        initialSucursal={user?.sucursal || ''}
        onSave={guardarIdentificacion}
        onClose={() => setShowIdentityModal(false)}
      />
    </div>
  )
}

