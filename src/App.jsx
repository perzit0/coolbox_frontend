import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi, tokenStore } from './api/client'

import Login from './features/auth/Login'
import SeleccionRol from './features/auth/SeleccionRol'
import Shell from './components/Shell'

import DashboardAdmin from './features/admin/DashboardAdmin'
import GestionUsuarios from './features/admin/GestionUsuarios'
import GestionProductos from './features/admin/GestionProductos'
import ReportesVentas from './features/admin/ReportesVentas'

import NuevaVenta from './features/ventas/NuevaVenta'
import HistorialVentas from './features/ventas/HistorialVentas'
import CatalogoProductos from './features/productos/CatalogoProductos'
import GestionStock from './features/productos/GestionStock'

/** Página de inicio según el rol activo. */
function inicioDeRol(rol) {
  if (!rol) return '/seleccionar-rol'
  if (rol.es_admin) return '/admin'
  const permisos = new Set(rol.permisos || [])
  if (permisos.has('ventas.crear')) return '/tienda'
  if (permisos.has('ventas.ver')) return '/tienda/ventas'
  if (permisos.has('stock.actualizar')) return '/tienda/stock'
  return '/tienda/productos'
}

export default function App() {
  const [sesion, setSesion] = useState(null) // { usuario, rol_activo }
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = tokenStore.get()
    if (!token) { setChecking(false); return }
    authApi.me()
      .then((r) => setSesion({ usuario: r.usuario, rol_activo: r.rol_activo }))
      .catch(() => { tokenStore.clear() })
      .finally(() => setChecking(false))
  }, [])

  // Login único: si el usuario tiene un solo rol ya viene activo; si tiene
  // varios (incluido Administrador), debe elegirlo en la siguiente pantalla.
  const handleLogin = (data) => {
    tokenStore.set(data.access_token)
    setSesion({ usuario: data.usuario, rol_activo: data.rol_activo })
    navigate(inicioDeRol(data.rol_activo))
  }

  const handleRolSeleccionado = (data) => {
    tokenStore.set(data.access_token)
    setSesion({ usuario: data.usuario, rol_activo: data.rol_activo })
    navigate(inicioDeRol(data.rol_activo))
  }

  const handleLogout = () => {
    tokenStore.clear()
    setSesion(null)
    navigate('/login')
  }

  if (checking) return <div className="loading-page">Verificando sesión…</div>

  // Sin sesión: un único formulario de ingreso
  if (!sesion) {
    return (
      <Routes>
        <Route path="/login" element={<Login onSuccess={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Sesión iniciada pero sin rol activo: elegir rol (el Administrador también se elige aquí)
  if (!sesion.rol_activo) {
    return (
      <Routes>
        <Route path="/seleccionar-rol" element={<SeleccionRol usuario={sesion.usuario} onSuccess={handleRolSeleccionado} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/seleccionar-rol" replace />} />
      </Routes>
    )
  }

  const rol = sesion.rol_activo
  const permisos = new Set(rol.permisos || [])
  const puedeAnular = permisos.has('ventas.anular')
  const inicio = inicioDeRol(rol)

  return (
    <Shell
      sesion={sesion}
      onLogout={handleLogout}
      onCambiarRol={() => { setSesion({ ...sesion, rol_activo: null }); navigate('/seleccionar-rol') }}
    >
      <Routes>
        {rol.es_admin ? (
          <>
            <Route path="/admin" element={<DashboardAdmin sesion={sesion} />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/productos" element={<GestionProductos />} />
            <Route path="/admin/reportes" element={<ReportesVentas />} />
            <Route path="/admin/ventas" element={<HistorialVentas puedeAnular={puedeAnular} />} />
          </>
        ) : (
          <>
            {permisos.has('ventas.crear') && <Route path="/tienda" element={<NuevaVenta sesion={sesion} />} />}
            {permisos.has('ventas.ver') && <Route path="/tienda/ventas" element={<HistorialVentas puedeAnular={puedeAnular} />} />}
            {permisos.has('productos.ver') && <Route path="/tienda/productos" element={<CatalogoProductos />} />}
            {permisos.has('stock.actualizar') && <Route path="/tienda/stock" element={<GestionStock />} />}
            {permisos.has('reportes.ver') && <Route path="/tienda/reportes" element={<ReportesVentas />} />}
          </>
        )}
        <Route path="*" element={<Navigate to={inicio} replace />} />
      </Routes>
    </Shell>
  )
}
