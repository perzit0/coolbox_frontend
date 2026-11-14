import { useMemo, useState } from 'react'
import { cajaApi } from '../../api/client'
import { useAutorizacion } from '../../components/Autorizacion'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { metodoLabel, money } from '../../utils/format'

export const BILLETES = ['200', '100', '50', '20', '10']
export const MONEDAS = ['5', '2', '1', '0.50', '0.20', '0.10']

const FUENTE = {
  tarjeta: 'Cierre del POS (tarjetas)',
  qr: 'Cierre del POS (QR)',
  yape: 'Reporte de Yape (validado código por código)',
  plin: 'Reporte de Plin',
}

/** Cierre de caja (arqueo).
 *
 * 1. El cajero cuenta billetes y monedas SIN ver el efectivo esperado (cuadre ciego).
 * 2. Declara lo que dicen el cierre del POS y los reportes de Yape/Plin.
 * 3. Si todo cuadra, la caja se cierra. Si hay diferencia, el sistema la muestra:
 *    el cajero puede volver a contar, o cerrar con observación y PIN del supervisor.
 */
export default function CierreCajaModal({ caja, onClose, onCerrada }) {
  const autorizar = useAutorizacion()
  const [conteo, setConteo] = useState({})
  const [declarado, setDeclarado] = useState({})
  const [observacion, setObservacion] = useState('')
  const [arqueo, setArqueo] = useState(null) // detalle devuelto por la API cuando hay diferencia
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const ciego = caja.resumen.efectivo_esperado == null
  const electronicos = caja.resumen.por_metodo.filter((m) => m.metodo !== 'efectivo')
  const contado = useMemo(() => Math.round(
    Object.entries(conteo).reduce((acc, [den, n]) => acc + Number(den) * (Number(n) || 0), 0) * 100,
  ) / 100, [conteo])

  const fila = (den) => {
    const n = conteo[den] ?? ''
    return (
      <div key={den} className="arqueo-fila">
        <span className="arqueo-den">{money(den)}</span>
        <span className="arqueo-x">×</span>
        <input className="form-control" type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={n}
          onChange={(e) => { setArqueo(null); setConteo((c) => ({ ...c, [den]: e.target.value.replace(/\D/g, '') })) }} />
        <span className="arqueo-sub">{money(Number(den) * (Number(n) || 0))}</span>
      </div>
    )
  }

  const payload = (extra = {}) => ({
    conteo: Object.fromEntries(Object.entries(conteo).filter(([, n]) => Number(n) > 0).map(([d, n]) => [d, Number(n)])),
    declarado: Object.fromEntries(Object.entries(declarado).filter(([, v]) => v !== '').map(([m, v]) => [m, Number(v)])),
    observacion: observacion.trim(),
    ...extra,
  })

  async function enviar(extra) {
    setError('')
    setEnviando(true)
    try {
      const r = await cajaApi.cerrar(payload(extra))
      onCerrada(r.caja)
    } catch (err) {
      if (err.code === 'diferencia_detectada') { setArqueo(err.body.arqueo); setError(err.detail) }
      else setError(err.detail || 'No fue posible cerrar la caja.')
    } finally { setEnviando(false) }
  }

  async function confirmar(e) {
    e.preventDefault()
    if (!arqueo) { enviar(); return }
    if (observacion.trim().length < 10) { setError('Explica la diferencia en la observación (mínimo 10 caracteres).'); return }
    const ok = await autorizar({
      accion: 'CIERRE_DIFERENCIA', monto: Math.abs(arqueo.diferencia),
      descripcion: `Caja ${caja.codigo}: ${arqueo.diferencia === 0 ? 'diferencias en medios electrónicos' : `${arqueo.diferencia > 0 ? 'sobrante' : 'faltante'} de ${money(Math.abs(arqueo.diferencia))}`}`,
    })
    if (ok) enviar({ autorizacion_token: ok.token })
  }

  // Sin cuadre ciego (p. ej. el Administrador operando una caja) se muestra la diferencia en vivo
  const esperadoVisible = arqueo ? arqueo.efectivo_esperado : (ciego ? null : caja.resumen.efectivo_esperado)
  const diferencia = esperadoVisible == null ? null : Math.round((contado - esperadoVisible) * 100) / 100

  return (
    <Modal size="lg" as="form" onSubmit={confirmar} onClose={onClose}
      titulo={`Cierre de caja ${caja.codigo}`}
      subtitulo={ciego
        ? 'Cuadre ciego: cuenta tu gaveta por denominación. El sistema te dirá si cuadra después de enviar el conteo.'
        : 'Cuenta el efectivo de tu gaveta por denominación.'}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          {arqueo && (
            <button type="button" className="btn btn-ghost" onClick={() => { setArqueo(null); setError('') }}>Volver a contar</button>
          )}
          <button className="btn btn-primary" disabled={enviando}>
            {enviando ? <span className="spinner" /> : arqueo
              ? <><Icon name="shield" /> Cerrar con autorización</>
              : <><Icon name="lock" /> {ciego ? 'Enviar conteo y cerrar' : 'Cerrar caja'}</>}
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

      {electronicos.length > 0 && (
        <div className="conciliacion">
          <h4 className="arqueo-titulo">Medios electrónicos: compara con tus reportes</h4>
          <table className="data-table">
            <thead><tr><th>Medio</th><th>Fuente</th><th className="num">Según sistema</th><th className="num">Según reporte</th></tr></thead>
            <tbody>
              {electronicos.map((m) => {
                const c = arqueo?.conciliacion?.[m.metodo]
                return (
                  <tr key={m.metodo}>
                    <td>{metodoLabel(m.metodo)}<div className="cell-sub">{m.ventas} cobro(s)</div></td>
                    <td className="small muted">{FUENTE[m.metodo]}</td>
                    <td className="num">{money(m.total)}</td>
                    <td className="num">
                      <input className="form-control input-num" type="number" min="0" step="0.01" placeholder={String(m.total)}
                        value={declarado[m.metodo] ?? ''} onChange={(e) => { setArqueo(null); setDeclarado((d) => ({ ...d, [m.metodo]: e.target.value })) }} />
                      {c && c.diferencia !== 0 && <div className="form-error">Dif. {money(c.diferencia)}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="form-help">Si lo dejas vacío se asume que tu reporte coincide con el sistema.</div>
        </div>
      )}

      <div className="arqueo-resumen">
        <div><span>Efectivo esperado</span><strong>{esperadoVisible == null ? 'Oculto' : money(esperadoVisible)}</strong></div>
        <div><span>Efectivo contado</span><strong>{money(contado)}</strong></div>
        {diferencia == null ? (
          <div><span>Diferencia</span><strong>Al enviar</strong></div>
        ) : (
          <div className={`arqueo-dif ${diferencia === 0 ? 'ok' : diferencia > 0 ? 'sobra' : 'falta'}`}>
            <span>{diferencia === 0 ? 'Efectivo cuadrado' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
            <strong>{money(Math.abs(diferencia))}</strong>
          </div>
        )}
      </div>

      {(arqueo || (diferencia != null && diferencia !== 0)) && (
        <div className="form-group">
          <label>Observación del cierre (obligatoria si hay diferencia)</label>
          <textarea className="form-control" rows={2} maxLength={240} value={observacion}
            placeholder="Ej. Se entregó S/ 0.50 de menos en un vuelto" onChange={(e) => setObservacion(e.target.value)} />
        </div>
      )}
      {error && <div className={`alert ${arqueo ? 'alert-info' : 'alert-error'}`}>{error}</div>}
    </Modal>
  )
}
