import { useEffect } from 'react'
import Icon from './Icon'

/** Modal accesible: cierra con Escape o clic fuera. size: sm | md | lg */
export default function Modal({ titulo, subtitulo, onClose, children, footer, size = 'md', as = 'div', onSubmit }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [onClose])

  const Contenedor = as
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <Contenedor className={`modal-card modal-${size}`} role="dialog" aria-modal="true" onSubmit={onSubmit}>
        <header className="modal-header">
          <div>
            <h3>{titulo}</h3>
            {subtitulo && <p className="modal-subtitle">{subtitulo}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </Contenedor>
    </div>
  )
}
