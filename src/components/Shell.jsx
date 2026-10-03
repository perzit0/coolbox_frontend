import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'

/** Ítems del menú lateral. `perm` filtra según los permisos del rol activo. */
export const MENU = [
  { seccion: 'General' },
  { to: '/admin', label: 'Panel', icon: 'dashboard', soloAdmin: true, end: true },
  { to: '/ventas/nueva', label: 'Nueva venta', icon: 'cart', perm: 'ventas.crear' },
  { to: '/ventas', label: 'Historial de ventas', icon: 'receipt', perm: 'ventas.ver', end: true },
  { to: '/reportes', label: 'Reportes', icon: 'chart', perm: 'reportes.ver' },
  { seccion: 'Catálogo e inventario' },
  { to: '/productos', label: 'Productos', icon: 'box', perm: 'productos.ver' },
  { to: '/almacen', label: 'Almacén', icon: 'warehouse', perm: 'stock.actualizar' },
  { to: '/kardex', label: 'Kardex', icon: 'kardex', perm: 'kardex.ver' },
  { to: '/catalogo/sku', label: 'Familias y SKU', icon: 'tag', perm: 'productos.ver' },
  { seccion: 'Administración', soloAdmin: true },
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'users', perm: 'usuarios.ver' },
]

export function itemsVisibles(rol) {
  const permisos = new Set(rol?.permisos || [])
  const esAdmin = !!rol?.es_admin
  const visibles = MENU.filter((it) => (!it.soloAdmin || esAdmin) && (!it.perm || permisos.has(it.perm)))
  // Quitar encabezados de sección sin ítems debajo
  return visibles.filter((it, i) => !it.seccion || (visibles[i + 1] && !visibles[i + 1].seccion))
}

function iniciales(usuario) {
  return `${usuario.nombres?.[0] || ''}${usuario.apellido_paterno?.[0] || ''}`.toUpperCase()
}

export default function Shell({ sesion, onLogout, onCambiarRol, children }) {
  const { usuario, rol_activo } = sesion
  const [abierto, setAbierto] = useState(false)
  const location = useLocation()
  useEffect(() => { setAbierto(false) }, [location.pathname])

  return (
    <div className={`layout ${abierto ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">COOLBOX</span>
          <span className="brand-tag">{rol_activo?.es_admin ? 'Administración' : 'Gestión de tienda'}</span>
        </div>

        <nav className="sidebar-nav">
          {itemsVisibles(rol_activo).map((item) => item.seccion ? (
            <div key={item.seccion} className="nav-section">{item.seccion}</div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/mi-cuenta" className="sidebar-user">
            <span className="avatar">{iniciales(usuario)}</span>
            <span className="sidebar-user-info">
              <span className="user-name">{usuario.nombres} {usuario.apellido_paterno}</span>
              <span className="user-role">{rol_activo?.nombre}</span>
            </span>
          </NavLink>
          <div className="sidebar-actions">
            {usuario.roles.length > 1 && (
              <button type="button" className="sidebar-btn" onClick={onCambiarRol} title="Cambiar de rol">
                <Icon name="swap" size={16} /> Cambiar rol
              </button>
            )}
            <button type="button" className="sidebar-btn" onClick={onLogout} title="Cerrar sesión">
              <Icon name="logout" size={16} /> Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={() => setAbierto(false)} />

      <div className="layout-main">
        <header className="mobile-bar">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Icon name="menu" size={22} />
          </button>
          <span className="brand-mark">COOLBOX</span>
          <span className="mobile-role">{rol_activo?.nombre}</span>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
