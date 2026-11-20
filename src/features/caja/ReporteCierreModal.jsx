import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { ACCIONES_AUTORIZACION, fechaHora, metodoLabel, money } from '../../utils/format'
import { MOTIVOS } from '../../components/Autorizacion'
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
          <div><span>Cajero</span><span>{caja.usuario_nombre}</span></div>
          <div><span>Apertura</span><span>{fechaHora(caja.fecha_apertura)}</span></div>
          <div><span>Cierre</span><span>{fechaHora(caja.fecha_cierre)}</span></div>
          <div><span>Ventas</span><span>{r.ventas_completadas}{r.ventas_anuladas ? ` (+${r.ventas_anuladas} anuladas)` : ''}</span></div>
        </div>
        <table className="ticket-items">
          <thead><tr><th>Método</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
          <tbody>
            {r.por_metodo.length === 0 && <tr><td colSpan={3}>Sin ventas en el turno</td></tr>}
            {r.por_metodo.map((m) => (
              <tr key={m.metodo}><td>{metodoLabel(m.metodo)}</td><td className="num">{m.ventas}</td><td className="num">{m.total == null ? '—' : money(m.total)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ticket-totals">
          {r.total_descuentos > 0 && <div><span>Descuentos</span><span>{money(r.total_descuentos)}</span></div>}
          {r.total_anulado > 0 && <div><span>Anulado</span><span>{money(r.total_anulado)}</span></div>}
          {r.total_devuelto > 0 && <div><span>Devuelto (notas de crédito)</span><span>{money(r.total_devuelto)}</span></div>}
          <div className="grand"><span>TOTAL VENDIDO</span><span>{money(r.total_vendido)}</span></div>
        </div>
        {caja.conciliacion && Object.keys(caja.conciliacion).length > 0 && (
          <table className="ticket-items">
            <thead><tr><th>Conciliación</th><th className="num">Sistema</th><th className="num">Reporte</th><th className="num">Dif.</th></tr></thead>
            <tbody>
              {Object.entries(caja.conciliacion).map(([m, c]) => (
                <tr key={m}><td>{metodoLabel(m)}</td><td className="num">{money(c.sistema)}</td><td className="num">{money(c.declarado)}</td><td className="num">{money(c.diferencia)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
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
          <div><span>Cobros en efectivo</span><span>{r.efectivo_ventas == null ? '—' : money(r.efectivo_ventas)}</span></div>
          {r.devuelto_efectivo > 0 && <div><span>Devoluciones en efectivo</span><span>- {money(r.devuelto_efectivo)}</span></div>}
          {r.retiros > 0 && <div><span>Retiros parciales</span><span>- {money(r.retiros)}</span></div>}
          <div><span>Efectivo esperado</span><span>{(caja.efectivo_esperado ?? r.efectivo_esperado) == null ? '—' : money(caja.efectivo_esperado ?? r.efectivo_esperado)}</span></div>
          {caja.efectivo_contado != null && <div><span>Efectivo contado</span><span>{money(caja.efectivo_contado)}</span></div>}
          {caja.diferencia != null && (
            <div className="grand"><span>{dif === 0 ? 'CUADRADA' : dif > 0 ? 'SOBRANTE' : 'FALTANTE'}</span><span>{money(Math.abs(dif))}</span></div>
          )}
        </div>
        {caja.observacion_cierre && <div className="ticket-foot">Obs.: {caja.observacion_cierre}</div>}
        <div className="ticket-firmas"><span>Cajero</span><span>Supervisor</span></div>
      </div>

      {caja.retiros && caja.retiros.length > 0 && (
        <div className="no-print caja-ventas">
          <h4 className="arqueo-titulo">Retiros parciales</h4>
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

      {caja.autorizaciones && caja.autorizaciones.length > 0 && (
        <div className="no-print caja-ventas">
          <h4 className="arqueo-titulo">Autorizaciones del turno</h4>
          <table className="data-table">
            <thead><tr><th>Hora</th><th>Acción</th><th>Supervisor</th><th>Motivo</th><th>Resultado</th></tr></thead>
            <tbody>
              {caja.autorizaciones.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{fechaHora(a.fecha)}</td>
                  <td>{ACCIONES_AUTORIZACION[a.accion] || a.accion}{a.detalle && <div className="cell-sub">{a.detalle}</div>}{a.venta_codigo && <div className="cell-sub">{a.venta_codigo}</div>}</td>
                  <td>{a.supervisor_nombre}</td>
                  <td>{MOTIVOS[a.motivo] || a.motivo}{a.comentario && <div className="cell-sub">{a.comentario}</div>}</td>
                  <td><ResultadoBadge resultado={a.resultado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  <td>{metodoLabel(v.metodo_pago)}</td>
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

export function ResultadoBadge({ resultado }) {
  const mapa = {
    aprobada: ['badge-green', 'Aprobada'],
    pin_invalido: ['badge-red', 'PIN errado'],
    bloqueado: ['badge-red', 'PIN bloqueado'],
  }
  const [clase, texto] = mapa[resultado] || ['badge-gray', resultado]
  return <span className={`badge ${clase}`}>{texto}</span>
}
