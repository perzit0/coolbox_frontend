import { NavLink } from 'react-router-dom'

/** Barra superior + navegación filtrada por permisos del rol activo. */
export default function Shell({ sesion, onLogout, onCambiarRol, children }) {
  const { usuario, rol_activo } = sesion
  const permisos = new Set(rol_activo?.permisos || [])
  const esAdmin = usuario.es_administrador

  // Ítems de navegación: se filtran por permiso del rol activo
  const items = esAdmin
    ? [
        { to: '/admin', label: 'Panel', end: true },
        { to: '/admin/usuarios', label: 'Usuarios', perm: 'usuarios.ver' },
        { to: '/admin/productos', label: 'Productos', perm: 'productos.ver' },
        { to: '/admin/ventas', label: 'Ventas', perm: 'ventas.ver' },
        { to: '/admin/reportes', label: 'Reportes', perm: 'reportes.ver' },
      ]
    : [
        { to: '/tienda', label: 'Nueva Venta', perm: 'ventas.crear' },
        { to: '/tienda/ventas', label: 'Historial de Ventas', perm: 'ventas.ver' },
        { to: '/tienda/productos', label: 'Catálogo', perm: 'productos.ver' },
        { to: '/tienda/stock', label: 'Almacén', perm: 'stock.actualizar' },
      ]

  const visibles = items.filter((it) => !it.perm || permisos.has(it.perm))

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">COOLBOX</span>
          <span className="brand-tag">{esAdmin ? 'Panel Administrativo' : 'Sistema de Tienda'}</span>
        </div>

        <nav className="topbar-nav">
          {visibles.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-user">
          <div className="user-info">
            <div className="user-name">{usuario.nombre_completo}</div>
            <div className="user-role">{rol_activo?.nombre || 'Sin rol activo'}</div>
          </div>
          {!esAdmin && usuario.roles.length > 1 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCambiarRol} style={{ color: '#fff' }}>
              Cambiar rol
            </button>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  )
}
