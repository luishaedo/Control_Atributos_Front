// src/services/adminApi.js — versión completa y consistente
const API_BASE = (import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) || window.location.origin;

// ===== Token admin (localStorage)
function getToken() { return localStorage.getItem('cc_admin_token') || '' }
export function adminSetToken(t) { if (!t) localStorage.removeItem('cc_admin_token'); else localStorage.setItem('cc_admin_token', String(t)) }
export function adminGetToken() { return getToken() }

// ===== Headers con Authorization
function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}

// ===== Helpers fetch
async function fetchAuth(path, options = {}) {
  const headers = authHeaders(options.headers || {});
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp;
}
async function fetchAuthJSON(path, options) { const r = await fetchAuth(path, options); return r.json().catch(()=>({})); }
async function fetchAuthBlob(path, options) { const r = await fetchAuth(path, options); return r.blob(); }

// ======================= Admin: ping
export function adminPing() { return fetchAuthJSON('/api/admin/ping'); }

// ======================= Importadores JSON (si tu back los expone por JSON)
export function importarDiccionariosJSON(payload) {
  return fetchAuthJSON('/api/admin/diccionarios/import-json', { method: 'POST', body: JSON.stringify(payload || {}) });
}
export function importarMaestroJSON(items) {
  return fetchAuthJSON('/api/admin/maestro/import-json', { method: 'POST', body: JSON.stringify({ items: items || [] }) });
}

// ======================= Campañas (crear por público /api)
export function crearCampania(data) {
  return fetchAuthJSON('/api/campanias', { method: 'POST', body: JSON.stringify(data || {}) });
}

// ======================= Auditoría (Admin.jsx)
export function getDiscrepancias(campaniaId) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
  return fetchAuthJSON(`/api/admin/discrepancias?${qs}`);
}
export function getDiscrepanciasSucursales(campaniaId) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
  return fetchAuthJSON(`/api/admin/discrepancias-sucursales?${qs}`);
}
export function exportDiscrepanciasCSV(campaniaId) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
  return fetchAuthBlob(`/api/admin/export/discrepancias.csv?${qs}`);
}
export function exportDiscrepanciasSucursalesCSV(campaniaId) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
  return fetchAuthBlob(`/api/admin/export/discrepancias-sucursales.csv?${qs}`);
}
// CSV globales que usa Admin.jsx
export function exportMaestroCSV()    { return fetchAuthBlob(`/api/admin/export/maestro.csv`); }
export function exportCategoriasCSV() { return fetchAuthBlob(`/api/admin/export/categorias.csv`); }
export function exportTiposCSV()      { return fetchAuthBlob(`/api/admin/export/tipos.csv`); }
export function exportClasifCSV()     { return fetchAuthBlob(`/api/admin/export/clasif.csv`); }

// ======================= Revisiones (tarjetas)
export function getRevisiones(params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString();
  //return fetchAuthJSON(`/api/admin/revisiones?${qs}`);
  return fetchAuthJSON(`/revisiones?${qs}`)
}
export function decidirRevision(body = {}) {
  return fetchAuthJSON(`/api/admin/revisiones/decidir`, { method: 'POST', body: JSON.stringify(body) });
}

// ======================= Cola de actualizaciones
// listar con filtros server-side
export function listarActualizaciones(campaniaId, opts = undefined) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId) });
  if (typeof opts === 'string') {
    if (opts) qs.set('estado', opts);
  } else if (opts && typeof opts === 'object') {
    const { estado, archivada } = opts;
    if (estado) qs.set('estado', estado);              // 'pendiente'|'aplicada'|'rechazada'
    if (archivada) qs.set('archivada', archivada);     // 'true'|'false'|'todas'
  }
  return fetchAuthJSON(`/api/admin/actualizaciones?${qs.toString()}`);
}
export function aplicarActualizaciones(ids = [], decidedBy = '') {
  //return fetchAuthJSON(`/api/admin/actualizaciones/aplicar`, {
  return fetchAuthJSON(`/actualizaciones/aplicar`, {
    method: 'POST', body: JSON.stringify({ ids, decidedBy })
  });
}
export function archivarActualizaciones(ids = [], archivada = true, archivadaBy = '') {
  return fetchAuthJSON(`/api/admin/actualizaciones/archivar`, {
    method: 'POST', body: JSON.stringify({ ids, archivada, archivadaBy })
  });
}
export function undoActualizacion(id) {
  return fetchAuthJSON(`/api/admin/actualizaciones/undo`, {
    method: 'POST', body: JSON.stringify({ id })
  });
}
export function revertirActualizacion(id) {
  return fetchAuthJSON(`/api/admin/actualizaciones/${encodeURIComponent(id)}/revertir`, { method: 'POST' });
}
export function exportActualizacionesCSV(campaniaId) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
  //return fetchAuthBlob(`/api/admin/export/actualizaciones.csv?${qs}`);
  return fetchAuthBlob(`/export/actualizaciones.csv?${qs}`)
}

// ======================= Exports TXT (por campo)
export function exportTxtCategoria(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId), estado });
  if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
  return fetchAuthBlob(`/api/admin/export/txt/categoria?${qs.toString()}`);
}
export function exportTxtTipo(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId), estado });
  if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
  return fetchAuthBlob(`/api/admin/export/txt/tipo?${qs.toString()}`);
}
export function exportTxtClasif(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
  const qs = new URLSearchParams({ campaniaId: String(campaniaId), estado });
  if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
  return fetchAuthBlob(`/api/admin/export/txt/clasif?${qs.toString()}`);
}


// // src/services/adminApi.js
// const API_BASE = (import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) || window.location.origin;

