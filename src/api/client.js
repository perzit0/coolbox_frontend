const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

const TOKEN_KEY = 'coolbox_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export async function api(path, options = {}) {
  const token = tokenStore.get()
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (netErr) {
    throw new ApiError('error_conexion', 0, `No se pudo conectar con el servidor. Verifique que el backend esté activo en ${API_URL}.`)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(body.error || 'error_de_api', response.status, body.detail || 'No fue posible completar la solicitud.')
  }
  return body
}

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  seleccionarRol: (rol_id) => api('/auth/seleccionar-rol', { method: 'POST', body: JSON.stringify({ rol_id }) }),
  me: () => api('/auth/me'),
}

export const rolesApi = {
  listar: () => api('/roles'),
}

export const usuariosApi = {
  listar: () => api('/usuarios'),
  crear: (payload) => api('/usuarios', { method: 'POST', body: JSON.stringify(payload) }),
  editar: (id, payload) => api(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  desactivar: (id) => api(`/usuarios/${id}`, { method: 'DELETE' }),
  resetPassword: (id) => api(`/usuarios/${id}/reset-password`, { method: 'POST' }),
}

export const productosApi = {
  listar: (params = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.categoria_id) q.set('categoria_id', params.categoria_id)
    if (params.solo_activos !== undefined) q.set('solo_activos', params.solo_activos ? '1' : '0')
    const qs = q.toString()
    return api(`/productos${qs ? `?${qs}` : ''}`)
  },
  categorias: () => api('/categorias'),
  crear: (payload) => api('/productos', { method: 'POST', body: JSON.stringify(payload) }),
  editar: (id, payload) => api(`/productos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  ajustarStock: (id, payload) => api(`/productos/${id}/stock`, { method: 'POST', body: JSON.stringify(payload) }),
}

export const ventasApi = {
  listar: () => api('/ventas'),
  obtener: (id) => api(`/ventas/${id}`),
  crear: (payload) => api('/ventas', { method: 'POST', body: JSON.stringify(payload) }),
  anular: (id) => api(`/ventas/${id}/anular`, { method: 'POST' }),
  reporte: () => api('/ventas/reporte/resumen'),
}
