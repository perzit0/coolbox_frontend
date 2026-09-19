import { useEffect, useMemo, useState } from 'react'
import { productosApi, ventasApi } from '../../api/client'
import ComprobanteModal from './ComprobanteModal'

export default function NuevaVenta({ sesion }) {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [carrito, setCarrito] = useState({}) // { producto_id: {producto, cantidad} }
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDoc, setClienteDoc] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [comprobante, setComprobante] = useState(null)

  async function cargar() {
    const [p, c] = await Promise.all([
      productosApi.listar({ q: busqueda, categoria_id: categoriaFiltro || undefined }),
      productosApi.categorias(),
    ])
    setProductos(p.productos || [])
    setCategorias(c.categorias || [])
  }
  useEffect(() => { cargar() }, [busqueda, categoriaFiltro])

  const agregar = (producto) => {
    if (producto.stock === 0) return
    setCarrito((c) => {
      const actual = c[producto.id]
      const nueva = actual ? Math.min(actual.cantidad + 1, producto.stock) : 1
      return { ...c, [producto.id]: { producto, cantidad: nueva } }
    })
  }
  const cambiarCantidad = (id, cantidad) => {
    setCarrito((c) => {
      const item = c[id]
      if (!item) return c
      const cant = Math.max(1, Math.min(Number(cantidad) || 1, item.producto.stock))
      return { ...c, [id]: { ...item, cantidad: cant } }
    })
  }
  const quitar = (id) => setCarrito(({ [id]: _, ...rest }) => rest)

  const totales = useMemo(() => {
    const items = Object.values(carrito)
    const total = items.reduce((acc, it) => acc + it.producto.precio * it.cantidad, 0)
    const base = total / 1.18
    const igv = total - base
    return { total, base, igv, items }
  }, [carrito])

  async function registrar() {
    setError('')
    if (totales.items.length === 0) { setError('Agrega al menos un producto al carrito.'); return }
    setEnviando(true)
    try {
      const payload = {
        cliente_nombre: clienteNombre || null,
        cliente_documento: clienteDoc || null,
        metodo_pago: metodoPago,
        items: totales.items.map((it) => ({ producto_id: it.producto.id, cantidad: it.cantidad })),
      }
      const r = await ventasApi.crear(payload)
      setComprobante(r.venta)
      setCarrito({}); setClienteNombre(''); setClienteDoc(''); setMetodoPago('efectivo')
      cargar()
    } catch (err) {
      setError(err.detail || 'No fue posible registrar la venta.')
    } finally { setEnviando(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva Venta en Tienda</h1>
          <p className="page-subtitle">
            Atendido por <strong>{sesion.usuario.nombres} {sesion.usuario.apellido_paterno}</strong> —
            Rol: <strong>{sesion.rol_activo.nombre}</strong>
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <input className="form-control" placeholder="Buscar producto por nombre o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select className="form-control" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="ventas-layout">
        <div className="product-grid">
          {productos.map((p) => (
            <div key={p.id} className={`product-card ${p.stock === 0 ? 'oos' : ''}`} onClick={() => agregar(p)}>
              <div className="product-code">{p.codigo}</div>
              <div className="product-name">{p.nombre}</div>
              <div className="product-brand">{p.marca} · {p.categoria}</div>
              <div className="product-price">S/ {p.precio.toFixed(2)}</div>
              <div className={`product-stock ${p.stock === 0 ? 'oos' : p.stock <= p.stock_minimo ? 'low' : ''}`}>
                {p.stock === 0 ? 'Sin stock' : `Stock: ${p.stock}`}
              </div>
            </div>
          ))}
          {productos.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}>Sin productos.</div>}
        </div>

        <aside className="cart-panel">
          <h3 className="cart-title">Carrito ({totales.items.length})</h3>

          <div className="cart-items">
            {totales.items.length === 0 ? (
              <div className="cart-empty">Aún no agregas productos.<br/>Haz clic en un producto para añadirlo.</div>
            ) : totales.items.map((it) => (
              <div key={it.producto.id} className="cart-item">
                <div>
                  <div className="cart-item-name">{it.producto.nombre}</div>
                  <div className="cart-item-price">S/ {it.producto.precio.toFixed(2)} c/u</div>
                </div>
                <input
                  type="number"
                  className="cart-qty-input"
                  min="1"
                  max={it.producto.stock}
                  value={it.cantidad}
                  onChange={(e) => cambiarCantidad(it.producto.id, e.target.value)}
                />
                <button className="cart-remove" onClick={() => quitar(it.producto.id)}>Quitar</button>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cliente (opcional)</label>
            <input className="form-control" placeholder="Nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input className="form-control" placeholder="DNI/RUC" value={clienteDoc} onChange={(e) => setClienteDoc(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Método de pago</label>
            <select className="form-control" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div className="cart-totals">
            <div className="cart-total-row"><span>Subtotal (sin IGV)</span><span>S/ {totales.base.toFixed(2)}</span></div>
            <div className="cart-total-row"><span>IGV (18%)</span><span>S/ {totales.igv.toFixed(2)}</span></div>
            <div className="cart-total-row grand"><span>Total</span><span>S/ {totales.total.toFixed(2)}</span></div>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: 0 }}>{error}</div>}

          <button className="btn btn-primary btn-block btn-lg" onClick={registrar} disabled={enviando || totales.items.length === 0}>
            {enviando ? <span className="spinner" /> : 'Registrar venta'}
          </button>
        </aside>
      </div>

      {comprobante && <ComprobanteModal venta={comprobante} onClose={() => setComprobante(null)} />}
    </>
  )
}
