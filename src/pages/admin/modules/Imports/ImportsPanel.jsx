import React from 'react'
import { Card, Row, Col, Form, Spinner } from 'react-bootstrap'
import { AppAlert, AppButton } from '../../../../components/ui.jsx'

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
}) {
  return (
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
  )
}
