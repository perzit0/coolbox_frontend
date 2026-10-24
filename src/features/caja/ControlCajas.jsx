import { useEffect, useState } from 'react'
import { cajaApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import { fechaHora, hoyLima, money } from '../../utils/format'
import { DiferenciaBadge } from './MiCaja'
import ReporteCierreModal from './ReporteCierreModal'

/** Control de cajas del Supervisor: turnos abiertos y cerrados, arqueos y diferencias. */
export default function ControlCajas() {
  const fb = useFeedback()
  const [filtros, setFiltros] = useState({ desde: hoyLima(), hasta: hoyLima(), estado: '', usuario_id: '' })
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [detalle, setDetalle] = useState(null)

  const cargar = () => {
    setCargando(true)
    cajaApi.control(filtros)
      .then(setDatos)
      .catch((err) => fb.error(err.detail))
      .finally(() => setCargando(false))
  }
  useEffect(() => { cargar() }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))
  const ver = (id) => cajaApi.obtener(id).then((r) => setDetalle(r.caja)).catch((err) => fb.error(err.detail))
  const ind = datos?.indicadores

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Control de cajas</h1>
          <p className="page-subtitle">Revisa los turnos de los vendedores, sus arqueos y las diferencias de efectivo.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={cargar}><Icon name="refresh" /> Actualizar</button>
      </div>

      <div className="filter-bar">
        <div className="form-group compact"><label>Desde</label><input type="date" className="form-control" value={filtros.desde} max={filtros.hasta} onChange={set('desde')} /></div>
        <div className="form-group compact"><label>Hasta</label><input type="date" className="form-control" value={filtros.hasta} min={filtros.desde} onChange={set('hasta')} /></div>
        <div className="form-group compact">
          <label>Estado</label>
          <select className="form-control" value={filtros.estado} onChange={set('estado')}>
            <option value="">Todas</option><option value="abierta">Abiertas</option><option value="cerrada">Cerradas</option>
          </select>
        </div>
        <div className="form-group compact">
          <label>Vendedor</label>
          <select className="form-control" value={filtros.usuario_id} onChange={set('usuario_id')}>
            <option value="">Todos</option>
            {(datos?.vendedores || []).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
      </div>

      {ind && (
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Vendido en el periodo</p>
            <p className="stat-value">{money(ind.total_vendido)}</p>
            <p className="stat-hint">{ind.abiertas} abierta(s) · {ind.cerradas} cerrada(s)</p>
          </div>
          <div className="stat-card stat-black">
            <p className="stat-label">Cajas con diferencia</p>
            <p className="stat-value">{ind.con_diferencia}</p>
            <p className="stat-hint">Sobrantes {money(ind.sobrantes)} · Faltantes {money(ind.faltantes)}</p>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Caja</th><th>Vendedor</th><th>Turno</th>
              <th className="num">Ventas</th><th className="num">Vendido</th><th>Arqueo</th><th />
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan="7" className="empty-state">Cargando…</td></tr>}
            {!cargando && datos?.cajas.length === 0 && <tr><td colSpan="7" className="empty-state">No hay cajas en el periodo seleccionado.</td></tr>}
            {!cargando && datos?.cajas.map((c) => (
              <tr key={c.id}>
                <td className="mono nowrap"><strong>{c.codigo}</strong></td>
                <td>{c.usuario_nombre}</td>
                <td className="nowrap">
                  {fechaHora(c.fecha_apertura)}
                  <div className="cell-sub">{c.estado === 'abierta' ? <span className="badge badge-green">Abierta</span> : `Cierre: ${fechaHora(c.fecha_cierre)}`}</div>
                </td>
                <td className="num">{c.resumen.ventas_completadas}{c.resumen.ventas_anuladas ? <div className="cell-sub">{c.resumen.ventas_anuladas} anulada(s)</div> : null}</td>
                <td className="num">{money(c.resumen.total_vendido)}</td>
                <td>
                  {c.estado === 'abierta' ? <span className="badge badge-gray">Pendiente</span> : <DiferenciaBadge valor={c.diferencia} />}
                  {c.observacion_cierre && <div className="cell-sub obs-corta" title={c.observacion_cierre}>{c.observacion_cierre}</div>}
                </td>
                <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => ver(c.id)}><Icon name="eye" size={14} /> Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && <ReporteCierreModal caja={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}
