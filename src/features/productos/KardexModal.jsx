import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import Modal from '../../components/Modal'
import SkuCode from '../../components/SkuCode'
import { fechaHora, TIPOS_MOVIMIENTO } from '../../utils/format'

/** Kardex de un producto: todos sus movimientos con saldo. */
export default function KardexModal({ producto, onClose }) {
  const [movs, setMovs] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    productosApi.movimientos(producto.id).then((r) => setMovs(r.movimientos)).catch((e) => setError(e.detail))
  }, [producto.id])

  return (
    <Modal size="lg" onClose={onClose} titulo="Kardex del producto"
      subtitulo={<><SkuCode sku={producto.sku} producto={producto} size="sm" /> {producto.nombre}</>}>
      {error && <div className="alert alert-error">{error}</div>}
      {!movs ? <div className="empty-state">Cargando…</div> : movs.length === 0 ? <div className="empty-state">Sin movimientos registrados.</div> : (
        <div className="table-wrapper flat">
          <table className="data-table compact">
            <thead><tr><th>Fecha</th><th>Tipo</th><th className="num">Cantidad</th><th className="num">Saldo</th><th>Motivo / referencia</th><th>Usuario</th></tr></thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}>
                  <td className="nowrap small">{fechaHora(m.fecha)}</td>
                  <td><span className={`badge ${TIPOS_MOVIMIENTO[m.tipo]?.clase}`}>{TIPOS_MOVIMIENTO[m.tipo]?.label || m.tipo}</span></td>
                  <td className={`num mono ${m.cantidad > 0 ? 'pos' : 'neg'}`}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                  <td className="num"><strong>{m.stock_nuevo}</strong></td>
                  <td className="small">{m.motivo || '—'}</td>
                  <td className="small">{m.usuario_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
