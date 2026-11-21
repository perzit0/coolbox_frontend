import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cajaApi, productosApi, ventasApi } from '../../api/client'
import { useAutorizacion } from '../../components/Autorizacion'
import { useFeedback } from '../../components/Feedback'
import Icon from '../../components/Icon'
import ProductoImagen from '../../components/ProductoImagen'
import SkuCode from '../../components/SkuCode'
import { AYUDA_METODO, fechaHora, hoyLima, METODOS_COBRO, METODOS_PAGO, money, ZONA_HORARIA } from '../../utils/format'
import useCatalogo from '../productos/useCatalogo'
import ComprobanteModal from './ComprobanteModal'
import PosSimulado from './PosSimulado'
import useAnularVenta from './useAnularVenta'

const MAX_EN_ESPERA = 5
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100

/* Los precios los fija la empresa (lista + promociones): en caja no hay descuentos manuales.
 * Tarjeta, Yape y Plin se cobran en el POS de pruebas, que genera el N° de operación. */
const pagoNuevo = (metodo = 'efectivo') => ({ metodo, monto: '', monto_recibido: '' })
// De dónde salió el nombre del cliente
const FUENTE_CLIENTE = { CLIENTES: 'Cliente registrado' }

const ventaVacia = () => ({ carrito: {}, clienteNombre: '', clienteDocumento: '', clienteFuente: '', pagos: [pagoNuevo()] })
const limpiarBorrador = (b) => ({
  ...b,
  pagos: (b.pagos || [pagoNuevo()]).map((p) => ({ metodo: p.metodo, monto: p.monto || '', monto_recibido: p.monto_recibido || '' })),
})

/* Almacenamiento local por cajero: borrador de la venta en curso (sobrevive a
 * una recarga o a un corte de red) y ventas en espera. */
const leer = (clave, defecto) => { try { return JSON.parse(localStorage.getItem(clave)) ?? defecto } catch { return defecto } }
const guardar = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* sin espacio */ } }

