import { useRef, useState } from 'react'
import { productosApi } from '../../api/client'
import ProductoImagen from '../../components/ProductoImagen'

/** Reduce la foto a máx. 600 px y la convierte a JPEG (data URL) para guardarla
 * liviana en la base de datos. */
function reducirImagen(file, maxLado = 600, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('El archivo debe ser una imagen.')); return }
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff' // fondo blanco para PNG con transparencia
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(file)
  })
}

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
    imagen_url: producto?.imagen_url || '',
  })
  const [urlManual, setUrlManual] = useState(
    producto?.imagen_url && !producto.imagen_url.startsWith('data:') ? producto.imagen_url : ''
  )
  const inputArchivo = useRef(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function onArchivo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      set('imagen_url', await reducirImagen(file))
      setUrlManual('')
    } catch (err) {
      setError(err.message)
    }
  }

  const categoriaNombre = categorias.find((c) => String(c.id) === String(form.categoria_id))?.nombre

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

            <div className="form-group" style={{ marginBottom: 0 }}><label>Imagen del producto</label></div>
            <div className="image-field">
              <ProductoImagen producto={{ ...form, categoria: categoriaNombre }} size="lg" />
              <div className="image-field-actions">
                <input ref={inputArchivo} type="file" accept="image/*" hidden onChange={onArchivo} />
                <button type="button" className="btn btn-dark btn-sm" onClick={() => inputArchivo.current?.click()}>
                  Subir foto desde el equipo
                </button>
                <input
                  className="form-control"
                  placeholder="o pega la URL de la imagen (https://...)"
                  value={urlManual}
                  onChange={(e) => { setUrlManual(e.target.value); set('imagen_url', e.target.value.trim()) }}
                />
                {form.imagen_url && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { set('imagen_url', ''); setUrlManual('') }}>
                    Quitar imagen
                  </button>
                )}
                <p className="image-field-hint">JPG o PNG. La foto se ajusta automáticamente a 600 px para que cargue rápido.</p>
              </div>
            </div>

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
