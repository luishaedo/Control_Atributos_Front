import React from 'react'
import { Badge } from 'react-bootstrap'
import { pad2 } from './sku'

export function etiqueta(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr || []).find(x => x.cod === c)
  return it ? `${c} · ${it.nombre}` : c
}

export function etiquetaNombre(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr || []).find(x => x.cod === c)
  return it ? it.nombre : c
}

export function shortUserLabel(value = '') {
  const str = String(value || '')
  if (!str) return '—'
  const [name] = str.split('@')
  return name || str
}

export function badgeDecision(estado) {
  if (estado === 'aplicada') return <Badge bg="success">APLICADA</Badge>
  if (estado === 'pendiente') return <Badge bg="warning" text="dark">ACEPTADA (pend.)</Badge>
  if (estado === 'rechazada') return <Badge bg="danger">RECHAZADA</Badge>
  return <Badge bg="secondary">—</Badge>
}

export function buildAttributeOptions(propuestas = [], field) {
  const map = new Map()
  for (const p of propuestas) {
    const code = p?.[field]
    if (!code) continue
    const entry = map.get(code) || { code, count: 0, usuarios: new Set(), sucursales: new Set() }
    entry.count += Number(p.count || 0)
    ;(p.usuarios || []).forEach(u => entry.usuarios.add(u))
    ;(p.sucursales || []).forEach(s => entry.sucursales.add(s))
    map.set(code, entry)
  }
  const list = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map(item => ({
      ...item,
      usuarios: Array.from(item.usuarios),
      sucursales: Array.from(item.sucursales),
    }))
  const total = list.reduce((acc, it) => acc + it.count, 0)
  return {
    total,
    options: list.map(item => ({
      ...item,
      share: total ? item.count / total : 0
    }))
  }
}

export function consensusLabel(share, threshold = 0.6) {
  const pct = Math.round(share * 100)
  if (share >= threshold) return { text: `Consenso ${pct}%`, variant: 'success' }
  if (share > 0) return { text: `${pct}%`, variant: 'warning' }
  return { text: 'Sin votos', variant: 'secondary' }
}

export function getAcceptedAttributeCode(propuestas = [], field) {
  const decisionKey =
    field === 'categoria_cod'
      ? 'new_categoria_cod'
      : field === 'tipo_cod'
        ? 'new_tipo_cod'
        : 'new_clasif_cod'
  for (const p of propuestas) {
    const decision = p?.decision
    if (!decision || decision?.estado === 'rechazada') continue
    const value = decision?.[decisionKey]
    if (value) return value
  }
  return ''
}

export function getAcceptedAttributeDecision(propuestas = [], field) {
  const decisionKey =
    field === 'categoria_cod'
      ? 'new_categoria_cod'
      : field === 'tipo_cod'
        ? 'new_tipo_cod'
        : 'new_clasif_cod'
  for (const p of propuestas) {
    const decision = p?.decision
    if (!decision || decision?.estado === 'rechazada') continue
    const value = decision?.[decisionKey]
    if (value) return decision
  }
  return null
}

export function hasValidCode(dicArr, code) {
  if (!code) return false
  const normalized = pad2(code)
  return (dicArr || []).some((item) => item.cod === normalized)
}

export function resolveAttributeValue(item, field) {
  const accepted = getAcceptedAttributeCode(item?.propuestas, field)
  if (accepted) return accepted
  if (field === 'categoria_cod') return item?.maestro?.categoria_cod || ''
  if (field === 'tipo_cod') return item?.maestro?.tipo_cod || ''
  return item?.maestro?.clasif_cod || ''
}