export default function NuevaVenta({ sesion }) {
  const fb = useFeedback()
  const autorizar = useAutorizacion()
  const puedeAnular = (sesion.rol_activo.permisos || []).includes('ventas.anular')
  const anularVenta = useAnularVenta({ puedeAnular })
  const claveBorrador = `coolbox_borrador_${sesion.usuario.id}`
  const claveEspera = `coolbox_espera_${sesion.usuario.id}`

  const { familias } = useCatalogo()
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [familiaId, setFamiliaId] = useState('')
  const [venta, setVenta] = useState(() => limpiarBorrador({ ...ventaVacia(), ...leer(claveBorrador, {}) }))
  const [config, setConfig] = useState({ igv: 0.18, marcas_tarjeta: [], pos_proveedor: '', consulta_documento: false })
  const [pos, setPos] = useState(null) // cobro en curso en el POS de pruebas
  const [consulta, setConsulta] = useState({ estado: 'idle', mensaje: '' })
  const [enEspera, setEnEspera] = useState(() => leer(claveEspera, []))
  const [verEspera, setVerEspera] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [comprobante, setComprobante] = useState(null)
  const buscador = useRef(null)
  const [caja, setCaja] = useState(undefined) // undefined = cargando, null = sin caja abierta

  const { carrito, clienteNombre, clienteDocumento, clienteFuente, pagos } = venta
  const set = (cambios) => setVenta((v) => ({ ...v, ...(typeof cambios === 'function' ? cambios(v) : cambios) }))

  useEffect(() => { guardar(claveBorrador, venta) }, [venta, claveBorrador])
  useEffect(() => { guardar(claveEspera, enEspera) }, [enEspera, claveEspera])

  const cargarCaja = () => cajaApi.miCaja().then((r) => setCaja(r.caja)).catch(() => setCaja(null))
  useEffect(() => { cargarCaja() }, [])
  useEffect(() => { ventasApi.config().then(setConfig).catch(() => {}) }, [])

  // Con DNI (8) o RUC (11) el nombre se completa solo: primero desde nuestro maestro de clientes
  // (incluye los recibidos del grupo pareado) y si no está, desde RENIEC / SUNAT. CE: a mano.
  useEffect(() => {
    if (![8, 11].includes(clienteDocumento.length)) {
      setConsulta({ estado: 'idle', mensaje: '' })
      return undefined
    }
    if (clienteFuente) return undefined
    let vivo = true
    setConsulta({ estado: 'buscando', mensaje: '' })
    const t = setTimeout(() => {
      ventasApi.consultarDocumento(clienteDocumento).then((r) => {
        if (!vivo) return
        set({ clienteNombre: r.nombre, clienteFuente: r.fuente })
        setConsulta({ estado: 'ok', mensaje: '' })
      }).catch((err) => {
        if (vivo) setConsulta({ estado: 'error', mensaje: err.detail || 'No se pudo consultar el documento: escribe el nombre.' })
      })
    }, 300)
    return () => { vivo = false; clearTimeout(t) }
  }, [clienteDocumento]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarDocumento = (valor) => {
    const doc = valor.replace(/\D/g, '')
    // Un nombre traído de RENIEC/SUNAT pertenece a ese documento: si cambia, se vuelve a consultar.
    set((v) => (doc === v.clienteDocumento ? {} : { clienteDocumento: doc, ...(v.clienteFuente ? { clienteNombre: '', clienteFuente: '' } : {}) }))
  }

  async function cargar() {
    try {
      const r = await productosApi.listar({ q: busqueda, familia_id: familiaId })
      setProductos(r.productos || [])
    } catch (err) { fb.error(err.detail) }
  }
  useEffect(() => {
    const t = setTimeout(cargar, 200)
    return () => clearTimeout(t)
  }, [busqueda, familiaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- Carrito
  const agregar = (producto) => {
    if (producto.stock === 0) return
    const actual = carrito[producto.id]?.cantidad || 0
    if (actual >= producto.stock) { fb.info(`Solo hay ${producto.stock} unidad(es) de ${producto.sku}.`); return }
    set((v) => ({ carrito: { ...v.carrito, [producto.id]: { producto, cantidad: actual + 1 } } }))
  }

  /** Quitar o restar un producto ya registrado = anulación de ítem: requiere PIN del supervisor. */
  async function reducir(id, quitarTodo = false) {
    const item = carrito[id]
    if (!item) return
    const unidades = quitarTodo ? item.cantidad : 1
    const ok = await autorizar({
      accion: 'ANULAR_ITEM',
      descripcion: `${unidades} x ${item.producto.nombre}`,
      detalle: `${item.producto.sku || item.producto.codigo} x${unidades} (${money(item.producto.precio * unidades)})`,
      monto: r2(item.producto.precio * unidades),
    })
    if (!ok) return
    set((v) => {
      const actual = v.carrito[id]
      if (!actual) return {}
      if (quitarTodo || actual.cantidad <= 1) {
        const { [id]: _, ...resto } = v.carrito
        return { carrito: resto }
      }
      return { carrito: { ...v.carrito, [id]: { ...actual, cantidad: actual.cantidad - 1 } } }
    })
    fb.info(`Ítem retirado con autorización de ${ok.supervisor_nombre}.`)
  }

  async function cancelarVenta() {
    const ok = await autorizar({ accion: 'VACIAR_CARRITO', descripcion: `${totales.unidades} unidad(es) por ${money(totales.total)}` })
    if (!ok) return
    setVenta(ventaVacia())
    fb.info('Venta en curso cancelada.')
  }

  // Enter en el buscador: si hay coincidencia exacta por SKU o un único resultado, se agrega
  const onBuscarEnter = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const exacto = productos.find((p) => p.sku === busqueda.trim() || p.codigo === busqueda.trim().toUpperCase())
    const elegido = exacto || (productos.length === 1 ? productos[0] : null)
    if (elegido) { agregar(elegido); setBusqueda('') }
  }

  // ---------------- Totales
  // Promociones vigentes en tienda (2x1, % de descuento...): el servidor calcula la mejor por línea
  const [cotizacion, setCotizacion] = useState({})
  useEffect(() => {
    const items = Object.values(carrito).map((it) => ({ producto_id: it.producto.id, cantidad: it.cantidad }))
    if (!items.length) { setCotizacion({}); return }
    let vivo = true
    const t = setTimeout(() => {
      ventasApi.cotizar(items).then((r) => {
        if (vivo) setCotizacion(Object.fromEntries(r.items.map((x) => [x.producto_id, x])))
      }).catch(() => {})
    }, 200)
    return () => { vivo = false; clearTimeout(t) }
  }, [carrito])

  const totales = useMemo(() => {
    const items = Object.values(carrito).map((it) => {
      const c = cotizacion[it.producto.id]
      const regular = r2(it.producto.precio * it.cantidad)
      const vale = c && c.cantidad === it.cantidad
      return { ...it, regular, neto: vale ? c.neto : regular, promo: vale && c.descuento > 0 ? c.promocion : null, ahorro: vale ? c.descuento : 0 }
    })
    const regular = r2(items.reduce((acc, it) => acc + it.regular, 0))
    const descPromos = r2(items.reduce((acc, it) => acc + it.ahorro, 0))
    const total = r2(regular - descPromos)
    const base = r2(total / (1 + Number(config.igv)))
    const unidades = items.reduce((a, it) => a + it.cantidad, 0)
    return { regular, descPromos, total, base, igv: r2(total - base), items, unidades }
  }, [carrito, cotizacion, config.igv])

  // Toda boleta o factura identifica al cliente: nombre y documento son obligatorios.
  const documentoValido = [8, 9, 11].includes(clienteDocumento.length)
  const clienteCompleto = clienteNombre.trim() !== '' && documentoValido

  // ---------------- Pagos
  const mixto = pagos.length > 1
  const montoPago = (p) => (mixto ? r2(p.monto) : totales.total)
  const pagado = r2(pagos.reduce((a, p) => a + montoPago(p), 0))
  const restante = r2(totales.total - pagado)
  const setPago = (i, cambios) => set((v) => ({ pagos: v.pagos.map((p, j) => (j === i ? { ...p, ...cambios } : p)) }))
  const agregarPago = () => set((v) => {
    const usados = new Set(v.pagos.map((p) => p.metodo))
    const metodo = ['tarjeta', 'yape', 'efectivo', 'plin'].find((m) => !usados.has(m)) || 'tarjeta'
    const primero = v.pagos.length === 1 ? [{ ...v.pagos[0], monto: v.pagos[0].monto || '' }] : v.pagos
    return { pagos: [...primero, pagoNuevo(metodo)] }
  })
  const quitarPago = (i) => set((v) => ({ pagos: v.pagos.filter((_, j) => j !== i) }))

  const erroresPago = pagos.map((p) => {
    const monto = montoPago(p)
    if (mixto && monto <= 0) return 'Indica el monto.'
    if (p.metodo === 'efectivo' && p.monto_recibido !== '' && Number(p.monto_recibido) < monto) return 'El efectivo recibido no alcanza.'
    return null
  })
  const efectivoDuplicado = pagos.filter((p) => p.metodo === 'efectivo').length > 1

  const puedeCobrar = totales.items.length > 0 && restante === 0 && erroresPago.every((e) => !e) && !efectivoDuplicado
    && clienteCompleto

  /** Abre el POS de pruebas para un pago y espera "Se realizó el pago" o "Cancelar". */
  const cobrarEnPos = (pago) => new Promise((resolve) => setPos({ ...pago, resolve }))

  async function registrar() {
    setError('')
    if (!puedeCobrar) return
    const electronicos = pagos.filter((p) => p.metodo !== 'efectivo')
    if (electronicos.length === 0) {
      const ok = await fb.confirmar({
        titulo: 'Confirmar cobro',
        mensaje: `Venta por ${money(totales.total)} (${totales.unidades} unidad${totales.unidades === 1 ? '' : 'es'}) en efectivo.`,
        textoConfirmar: 'Registrar venta',
      })
      if (!ok) return
    }
    // Cada pago con tarjeta, Yape o Plin pasa por el POS; si uno se cancela, la venta no se registra.
    const cobros = []
    for (const p of pagos) {
      if (p.metodo === 'efectivo') { cobros.push({}); continue }
      const r = await cobrarEnPos({ metodo: p.metodo, monto: montoPago(p) })
      if (!r) { fb.info('Pago cancelado: la venta no se registró.'); return }
      cobros.push(r)
    }
    setEnviando(true)
    try {
      const r = await ventasApi.crear({
        cliente_nombre: clienteNombre.trim() || null,
        cliente_documento: clienteDocumento || null,
        pagos: pagos.map((p, i) => ({
          metodo: p.metodo,
          monto: montoPago(p),
          monto_recibido: p.metodo === 'efectivo' && p.monto_recibido !== '' ? Number(p.monto_recibido) : null,
          ...cobros[i],
        })),
        items: totales.items.map((it) => ({ producto_id: it.producto.id, cantidad: it.cantidad })),
      })
      setComprobante(r.venta)
      setVenta(ventaVacia())
      cargar(); cargarCaja()
    } catch (err) {
      setError(err.detail || 'No fue posible registrar la venta.')
      if (err.code === 'caja_cerrada' || err.code === 'caja_vencida') cargarCaja()
      cargar()
    } finally { setEnviando(false) }
  }

  // ---------------- Ventas en espera
  function ponerEnEspera() {
    if (totales.items.length === 0) return
    if (enEspera.length >= MAX_EN_ESPERA) { fb.error(`Máximo ${MAX_EN_ESPERA} ventas en espera. Retoma o cancela alguna.`); return }
    setEnEspera((l) => [...l, { id: Date.now(), fecha: new Date().toISOString(), total: totales.total, unidades: totales.unidades, venta }])
    setVenta(ventaVacia())
    fb.info('Venta puesta en espera. Atiende al siguiente cliente.')
    buscador.current?.focus()
  }
  function retomar(item) {
    if (totales.items.length > 0) { fb.error('Cobra o pon en espera la venta actual antes de retomar otra.'); return }
    setVenta(limpiarBorrador({ ...ventaVacia(), ...item.venta }))
    setEnEspera((l) => l.filter((x) => x.id !== item.id))
    setVerEspera(false)
  }
  async function descartar(item) {
    const ok = await autorizar({ accion: 'VACIAR_CARRITO', descripcion: `Venta en espera de ${item.unidades} unidad(es) por ${money(item.total)}` })
    if (ok) setEnEspera((l) => l.filter((x) => x.id !== item.id))
  }

  if (caja === undefined) return <div className="loading-page"><span className="spinner spinner-dark" /> Verificando tu caja…</div>

  // Reglas de negocio: sin caja abierta (o con una caja de un día anterior) no se registran ventas
  const vencida = caja && new Date(caja.fecha_apertura).toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA }) < hoyLima()
  if (caja === null || vencida) {
    return (
      <div className="card caja-bloqueo">
        <div className="icon-big"><Icon name="wallet" size={40} /></div>
        <h2 className="card-title">{vencida ? `Tu caja ${caja.codigo} es de un día anterior` : 'Tu caja está cerrada'}</h2>
        <p className="page-subtitle">
          {vencida ? 'Ciérrala con su arqueo y abre la caja de hoy para seguir vendiendo.' : 'Para registrar ventas primero abre tu caja indicando el fondo inicial en efectivo.'}
        </p>
        <Link to="/caja" className="btn btn-primary btn-lg"><Icon name="wallet" /> {vencida ? 'Ir a cerrar mi caja' : 'Abrir mi caja'}</Link>
      </div>
    )
  }

  const sugerencias = (monto) => (monto > 0
    ? [...new Set([Math.ceil(monto / 10) * 10, Math.ceil(monto / 50) * 50, Math.ceil(monto / 100) * 100, 200])].filter((s) => s > monto).slice(0, 3)
    : [])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva venta</h1>
          <p className="page-subtitle">
            Caja de <strong>{sesion.usuario.nombres} {sesion.usuario.apellido_paterno}</strong> · {sesion.rol_activo.nombre}.
            Escanea o escribe el SKU y presiona Enter.
          </p>
        </div>
        <div className="actions-inline">
          <button type="button" className="btn btn-outline" onClick={() => setVerEspera((x) => !x)}>
            <Icon name="pause" size={16} /> En espera <span className="badge badge-black">{enEspera.length}</span>
          </button>
          <Link to="/caja" className="caja-pill" title="Ver mi caja">
            <span className="badge badge-green">Caja {caja.codigo}</span>
            <span>Vendido: {money(caja.resumen.total_vendido)}</span>
          </Link>
        </div>
      </div>

      {caja.resumen.requiere_retiro && (
        <div className="alert alert-info">Tu gaveta superó el límite de efectivo. Pide al supervisor un retiro parcial desde <Link to="/caja">Mi caja</Link>.</div>
      )}

      {verEspera && (
        <div className="card espera-card">
          <div className="card-header"><h3 className="card-title">Ventas en espera</h3><span className="muted small">Se guardan en este equipo, máximo {MAX_EN_ESPERA}.</span></div>
          {enEspera.length === 0 ? <div className="empty-state">No hay ventas en espera.</div> : (
            <table className="data-table">
              <thead><tr><th>Hora</th><th>Cliente</th><th className="num">Unidades</th><th className="num">Total</th><th /></tr></thead>
              <tbody>
                {enEspera.map((e) => (
                  <tr key={e.id}>
                    <td>{fechaHora(e.fecha)}</td>
                    <td>{e.venta.clienteNombre || '—'}</td>
                    <td className="num">{e.unidades}</td>
                    <td className="num">{money(e.total)}</td>
                    <td><div className="actions-inline nowrap">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => retomar(e)}><Icon name="play" size={14} /> Retomar</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => descartar(e)}><Icon name="trash" size={14} /> Cancelar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="filter-bar">
        <div className="search-box grow">
          <Icon name="search" size={16} />
          <input ref={buscador} className="form-control" autoFocus placeholder="SKU, código o nombre del producto…" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} onKeyDown={onBuscarEnter} />
        </div>
        <div className="chip-row">
          <button type="button" className={`chip ${!familiaId ? 'active' : ''}`} onClick={() => setFamiliaId('')}>Todo</button>
          {familias.map((f) => (
            <button key={f.id} type="button" className={`chip ${String(familiaId) === String(f.id) ? 'active' : ''}`}
              onClick={() => setFamiliaId(f.id)}>{f.nombre}</button>
          ))}
        </div>
      </div>

      <div className="ventas-layout">
        <div className="product-grid">
          {productos.map((p) => {
            const enCarrito = carrito[p.id]?.cantidad || 0
            return (
              <button type="button" key={p.id} className={`product-card ${p.stock === 0 ? 'oos' : ''} ${enCarrito ? 'in-cart' : ''}`}
                onClick={() => agregar(p)} disabled={p.stock === 0}>
                {enCarrito > 0 && <span className="in-cart-badge">{enCarrito}</span>}
                <ProductoImagen producto={p} />
                <SkuCode sku={p.sku} producto={p} size="sm" />
                <span className="product-name clamp-3">{p.nombre}</span>
                <span className="product-brand">{p.marca} · {p.familia}</span>
                <span className="product-price">{money(p.precio)}</span>
                <span className={`product-stock ${p.estado_stock === 'agotado' ? 'oos' : p.estado_stock === 'bajo' ? 'low' : ''}`}>
                  {p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}
                </span>
              </button>
            )
          })}
          {productos.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}>Sin productos que coincidan.</div>}
        </div>

        <aside className="cart-panel">
          <div className="cart-head">
            <h3 className="cart-title">Venta en curso</h3>
            <span className="badge badge-black">{totales.unidades} u.</span>
            {totales.items.length > 0 && (
              <div className="actions-inline">
                <button type="button" className="btn btn-ghost btn-sm" onClick={ponerEnEspera} title="Atender a otro cliente y retomar después">
                  <Icon name="pause" size={14} /> Espera
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelarVenta}><Icon name="lock" size={14} /> Cancelar</button>
              </div>
            )}
          </div>

          <div className="cart-items">
            {totales.items.length === 0 ? (
              <div className="cart-empty">
                <Icon name="cart" size={32} />
                <p>Aún no agregas productos.<br />Haz clic en un producto o escanea su SKU.</p>
              </div>
            ) : totales.items.map((it) => (
              <div key={it.producto.id} className="cart-item">
                <ProductoImagen producto={it.producto} size="xs" />
                <div className="cart-item-info">
                  <div className="cart-item-name">{it.producto.nombre}</div>
                  <div className="cart-item-price">{it.producto.sku} · {money(it.producto.precio)} c/u</div>
                  {it.promo && <div className="cart-item-promo"><Icon name="tag" size={12} /> {it.promo.etiqueta} · {it.promo.nombre}</div>}
                </div>
                <div className="qty">
                  <button type="button" onClick={() => reducir(it.producto.id)} aria-label="Restar (requiere supervisor)" title="Requiere autorización del supervisor"><Icon name="minus" size={14} /></button>
                  <span className="qty-val">{it.cantidad}</span>
                  <button type="button" onClick={() => agregar(it.producto)} disabled={it.cantidad >= it.producto.stock} aria-label="Sumar"><Icon name="plus" size={14} /></button>
                </div>
                <div className="cart-item-sub">
                  {it.ahorro > 0 && <s className="cart-item-old">{money(it.regular)}</s>}
                  {money(it.neto)}
                  <button type="button" className="link-btn" onClick={() => reducir(it.producto.id, true)} title="Requiere autorización del supervisor">Quitar</button>
                </div>
              </div>
            ))}
          </div>
          {totales.items.length > 0 && <div className="form-help">Restar o quitar un producto ya registrado requiere el PIN del supervisor.</div>}

          <div className="cliente-campos">
            <div className="form-group compact">
              <label>DNI / CE / RUC <span className="neg">(obligatorio)</span></label>
              <input className="form-control" inputMode="numeric" maxLength={11} value={clienteDocumento}
                onChange={(e) => cambiarDocumento(e.target.value)} placeholder="Documento del cliente" />
            </div>
            <div className="form-group compact">
              <label>
                Cliente {clienteFuente
                  ? <span className="cliente-verificado"><Icon name="check" size={12} /> {FUENTE_CLIENTE[clienteFuente] || clienteFuente}</span>
                  : <span className="neg">(obligatorio)</span>}
              </label>
              <input className="form-control" maxLength={180} value={clienteNombre} readOnly={Boolean(clienteFuente)}
                placeholder={consulta.estado === 'buscando' ? 'Consultando…' : 'Nombre o razón social'}
                onChange={(e) => set({ clienteNombre: e.target.value })} />
            </div>
          </div>
          {!clienteDocumento && <div className="form-help">Con DNI o RUC el nombre se completa solo. Toda boleta o factura lleva los datos del cliente.</div>}
          {clienteDocumento && !documentoValido && <div className="form-error">El documento debe tener 8 (DNI), 9 (CE) u 11 (RUC) dígitos.</div>}
          {consulta.estado === 'error' && <div className="form-help">{consulta.mensaje}</div>}

          <div className="pagos">
            <div className="pagos-head">
              <label>Pago {mixto && <span className="badge badge-blue">Mixto</span>}</label>
              {pagos.length < 3 && totales.total > 0 && (
                <button type="button" className="link-btn" onClick={agregarPago}><Icon name="plus" size={13} /> Otro medio de pago</button>
              )}
            </div>
            {pagos.map((p, i) => {
              const monto = montoPago(p)
              const vuelto = p.metodo === 'efectivo' && p.monto_recibido !== '' ? r2(Number(p.monto_recibido) - monto) : null
              return (
                <div key={i} className="pago-linea">
                  <div className="pay-methods">
                    {METODOS_COBRO.map((id) => (
                      <button key={id} type="button" className={`pay-method ${p.metodo === id ? 'active' : ''}`}
                        onClick={() => setPago(i, { metodo: id })}>{METODOS_PAGO[id].replace(' (POS)', '')}</button>
                    ))}
                  </div>
                  <div className="form-help">{AYUDA_METODO[p.metodo]}</div>

                  {mixto && (
                    <div className="pago-monto">
                      <span className="pago-etq">Monto</span>
                      <input className="form-control" type="number" min="0" step="0.10" placeholder="Monto S/" value={p.monto}
                        onChange={(e) => setPago(i, { monto: e.target.value })} />
                      {restante > 0 && <button type="button" className="chip" onClick={() => setPago(i, { monto: String(r2(r2(p.monto) + restante)) })}>+ Restante {money(restante)}</button>}
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => quitarPago(i)} aria-label="Quitar pago"><Icon name="x" size={14} /></button>
                    </div>
                  )}

                  {p.metodo === 'efectivo' && monto > 0 && (
                    <>
                      <div className="pago-monto">
                        <span className="pago-etq">Recibido</span>
                        <input className="form-control" type="number" step="0.10" min="0" value={p.monto_recibido}
                        onChange={(e) => setPago(i, { monto_recibido: e.target.value })} placeholder={`Para el vuelto · cobra ${money(monto)}`} />
                      </div>
                      <div className="chip-row">
                        <button type="button" className="chip" onClick={() => setPago(i, { monto_recibido: String(monto) })}>Exacto</button>
                        {sugerencias(monto).map((s) => (
                          <button key={s} type="button" className="chip" onClick={() => setPago(i, { monto_recibido: String(s) })}>{money(s)}</button>
                        ))}
                      </div>
                      {vuelto !== null && (
                        <div className={`cart-total-row vuelto ${vuelto < 0 ? 'neg' : ''}`}><span>{vuelto < 0 ? 'Falta' : 'Vuelto'}</span><span>{money(Math.abs(vuelto))}</span></div>
                      )}
                    </>
                  )}

                  {totales.items.length > 0 && erroresPago[i] && <div className="form-error">{erroresPago[i]}</div>}
                </div>
              )
            })}
            {efectivoDuplicado && <div className="form-error">Registra el efectivo en una sola línea.</div>}
            {mixto && restante !== 0 && totales.total > 0 && (
              <div className="form-error">{restante > 0 ? `Falta asignar ${money(restante)}` : `Los pagos superan el total en ${money(-restante)}`}</div>
            )}
          </div>

          <div className="cart-totals">
            {totales.descPromos > 0 && <div className="cart-total-row"><span>Precio regular</span><span>{money(totales.regular)}</span></div>}
            {totales.descPromos > 0 && <div className="cart-total-row promo"><span>Promociones</span><span>- {money(totales.descPromos)}</span></div>}
            <div className="cart-total-row"><span>Op. gravada (sin IGV)</span><span>{money(totales.base)}</span></div>
            <div className="cart-total-row"><span>IGV ({Math.round(Number(config.igv) * 100)}%)</span><span>{money(totales.igv)}</span></div>
            <div className="cart-total-row grand"><span>Total</span><span>{money(totales.total)}</span></div>
          </div>

          {error && <div className="alert alert-error" style={{ margin: 0 }}>{error}</div>}

          <button className="btn btn-primary btn-block btn-lg" onClick={registrar} disabled={enviando || !puedeCobrar}>
            {enviando ? <span className="spinner" /> : `Cobrar ${money(totales.total)}`}
          </button>
        </aside>
      </div>

      {pos && (
        <PosSimulado metodo={pos.metodo} monto={pos.monto} proveedor={config.pos_proveedor} marcas={config.marcas_tarjeta}
          onDone={(r) => { pos.resolve(r); setPos(null) }} />
      )}
      {comprobante && (
        <ComprobanteModal venta={comprobante} recienCreada
          onAnular={async () => {
            const anulada = await anularVenta(comprobante)
            if (anulada) { setComprobante(anulada); cargar(); cargarCaja() }
          }}
          puedeReintentar onActualizar={setComprobante}
          onClose={() => { setComprobante(null); buscador.current?.focus() }} />
      )}
    </>
  )
}
