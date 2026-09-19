import { useEffect, useState } from 'react'
import { ventasApi } from '../../api/client'
import ComprobanteModal from './ComprobanteModal'

/** Historial de ventas. La acción "Anular" solo se muestra si el rol activo
 * tiene el permiso ventas.anular (Supervisor de Ventas o Administrador). */
export default function HistorialVentas({ puedeAnular = false }) {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [msg, setMsg] = useState('')

  async function cargar() {
    setLoading(true)
    try { setVentas((await ventasApi.listar()).ventas || []) } finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [])

  const verDetalle = async (id) => setDetalle((await ventasApi.obtener(id)).venta)
  const anular = async (v) => {
    if (!confirm(`¿Anular la venta ${v.codigo}? Se devolverá el stock.`)) return
    try {
      await ventasApi.anular(v.id)
      setMsg('Venta anulada. Stock devuelto.'); setTimeout(() => setMsg(''), 2500)
      cargar()
    } catch (err) {
      alert(err.detail || 'No fue posible anular.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Ventas</h1>
          <p className="page-subtitle">Últimas 200 ventas registradas.</p>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Atendido por</th>
              <th>Rol</th>
              <th>Cliente</th>
              <th>Método</th>
              <th>Total</th>
              <th>Estado</th>
              <th style={{ width: puedeAnular ? 180 : 90 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="empty-state">Cargando…</td></tr>
            ) : ventas.length === 0 ? (
              <tr><td colSpan="9" className="empty-state">Aún no hay ventas registradas.</td></tr>
            ) : ventas.map((v) => (
              <tr key={v.id}>
                <td style={{ fontFamily: 'monospace' }}><strong>{v.codigo}</strong></td>
                <td>{new Date(v.fecha).toLocaleString('es-PE')}</td>
                <td>{v.usuario_nombre}</td>
                <td>{v.rol}</td>
                <td>{v.cliente_nombre || '—'}</td>
                <td>{v.metodo_pago}</td>
                <td><strong>S/ {v.total.toFixed(2)}</strong></td>
                <td>
                  <span className={v.estado === 'completada' ? 'badge badge-green' : 'badge badge-red'}>{v.estado}</span>
                </td>
                <td>
                  <div className="actions-inline">
                    <button className="btn btn-outline btn-sm" onClick={() => verDetalle(v.id)}>Ver</button>
                    {puedeAnular && v.estado === 'completada' && (
                      <button className="btn btn-danger btn-sm" onClick={() => anular(v)}>Anular</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && <ComprobanteModal venta={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}
