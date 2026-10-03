import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi, tokenStore } from './api/client'
import { useFeedback } from './components/Feedback'

import Login from './features/auth/Login'
import SeleccionRol from './features/auth/SeleccionRol'
import CambioPasswordObligatorio from './features/auth/CambioPasswordObligatorio'
import Shell from './components/Shell'

import DashboardAdmin from './features/admin/DashboardAdmin'
import GestionUsuarios from './features/admin/GestionUsuarios'
import Reportes from './features/admin/Reportes'
import Productos from './features/productos/Productos'
import GestionStock from './features/productos/GestionStock'
import Kardex from './features/productos/Kardex'
import GuiaSku from './features/productos/GuiaSku'
import NuevaVenta from './features/ventas/NuevaVenta'
import HistorialVentas from './features/ventas/HistorialVentas'
import MiCuenta from './features/cuenta/MiCuenta'

/** Página de inicio según el rol activo. */
function inicioDeRol(rol) {
  if (!rol) return '/seleccionar-rol'
  if (rol.es_admin) return '/admin'
  const permisos = new Set(rol.permisos || [])
  if (permisos.has('ventas.crear')) return '/ventas/nueva'
  if (permisos.has('reportes.ver')) return '/reportes'
  if (permisos.has('ventas.ver')) return '/ventas'
  if (permisos.has('stock.actualizar')) return '/almacen'
  return '/productos'
}

export default function App() {
  const [sesion, setSesion] = useState(null) // { usuario, rol_activo }
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const fb = useFeedback()

  useEffect(() => {
    const token = tokenStore.get()
    if (!token) { setChecking(false); return }
    authApi.me()
      .then((r) => setSesion({ usuario: r.usuario, rol_activo: r.rol_activo }))
      .catch(() => { tokenStore.clear() })
      .finally(() => setChecking(false))
  }, [])

  const cerrarSesion = useCallback((mensaje) => {
    tokenStore.clear()
    setSesion(null)
    navigate('/login')
    if (mensaje) fb.info(mensaje)
  }, [navigate, fb])

  // Token vencido o usuario desactivado mientras trabajaba
  useEffect(() => {
    const onExpira = (e) => cerrarSesion(e.detail || 'Tu sesión expiró. Ingresa nuevamente.')
    const onCambio = () => setSesion((s) => (s ? { ...s, usuario: { ...s.usuario, debe_cambiar_password: true } } : s))
    window.addEventListener('coolbox:sesion-expirada', onExpira)
    window.addEventListener('coolbox:cambio-password', onCambio)
    return () => {
      window.removeEventListener('coolbox:sesion-expirada', onExpira)
      window.removeEventListener('coolbox:cambio-password', onCambio)
    }
  }, [cerrarSesion])

  const aplicarSesion = (data) => {
    tokenStore.set(data.access_token)
    setSesion({ usuario: data.usuario, rol_activo: data.rol_activo })
    navigate(data.usuario.debe_cambiar_password ? '/cambiar-password' : inicioDeRol(data.rol_activo))
  }

  const actualizarUsuario = (usuario) => setSesion((s) => ({ ...s, usuario }))

  if (checking) return <div className="loading-page"><span className="spinner spinner-dark" /> Verificando sesión…</div>

  // Sin sesión: un único formulario de ingreso
  if (!sesion) {
    return (
      <Routes>
        <Route path="/login" element={<Login onSuccess={aplicarSesion} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Contraseña temporal: debe cambiarla antes de continuar (igual que en Matrícula UNFV)
  if (sesion.usuario.debe_cambiar_password) {
    return (
      <Routes>
        <Route path="/cambiar-password" element={(
          <CambioPasswordObligatorio
            usuario={sesion.usuario}
            onLogout={() => cerrarSesion()}
            onSuccess={(usuario) => {
              actualizarUsuario(usuario)
              fb.ok('Contraseña actualizada. Ya puedes continuar.')
              navigate(inicioDeRol(sesion.rol_activo))
            }}
          />
        )} />
        <Route path="*" element={<Navigate to="/cambiar-password" replace />} />
      </Routes>
    )
  }

  // Sesión iniciada pero sin rol activo: elegir rol (el Administrador también se elige aquí)
  if (!sesion.rol_activo) {
    return (
      <Routes>
        <Route path="/seleccionar-rol" element={<SeleccionRol usuario={sesion.usuario} onSuccess={aplicarSesion} onLogout={() => cerrarSesion()} />} />
        <Route path="*" element={<Navigate to="/seleccionar-rol" replace />} />
      </Routes>
    )
  }

  const rol = sesion.rol_activo
  const permisos = new Set(rol.permisos || [])
  const puede = (p) => permisos.has(p)

  return (
    <Shell
      sesion={sesion}
      onLogout={() => cerrarSesion()}
      onCambiarRol={() => { setSesion({ ...sesion, rol_activo: null }); navigate('/seleccionar-rol') }}
    >
      <Routes>
        {rol.es_admin && <Route path="/admin" element={<DashboardAdmin sesion={sesion} />} />}
        {puede('usuarios.ver') && <Route path="/admin/usuarios" element={<GestionUsuarios sesion={sesion} />} />}
        {puede('ventas.crear') && <Route path="/ventas/nueva" element={<NuevaVenta sesion={sesion} />} />}
        {puede('ventas.ver') && <Route path="/ventas" element={<HistorialVentas puedeAnular={puede('ventas.anular')} />} />}
        {puede('reportes.ver') && <Route path="/reportes" element={<Reportes />} />}
        {puede('productos.ver') && <Route path="/productos" element={<Productos permisos={permisos} />} />}
        {puede('productos.ver') && <Route path="/catalogo/sku" element={<GuiaSku />} />}
        {puede('stock.actualizar') && <Route path="/almacen" element={<GestionStock />} />}
        {puede('kardex.ver') && <Route path="/kardex" element={<Kardex />} />}
        <Route path="/mi-cuenta" element={<MiCuenta sesion={sesion} onUsuario={actualizarUsuario} />} />
        <Route path="*" element={<Navigate to={inicioDeRol(rol)} replace />} />
      </Routes>
    </Shell>
  )
}
