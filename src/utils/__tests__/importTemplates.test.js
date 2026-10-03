import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const template = file => readFileSync(resolve(testDirectory, '../../../public/templates', file), 'utf8').trim()

describe('plantillas CSV de importación', () => {
  it.each([
    ['plantilla-categorias.csv', 'cod,nombre'],
    ['plantilla-tipos.csv', 'cod,nombre'],
    ['plantilla-clasificaciones.csv', 'cod,nombre'],
    ['plantilla-maestro.csv', 'sku,descripcion,categoria_cod,tipo_cod,clasif_cod'],
  ])('%s usa los encabezados canónicos', (file, headers) => {
    expect(template(file)).toBe(headers)
  })
})
