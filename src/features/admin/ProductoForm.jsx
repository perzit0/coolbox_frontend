import { useState } from 'react'
import { productosApi } from '../../api/client'

export default function ProductoForm({ producto, categorias, onClose, onGuardado }) {
  const esNuevo = !producto
  const [form, setForm] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    marca: producto?.marca || '',
    categoria_id: producto?.categoria_id || (categorias[0]?.id || ''),
    precio: producto?.precio ?? 0,
    stock: producto?.stock ?? 0,
    stock_minimo: producto?.stock_minimo ?? 5,
    activo: producto?.activo ?? true,
  })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const payload = { ...form, precio: Number(form.precio), stock: Number(form.stock), stock_minimo: Number(form.stock_minimo), categoria_id: Number(form.categoria_id) }
      if (esNuevo) await productosApi.crear(payload)
      else await productosApi.editar(producto.id, payload)
      onGuardado()
    } catch (err) {
      setError(err.detail || 'No fue posible guardar.')
    } finally { setSending(false) }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <header className="modal-header">
          <h3>{esNuevo ? 'Registrar producto' : 'Editar producto'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>
        <form onSubmit={guardar}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label>Código</label>
                <input className="form-control" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required disabled={!esNuevo} />
              </div>
              <div className="form-group">
                <label>Marca</label>
                <input className="form-control" value={form.marca} onChange={(e) => set('marca', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input className="form-control" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea className="form-control" rows="2" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoría</label>
                <select className="form-control" value={form.categoria_id} onChange={(e) => set('categoria_id', e.target.value)} required>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Precio (S/)</label>
                <input className="form-control" type="number" step="0.01" min="0" value={form.precio} onChange={(e) => set('precio', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Stock</label>
                <input className="form-control" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Stock mínimo</label>
                <input className="form-control" type="number" min="0" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} />
              </div>
            </div>
            <label className="checkbox-item" style={{ background: '#fafafa', padding: '0.75rem' }}>
              <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} />
              <span>Producto activo (visible en tienda)</span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? <span className="spinner" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
