import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cajaApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import { fechaHora, METODOS_PAGO, money, plural } from '../../utils/format'

const FONDOS_SUGERIDOS = [100, 200, 300, 500]

/** Turno de caja del vendedor: apertura con fondo inicial y resumen en vivo. */
export default function MiCaja() {
  const fb = useFeedback()
  const [caja, setCaja] = useState(undefined) // undefined = cargando, null = sin caja
  const [fondo, setFondo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = () => cajaApi.miCaja().then((r) => setCaja(r.caja)).catch((err) => setError(err.detail))
  useEffect(() => { cargar() }, [])

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
              <p className="form-help">Cuenta los billetes y monedas que recibes para dar vuelto. Este monto se usará en el arqueo al cerrar.</p>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary btn-lg" disabled={enviando}>
              {enviando ? <span className="spinner" /> : <><Icon name="wallet" /> Abrir caja</>}
            </button>
          </form>
        </div>
      </>
    )
  }

  const r = caja.resumen
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi caja <span className="badge badge-green">Abierta</span></h1>
          <p className="page-subtitle">Caja <strong>{caja.codigo}</strong> abierta el {fechaHora(caja.fecha_apertura)} con un fondo de {money(caja.monto_apertura)}.</p>
        </div>
        <div className="actions-inline">
          <button type="button" className="btn btn-outline" onClick={cargar}><Icon name="refresh" /> Actualizar</button>
          <Link to="/ventas/nueva" className="btn btn-primary"><Icon name="cart" /> Nueva venta</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Vendido en el turno</p>
          <p className="stat-value">{money(r.total_vendido)}</p>
          <p className="stat-hint">{plural(r.ventas_completadas, 'venta')}{r.ventas_anuladas ? ` · ${plural(r.ventas_anuladas, 'anulada')}` : ''}</p>
        </div>
        <div className="stat-card stat-black">
          <p className="stat-label">Efectivo esperado en caja</p>
          <p className="stat-value">{money(r.efectivo_esperado)}</p>
          <p className="stat-hint">Fondo {money(caja.monto_apertura)} + ventas en efectivo {money(r.efectivo_ventas)}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Cobros por método de pago</h3></div>
        {r.por_metodo.length === 0 ? <div className="empty-state">Aún no registras ventas en este turno.</div> : (
          <table className="data-table">
            <thead><tr><th>Método</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
            <tbody>
              {r.por_metodo.map((m) => (
                <tr key={m.metodo}><td>{METODOS_PAGO[m.metodo] || m.metodo}</td><td className="num">{m.ventas}</td><td className="num">{money(m.total)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
