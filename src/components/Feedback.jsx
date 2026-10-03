import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import Modal from './Modal'

/* Notificaciones (toasts) y diálogos de confirmación que reemplazan a
 * alert(), confirm() y prompt() del navegador. */

const FeedbackContext = createContext(null)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialogo, setDialogo] = useState(null)
  const idRef = useRef(0)

  const cerrarToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback((mensaje, tipo = 'success', duracion = 3500) => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-3), { id, mensaje, tipo }])
    setTimeout(() => cerrarToast(id), duracion)
  }, [cerrarToast])

  /** confirmar({ titulo, mensaje, textoConfirmar, peligro, pedirMotivo, minMotivo }) -> Promise<false | true | motivo> */
  const confirmar = useCallback((opciones) => new Promise((resolve) => {
    setDialogo({ ...opciones, resolve })
  }), [])

  const api = useMemo(() => ({
    toast,
    confirmar,
    ok: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error', 5000),
    info: (m) => toast(m, 'info'),
  }), [toast, confirmar])

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            <Icon name={t.tipo === 'error' ? 'alert' : t.tipo === 'info' ? 'info' : 'check'} size={18} />
            <span>{t.mensaje}</span>
            <button type="button" onClick={() => cerrarToast(t.id)} aria-label="Cerrar"><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
      {dialogo && <ConfirmDialog {...dialogo} onDone={(v) => { dialogo.resolve(v); setDialogo(null) }} />}
    </FeedbackContext.Provider>
  )
}

function ConfirmDialog({ titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false, pedirMotivo = false,
  etiquetaMotivo = 'Motivo', minMotivo = 0, onDone }) {
  const [motivo, setMotivo] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const valido = !pedirMotivo || motivo.trim().length >= minMotivo

  return (
    <Modal titulo={titulo} onClose={() => onDone(false)} size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={() => onDone(false)}>Cancelar</button>
          <button type="button" ref={pedirMotivo ? null : ref} disabled={!valido}
            className={peligro ? 'btn btn-danger-solid' : 'btn btn-primary'}
            onClick={() => onDone(pedirMotivo ? motivo.trim() : true)}>
            {textoConfirmar}
          </button>
        </>
      )}>
      <p className="confirm-text">{mensaje}</p>
      {pedirMotivo && (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{etiquetaMotivo}</label>
          <textarea ref={ref} className="form-control" rows="3" value={motivo} maxLength={240}
            onChange={(e) => setMotivo(e.target.value)} />
          {minMotivo > 0 && (
            <div className="form-help">Mínimo {minMotivo} caracteres ({motivo.trim().length}/{minMotivo}).</div>
          )}
        </div>
      )}
    </Modal>
  )
}

export function useFeedback() {
  return useContext(FeedbackContext)
}
