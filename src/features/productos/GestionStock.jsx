import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { ESTADO_STOCK } from '../../utils/format'
import FiltrosProductos, { FILTROS_INICIALES } from './FiltrosProductos'
import KardexModal from './KardexModal'
import MovimientoModal from './MovimientoModal'
import useCatalogo from './useCatalogo'

/** Vista del Almacenero: entradas, salidas y ajustes con motivo (todo queda en el kardex). */
export default function GestionStock() {
  const fb = useFeedback()
  const { familias, marcas } = useCatalogo()
  const [filtros, setFiltros] = useState({ ...FILTROS_INICIALES, solo_activos: false })
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [movimiento, setMovimiento] = useState(null) // { producto, tipo }
  const [kardex, setKardex] = useState(null)

  const cargar = async () => {
    setLoading(true)
    try { setProductos((await productosApi.listar(filtros)).productos || []) }
    catch (err) { fb.error(err.detail) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
  }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps

  const resumen = {
    agotados: productos.filter((p) => p.estado_stock === 'agotado').length,
    bajos: productos.filter((p) => p.estado_stock === 'bajo').length,
    unidades: productos.reduce((a, p) => a + p.stock, 0),
  }

  const onGuardado = (producto, tipo) => {
    setMovimiento(null)
    setProductos((ps) => ps.map((p) => (p.id === producto.id ? producto : p)))
    fb.ok(`${tipo === 'entrada' ? 'Entrada' : tipo === 'salida' ? 'Salida' : 'Ajuste'} registrado. Stock de ${producto.sku}: ${producto.stock}.`)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Control de almacén</h1>
          <p className="page-subtitle">Registra entradas, salidas y ajustes de inventario. Cada movimiento queda en el kardex con su motivo.</p>
        </div>
      </div>

      <div className="mini-stats">
        <button type="button" className="mini-stat" onClick={() => setFiltros((f) => ({ ...f, estado_stock: '' }))}>
          <span>{resumen.unidades}</span> unidades en la vista
        </button>
        <button type="button" className="mini-stat warn" onClick={() => setFiltros((f) => ({ ...f, estado_stock: 'bajo' }))}>
          <span>{resumen.bajos}</span> con stock bajo
        </button>
        <button type="button" className="mini-stat danger" onClick={() => setFiltros((f) => ({ ...f, estado_stock: 'agotado' }))}>
          <span>{resumen.agotados}</span> agotados
        </button>
      </div>

      <FiltrosProductos filtros={filtros} setFiltros={setFiltros} familias={familias} marcas={marcas} />

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }} />
              <th>SKU</th>
              <th>Producto</th>
              <th className="num">Stock</th>
              <th className="num">Mínimo</th>
              <th>Estado</th>
              <th className="actions-col">Movimientos</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="empty-state">Cargando…</td></tr>
              : productos.length === 0 ? <tr><td colSpan="7" className="empty-state">Sin productos.</td></tr>
                : productos.map((p) => (
                  <tr key={p.id}>
                    <td><ProductoImagen producto={p} size="xs" /></td>
                    <td><SkuCode sku={p.sku} producto={p} /></td>
                    <td><strong className="clamp-2">{p.nombre}</strong></td>
                    <td className="num"><strong className="big-num">{p.stock}</strong></td>
                    <td className="num">{p.stock_minimo}</td>
                    <td><span className={`badge ${ESTADO_STOCK[p.estado_stock].clase}`}>{ESTADO_STOCK[p.estado_stock].label}</span></td>
                    <td>
                      <div className="actions-inline nowrap">
                        <button className="btn btn-outline btn-sm" onClick={() => setMovimiento({ producto: p, tipo: 'entrada' })} title="Entrada">
                          <Icon name="arrowIn" size={15} /> Entrada
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setMovimiento({ producto: p, tipo: 'salida' })} disabled={p.stock === 0} title="Salida">
                          <Icon name="arrowOut" size={15} /> Salida
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setMovimiento({ producto: p, tipo: 'ajuste' })} title="Ajuste por conteo">
                          <Icon name="scale" size={15} />
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setKardex(p)} title="Ver kardex">
                          <Icon name="kardex" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {movimiento && (
        <MovimientoModal producto={movimiento.producto} tipoInicial={movimiento.tipo}
          onClose={() => setMovimiento(null)} onGuardado={onGuardado} />
      )}
      {kardex && <KardexModal producto={kardex} onClose={() => setKardex(null)} />}
    </>
  )
}
