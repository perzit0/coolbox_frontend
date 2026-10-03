const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(detail || message)
    this.code = message
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

/** Errores que invalidan la sesión: la app escucha este evento y cierra sesión. */
const ERRORES_SESION = new Set(['token_expirado', 'token_invalido', 'usuario_no_encontrado', 'usuario_inactivo'])

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
  } catch {
    throw new ApiError('error_conexion', 0, 'No se pudo conectar con el servidor. Si el backend está en Render (plan gratuito), espere unos segundos a que despierte e intente de nuevo.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = body.error || 'error_de_api'
    if (token && ERRORES_SESION.has(code)) {
      window.dispatchEvent(new CustomEvent('coolbox:sesion-expirada', { detail: body.detail }))
    }
    if (code === 'cambio_password_requerido') {
      window.dispatchEvent(new CustomEvent('coolbox:cambio-password'))
    }
    throw new ApiError(code, response.status, body.detail || 'No fue posible completar la solicitud.')
  }
  return body
}

const json = (method, payload) => ({ method, body: JSON.stringify(payload ?? {}) })

function qs(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const authApi = {
  login: (email, password) => api('/auth/login', json('POST', { email, password })),
  seleccionarRol: (rol_id) => api('/auth/seleccionar-rol', json('POST', { rol_id })),
  me: () => api('/auth/me'),
  cambiarPassword: (password_actual, password_nueva) =>
    api('/auth/cambiar-password', json('POST', { password_actual, password_nueva })),
  actualizarPerfil: (payload) => api('/auth/perfil', json('PATCH', payload)),
}

export const rolesApi = {
  listar: () => api('/roles'),
}

export const usuariosApi = {
  listar: (params) => api(`/usuarios${qs(params)}`),
  previewEmail: (params) => api(`/usuarios/preview-email${qs(params)}`),
  crear: (payload) => api('/usuarios', json('POST', payload)),
  editar: (id, payload) => api(`/usuarios/${id}`, json('PATCH', payload)),
  desactivar: (id) => api(`/usuarios/${id}`, { method: 'DELETE' }),
  activar: (id) => api(`/usuarios/${id}/activar`, { method: 'POST' }),
  desbloquear: (id) => api(`/usuarios/${id}/desbloquear`, { method: 'POST' }),
  resetPassword: (id) => api(`/usuarios/${id}/reset-password`, { method: 'POST' }),
}

export const catalogoApi = {
  familias: () => api('/familias'),
  marcas: () => api('/marcas'),
  crearMarca: (nombre) => api('/marcas', json('POST', { nombre })),
  skuPreview: (subfamilia_id, marca_id) => api(`/productos/sku-preview${qs({ subfamilia_id, marca_id })}`),
}

export const productosApi = {
  listar: (params = {}) => api(`/productos${qs(params)}`),
  obtener: (id) => api(`/productos/${id}`),
  crear: (payload) => api('/productos', json('POST', payload)),
  editar: (id, payload) => api(`/productos/${id}`, json('PATCH', payload)),
  moverStock: (id, payload) => api(`/productos/${id}/stock`, json('POST', payload)),
  movimientos: (id) => api(`/productos/${id}/movimientos`),
  movimientosRecientes: (params) => api(`/movimientos${qs(params)}`),
}

export const ventasApi = {
  listar: (params) => api(`/ventas${qs(params)}`),
  vendedores: () => api('/ventas/vendedores'),
  obtener: (id) => api(`/ventas/${id}`),
  crear: (payload) => api('/ventas', json('POST', payload)),
  anular: (id, motivo) => api(`/ventas/${id}/anular`, json('POST', { motivo })),
}

export const reportesApi = {
  resumen: (params) => api(`/reportes/resumen${qs(params)}`),
  inventario: () => api('/reportes/inventario'),
}
