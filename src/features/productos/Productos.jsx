import { useEffect, useState } from 'react'
import { productosApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { ESTADO_STOCK, money } from '../../utils/format'
import FiltrosProductos, { FILTROS_INICIALES } from './FiltrosProductos'
import ProductoForm from './ProductoForm'
import useCatalogo from './useCatalogo'

/** Catálogo de productos. Con permisos de edición muestra las acciones de
 * administración; sin ellos funciona como consulta de solo lectura. */
export default function Productos({ permisos }) {
  const fb = useFeedback()
  const { familias, marcas } = useCatalogo()
  const puedeCrear = permisos.has('productos.crear')
  const puedeEditar = permisos.has('productos.editar')
  const [filtros, setFiltros] = useState({ ...FILTROS_INICIALES, solo_activos: !puedeEditar ? true : false })
  const [vista, setVista] = useState(puedeEditar ? 'tabla' : 'grilla')
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // null | 'nuevo' | producto

  const cargar = async () => {
    setLoading(true)
    try {
      setProductos((await productosApi.listar(filtros)).productos || [])
    } catch (err) {
      fb.error(err.detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
  }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps

  const onGuardado = (producto, esNuevo) => {
    setForm(null)
    cargar()
    fb.ok(esNuevo ? `Producto registrado con SKU ${producto.sku}.` : 'Producto actualizado.')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">
            Catálogo con SKU de 8 dígitos por familia. {productos.length} producto{productos.length === 1 ? '' : 's'} en la vista.
          </p>
        </div>
        <div className="actions-inline">
          <div className="segmented">
            <button type="button" className={vista === 'tabla' ? 'active' : ''} onClick={() => setVista('tabla')}>Tabla</button>
            <button type="button" className={vista === 'grilla' ? 'active' : ''} onClick={() => setVista('grilla')}>Grilla</button>
          </div>
          {puedeCrear && (
            <button className="btn btn-primary" onClick={() => setForm('nuevo')}><Icon name="plus" /> Registrar producto</button>
          )}
        </div>
      </div>

      <FiltrosProductos filtros={filtros} setFiltros={setFiltros} familias={familias} marcas={marcas} mostrarInactivos={puedeEditar} />

      {vista === 'tabla' ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Foto</th>
                <th>SKU</th>
                <th>Producto</th>
                <th>Familia / subfamilia</th>
                <th>Marca</th>
                <th className="num">Precio</th>
                <th className="num">Stock</th>
                <th>Estado</th>
                {puedeEditar && <th className="actions-col">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="empty-state">Cargando…</td></tr>
              ) : productos.length === 0 ? (
                <tr><td colSpan="9" className="empty-state">Sin productos que coincidan con los filtros.</td></tr>
              ) : productos.map((p) => (
                <tr key={p.id} className={!p.activo ? 'row-muted' : ''}>
                  <td><ProductoImagen producto={p} size="xs" /></td>
                  <td><SkuCode sku={p.sku} producto={p} /></td>
                  <td>
                    <strong className="clamp-2">{p.nombre}</strong>
                    <div className="cell-sub mono">Ref. {p.codigo}</div>
                  </td>
                  <td>{p.familia}<div className="cell-sub">{p.subfamilia}</div></td>
                  <td>{p.marca}</td>
                  <td className="num"><strong>{money(p.precio)}</strong></td>
                  <td className="num">{p.stock}<div className="cell-sub">mín. {p.stock_minimo}</div></td>
                  <td>
                    {p.activo
                      ? <span className={`badge ${ESTADO_STOCK[p.estado_stock].clase}`}>{ESTADO_STOCK[p.estado_stock].label}</span>
                      : <span className="badge badge-gray">Inactivo</span>}
                  </td>
                  {puedeEditar && (
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setForm(p)}><Icon name="edit" size={15} /> Editar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="product-grid">
          {loading ? <div className="empty-state" style={{ gridColumn: '1/-1' }}>Cargando…</div>
            : productos.length === 0 ? <div className="empty-state" style={{ gridColumn: '1/-1' }}>Sin resultados.</div>
              : productos.map((p) => (
                <div key={p.id} className={`product-card static ${!p.activo ? 'oos' : ''}`}
                  onClick={puedeEditar ? () => setForm(p) : undefined} role={puedeEditar ? 'button' : undefined}>
                  <ProductoImagen producto={p} />
                  <SkuCode sku={p.sku} producto={p} size="sm" />
                  <div className="product-name clamp-3">{p.nombre}</div>
                  <div className="product-brand">{p.marca} · {p.subfamilia}</div>
                  <div className="product-price">{money(p.precio)}</div>
                  <div className={`product-stock ${p.estado_stock === 'agotado' ? 'oos' : p.estado_stock === 'bajo' ? 'low' : ''}`}>
                    {p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}
                  </div>
                </div>
              ))}
        </div>
      )}

      {form && (
        <ProductoForm producto={form === 'nuevo' ? null : form} familias={familias} marcas={marcas}
          onClose={() => setForm(null)} onGuardado={onGuardado} />
      )}
    </>
  )
}
