import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportesApi, usuariosApi, ventasApi } from '../../api/client'
import { ColumnChart } from '../../components/Charts'
import Icon from '../../components/Icon'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { fechaHora, hoyLima, METODOS_PAGO, money, plural } from '../../utils/format'

export default function DashboardAdmin({ sesion }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      reportesApi.resumen({ desde: hoyLima(-13), hasta: hoyLima() }),
      reportesApi.resumen({ desde: hoyLima(), hasta: hoyLima() }),
      reportesApi.inventario(),
      usuariosApi.listar({ estado: 'activo' }),
      ventasApi.listar({ per_page: 6 }),
    ])
      .then(([quincena, hoy, inv, usuarios, ventas]) => setDatos({ quincena, hoy, inv, usuarios: usuarios.usuarios, ventas: ventas.ventas }))
      .catch((err) => setError(err.detail))
  }, [])

  if (error) return <div className="alert alert-error">{error}</div>
  if (!datos) return <div className="loading-page"><span className="spinner spinner-dark" /> Cargando panel administrativo…</div>

  const { quincena, hoy, inv } = datos
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel administrativo</h1>
          <p className="page-subtitle">Bienvenido, {sesion.usuario.nombres}. Resumen operativo de la tienda.</p>
        </div>
        <div className="actions-inline">
          <Link to="/admin/usuarios" className="btn btn-outline"><Icon name="users" /> Usuarios</Link>
          <Link to="/productos" className="btn btn-primary"><Icon name="plus" /> Registrar producto</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Ventas de hoy</p>
          <p className="stat-value">{money(hoy.indicadores.total_vendido)}</p>
          <p className="stat-hint">{plural(hoy.indicadores.ventas_completadas, 'venta')} · ticket prom. {money(hoy.indicadores.ticket_promedio)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Últimos 14 días</p>
          <p className="stat-value">{money(quincena.indicadores.total_vendido)}</p>
          <p className="stat-hint">{plural(quincena.indicadores.unidades_vendidas, 'unidad', 'unidades')} · {plural(quincena.indicadores.ventas_anuladas, 'anulada')}</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Inventario valorizado</p>
          <p className="stat-value">{money(inv.valor_inventario)}</p>
          <p className="stat-hint">{inv.unidades_en_stock} unidades en {inv.productos_activos} productos</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Por reponer</p>
          <p className="stat-value">{inv.agotados + inv.stock_bajo}</p>
          <p className="stat-hint">{plural(inv.agotados, 'agotado')} · {inv.stock_bajo} con stock bajo · {plural(datos.usuarios.length, 'usuario activo', 'usuarios activos')}</p>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventas por día (últimos 14 días)</h3>
            <Link to="/reportes" className="link">Ver reportes</Link>
          </div>
          <ColumnChart datos={quincena.por_dia} />
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Más vendidos</h3>
          </div>
          {quincena.top_productos.length === 0 ? <div className="empty-state">Aún no hay ventas en el periodo.</div> : (
            <ol className="top-list">
              {quincena.top_productos.slice(0, 5).map((p) => (
                <li key={p.producto_id}>
                  <ProductoImagen producto={p} size="xs" />
                  <div>
                    <div className="top-name">{p.nombre}</div>
                    <SkuCode sku={p.sku} size="sm" />
                  </div>
                  <span className="top-units">{p.unidades} u.</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos por reponer</h3>
            <Link to="/kardex" className="link">Ir al kardex</Link>
          </div>
          {inv.criticos.length === 0 ? <div className="empty-state">Todo el inventario está sobre el stock mínimo.</div> : (
            <table className="data-table compact">
              <thead><tr><th>SKU</th><th>Producto</th><th className="num">Stock</th><th className="num">Mín.</th></tr></thead>
              <tbody>
                {inv.criticos.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td><SkuCode sku={p.sku} size="sm" /></td>
                    <td className="truncate">{p.nombre}</td>
                    <td className="num"><span className={`badge ${p.stock === 0 ? 'badge-red' : 'badge-yellow'}`}>{p.stock}</span></td>
                    <td className="num">{p.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Últimas ventas</h3>
            <Link to="/ventas" className="link">Ver historial</Link>
          </div>
          {datos.ventas.length === 0 ? <div className="empty-state">Aún no hay ventas registradas.</div> : (
            <table className="data-table compact">
              <thead><tr><th>Código</th><th>Fecha</th><th>Pago</th><th className="num">Total</th></tr></thead>
              <tbody>
                {datos.ventas.map((v) => (
                  <tr key={v.id} className={v.estado === 'anulada' ? 'row-muted' : ''}>
                    <td className="mono"><strong>{v.codigo}</strong></td>
                    <td>{fechaHora(v.fecha)}</td>
                    <td>{METODOS_PAGO[v.metodo_pago]}</td>
                    <td className="num">{v.estado === 'anulada' ? <span className="badge badge-red">Anulada</span> : money(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
