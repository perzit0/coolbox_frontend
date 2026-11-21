import { useEffect, useRef, useState } from 'react'
import { integracionApi } from '../../api/client'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { fechaHora } from '../../utils/format'

const ESTADO_LOTE = {
  en_proceso: ['En proceso', 'badge-blue'], completado: ['Completado', 'badge-green'], error: ['Error', 'badge-red'],
}
const MODO = { consulta: 'Leímos su API', recepcion: 'Nos enviaron', archivo: 'Archivo JSON' }
const ESTADO_FILA = {
  pendiente: ['Pendiente', 'badge-gray'], insertado: ['Nuevo', 'badge-green'], actualizado: ['Completado', 'badge-blue'],
  sin_cambios: ['Ya existía', 'badge-gray'], duplicado: ['Repetido', 'badge-yellow'], rechazado: ['Rechazado', 'badge-red'],
}

function Contadores({ l }) {
  return (
    <span className="small">
      <b>{l.total}</b> recibidos · <span className="pos">{l.insertados} nuevos</span> · {l.actualizados} completados · {l.sin_cambios} ya existían
      {l.duplicados > 0 && ` · ${l.duplicados} repetidos`}{l.rechazados > 0 && <span className="neg"> · {l.rechazados} rechazados</span>}
    </span>
  )
}

/** Detalle de un lote: lo que llegó (tabla stage) y lo que se hizo con cada registro. */
function LoteModal({ loteId, onClose }) {
  const fb = useFeedback()
  const [estado, setEstado] = useState('')
  const [datos, setDatos] = useState(null)
  const [verPayload, setVerPayload] = useState(null)
  useEffect(() => { integracionApi.lote(loteId, estado || undefined).then(setDatos).catch((e) => fb.error(e.detail)) }, [loteId, estado]) // eslint-disable-line react-hooks/exhaustive-deps
  const l = datos?.lote
  return (
    <Modal size="lg" onClose={onClose} titulo={`Lote ${loteId}${l ? ` · ${l.origen}` : ''}`}
      subtitulo={l ? `${MODO[l.modo]} · ${fechaHora(l.fecha_inicio)}${l.intentos ? ` · ${l.intentos} intento(s)` : ''}` : ''}
      footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      {l && <p><Contadores l={l} /></p>}
      {l?.mensaje && <p className="small muted">{l.mensaje}</p>}
      <div className="segmented filtro-estado" style={{ marginBottom: 12 }}>
        {[['', 'Todos'], ...Object.entries(ESTADO_FILA).filter(([k]) => k !== 'pendiente').map(([k, [t]]) => [k, t])].map(([k, t]) => (
          <button type="button" key={k} className={estado === k ? 'active' : ''} onClick={() => setEstado(k)}>{t}</button>
        ))}
      </div>
      <div className="table-wrapper">
        <table className="data-table compact">
          <thead><tr><th className="num">#</th><th>Documento</th><th>Nombre</th><th>Resultado</th><th /></tr></thead>
          <tbody>
            {!datos ? <tr><td colSpan="5" className="empty-cell">Cargando…</td></tr>
              : datos.registros.length === 0 ? <tr><td colSpan="5" className="empty-cell">Sin registros.</td></tr>
                : datos.registros.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{r.fila}</td>
                    <td className="mono">{r.tipo_documento || '?'} {r.nro_documento || <span className="muted">sin número</span>}</td>
                    <td>{r.razon_social || [r.nombres, r.apellidos].filter(Boolean).join(' ') || <span className="muted">sin nombre</span>}</td>
                    <td><span className={`badge ${(ESTADO_FILA[r.estado] || [])[1]}`}>{(ESTADO_FILA[r.estado] || [r.estado])[0]}</span><div className="cell-sub">{r.mensaje}</div></td>
                    <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => setVerPayload(r)}>Ver lo recibido</button></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {verPayload && (
        <Modal titulo={`Registro ${verPayload.fila} tal como llegó`} subtitulo="Contenido guardado en la tabla stage (cliente_stage.payload)" onClose={() => setVerPayload(null)}
          footer={<button type="button" className="btn btn-outline" onClick={() => setVerPayload(null)}>Cerrar</button>}>
          <pre className="json-box">{JSON.stringify(verPayload.payload, null, 2)}</pre>
        </Modal>
      )}
    </Modal>
  )
}

