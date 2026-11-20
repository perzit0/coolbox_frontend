import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

// Pila de modales abiertos: Escape solo cierra el de arriba (p. ej. el POS sobre la devolución).
const pila = []

/** Modal accesible: cierra con Escape o clic fuera. size: sm | md | lg */
export default function Modal({ titulo, subtitulo, onClose, children, footer, size = 'md', as = 'div', onSubmit }) {
  const cerrar = useRef(onClose)
  cerrar.current = onClose
  useEffect(() => {
    const id = Symbol('modal')
    pila.push(id)
    const onKey = (e) => { if (e.key === 'Escape' && pila[pila.length - 1] === id) cerrar.current?.() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      pila.splice(pila.indexOf(id), 1)
      if (pila.length === 0) document.body.classList.remove('modal-open')
    }
  }, [])

  const Contenedor = as
  return createPortal(
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
    </div>,
    document.body,
  )
}
