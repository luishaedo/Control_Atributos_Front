import React from 'react'
import { Badge } from 'react-bootstrap'

export default function StatusBadge({ estado }) {
  const map = {
    'OK': 'success',
    'REVISAR': 'warning',
    'NO_MAESTRO': 'danger',
  }
  const labels = {
    'OK': 'Sistema',
    'REVISAR': 'Revisar',
    'NO_MAESTRO': 'Fuera del Sistema',
  }
  const variant = map[estado] || 'secondary'
  return <Badge bg={variant}>{labels[estado] || estado || '—'}</Badge>
}
