import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productosApi, usuariosApi, ventasApi } from '../../api/client'

export default function DashboardAdmin({ sesion }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      usuariosApi.listar().catch(() => ({ usuarios: [] })),
      productosApi.listar({ solo_activos: false }).catch(() => ({ productos: [] })),
      ventasApi.reporte().catch(() => ({ total_facturado: 0, ventas_completadas: 0, ventas_anuladas: 0 })),
    ])
      .then(([u, p, r]) => {
        const bajos = (p.productos || []).filter((x) => x.stock <= x.stock_minimo).length
        setStats({
          usuarios: u.usuarios?.length || 0,
          productos: p.productos?.length || 0,
          stock_bajo: bajos,
          ...r,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-page">Cargando panel administrativo…</div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel Administrativo</h1>
          <p className="page-subtitle">Bienvenido, {sesion.usuario.nombres}. Este es el resumen operativo del día.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Personal registrado</p>
          <p className="stat-value">{stats.usuarios}</p>
          <p className="stat-hint">Usuarios en el sistema</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Productos activos</p>
          <p className="stat-value">{stats.productos}</p>
          <p className="stat-hint">Ítems en el catálogo</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Ventas completadas</p>
          <p className="stat-value">{stats.ventas_completadas}</p>
          <p className="stat-hint">S/ {Number(stats.total_facturado).toFixed(2)} facturado</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Stock bajo</p>
          <p className="stat-value">{stats.stock_bajo}</p>
          <p className="stat-hint">Productos por reponer</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Accesos rápidos</h3>
        </div>
        <div className="actions-inline">
          <Link to="/admin/usuarios" className="btn btn-primary">Registrar nuevo usuario</Link>
          <Link to="/admin/productos" className="btn btn-outline">Gestionar productos</Link>
          <Link to="/admin/ventas" className="btn btn-outline">Ver ventas del día</Link>
          <Link to="/admin/reportes" className="btn btn-outline">Reportes de operación</Link>
        </div>
      </div>
    </>
  )
}
