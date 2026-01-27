import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  ButtonGroup,
  Badge,
  Stack,
  Alert,
} from "react-bootstrap";
import {
  getCampaigns,
  setActiveCampaign,
  getDictionaries,
} from "../services/api";
import { getNombre } from "../utils/texto.js";

const LS_KEY = "cc_last_active_campaign_id";

export default function CampaignSelector({ onSelect }) {
  const [listado, setListado] = useState([]);
  const [dic, setDic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activa = listado.find((c) => c.activa);

  useEffect(() => {
    async function cargar() {
      try {
        setLoading(true);
        setError(null);
        const [camps, d] = await Promise.all([
          getCampaigns(),
          getDictionaries(),
        ]);
        setListado(camps || []);
        setDic(d);
        const saved = Number(localStorage.getItem(LS_KEY) || 0);
        const savedObj = (camps || []).find((c) => c.id === saved && c.activa) || null;
        const elegida = savedObj || (camps || []).find((c) => c.activa) || null;
        if (elegida) {
          onSelect?.(elegida);
          localStorage.setItem(LS_KEY, String(elegida.id));
        } else {
          onSelect?.(null);
          localStorage.removeItem(LS_KEY);
        }
      } catch (e) {
        setError(e.message || "Error al cargar campañas/diccionarios");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  async function activar(id) {
    try {
      setLoading(true);
      setError(null);
      await setActiveCampaign(id);
      const camps = await getCampaigns();
      setListado(camps || []);
      const nuevaActiva = (camps || []).find((c) => c.activa) || null;
      if (nuevaActiva) {
        onSelect?.(nuevaActiva);
        localStorage.setItem(LS_KEY, String(nuevaActiva.id));
      } else {
        onSelect?.(null);
        localStorage.removeItem(LS_KEY);
      }
    } catch (e) {
      setError(e.message || "Error al activar campaña");
    } finally {
      setLoading(false);
    }
  }

  function chipObjetivo(c) {
    if (!dic) return null;
    const chips = [];
    if (c.categoria_objetivo_cod) {
      const nombre = getNombre(dic.categorias, c.categoria_objetivo_cod);
      chips.push(
        <Badge key="cat" bg="primary">
          Cat {c.categoria_objetivo_cod} · {nombre}
        </Badge>
      );
    }
    if (c.tipo_objetivo_cod) {
      const nombre = getNombre(dic.tipos, c.tipo_objetivo_cod);
      chips.push(
        <Badge key="tipo" bg="secondary">
          Tipo {c.tipo_objetivo_cod} · {nombre}
        </Badge>
      );
    }
    if (c.clasif_objetivo_cod) {
      const nombre = getNombre(dic.clasif, c.clasif_objetivo_cod);
      chips.push(
        <Badge key="clasif" bg="info">
          Clasif {c.clasif_objetivo_cod} · {nombre}
        </Badge>
      );
    }
    if (chips.length === 0)
      chips.push(
        <Badge key="none" bg="dark">
          Sin filtros
        </Badge>
      );
    return (
      <Stack direction="horizontal" gap={2}>
        {chips}
      </Stack>
    );
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
                {c.nombre}{' '}
                {c.activa ? <Badge bg="light" text="dark">Activa</Badge> : <Badge bg="secondary">Inactiva</Badge>}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      </Card.Header>
      <Card.Body>
        {error && <div className="alert alert-danger mb-2">{error}</div>}
        {loading && <em>Cargando campañas…</em>}

        {!loading && listado.length === 0 && (
          <Alert variant="warning" className="mb-0">
            No hay campañas disponibles. Creá una y activala en el panel de Admin.
          </Alert>
        )}

        {!loading && listado.length > 0 && (
          <>
            <div className="mb-2">
              <small>
                Vigencia: {activa?.inicia} → {activa?.termina}
              </small>
            </div>
            {activa ? chipObjetivo(activa) : null}
          </>
        )}
      </Card.Body>
    </Card>
  )
}
