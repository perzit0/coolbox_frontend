import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cajaApi } from '../../api/client'
import { useAutorizacion } from '../../components/Autorizacion'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { fechaHora, hoyLima, metodoLabel, money, plural, ZONA_HORARIA } from '../../utils/format'
import CierreCajaModal from './CierreCajaModal'
import ReporteCierreModal from './ReporteCierreModal'

const FONDOS_SUGERIDOS = [100, 200, 300, 500]

/** Turno de caja del cajero: apertura con fondo inicial, resumen en vivo,
 * retiros parciales con PIN del supervisor y cierre con arqueo ciego. */
export default function MiCaja() {
  const fb = useFeedback()
  const autorizar = useAutorizacion()
  const [retirando, setRetirando] = useState(false)
  const [caja, setCaja] = useState(undefined) // undefined = cargando, null = sin caja
  const [fondo, setFondo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [reporte, setReporte] = useState(null) // { caja, recien }
  const [historial, setHistorial] = useState([])

  const cargar = () => {
    cajaApi.miCaja().then((r) => setCaja(r.caja)).catch((err) => setError(err.detail))
    cajaApi.misCajas().then((r) => setHistorial(r.cajas.filter((c) => c.estado === 'cerrada'))).catch(() => {})
  }
  useEffect(() => { cargar() }, [])

  const verReporte = (id) => cajaApi.obtener(id).then((r) => setReporte({ caja: r.caja })).catch((err) => fb.error(err.detail))

  const historialCard = historial.length > 0 && (
    <div className="card">
      <div className="card-header"><h3 className="card-title">Mis últimos cierres</h3></div>
      <div className="table-wrapper flat"><table className="data-table">
        <thead><tr><th>Caja</th><th>Apertura</th><th>Cierre</th><th className="num">Vendido</th><th className="num">Diferencia</th><th /></tr></thead>
        <tbody>
          {historial.map((c) => (
            <tr key={c.id}>
              <td><strong>{c.codigo}</strong></td>
              <td>{fechaHora(c.fecha_apertura)}</td>
              <td>{fechaHora(c.fecha_cierre)}</td>
              <td className="num">{money(c.resumen.total_vendido)}</td>
              <td className="num"><DiferenciaBadge valor={c.diferencia} /></td>
              <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => verReporte(c.id)}><Icon name="eye" size={14} /> Ver</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  )
  const reporteModal = reporte && <ReporteCierreModal caja={reporte.caja} recienCerrada={reporte.recien} onClose={() => setReporte(null)} />

  async function abrir(e) {
    e.preventDefault()
    setError('')
    if (fondo === '' || Number(fondo) < 0) { setError('Ingresa el fondo inicial (puede ser S/ 0.00).'); return }
    setEnviando(true)
    try {
      const r = await cajaApi.abrir(Number(fondo))
      setCaja(r.caja)
      fb.ok(`Caja ${r.caja.codigo} abierta con ${money(r.caja.monto_apertura)}.`)
    } catch (err) { setError(err.detail || 'No fue posible abrir la caja.') }
    finally { setEnviando(false) }
  }

  if (caja === undefined && !error) return <div className="loading-page"><span className="spinner spinner-dark" /> Consultando tu caja…</div>

  if (!caja) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Mi caja</h1>
            <p className="page-subtitle">Abre tu caja con el efectivo con el que inicias el turno. Sin caja abierta no se pueden registrar ventas.</p>
          </div>
        </div>
        <div className="card caja-apertura">
          <div className="card-header"><h3 className="card-title">Apertura de caja</h3><span className="badge badge-gray">Cerrada</span></div>
          <form onSubmit={abrir}>
            <div className="form-group">
              <label>Fondo inicial en efectivo (S/)</label>
              <input className="form-control input-lg" type="number" min="0" max="5000" step="0.10" autoFocus
                placeholder="0.00" value={fondo} onChange={(e) => setFondo(e.target.value)} />
              <div className="chip-row">
                {FONDOS_SUGERIDOS.map((m) => (
                  <button key={m} type="button" className={`chip ${Number(fondo) === m ? 'active' : ''}`} onClick={() => setFondo(String(m))}>{money(m)}</button>
                ))}
              </div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary btn-lg" disabled={enviando}>
              {enviando ? <span className="spinner" /> : <><Icon name="wallet" /> Abrir caja</>}
            </button>
          </form>
        </div>
        {historialCard}
        {reporteModal}
      </>
    )
  }

  async function retirar(monto, nota) {
    const ok = await autorizar({ accion: 'RETIRO_EFECTIVO', monto, descripcion: 'El supervisor cuenta y se lleva el efectivo frente al cajero.' })
    if (!ok) return
    try {
      const res = await cajaApi.retiro(monto, nota || ok.motivoTexto, ok.token)
      setCaja(res.caja)
      setRetirando(false)
      fb.ok(`Retiro de ${money(monto)} registrado, autorizado por ${ok.supervisor_nombre}.`)
    } catch (err) { fb.error(err.detail || 'No fue posible registrar el retiro.') }
  }

  const r = caja.resumen
  const ciego = r.efectivo_esperado == null
  const vencida = new Date(caja.fecha_apertura).toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA }) < hoyLima()
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi caja <span className="badge badge-green">Abierta</span></h1>
          <p className="page-subtitle">Caja <strong>{caja.codigo}</strong> abierta el {fechaHora(caja.fecha_apertura)} con un fondo de {money(caja.monto_apertura)}.</p>
        </div>
        <div className="actions-inline">
          <button type="button" className="btn btn-outline" onClick={cargar}><Icon name="refresh" /> Actualizar</button>
          <button type="button" className="btn btn-outline" onClick={() => setRetirando(true)}><Icon name="arrowOut" /> Retiro de efectivo</button>
          <button type="button" className="btn btn-dark" onClick={() => setCerrando(true)}><Icon name="lock" /> Cerrar caja</button>
          {!vencida && <Link to="/ventas/nueva" className="btn btn-primary"><Icon name="cart" /> Nueva venta</Link>}
        </div>
      </div>

      {vencida && (
        <div className="alert alert-error">
          Esta caja se abrió un día anterior y no puede recibir ventas nuevas. Ciérrala con su arqueo para abrir la de hoy.
        </div>
      )}

      {r.requiere_retiro && (
        <div className="alert alert-info">
          La gaveta superó el límite de {money(r.limite_efectivo)} en efectivo. Llama al supervisor para un retiro parcial.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Vendido en el turno</p>
          <p className="stat-value">{money(r.total_vendido)}</p>
          <p className="stat-hint">{plural(r.ventas_completadas, 'venta')}{r.ventas_anuladas ? ` · ${plural(r.ventas_anuladas, 'anulada')}` : ''}{r.total_descuentos ? ` · descuentos ${money(r.total_descuentos)}` : ''}{r.devoluciones ? ` · ${plural(r.devoluciones, 'devolución', 'devoluciones')} ${money(r.total_devuelto)}` : ''}</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Efectivo esperado en caja</p>
          {ciego ? (
            <>
              <p className="stat-value">Cuadre ciego</p>
              <p className="stat-hint">Lo verás al cerrar, después de contar tu gaveta. Fondo inicial {money(caja.monto_apertura)}{r.retiros ? ` · retiros ${money(r.retiros)}` : ''}.</p>
            </>
          ) : (
            <>
              <p className="stat-value">{money(r.efectivo_esperado)}</p>
              <p className="stat-hint">Fondo {money(caja.monto_apertura)} + efectivo {money(r.efectivo_ventas)}{r.devuelto_efectivo ? ` - devoluciones ${money(r.devuelto_efectivo)}` : ''}{r.retiros ? ` - retiros ${money(r.retiros)}` : ''}</p>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Cobros por método de pago</h3></div>
        {r.por_metodo.length === 0 ? <div className="empty-state">Aún no registras ventas en este turno.</div> : (
          <table className="data-table">
            <thead><tr><th>Método</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
            <tbody>
              {r.por_metodo.map((m) => (
                <tr key={m.metodo}><td>{metodoLabel(m.metodo)}</td><td className="num">{m.ventas}</td>
                  <td className="num">{m.total == null ? <span className="muted">Se ve al cerrar</span> : money(m.total)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {caja.devoluciones?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Devoluciones atendidas</h3></div>
          <table className="data-table">
            <thead><tr><th>Hora</th><th>Devolución</th><th>Venta</th><th>Nota de crédito</th><th>Reembolso</th><th className="num">Monto</th></tr></thead>
            <tbody>
              {caja.devoluciones.map((d) => (
                <tr key={d.id}><td>{fechaHora(d.fecha)}</td><td className="mono">{d.codigo}</td><td className="mono">{d.venta_codigo}</td>
                  <td className="mono">{d.nota_credito || '—'}</td><td>{metodoLabel(d.metodo_reembolso)}</td><td className="num">{money(d.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {caja.retiros?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Retiros parciales</h3></div>
          <table className="data-table">
            <thead><tr><th>Hora</th><th>Autorizó</th><th>Motivo</th><th className="num">Monto</th></tr></thead>
            <tbody>
              {caja.retiros.map((m) => (
                <tr key={m.id}><td>{fechaHora(m.fecha)}</td><td>{m.supervisor_nombre}</td><td>{m.motivo}</td><td className="num">{money(m.monto)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {historialCard}

      {retirando && <RetiroModal onClose={() => setRetirando(false)} onConfirmar={retirar} />}

      {cerrando && (
        <CierreCajaModal caja={caja} onClose={() => setCerrando(false)}
          onCerrada={(cerrada) => {
            setCerrando(false); setCaja(null); setFondo('')
            setReporte({ caja: cerrada, recien: true })
            fb.ok(`Caja ${cerrada.codigo} cerrada.`)
            cargar()
          }} />
      )}
      {reporteModal}
    </>
  )
}

function RetiroModal({ onClose, onConfirmar }) {
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const valido = Number(monto) > 0
  return (
    <Modal size="sm" as="form" onClose={onClose} titulo="Retiro parcial de efectivo"
      subtitulo="El supervisor retira efectivo de la gaveta (sangría) para no acumular dinero en caja."
      onSubmit={(e) => { e.preventDefault(); if (valido) onConfirmar(Number(monto), nota.trim()) }}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valido}><Icon name="shield" /> Continuar con el PIN</button>
        </>
      )}>
      <div className="form-group">
        <label>Monto a retirar (S/)</label>
        <input className="form-control input-lg" type="number" min="0" step="10" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} />
        <div className="chip-row">
          {[200, 500, 1000].map((m) => <button key={m} type="button" className="chip" onClick={() => setMonto(String(m))}>{money(m)}</button>)}
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Nota (opcional)</label>
        <input className="form-control" maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Sobre N° 12 a bóveda" />
      </div>
    </Modal>
  )
}

export function DiferenciaBadge({ valor }) {
  if (valor == null) return <span className="badge badge-gray">—</span>
  if (valor === 0) return <span className="badge badge-green">Cuadrada</span>
  return <span className={`badge ${valor > 0 ? 'badge-yellow' : 'badge-red'}`}>{valor > 0 ? 'Sobra ' : 'Falta '}{money(Math.abs(valor))}</span>
}
