import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import ProductoForm from './ProductoForm'
import ProductoImagen from '../../components/ProductoImagen'

export default function GestionProductos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        productosApi.listar({ q: busqueda, categoria_id: categoriaFiltro || undefined, solo_activos: false }),
        productosApi.categorias(),
      ])
      setProductos(p.productos || [])
      setCategorias(c.categorias || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [busqueda, categoriaFiltro])

  const onGuardado = () => {
    setFormAbierto(false); setEditando(null); cargar()
    setMensaje('Producto guardado.'); setTimeout(() => setMensaje(''), 2500)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Productos</h1>
          <p className="page-subtitle">Administra el catálogo, fotos, precios y stock de la tienda.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setFormAbierto(true) }}>
          Registrar nuevo producto
        </button>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Buscar por nombre, código o marca…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="form-control" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Foto</th>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Marca</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="empty-state">Cargando…</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan="9" className="empty-state">Sin productos coincidentes.</td></tr>
            ) : productos.map((p) => (
              <tr key={p.id}>
                <td><ProductoImagen producto={p} size="xs" /></td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.codigo}</td>
                <td><strong>{p.nombre}</strong></td>
                <td>{p.categoria}</td>
                <td>{p.marca}</td>
                <td><strong>S/ {p.precio.toFixed(2)}</strong></td>
                <td>
                  <span className={p.stock === 0 ? 'badge badge-red' : p.stock <= p.stock_minimo ? 'badge badge-yellow' : 'badge badge-green'}>
                    {p.stock}
                  </span>
                </td>
                <td>
                  <span className={p.activo ? 'badge badge-green' : 'badge badge-gray'}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditando(p); setFormAbierto(true) }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formAbierto && (
        <ProductoForm
          producto={editando}
          categorias={categorias}
          onClose={() => { setFormAbierto(false); setEditando(null) }}
          onGuardado={onGuardado}
        />
      )}
    </>
  )
}
