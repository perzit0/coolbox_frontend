import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi, tokenStore } from './api/client'

import LoginAdmin from './features/auth/LoginAdmin'
import LoginUsuario from './features/auth/LoginUsuario'
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

  const handleAdminLogin = (data) => {
    tokenStore.set(data.access_token)
    setSesion({ usuario: data.usuario, rol_activo: data.rol_activo })
    navigate('/admin')
  }

  const handleUsuarioLogin = (data) => {
    tokenStore.set(data.access_token)
    setSesion({ usuario: data.usuario, rol_activo: null })
    navigate('/seleccionar-rol')
  }

  const handleRolSeleccionado = (data) => {
    tokenStore.set(data.access_token)
    setSesion({ usuario: data.usuario, rol_activo: data.rol_activo })
    navigate('/tienda')
  }

  const handleLogout = () => {
    tokenStore.clear()
    setSesion(null)
    navigate('/login')
  }

  if (checking) return <div className="loading-page">Verificando sesión…</div>

  // No hay sesión aún
  if (!sesion) {
    return (
      <Routes>
        <Route path="/login" element={<LoginUsuario onSuccess={handleUsuarioLogin} />} />
        <Route path="/login-admin" element={<LoginAdmin onSuccess={handleAdminLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Sesión iniciada como usuario normal, pero sin rol activo
  if (sesion.usuario && !sesion.usuario.es_administrador && !sesion.rol_activo) {
    return (
      <Routes>
        <Route path="/seleccionar-rol" element={<SeleccionRol usuario={sesion.usuario} onSuccess={handleRolSeleccionado} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/seleccionar-rol" replace />} />
      </Routes>
    )
  }

  // Layout con sesión activa
  const esAdmin = sesion.usuario.es_administrador
  return (
    <Shell sesion={sesion} onLogout={handleLogout} onCambiarRol={() => { setSesion({ ...sesion, rol_activo: null }); navigate('/seleccionar-rol') }}>
      <Routes>
        {esAdmin ? (
          <>
            <Route path="/admin" element={<DashboardAdmin sesion={sesion} />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/productos" element={<GestionProductos />} />
            <Route path="/admin/reportes" element={<ReportesVentas />} />
            <Route path="/admin/ventas" element={<HistorialVentas />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/tienda" element={<NuevaVenta sesion={sesion} />} />
            <Route path="/tienda/ventas" element={<HistorialVentas />} />
            <Route path="/tienda/productos" element={<CatalogoProductos />} />
            <Route path="/tienda/stock" element={<GestionStock />} />
            <Route path="*" element={<Navigate to="/tienda" replace />} />
          </>
        )}
      </Routes>
    </Shell>
  )
}
