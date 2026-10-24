import { useMemo, useState } from 'react'
import { cajaApi } from '../../api/client'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { money } from '../../utils/format'

export const BILLETES = ['200', '100', '50', '20', '10']
export const MONEDAS = ['5', '2', '1', '0.50', '0.20', '0.10']

/** Arqueo de caja: el vendedor cuenta billetes y monedas; el sistema calcula la diferencia. */
export default function CierreCajaModal({ caja, onClose, onCerrada }) {
  const [conteo, setConteo] = useState({})
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const esperado = caja.resumen.efectivo_esperado
  const contado = useMemo(() => Math.round(
    Object.entries(conteo).reduce((acc, [den, n]) => acc + Number(den) * (Number(n) || 0), 0) * 100,
  ) / 100, [conteo])
  const diferencia = Math.round((contado - esperado) * 100) / 100
  const cuadra = diferencia === 0

  const fila = (den) => {
    const n = conteo[den] ?? ''
    return (
      <div key={den} className="arqueo-fila">
        <span className="arqueo-den">{money(den)}</span>
        <span className="arqueo-x">×</span>
        <input className="form-control" type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={n}
          onChange={(e) => setConteo((c) => ({ ...c, [den]: e.target.value.replace(/\D/g, '') }))} />
        <span className="arqueo-sub">{money(Number(den) * (Number(n) || 0))}</span>
      </div>
    )
  }

  async function confirmar(e) {
    e.preventDefault()
    setError('')
    if (!cuadra && observacion.trim().length < 10) {
      setError(`Hay un ${diferencia > 0 ? 'sobrante' : 'faltante'} de ${money(Math.abs(diferencia))}. Explica la diferencia (mínimo 10 caracteres).`)
      return
    }
    setEnviando(true)
    try {
      const limpio = Object.fromEntries(Object.entries(conteo).filter(([, n]) => Number(n) > 0).map(([d, n]) => [d, Number(n)]))
      const r = await cajaApi.cerrar(limpio, observacion.trim())
      onCerrada(r.caja)
    } catch (err) { setError(err.detail || 'No fue posible cerrar la caja.') }
    finally { setEnviando(false) }
  }

  return (
    <Modal size="lg" as="form" onSubmit={confirmar} onClose={onClose}
      titulo={`Cierre de caja ${caja.codigo}`}
      subtitulo="Cuenta el efectivo de tu gaveta por denominación. Los pagos con tarjeta, Yape o Plin no se cuentan."
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={enviando}>
            {enviando ? <span className="spinner" /> : <><Icon name="lock" /> Cerrar caja</>}
          </button>
        </>
      )}>
      <div className="arqueo-grid">
        <div>
          <h4 className="arqueo-titulo">Billetes</h4>
          {BILLETES.map(fila)}
        </div>
        <div>
          <h4 className="arqueo-titulo">Monedas</h4>
          {MONEDAS.map(fila)}
        </div>
      </div>

      <div className="arqueo-resumen">
        <div><span>Efectivo esperado</span><strong>{money(esperado)}</strong></div>
        <div><span>Efectivo contado</span><strong>{money(contado)}</strong></div>
        <div className={`arqueo-dif ${cuadra ? 'ok' : diferencia > 0 ? 'sobra' : 'falta'}`}>
          <span>{cuadra ? 'Caja cuadrada' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
          <strong>{money(Math.abs(diferencia))}</strong>
        </div>
      </div>

      {!cuadra && (
        <div className="form-group">
          <label>Observación del cierre (obligatoria si hay diferencia)</label>
          <textarea className="form-control" rows={2} maxLength={240} value={observacion}
            placeholder="Ej. Se entregó S/ 0.50 de menos en un vuelto" onChange={(e) => setObservacion(e.target.value)} />
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
    </Modal>
  )
}
