import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'

/** Consulta de solo lectura al catálogo. */
export default function CatalogoProductos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([productosApi.listar({ q, categoria_id: cat || undefined }), productosApi.categorias()])
      .then(([p, c]) => { setProductos(p.productos || []); setCategorias(c.categorias || []) })
      .finally(() => setLoading(false))
  }, [q, cat])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Productos</h1>
          <p className="page-subtitle">Consulta rápida de productos disponibles en tienda.</p>
        </div>
      </div>

      <div className="filter-bar">
        <input className="form-control" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="form-control" value={cat} onChange={(e) => setCat(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="product-grid">
        {loading ? <div className="empty-state" style={{ gridColumn: '1/-1' }}>Cargando…</div>
          : productos.length === 0 ? <div className="empty-state" style={{ gridColumn: '1/-1' }}>Sin resultados.</div>
          : productos.map((p) => (
            <div key={p.id} className="product-card" style={{ cursor: 'default' }}>
              <div className="product-code">{p.codigo}</div>
              <div className="product-name">{p.nombre}</div>
              <div className="product-brand">{p.marca} · {p.categoria}</div>
              <div className="product-price">S/ {p.precio.toFixed(2)}</div>
              <div className={`product-stock ${p.stock === 0 ? 'oos' : p.stock <= p.stock_minimo ? 'low' : ''}`}>
                {p.stock === 0 ? 'Sin stock' : `Stock: ${p.stock}`}
              </div>
            </div>
          ))}
      </div>
    </>
  )
}
