import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { autorizacionesApi } from '../api/client'
import { ACCIONES_AUTORIZACION, money } from '../utils/format'
import Icon from './Icon'
import Modal from './Modal'

/* Autorización de supervisor EN LA CAJA DEL CAJERO.
 *
 * Como en un supermercado: el cajero no cierra su sesión. Llama al supervisor,
 * este se acerca, elige su nombre, escribe su PIN y la acción queda aprobada.
 * La venta en curso sigue intacta detrás del modal.
 *
 *   const autorizar = useAutorizacion()
 *   const ok = await autorizar({ accion: 'ANULAR_ITEM', descripcion: 'Retirar Mouse G203', detalle: '...' })
 *   if (!ok) return              // canceló
 *   ok.token                     // token de un solo uso (null en acciones inmediatas)
 *   ok.motivoTexto               // "El cliente desiste - comentario"
 *   ok.supervisor_nombre
 */

export const MOTIVOS = {
  error_digitacion: 'Error de digitación',
  cliente_desiste: 'El cliente desiste',
  producto_danado: 'Producto dañado o con falla',
  precio_incorrecto: 'Precio incorrecto en góndola',
  pago_rechazado: 'Pago rechazado o incompleto',
  promocion: 'Promoción o compensación al cliente',
  exceso_efectivo: 'Exceso de efectivo en gaveta',
  error_cobro: 'Error en el cobro o en el vuelto',
  solicitud_cliente: 'Solicitud del cliente',
  otro: 'Otro',
}

const MOTIVOS_POR_ACCION = {
  ANULAR_ITEM: ['error_digitacion', 'cliente_desiste', 'producto_danado', 'precio_incorrecto', 'otro'],
  VACIAR_CARRITO: ['cliente_desiste', 'pago_rechazado', 'error_digitacion', 'otro'],
  DESCUENTO: ['promocion', 'producto_danado', 'precio_incorrecto', 'otro'],
  ANULAR_VENTA: ['cliente_desiste', 'error_cobro', 'pago_rechazado', 'producto_danado', 'error_digitacion', 'otro'],
  RETIRO_EFECTIVO: ['exceso_efectivo', 'otro'],
  CIERRE_DIFERENCIA: ['error_cobro', 'otro'],
  REIMPRESION: ['solicitud_cliente', 'otro'],
  DEVOLUCION: ['producto_danado', 'cliente_desiste', 'solicitud_cliente', 'otro'],
}

const AutorizacionContext = createContext(null)

export function AutorizacionProvider({ children }) {
  const [solicitud, setSolicitud] = useState(null)
  const autorizar = useCallback((opciones) => new Promise((resolve) => setSolicitud({ ...opciones, resolve })), [])
  return (
    <AutorizacionContext.Provider value={autorizar}>
      {children}
      {solicitud && (
        <AutorizacionModal {...solicitud} onDone={(v) => { solicitud.resolve(v); setSolicitud(null) }} />
      )}
    </AutorizacionContext.Provider>
  )
}

export function useAutorizacion() {
  return useContext(AutorizacionContext)
}

function AutorizacionModal({ accion, descripcion, monto, venta_id, detalle, onDone }) {
  const motivos = MOTIVOS_POR_ACCION[accion] || Object.keys(MOTIVOS)
  const [supervisores, setSupervisores] = useState(null)
  const [supervisorId, setSupervisorId] = useState('')
  const [pin, setPin] = useState('')
  const [motivo, setMotivo] = useState(motivos.length === 2 ? motivos[0] : '')
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const pinRef = useRef(null)

  useEffect(() => {
    autorizacionesApi.supervisores()
      .then((r) => {
        setSupervisores(r.supervisores)
        const conPin = r.supervisores.filter((s) => s.tiene_pin)
        if (conPin.length === 1) setSupervisorId(String(conPin[0].id))
      })
      .catch((err) => { setSupervisores([]); setError(err.detail) })
  }, [])

  useEffect(() => { if (supervisorId) pinRef.current?.focus() }, [supervisorId])

  const comentarioOk = motivo !== 'otro' || comentario.trim().length >= 5
  const valido = supervisorId && pin.length === 6 && motivo && comentarioOk

  async function enviar(e) {
    e.preventDefault()
    if (!valido || enviando) return
    setError('')
    setEnviando(true)
    try {
      const r = await autorizacionesApi.solicitar({
        accion, supervisor_id: Number(supervisorId), pin, motivo,
        comentario: comentario.trim() || null, monto: monto ?? null, venta_id: venta_id ?? null, detalle: detalle ?? null,
      })
      const motivoTexto = `${MOTIVOS[motivo]}${comentario.trim() ? ` - ${comentario.trim()}` : ''}`
      onDone({ token: r.token, supervisor_nombre: r.supervisor_nombre, motivo, motivoTexto, comentario: comentario.trim() })
    } catch (err) {
      setPin('')
      setError(err.detail || 'No fue posible validar la autorización.')
      pinRef.current?.focus()
    } finally { setEnviando(false) }
  }

  return (
    <Modal size="sm" as="form" onSubmit={enviar} onClose={() => onDone(null)}
      titulo="Autorización de supervisor"
      subtitulo="El supervisor ingresa su PIN en esta caja. La venta en curso no se pierde."
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={() => onDone(null)}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valido || enviando}>
            {enviando ? <span className="spinner" /> : <><Icon name="shield" /> Autorizar</>}
          </button>
        </>
      )}>
      <div className="aut-accion">
        <Icon name="shield" size={22} />
        <div>
          <strong>{ACCIONES_AUTORIZACION[accion] || accion}</strong>
          {descripcion && <div className="cell-sub">{descripcion}</div>}
          {monto != null && <div className="aut-monto">{money(monto)}</div>}
        </div>
      </div>

      <div className="form-group">
        <label>Supervisor que autoriza</label>
        {supervisores === null ? <div className="muted small"><span className="spinner spinner-dark" /> Cargando supervisores…</div> : (
          <select className="form-control" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} autoFocus={!supervisorId}>
            <option value="">Seleccione…</option>
            {supervisores.map((s) => (
              <option key={s.id} value={s.id} disabled={!s.tiene_pin}>
                {s.nombre} · {s.rol}{s.tiene_pin ? '' : ' (sin PIN)'}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="form-group">
        <label>PIN del supervisor</label>
        <input ref={pinRef} className="form-control pin-input" type="password" inputMode="numeric" autoComplete="off"
          maxLength={6} placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </div>

      <div className="form-group">
        <label>Motivo</label>
        <select className="form-control" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          <option value="">Seleccione…</option>
          {motivos.map((m) => <option key={m} value={m}>{MOTIVOS[m]}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Comentario {motivo === 'otro' ? '(obligatorio)' : '(opcional)'}</label>
        <input className="form-control" maxLength={200} value={comentario} onChange={(e) => setComentario(e.target.value)}
          placeholder="Detalle breve para la bitácora" />
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>{error}</div>}
    </Modal>
  )
}
