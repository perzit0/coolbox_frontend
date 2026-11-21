const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, detail, body = {}) {
    super(detail || message)
    this.code = message
    this.status = status
    this.detail = detail
    this.body = body
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
    throw new ApiError(code, response.status, body.detail || 'No fue posible completar la solicitud.', body)
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
  liberarRol: () => api('/auth/liberar-rol', json('POST', {})),
  me: () => api('/auth/me'),
  cambiarPassword: (password_actual, password_nueva) =>
    api('/auth/cambiar-password', json('POST', { password_actual, password_nueva })),
  actualizarPerfil: (payload) => api('/auth/perfil', json('PATCH', payload)),
  configurarPin: (password_actual, pin) => api('/auth/pin', json('PUT', { password_actual, pin })),
}

export const autorizacionesApi = {
  supervisores: () => api('/autorizaciones/supervisores'),
  solicitar: (payload) => api('/autorizaciones', json('POST', payload)),
  bitacora: (params) => api(`/autorizaciones${qs(params)}`),
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
  cotizar: (items) => api('/ventas/cotizar', json('POST', { items })),
  config: () => api('/ventas/config'),
  consultarDocumento: (numero) => api(`/ventas/consulta-documento/${encodeURIComponent(numero)}`),
  anular: (id, motivo, autorizacion_token) => api(`/ventas/${id}/anular`, json('POST', { motivo, autorizacion_token })),
  reintentarComprobante: (id) => api(`/ventas/${id}/comprobante`, json('POST', {})),
  devolver: (id, payload) => api(`/ventas/${id}/devoluciones`, json('POST', payload)),
}

export const devolucionesApi = {
  reintentarNota: (id) => api(`/devoluciones/${id}/comprobante`, json('POST', {})),
}

/** Abre en otra pestaña un PDF o XML guardado por el backend (la descarga necesita el token). */
export async function abrirArchivo(path) {
  const token = tokenStore.get()
  const ventana = window.open('', '_blank')
  try {
    const r = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new ApiError(body.error || 'error_de_api', r.status, body.detail || 'El archivo no está disponible.')
    }
    const url = URL.createObjectURL(await r.blob())
    if (ventana) ventana.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (err) {
    ventana?.close()
    throw err
  }
}

export const cajaApi = {
  miCaja: () => api('/cajas/mi-caja'),
  denominaciones: () => api('/cajas/denominaciones'),
  abrir: (monto_apertura) => api('/cajas/abrir', json('POST', { monto_apertura })),
  cerrar: (payload) => api('/cajas/cerrar', json('POST', payload)),
  retiro: (monto, motivo, autorizacion_token) => api('/cajas/retiro', json('POST', { monto, motivo, autorizacion_token })),
  misCajas: () => api('/cajas/mis-cajas'),
  obtener: (id) => api(`/cajas/${id}`),
  control: (params) => api(`/cajas${qs(params)}`),
}

export const reportesApi = {
  resumen: (params) => api(`/reportes/resumen${qs(params)}`),
  inventario: () => api('/reportes/inventario'),
}

export const promocionesApi = {
  tipos: () => api('/promociones/tipos'),
  listar: (params) => api(`/promociones${qs(params)}`),
  obtener: (id) => api(`/promociones/${id}`),
  crear: (payload) => api('/promociones', json('POST', payload)),
  editar: (id, payload) => api(`/promociones/${id}`, json('PUT', payload)),
  cambiarEstado: (id, activar) => api(`/promociones/${id}/${activar ? 'activar' : 'desactivar'}`, json('POST', {})),
  productos: (params) => api(`/promociones/productos${qs(params)}`),
}

export const pedidosOnlineApi = {
  listar: (params) => api(`/pedidos-online${qs(params)}`),
  accion: (id, accion, payload) => api(`/pedidos-online/${id}/${accion}`, json('POST', payload || {})),
  reintentarComprobante: (id, tipo) => api(`/pedidos-online/${id}/comprobante/${tipo}`, json('POST', {})),
  devolver: (id, payload) => api(`/pedidos-online/${id}/devoluciones`, json('POST', payload)),
  reintentarNotaDevolucion: (id) => api(`/pedidos-online/devoluciones/${id}/comprobante`, json('POST', {})),
}

export const maestroClientesApi = {
  listar: (params) => api(`/maestro-clientes${qs(params)}`),
  resumen: () => api('/maestro-clientes/resumen'),
  crear: (payload) => api('/maestro-clientes', json('POST', payload)),
  editar: (id, payload) => api(`/maestro-clientes/${id}`, json('PUT', payload)),
  cambiarEstado: (id, activo) => api(`/maestro-clientes/${id}/estado`, json('POST', { activo })),
}

export const integracionApi = {
  estado: () => api('/integracion/estado'),
  importar: () => api('/integracion/importar', json('POST', {})),
  importarArchivo: (payload) => api('/integracion/importar-archivo', json('POST', payload)),
  lotes: () => api('/integracion/lotes'),
  lote: (id, estado) => api(`/integracion/lotes/${id}${qs({ estado })}`),
  traza: (direccion) => api(`/integracion/traza${qs({ direccion })}`),
}
