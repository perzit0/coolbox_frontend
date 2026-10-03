import Icon from '../../components/Icon'

/** Barra de filtros común: búsqueda, familia, subfamilia, marca y estado de stock. */
export default function FiltrosProductos({ filtros, setFiltros, familias, marcas, mostrarEstado = true, mostrarInactivos = false }) {
  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v, ...(k === 'familia_id' ? { subfamilia_id: '' } : {}) }))
  const familia = familias.find((f) => String(f.id) === String(filtros.familia_id))
  return (
    <div className="filter-bar">
      <div className="search-box grow">
        <Icon name="search" size={16} />
        <input className="form-control" placeholder="Buscar por nombre, SKU, código o marca…" value={filtros.q}
          onChange={(e) => set('q', e.target.value)} />
      </div>
      <select className="form-control" value={filtros.familia_id} onChange={(e) => set('familia_id', e.target.value)}>
        <option value="">Todas las familias</option>
        {familias.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
      </select>
      {familia && (
        <select className="form-control" value={filtros.subfamilia_id} onChange={(e) => set('subfamilia_id', e.target.value)}>
          <option value="">Todas las subfamilias</option>
          {familia.subfamilias.map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>)}
        </select>
      )}
      <select className="form-control" value={filtros.marca_id} onChange={(e) => set('marca_id', e.target.value)}>
        <option value="">Todas las marcas</option>
        {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>
      {mostrarEstado && (
        <select className="form-control" value={filtros.estado_stock} onChange={(e) => set('estado_stock', e.target.value)}>
          <option value="">Cualquier stock</option>
          <option value="bajo">Stock bajo o agotado</option>
          <option value="agotado">Solo agotados</option>
        </select>
      )}
      {mostrarInactivos && (
        <label className="checkbox-inline">
          <input type="checkbox" checked={!filtros.solo_activos} onChange={(e) => set('solo_activos', !e.target.checked)} />
          Incluir inactivos
        </label>
      )}
    </div>
  )
}

export const FILTROS_INICIALES = { q: '', familia_id: '', subfamilia_id: '', marca_id: '', estado_stock: '', solo_activos: true }
