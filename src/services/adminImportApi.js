const API_BASE = (import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) || window.location.origin;

function authHeader() {
  const t = localStorage.getItem('cc_admin_token') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function uploadDiccionarios({ categorias, tipos, clasif } = {}) {
  if (!categorias && !tipos && !clasif) {
    throw new Error('Select at least one dictionary file before uploading.')
  }
  const fd = new FormData();
  if (categorias) fd.append('categorias', categorias);
  if (tipos) fd.append('tipos',     tipos);
  if (clasif) fd.append('clasif',   clasif);

  const res = await fetch(`${API_BASE}/api/admin/diccionarios/import-file`, {
    method: 'POST',
    headers: authHeader(),
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

export async function uploadMaestro({ maestro } = {}) {
  if (!maestro) {
    throw new Error('Select a master file before uploading.')
  }
  const fd = new FormData();
  fd.append('maestro', maestro);

  const res = await fetch(`${API_BASE}/api/admin/maestro/import-file`, {
    method: 'POST',
    headers: authHeader(),
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}
