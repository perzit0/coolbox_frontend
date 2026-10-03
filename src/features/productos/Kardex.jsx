import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import { fechaHora, TIPOS_MOVIMIENTO } from '../../utils/format'
import SkuCode from '../../components/SkuCode'
import KardexModal from './KardexModal'

/** Kardex general: últimos movimientos de stock de toda la tienda. */
export default function Kardex() {
  const fb = useFeedback()
  const [tipo, setTipo] = useState('')
  const [q, setQ] = useState('')
  const [movs, setMovs] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)

  const cargar = () => {
    setLoading(true)
    productosApi.movimientosRecientes({ tipo, limit: 300 })
      .then((r) => setMovs(r.movimientos))
      .catch((e) => fb.error(e.detail))
      .finally(() => setLoading(false))
  }
  useEffect(cargar, [tipo]) // eslint-disable-line react-hooks/exhaustive-deps

  const texto = q.trim().toLowerCase()
  const visibles = texto
    ? movs.filter((m) => `${m.producto_sku} ${m.producto_nombre} ${m.motivo || ''} ${m.usuario_nombre}`.toLowerCase().includes(texto))
    : movs

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kardex de inventario</h1>
          <p className="page-subtitle">Trazabilidad de cada unidad: ventas, anulaciones, entradas, salidas y ajustes.</p>
        </div>
        <button className="btn btn-outline" onClick={cargar}><Icon name="refresh" /> Actualizar</button>
      </div>

      <div className="filter-bar">
        <div className="search-box grow">
          <Icon name="search" size={16} />
          <input className="form-control" placeholder="Filtrar por SKU, producto, motivo o usuario…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="segmented">
          <button type="button" className={!tipo ? 'active' : ''} onClick={() => setTipo('')}>Todos</button>
          {Object.entries(TIPOS_MOVIMIENTO).map(([id, t]) => (
            <button key={id} type="button" className={tipo === id ? 'active' : ''} onClick={() => setTipo(id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Fecha</th><th>Tipo</th><th>SKU</th><th>Producto</th><th className="num">Cant.</th><th className="num">Anterior</th><th className="num">Saldo</th><th>Motivo</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="9" className="empty-state">Cargando…</td></tr>
              : visibles.length === 0 ? <tr><td colSpan="9" className="empty-state">Sin movimientos.</td></tr>
                : visibles.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => setDetalle({ id: m.producto_id, sku: m.producto_sku, nombre: m.producto_nombre })}>
                    <td className="nowrap small">{fechaHora(m.fecha)}</td>
                    <td><span className={`badge ${TIPOS_MOVIMIENTO[m.tipo]?.clase}`}>{TIPOS_MOVIMIENTO[m.tipo]?.label}</span></td>
                    <td><SkuCode sku={m.producto_sku} size="sm" /></td>
                    <td className="truncate">{m.producto_nombre}</td>
                    <td className={`num mono ${m.cantidad > 0 ? 'pos' : 'neg'}`}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                    <td className="num">{m.stock_anterior}</td>
                    <td className="num"><strong>{m.stock_nuevo}</strong></td>
                    <td className="small kardex-motivo">{m.motivo || '—'}</td>
                    <td className="small nowrap">{m.usuario_nombre}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {detalle && <KardexModal producto={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}