/** Integración de clientes con el grupo pareado (API de ida y vuelta). */
export default function Integracion() {
  const fb = useFeedback()
  const [estado, setEstado] = useState(null)
  const [lotes, setLotes] = useState([])
  const [traza, setTraza] = useState([])
  const [direccion, setDireccion] = useState('')
  const [importando, setImportando] = useState(false)
  const [lote, setLote] = useState(null)
  const archivo = useRef(null)

  const cargar = () => {
    integracionApi.estado().then(setEstado).catch((e) => fb.error(e.detail))
    integracionApi.lotes().then((r) => setLotes(r.lotes)).catch(() => {})
  }
  const cargarTraza = () => integracionApi.traza(direccion || undefined).then((r) => setTraza(r.traza)).catch(() => {})
  useEffect(cargar, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { cargarTraza() }, [direccion]) // eslint-disable-line react-hooks/exhaustive-deps

  const terminar = (l) => {
    if (l.estado === 'completado') fb.ok(`Lote ${l.id}: ${l.insertados} clientes nuevos, ${l.actualizados} completados, ${l.rechazados} rechazados.`)
    else fb.error(l.mensaje || 'No se pudo completar la carga.')
    cargar(); cargarTraza()
  }
  const importar = async () => {
    setImportando(true)
    try {
      terminar((await integracionApi.importar()).lote)
    } catch (e) {
      // 502: el lote quedó registrado con el error (sin respuesta, clave rechazada...)
      if (e.body?.lote) { cargar(); cargarTraza() }
      fb.error(e.body?.lote?.mensaje || e.detail || 'La API del otro grupo no respondió.')
    } finally { setImportando(false) }
  }
  const subirArchivo = async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    try {
      const contenido = JSON.parse(await file.text())
      setImportando(true)
      terminar((await integracionApi.importarArchivo({ registros: contenido, origen: `${estado?.socio?.nombre || 'Archivo'} (${file.name})` })).lote)
    } catch (e) {
      fb.error(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : (e.detail || 'No se pudo cargar el archivo.'))
    } finally { setImportando(false) }
  }
  const copiar = (texto) => navigator.clipboard?.writeText(texto).then(() => fb.ok('Copiado.')).catch(() => {})

  const socio = estado?.socio
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Integración de clientes</h1>
          <p className="page-subtitle">Intercambio de clientes con el grupo pareado por API, de ida y vuelta. Lo recibido entra primero a la tabla de desembarco (stage) y solo lo válido y no repetido pasa al maestro.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => { cargar(); cargarTraza() }}><Icon name="refresh" /> Actualizar</button>
      </div>

      {estado && !estado.disponible && (
        <div className="alert alert-info">La integración usa procedimientos almacenados: el backend debe estar conectado a PostgreSQL (Supabase).</div>
      )}

      <div className="integ-grid">
        <div className="card integ-card">
          <div className="integ-titulo"><Icon name="link" /> Ida: nuestra API</div>
          <p className="small muted">El otro grupo lee nuestros clientes con su clave en la cabecera <code>X-API-Key</code>.</p>
          <div className="integ-url">
            <code>{estado?.nuestra_api?.url || '…'}</code>
            {estado && <button type="button" className="btn btn-ghost btn-icon" title="Copiar" onClick={() => copiar(estado.nuestra_api.url)}><Icon name="copy" size={15} /></button>}
          </div>
          <p className="small">
            Sistemas con clave: {estado?.nuestra_api?.sistemas_con_clave?.length
              ? estado.nuestra_api.sistemas_con_clave.map((s) => <span key={s} className="badge badge-green" style={{ marginRight: 6 }}>{s}</span>)
              : <span className="neg">ninguno (configure INTEGRACION_API_KEYS en el backend)</span>}
          </p>
        </div>

        <div className="card integ-card">
          <div className="integ-titulo"><Icon name="swap" /> Vuelta: API de {socio?.nombre || 'el otro grupo'}</div>
          <p className="small muted">{socio?.configurado ? <code>{socio.url}</code> : <span className="neg">Falta INTEGRACION_SOCIO_URL en el backend.</span>}</p>
          <p className="small">Clave de su API: {socio?.tiene_clave ? <span className="badge badge-green">configurada</span> : <span className="badge badge-gray">sin clave</span>} · {estado?.reintentos || 3} reintentos si no responde</p>
          <div className="actions-inline">
            <button type="button" className="btn btn-primary" disabled={!socio?.configurado || importando || !estado?.disponible} onClick={importar}>
              <Icon name="refresh" /> {importando ? 'Importando…' : `Importar clientes de ${socio?.nombre || 'su API'}`}
            </button>
            <button type="button" className="btn btn-outline" disabled={importando || !estado?.disponible} onClick={() => archivo.current?.click()}>
              <Icon name="file" /> Cargar JSON
            </button>
            <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={subirArchivo} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">Cargas recibidas (lotes)</h2></div>
        <div className="table-wrapper flat">
          <table className="data-table">
            <thead><tr><th>Lote</th><th>Fecha</th><th>Origen</th><th>Resultado</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {lotes.length === 0 ? <tr><td colSpan="6" className="empty-cell">Aún no se han recibido clientes.</td></tr>
                : lotes.map((l) => (
                  <tr key={l.id}>
                    <td className="mono"><b>{l.id}</b></td>
                    <td className="small">{fechaHora(l.fecha_inicio)}<div className="cell-sub">{l.usuario_nombre || ''}</div></td>
                    <td>{l.origen}<div className="cell-sub">{MODO[l.modo]}{l.intentos ? ` · ${l.intentos} intento(s)` : ''}</div></td>
                    <td>{l.estado === 'error' ? <span className="small neg">{l.mensaje}</span> : <Contadores l={l} />}</td>
                    <td><span className={`badge ${(ESTADO_LOTE[l.estado] || [])[1]}`}>{(ESTADO_LOTE[l.estado] || [l.estado])[0]}</span></td>
                    <td>{l.total > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={() => setLote(l.id)}>Ver stage</button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Traza del API</h2>
          <div className="segmented">
            {[['', 'Todas'], ['entrada', 'Entrantes'], ['salida', 'Salientes']].map(([k, t]) => (
              <button type="button" key={k} className={direccion === k ? 'active' : ''} onClick={() => setDireccion(k)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="table-wrapper flat">
          <table className="data-table compact">
            <thead><tr><th>Fecha</th><th>Dirección</th><th>Sistema</th><th>Llamada</th><th className="num">HTTP</th><th className="num">Intento</th><th className="num">ms</th><th className="num">Registros</th><th>Detalle</th></tr></thead>
            <tbody>
              {traza.length === 0 ? <tr><td colSpan="9" className="empty-cell">Sin llamadas registradas.</td></tr>
                : traza.map((t) => (
                  <tr key={t.id}>
                    <td className="small nowrap">{fechaHora(t.fecha)}</td>
                    <td><span className={`badge ${t.direccion === 'entrada' ? 'badge-blue' : 'badge-black'}`}>{t.direccion === 'entrada' ? 'Entrante' : 'Saliente'}</span></td>
                    <td className="small">{t.sistema || <span className="muted">desconocido</span>}</td>
                    <td className="small mono">{t.metodo} {t.endpoint.replace(/^https?:\/\/[^/]+/, '')}</td>
                    <td className={`num ${t.exito ? 'pos' : 'neg'}`}>{t.estado_http ?? '—'}</td>
                    <td className="num">{t.intento}</td>
                    <td className="num">{t.duracion_ms ?? ''}</td>
                    <td className="num">{t.registros ?? ''}</td>
                    <td className="small traza-detalle">{t.mensaje}{t.ip ? <div className="cell-sub">IP {t.ip}</div> : null}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {lote && <LoteModal loteId={lote} onClose={() => setLote(null)} />}
    </>
  )
}
