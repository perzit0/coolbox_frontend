import { useEffect, useMemo, useRef, useState } from 'react'
import { productosApi, ventasApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { METODOS_PAGO, money } from '../../utils/format'
import useCatalogo from '../productos/useCatalogo'
import ComprobanteModal from './ComprobanteModal'

const IGV = 0.18

export default function NuevaVenta({ sesion }) {
  const fb = useFeedback()
  const { familias } = useCatalogo()
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [familiaId, setFamiliaId] = useState('')
  const [carrito, setCarrito] = useState({}) // { producto_id: {producto, cantidad} }
  const [clienteNombre, setClienteNombre] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [recibido, setRecibido] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [comprobante, setComprobante] = useState(null)
  const buscador = useRef(null)

  async function cargar() {
    try {
      const r = await productosApi.listar({ q: busqueda, familia_id: familiaId })
      setProductos(r.productos || [])
    } catch (err) { fb.error(err.detail) }
  }
  useEffect(() => {
    const t = setTimeout(cargar, 200)
    return () => clearTimeout(t)
  }, [busqueda, familiaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const agregar = (producto) => {
    if (producto.stock === 0) return
    const actual = carrito[producto.id]?.cantidad || 0
    if (actual >= producto.stock) { fb.info(`Solo hay ${producto.stock} unidad(es) de ${producto.sku}.`); return }
    setCarrito((c) => ({ ...c, [producto.id]: { producto, cantidad: actual + 1 } }))
  }
  const cambiarCantidad = (id, cantidad) => setCarrito((c) => {
    const item = c[id]
    if (!item) return c
    const cant = Math.max(1, Math.min(Number(cantidad) || 1, item.producto.stock))
    return { ...c, [id]: { ...item, cantidad: cant } }
  })
  const quitar = (id) => setCarrito(({ [id]: _, ...rest }) => rest)

  // Enter en el buscador: si hay coincidencia exacta por SKU o un único resultado, se agrega
  const onBuscarEnter = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const exacto = productos.find((p) => p.sku === busqueda.trim() || p.codigo === busqueda.trim().toUpperCase())
    const elegido = exacto || (productos.length === 1 ? productos[0] : null)
    if (elegido) { agregar(elegido); setBusqueda('') }
  }

  const totales = useMemo(() => {
    const items = Object.values(carrito)
    const total = Math.round(items.reduce((acc, it) => acc + it.producto.precio * it.cantidad, 0) * 100) / 100
    const base = Math.round((total / (1 + IGV)) * 100) / 100
    const unidades = items.reduce((a, it) => a + it.cantidad, 0)
    return { total, base, igv: Math.round((total - base) * 100) / 100, items, unidades }
  }, [carrito])

  const montoRecibido = Number(recibido)
  const vuelto = metodoPago === 'efectivo' && recibido !== '' ? montoRecibido - totales.total : null
  const efectivoInsuficiente = vuelto !== null && vuelto < 0

  async function registrar() {
    setError('')
    if (totales.items.length === 0) { setError('Agrega al menos un producto al carrito.'); return }
    if (efectivoInsuficiente) { setError('El monto recibido no cubre el total.'); return }
    const ok = await fb.confirmar({
      titulo: 'Confirmar venta',
      mensaje: `Se registrará la venta por ${money(totales.total)} (${totales.unidades} unidad${totales.unidades === 1 ? '' : 'es'}) con pago ${METODOS_PAGO[metodoPago]}.`,
      textoConfirmar: 'Registrar venta',
    })
    if (!ok) return
    setEnviando(true)
    try {
      const r = await ventasApi.crear({
        cliente_nombre: clienteNombre || null,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'efectivo' && recibido !== '' ? montoRecibido : null,
        items: totales.items.map((it) => ({ producto_id: it.producto.id, cantidad: it.cantidad })),
      })
      setComprobante(r.venta)
      setCarrito({}); setClienteNombre(''); setMetodoPago('efectivo'); setRecibido('')
      cargar()
    } catch (err) {
      setError(err.detail || 'No fue posible registrar la venta.')
      cargar()
    } finally { setEnviando(false) }
  }

  const sugerencias = totales.total > 0
    ? [...new Set([Math.ceil(totales.total / 10) * 10, Math.ceil(totales.total / 50) * 50, Math.ceil(totales.total / 100) * 100])].slice(0, 3)
    : []

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva venta en tienda</h1>
          <p className="page-subtitle">
            Atiende <strong>{sesion.usuario.nombres} {sesion.usuario.apellido_paterno}</strong> · {sesion.rol_activo.nombre}.
            Escribe o escanea el SKU y presiona Enter para agregarlo.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box grow">
          <Icon name="search" size={16} />
          <input ref={buscador} className="form-control" autoFocus placeholder="SKU, código o nombre del producto…" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} onKeyDown={onBuscarEnter} />
        </div>
        <div className="chip-row">
          <button type="button" className={`chip ${!familiaId ? 'active' : ''}`} onClick={() => setFamiliaId('')}>Todo</button>
          {familias.map((f) => (
            <button key={f.id} type="button" className={`chip ${String(familiaId) === String(f.id) ? 'active' : ''}`}
              onClick={() => setFamiliaId(f.id)}>{f.nombre}</button>
          ))}
        </div>
      </div>

      <div className="ventas-layout">
        <div className="product-grid">
          {productos.map((p) => {
            const enCarrito = carrito[p.id]?.cantidad || 0
            return (
              <button type="button" key={p.id} className={`product-card ${p.stock === 0 ? 'oos' : ''} ${enCarrito ? 'in-cart' : ''}`}
                onClick={() => agregar(p)} disabled={p.stock === 0}>
                {enCarrito > 0 && <span className="in-cart-badge">{enCarrito}</span>}
                <ProductoImagen producto={p} />
                <SkuCode sku={p.sku} producto={p} size="sm" />
                <span className="product-name clamp-3">{p.nombre}</span>
                <span className="product-brand">{p.marca} · {p.familia}</span>
                <span className="product-price">{money(p.precio)}</span>
                <span className={`product-stock ${p.estado_stock === 'agotado' ? 'oos' : p.estado_stock === 'bajo' ? 'low' : ''}`}>
                  {p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}
                </span>
              </button>
            )
          })}
          {productos.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}>Sin productos que coincidan.</div>}
        </div>

        <aside className="cart-panel">
          <div className="cart-head">
            <h3 className="cart-title">Carrito</h3>
            <span className="badge badge-black">{totales.unidades} u.</span>
            {totales.items.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCarrito({})}>Vaciar</button>
            )}
          </div>

          <div className="cart-items">
            {totales.items.length === 0 ? (
              <div className="cart-empty">
                <Icon name="cart" size={32} />
                <p>Aún no agregas productos.<br />Haz clic en un producto o escanea su SKU.</p>
              </div>
            ) : totales.items.map((it) => (
              <div key={it.producto.id} className="cart-item">
                <ProductoImagen producto={it.producto} size="xs" />
                <div className="cart-item-info">
                  <div className="cart-item-name">{it.producto.nombre}</div>
                  <div className="cart-item-price">{it.producto.sku} · {money(it.producto.precio)} c/u</div>
                </div>
                <div className="qty">
                  <button type="button" onClick={() => (it.cantidad > 1 ? cambiarCantidad(it.producto.id, it.cantidad - 1) : quitar(it.producto.id))} aria-label="Restar"><Icon name="minus" size={14} /></button>
                  <input type="number" min="1" max={it.producto.stock} value={it.cantidad}
                    onChange={(e) => cambiarCantidad(it.producto.id, e.target.value)} />
                  <button type="button" onClick={() => cambiarCantidad(it.producto.id, it.cantidad + 1)} disabled={it.cantidad >= it.producto.stock} aria-label="Sumar"><Icon name="plus" size={14} /></button>
                </div>
                <div className="cart-item-sub">{money(it.producto.precio * it.cantidad)}</div>
              </div>
            ))}
          </div>

          <div className="form-group compact">
            <label>Nombre del cliente (opcional)</label>
            <input className="form-control" placeholder="Ej. Carlos Ramírez" maxLength={180} value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
          </div>

          <div className="form-group compact">
            <label>Método de pago</label>
            <div className="pay-methods">
              {Object.entries(METODOS_PAGO).map(([id, label]) => (
                <button key={id} type="button" className={`pay-method ${metodoPago === id ? 'active' : ''}`} onClick={() => setMetodoPago(id)}>{label}</button>
              ))}
            </div>
          </div>

          {metodoPago === 'efectivo' && totales.total > 0 && (
            <div className="form-group compact">
              <label>Monto recibido (opcional, para calcular vuelto)</label>
              <input className="form-control" type="number" step="0.10" min="0" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="S/ 0.00" />
              <div className="chip-row">
                <button type="button" className="chip" onClick={() => setRecibido(String(totales.total))}>Exacto</button>
                {sugerencias.filter((s) => s > totales.total).map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => setRecibido(String(s))}>{money(s)}</button>
                ))}
              </div>
            </div>
          )}

          <div className="cart-totals">
            <div className="cart-total-row"><span>Op. gravada (sin IGV)</span><span>{money(totales.base)}</span></div>
            <div className="cart-total-row"><span>IGV (18%)</span><span>{money(totales.igv)}</span></div>
            <div className="cart-total-row grand"><span>Total</span><span>{money(totales.total)}</span></div>
            {vuelto !== null && (
              <div className={`cart-total-row vuelto ${efectivoInsuficiente ? 'neg' : ''}`}>
                <span>{efectivoInsuficiente ? 'Falta' : 'Vuelto'}</span><span>{money(Math.abs(vuelto))}</span>
              </div>
            )}
          </div>

          {error && <div className="alert alert-error" style={{ margin: 0 }}>{error}</div>}

          <button className="btn btn-primary btn-block btn-lg" onClick={registrar}
            disabled={enviando || totales.items.length === 0 || efectivoInsuficiente}>
            {enviando ? <span className="spinner" /> : `Cobrar ${money(totales.total)}`}
          </button>
        </aside>
      </div>

      {comprobante && (
        <ComprobanteModal venta={comprobante} recienCreada
          onClose={() => { setComprobante(null); buscador.current?.focus() }} />
      )}
    </>
  )
}
