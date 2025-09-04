import React, { useEffect, useState } from 'react'
import { Card, Button, ButtonGroup, Badge, Stack } from 'react-bootstrap'
import { getCampaigns, setActiveCampaign, getDictionaries, } from '../services/api'
import { getNombre } from '../utils/texto.js'

export default function CampaignSelector({ onSelect }) {
  const [listado, setListado] = useState([])
  const [dic, setDic] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const activa = listado.find(c => c.activa)

  useEffect(() => {
    async function cargar() {
      try {
        setLoading(true)
        setError(null)
        const [camps, d] = await Promise.all([getCampaigns(), getDictionaries()])
        setListado(camps)
        setDic(d)
        onSelect?.(camps.find(c => c.activa) || null)
      } catch (e) {
        setError(e.message || 'Error al cargar campañas/diccionarios')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  async function activar(id) {
    try {
      setLoading(true)
      setError(null)
      const activa = await setActiveCampaign(id)
      const camps = await getCampaigns()
      setListado(camps)
      onSelect?.(activa)
    } catch (e) {
      setError(e.message || 'Error al activar campaña')
    } finally {
      setLoading(false)
    }
  }

  function chipObjetivo(c) {
    if (!dic) return null
    const chips = []
    if (c.categoria_objetivo_cod) {
      const nombre = getNombre(dic.categorias, c.categoria_objetivo_cod)
      chips.push(<Badge key="cat" bg="primary">Cat {c.categoria_objetivo_cod} · {nombre}</Badge>)
    }
    if (c.tipo_objetivo_cod) {
      const nombre = getNombre(dic.tipos, c.tipo_objetivo_cod)
      chips.push(<Badge key="tipo" bg="secondary">Tipo {c.tipo_objetivo_cod} · {nombre}</Badge>)
    }
    if (c.clasif_objetivo_cod) {
      const nombre = getNombre(dic.clasif, c.clasif_objetivo_cod)
      chips.push(<Badge key="clasif" bg="info">Clasif {c.clasif_objetivo_cod} · {nombre}</Badge>)
    }
    if (chips.length === 0) chips.push(<Badge key="none" bg="dark">Sin filtros</Badge>)
    return <Stack direction="horizontal" gap={2}>{chips}</Stack>
  }

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>Campaña activa</strong>
        <div>
          <ButtonGroup>
            {listado.map(c => (
              <Button
                key={c.id}
                variant={c.activa ? 'success' : 'outline-secondary'}
                size="sm"
                onClick={() => activar(c.id)}
                disabled={loading}
              >
                 {c.nombre} {c.activa ? <Badge bg="light" text="dark">Activa</Badge> : null}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      </Card.Header>
      <Card.Body>
        {error && <div className="alert alert-danger mb-2">{error}</div>}
        {loading && <em>Cargando campañas…</em>}
        {!loading && (activa ? (
          <div>
            <div className="mb-2"><small>Vigencia: {activa.inicia} → {activa.termina}</small></div>
            {chipObjetivo(activa)}
          </div>
        ) : (
          <em>No hay campaña activa</em>
        ))}
      </Card.Body>
    </Card>
  )
}
