import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import ProductoImagen from '../../components/ProductoImagen'

/** Vista para el rol Almacenero: ajustar stock (entradas / salidas). */
export default function GestionStock() {
  const [productos, setProductos] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function cargar() {
    setLoading(true)
    try { setProductos((await productosApi.listar({ q, solo_activos: false })).productos || []) }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [q])

  const ajustar = async (p, delta) => {
    try {
      await productosApi.ajustarStock(p.id, { delta })
      setMsg(`Stock de ${p.nombre} actualizado.`); setTimeout(() => setMsg(''), 2000)
      cargar()
    } catch (err) {
      alert(err.detail || 'No fue posible actualizar el stock.')
    }
  }

  const setAbsoluto = async (p) => {
    const valor = prompt(`Nuevo stock para ${p.nombre} (actual: ${p.stock})`, String(p.stock))
    if (valor === null) return
    try {
      await productosApi.ajustarStock(p.id, { stock: Number(valor) })
      cargar()
    } catch (err) {
      alert(err.detail || 'No fue posible actualizar el stock.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Control de Almacén</h1>
          <p className="page-subtitle">Registra entradas y salidas de mercadería en tienda.</p>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="filter-bar">
        <input className="form-control" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}></th>
              <th>Código</th>
              <th>Producto</th>
              <th>Stock actual</th>
              <th>Stock mínimo</th>
              <th style={{ width: 320 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="empty-state">Cargando…</td></tr>
              : productos.map((p) => (
                <tr key={p.id}>
                  <td><ProductoImagen producto={p} size="xs" /></td>
                  <td style={{ fontFamily: 'monospace' }}>{p.codigo}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>
                    <span className={p.stock === 0 ? 'badge badge-red' : p.stock <= p.stock_minimo ? 'badge badge-yellow' : 'badge badge-green'}>
                      {p.stock}
                    </span>
                  </td>
                  <td>{p.stock_minimo}</td>
                  <td>
                    <div className="actions-inline">
                      <button className="btn btn-outline btn-sm" onClick={() => ajustar(p, -1)} disabled={p.stock === 0}>−1</button>
                      <button className="btn btn-outline btn-sm" onClick={() => ajustar(p, 1)}>+1</button>
                      <button className="btn btn-outline btn-sm" onClick={() => ajustar(p, 5)}>+5</button>
                      <button className="btn btn-outline btn-sm" onClick={() => ajustar(p, 10)}>+10</button>
                      <button className="btn btn-dark btn-sm" onClick={() => setAbsoluto(p)}>Fijar stock</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