// // ===== Token admin (localStorage)
// export function adminSetToken(t) { if (!t) localStorage.removeItem('cc_admin_token'); else localStorage.setItem('cc_admin_token', String(t)); }
// export function adminGetToken() { return localStorage.getItem('cc_admin_token') || ""; }
// function authHeaders(extra = {}) {
//   const t = adminGetToken();
//   return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
// }

// // ===== Helpers
// async function fetchAuthJSON(path, opts = {}) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...opts,
//     headers: authHeaders({ "Content-Type": "application/json", ...(opts.headers || {}) }),
//   });
//   const ct = res.headers.get("content-type") || "";
//   const isJSON = ct.includes("application/json");
//   const body = isJSON ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
//   if (!res.ok) {
//     const msg = (isJSON && body?.error) ? body.error : String(body || res.statusText);
//     throw new Error(msg || `Error ${res.status}`);
//   }
//   return body;
// }
// async function fetchAuthBlob(path, opts = {}) {
//   const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: authHeaders(opts.headers || {}) });
//   if (!res.ok) {
//     let msg = `Error ${res.status}`;
//     try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
//     throw new Error(msg);
//   }
//   return res.blob();
// }

// // ============ Admin: ping
// export function adminPing() { return fetchAuthJSON('/api/admin/ping'); }

// // ============ Importadores JSON (opcionales si tu back los expone por JSON)
// export function importarDiccionariosJSON(payload) {
//   return fetchAuthJSON('/api/admin/diccionarios/import-json', { method: 'POST', body: JSON.stringify(payload || {}) });
// }
// export function importarMaestroJSON(payload) {
//   return fetchAuthJSON('/api/admin/maestro/import-json', { method: 'POST', body: JSON.stringify(payload || {}) });
// }

// // ============ Campañas (usar endpoint público)
// export function crearCampania(data) {
//   return fetchAuthJSON('/api/campanias', { method: 'POST', body: JSON.stringify(data || {}) });
// }

// // ============ Auditoría (Admin.jsx)
// export function getDiscrepancias(campaniaId) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
//   return fetchAuthJSON(`/api/admin/discrepancias?${qs}`);
// }
// export function getDiscrepanciasSucursales(campaniaId) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
//   return fetchAuthJSON(`/api/admin/discrepancias-sucursales?${qs}`);
// }
// export function exportDiscrepanciasCSV(campaniaId) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
//   return fetchAuthBlob(`/api/admin/export/discrepancias.csv?${qs}`);
// }
// // CSV auxiliares pedidos por Admin.jsx:
// export function exportMaestroCSV()        { return fetchAuthBlob(`/api/admin/export/maestro.csv`); }
// export function exportCategoriasCSV()     { return fetchAuthBlob(`/api/admin/export/categorias.csv`); }
// export function exportTiposCSV()          { return fetchAuthBlob(`/api/admin/export/tipos.csv`); }
// export function exportClasifCSV()         { return fetchAuthBlob(`/api/admin/export/clasif.csv`); }

// // ============ Revisiones (tarjetas)
// export function getRevisiones(params = {}) {
//   const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString();
//   return fetchAuthJSON(`/api/admin/revisiones?${qs}`);
// }
// export function decidirRevision(body = {}) {
//   return fetchAuthJSON(`/api/admin/revisiones/decidir`, { method: 'POST', body: JSON.stringify(body) });
// }

// // ============ Cola de actualizaciones (tabla)
// export function listarActualizaciones(campaniaId, opts = undefined) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId) });
//   if (typeof opts === 'string') {
//     if (opts) qs.set('estado', opts);
//   } else if (opts && typeof opts === 'object') {
//     const { estado, archivada } = opts;
//     if (estado) qs.set('estado', estado);
//     if (archivada) qs.set('archivada', archivada); // 'true' | 'false' | 'todas'
//   }
//   return fetchAuthJSON(`/api/admin/actualizaciones?${qs.toString()}`);
// }
// export function aplicarActualizaciones(ids = [], decidedBy = '') {
//   return fetchAuthJSON(`/api/admin/actualizaciones/aplicar`, {
//     method: 'POST', body: JSON.stringify({ ids, decidedBy })
//   });
// }
// export function archivarActualizaciones(ids = [], archivada = true, archivadaBy = '') {
//   return fetchAuthJSON(`/api/admin/actualizaciones/archivar`, {
//     method: 'POST', body: JSON.stringify({ ids, archivada, archivadaBy })
//   });
// }
// export function undoActualizacion(id) {
//   return fetchAuthJSON(`/api/admin/actualizaciones/undo`, {
//     method: 'POST', body: JSON.stringify({ id })
//   });
// }
// export function revertirActualizacion(id) {
//   return fetchAuthJSON(`/api/admin/actualizaciones/${encodeURIComponent(id)}/revertir`, {
//     method: 'POST'
//   });
// }
// export function exportActualizacionesCSV(campaniaId) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId) }).toString();
//   return fetchAuthBlob(`/api/admin/export/actualizaciones.csv?${qs}`);
// }

// // ============ Exports TXT por campo (Revisiones.jsx)
// export function exportTxtCategoria(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId), estado });
//   if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
//   return fetchAuthBlob(`/api/admin/export/txt/categoria?${qs.toString()}`);
// }
// export function exportTxtTipo(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId), estado });
//   if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
//   return fetchAuthBlob(`/api/admin/export/txt/tipo?${qs.toString()}`);
// }
// export function exportTxtClasif(campaniaId, estado = 'aceptadas', incluirArchivadas = false) {
//   const qs = new URLSearchParams({ campaniaId: String(campaniaId), estado });
//   if (incluirArchivadas) qs.set('incluirArchivadas', 'true');
//   return fetchAuthBlob(`/api/admin/export/txt/clasif?${qs.toString()}`);
// }
