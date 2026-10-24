import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { fechaHora, METODOS_PAGO, money } from '../../utils/format'
import { BILLETES, MONEDAS } from './CierreCajaModal'

/** Reporte de cierre (arqueo) con formato de ticket de 80 mm al imprimir. */
export default function ReporteCierreModal({ caja, onClose, recienCerrada = false }) {
  const r = caja.resumen
  const dif = caja.diferencia ?? 0
  const conteo = caja.conteo || {}
  return (
    <Modal size="md" onClose={onClose}
      titulo={`Cierre de caja ${caja.codigo}`}
      subtitulo={caja.estado === 'abierta' ? 'Caja abierta' : `Cerrada el ${fechaHora(caja.fecha_cierre)}`}
      footer={(
        <>
          <button className="btn btn-outline" onClick={() => window.print()}><Icon name="printer" /> Imprimir cierre</button>
          <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </>
      )}>
      {recienCerrada && <div className="alert alert-success no-print">Caja cerrada. Entrega el efectivo y este reporte a tu supervisor.</div>}
      <div className="ticket">
        <div className="ticket-head">
          <div className="ticket-brand">COOLBOX</div>
          <div>Reporte de cierre de caja</div>
          <div className="ticket-code">{caja.codigo}</div>
        </div>
        <div className="ticket-meta">
          <div><span>Vendedor</span><span>{caja.usuario_nombre}</span></div>
          <div><span>Apertura</span><span>{fechaHora(caja.fecha_apertura)}</span></div>
          <div><span>Cierre</span><span>{fechaHora(caja.fecha_cierre)}</span></div>
          <div><span>Ventas</span><span>{r.ventas_completadas}{r.ventas_anuladas ? ` (+${r.ventas_anuladas} anuladas)` : ''}</span></div>
        </div>
        <table className="ticket-items">
          <thead><tr><th>Método</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
          <tbody>
            {r.por_metodo.length === 0 && <tr><td colSpan={3}>Sin ventas en el turno</td></tr>}
            {r.por_metodo.map((m) => (
              <tr key={m.metodo}><td>{METODOS_PAGO[m.metodo] || m.metodo}</td><td className="num">{m.ventas}</td><td className="num">{money(m.total)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ticket-totals">
          <div className="grand"><span>TOTAL VENDIDO</span><span>{money(r.total_vendido)}</span></div>
        </div>
        {caja.conteo && (
          <table className="ticket-items">
            <thead><tr><th>Denominación</th><th className="num">Cant.</th><th className="num">Importe</th></tr></thead>
            <tbody>
              {[...BILLETES, ...MONEDAS].filter((d) => conteo[d]).map((d) => (
                <tr key={d}><td>{money(d)}</td><td className="num">{conteo[d]}</td><td className="num">{money(Number(d) * conteo[d])}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="ticket-totals">
          <div><span>Fondo inicial</span><span>{money(caja.monto_apertura)}</span></div>
          <div><span>Ventas en efectivo</span><span>{money(r.efectivo_ventas)}</span></div>
          <div><span>Efectivo esperado</span><span>{money(caja.efectivo_esperado ?? r.efectivo_esperado)}</span></div>
          {caja.efectivo_contado != null && <div><span>Efectivo contado</span><span>{money(caja.efectivo_contado)}</span></div>}
          {caja.diferencia != null && (
            <div className="grand"><span>{dif === 0 ? 'CUADRADA' : dif > 0 ? 'SOBRANTE' : 'FALTANTE'}</span><span>{money(Math.abs(dif))}</span></div>
          )}
        </div>
        {caja.observacion_cierre && <div className="ticket-foot">Obs.: {caja.observacion_cierre}</div>}
        <div className="ticket-firmas"><span>Vendedor</span><span>Supervisor</span></div>
      </div>

      {caja.ventas && caja.ventas.length > 0 && (
        <div className="no-print caja-ventas">
          <h4 className="arqueo-titulo">Ventas del turno</h4>
          <table className="data-table">
            <thead><tr><th>Código</th><th>Hora</th><th>Pago</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {caja.ventas.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.codigo}</td>
                  <td>{fechaHora(v.fecha)}</td>
                  <td>{METODOS_PAGO[v.metodo_pago] || v.metodo_pago}</td>
                  <td className="num">{money(v.total)}</td>
                  <td><span className={`badge ${v.estado === 'anulada' ? 'badge-red' : 'badge-green'}`}>{v.estado === 'anulada' ? 'Anulada' : 'Completada'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
