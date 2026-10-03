import React, { useState } from 'react'
import { Alert, Button, Form, Table } from 'react-bootstrap'

const FILE_LABELS = {
  categorias: 'Categorías',
  tipos: 'Tipos',
  clasif: 'Clasificaciones',
  maestro: 'Maestro',
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadOmittedRows(fileKey, rows) {
  const sourceHeaders = [...new Set(rows.flatMap(item => Object.keys(item.raw || {})))]
  const headers = [...sourceHeaders, '_fila_origen', '_campo', '_motivo_omision']
  const lines = [headers, ...rows.map(item => [
    ...sourceHeaders.map(header => item.raw?.[header] ?? ''),
    item.row ?? '', item.field ?? '', item.message ?? item.reason ?? '',
  ])].map(row => row.map(csvCell).join(','))
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `filas-omitidas-${fileKey}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function sourceValue(row, keys) {
  const headers = Object.keys(row.raw || {})
  const key = keys.find(candidate => headers.some(header => header.trim().toLowerCase() === candidate.toLowerCase()))
  if (!key) return ''
  const actual = headers.find(header => header.trim().toLowerCase() === key.toLowerCase())
  return row.raw[actual] ?? ''
}

function OmittedRowEditor({ fileKey, row, onImportRow }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(() => fileKey === 'maestro' ? {
    sku: sourceValue(row, ['sku', 'Código', 'Codigo']),
    descripcion: sourceValue(row, ['descripcion', 'Descripción', 'Descripcion']),
    categoria_cod: sourceValue(row, ['categoria_cod', 'Categoría', 'Categoria']),
    tipo_cod: sourceValue(row, ['tipo_cod', 'Tipo']),
    clasif_cod: sourceValue(row, ['clasif_cod', 'Clasificación', 'Clasificacion']),
  } : {
    cod: sourceValue(row, ['cod', 'Código', 'Codigo']),
    nombre: sourceValue(row, ['nombre', 'Descripción', 'Descripcion']),
  })

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onImportRow(fileKey, row, draft)
    } catch (saveError) {
      setError(saveError.message || 'No se pudo cargar esta fila.')
    } finally {
      setSaving(false)
    }
  }

  const fields = fileKey === 'maestro'
    ? [['sku', 'SKU'], ['descripcion', 'Descripción'], ['categoria_cod', 'Categoría'], ['tipo_cod', 'Tipo'], ['clasif_cod', 'Clasificación']]
    : [['cod', 'Código'], ['nombre', 'Nombre']]

  return (
    <details className="mt-2">
      <summary>Corregir y cargar esta fila manualmente</summary>
      <Form onSubmit={submit} className="mt-2">
        <div className="row g-2">
          {fields.map(([name, label]) => (
            <Form.Group className={fileKey === 'maestro' ? 'col-12 col-md-6' : 'col-12 col-md-6'} key={name}>
              <Form.Label className="small mb-1">{label}</Form.Label>
              <Form.Control
                size="sm"
                required={name !== 'descripcion'}
                value={draft[name]}
                onChange={event => setDraft(current => ({ ...current, [name]: event.target.value }))}
              />
            </Form.Group>
          ))}
        </div>
        {error && <div className="text-danger small mt-2" role="alert">{error}</div>}
        <Button type="submit" size="sm" variant="dark" className="mt-2" disabled={saving}>
          {saving ? 'Cargando…' : 'Guardar fila corregida'}
        </Button>
      </Form>
    </details>
  )
}

export default function ImportOmissions({ omittedRows = {}, onImportRow }) {
  const files = Object.entries(omittedRows).filter(([, rows]) => rows?.length)
  if (!files.length) return null

  return (
    <div className="mt-3" aria-live="polite">
      {files.map(([fileKey, rows]) => (
        <Alert variant="warning" key={fileKey} className="mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <strong>{FILE_LABELS[fileKey] || fileKey}: {rows.length} fila(s) omitida(s)</strong>
              <div className="small">Las demás filas válidas sí se cargaron. Corregí estas filas y subí el CSV descargado.</div>
            </div>
            <Button size="sm" variant="outline-dark" onClick={() => downloadOmittedRows(fileKey, rows)}>
              Descargar filas omitidas para corregir
            </Button>
          </div>
          <div className="table-responsive mt-2" style={{ maxHeight: 320 }}>
            <Table size="sm" bordered hover className="mb-0 bg-white">
              <thead><tr><th>Fila</th><th>Datos</th><th>Motivo</th></tr></thead>
              <tbody>
                {rows.map((item, index) => (
                  <tr key={`${item.row}-${item.field}-${index}`}>
                    <td>{item.row ?? '—'}</td>
                    <td>
                      <code>{JSON.stringify(item.raw || item)}</code>
                      {onImportRow && <OmittedRowEditor fileKey={fileKey} row={item} onImportRow={onImportRow} />}
                    </td>
                    <td>{item.message || item.reason || 'Fila inválida'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Alert>
      ))}
    </div>
  )
}
