import Icon from './Icon'

export default function Pagination({ page, pages, total, onChange, etiqueta = 'registros' }) {
  if (!total) return null
  return (
    <div className="pagination">
      <span className="pagination-info">{total} {etiqueta} · página {page} de {pages}</span>
      <div className="actions-inline">
        <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <Icon name="chevronLeft" size={16} /> Anterior
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Siguiente <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  )
}
