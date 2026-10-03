import React from 'react'
import { Card, Row, Col, Form, Spinner, Button } from 'react-bootstrap'
import { AppAlert, AppButton } from '../../../../components/ui.jsx'
import ImportOmissions from './ImportOmissions.jsx'

export default function ImportsPanel({
  authOK,
  isUploading,
  dictionaryFiles,
  onDictionaryFilesChange,
  onImportDictionaries,
  dictionaryUploadButtonState,
  masterFile,
  onMasterFileChange,
  onImportMaster,
  masterUploadButtonState,
  importMessage,
  omittedRows,
  onImportOmittedRow,
}) {
  return (
    <Card className="mb-3">
      <Card.Header>Importar por Archivo (CSV)</Card.Header>
      <Card.Body>
        <Row className="g-3">
          <Col md={6}>
            <div className="mb-2 fw-semibold">Diccionarios</div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button size="sm" variant="outline-primary" href="/templates/plantilla-categorias.csv" download>Plantilla categorías</Button>
              <Button size="sm" variant="outline-primary" href="/templates/plantilla-tipos.csv" download>Plantilla tipos</Button>
              <Button size="sm" variant="outline-primary" href="/templates/plantilla-clasificaciones.csv" download>Plantilla clasificaciones</Button>
            </div>

            <Form.Group className="mb-2">
              <Form.Label>Categorías (CSV)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv"
                disabled={!authOK || isUploading}
                onChange={(e) => onDictionaryFilesChange((state) => ({ ...state, categorias: e.target.files?.[0] || null }))}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Tipos (CSV)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv"
                disabled={!authOK || isUploading}
                onChange={(e) => onDictionaryFilesChange((state) => ({ ...state, tipos: e.target.files?.[0] || null }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Clasificaciones (CSV)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv"
                disabled={!authOK || isUploading}
                onChange={(e) => onDictionaryFilesChange((state) => ({ ...state, clasif: e.target.files?.[0] || null }))}
              />
            </Form.Group>

            <AppButton
              type="button"
              className="btn btn-primary"
              onClick={onImportDictionaries}
              state={!authOK || isUploading || !(dictionaryFiles.categorias || dictionaryFiles.tipos || dictionaryFiles.clasif) ? 'disabled' : dictionaryUploadButtonState}
              label="Subir diccionarios"
              loadingLabel="Subiendo diccionarios…"
              successLabel="Diccionarios cargados"
              errorLabel="Error al subir"
            />
          </Col>

          <Col md={6}>
            <div className="mb-2 fw-semibold">Maestro</div>
            <div className="mb-3">
              <Button size="sm" variant="outline-primary" href="/templates/plantilla-maestro.csv" download>Descargar plantilla maestro</Button>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Archivo maestro (CSV)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv"
                disabled={!authOK || isUploading}
                onChange={(e) => onMasterFileChange(e.target.files?.[0] || null)}
              />
            </Form.Group>

            <AppButton
              type="button"
              className="btn btn-primary"
              onClick={onImportMaster}
              state={!authOK || isUploading || !masterFile ? 'disabled' : masterUploadButtonState}
              label="Cargar archivo maestro"
              loadingLabel="Cargando archivo maestro…"
              successLabel="Maestro cargado"
              errorLabel="Error al subir"
            />
          </Col>
        </Row>

        {isUploading && (
          <div className="mt-3 text-muted d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
            <span>Cargando…</span>
          </div>
        )}

        {importMessage && (
          <AppAlert
            variant="success"
            className="mt-3"
            title="Importación completada"
            message={importMessage}
            actionHint="Revisá el preview para validar los datos antes de continuar."
          />
        )}

        <ImportOmissions omittedRows={omittedRows} onImportRow={onImportOmittedRow} />

        <div className="mt-3 small text-muted">
          <div>Encabezados de las plantillas descargables:</div>
          <ul className="mb-0">
            <li>Diccionarios: <code>cod,nombre</code></li>
            <li>Maestro: <code>sku,descripcion,categoria_cod,tipo_cod,clasif_cod</code></li>
          </ul>
          <div>Los códigos 1..9 se normalizan a dos dígitos (01..09). Las filas inválidas se omiten y se informan individualmente.</div>
        </div>
      </Card.Body>
    </Card>
  )
}
