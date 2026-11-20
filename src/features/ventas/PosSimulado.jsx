import { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { metodoLabel, money } from '../../utils/format'

/** N° de operación de 8 dígitos, como el REF de un voucher (generado con el azar del navegador). */
function numeroOperacion() {
  const n = new Uint32Array(1)
  crypto.getRandomValues(n)
  return String(n[0] % 100000000).padStart(8, '0')
}

/** QR decorativo (no es un QR real): una cuadrícula determinista a partir de una semilla. */
function QrPrueba({ semilla }) {
  const lado = 25
  const celdas = useMemo(() => {
    let x = [...semilla].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    const lista = []
    for (let i = 0; i < lado * lado; i += 1) {
      x = (x * 1103515245 + 12345) >>> 0
      if (x % 3 === 0) lista.push(i)
    }
    return lista
  }, [semilla])
  const esquina = (cx, cy) => (
    <g key={`${cx}-${cy}`}>
      <rect x={cx} y={cy} width="7" height="7" fill="#111" />
      <rect x={cx + 1} y={cy + 1} width="5" height="5" fill="#fff" />
      <rect x={cx + 2} y={cy + 2} width="3" height="3" fill="#111" />
    </g>
  )
  const enEsquina = (c, f) => (c < 8 && f < 8) || (c > lado - 9 && f < 8) || (c < 8 && f > lado - 9)
  return (
    <svg className="pos-qr" viewBox={`-1 -1 ${lado + 2} ${lado + 2}`} role="img" aria-label="Código QR de prueba">
      <rect x="-1" y="-1" width={lado + 2} height={lado + 2} fill="#fff" />
      {celdas.map((i) => {
        const c = i % lado
        const f = Math.floor(i / lado)
        return enEsquina(c, f) ? null : <rect key={i} x={c} y={f} width="1" height="1" fill="#111" />
      })}
      {[esquina(0, 0), esquina(lado - 7, 0), esquina(0, lado - 7)]}
    </svg>
  )
}

/** POS de pruebas: simula el cobro con tarjeta (POS) o con QR (Yape/Plin), como en una tienda real.
 * No se conecta a ningún banco: el cajero confirma con "Se realizó el pago" (Enter) o cancela (Esc).
 * Devuelve { nro_operacion, proveedor, marca_tarjeta, tipo_tarjeta } o null si se cancela. */
export default function PosSimulado({ metodo, monto, proveedor, marcas = [], onDone }) {
  const [marca, setMarca] = useState(marcas[0] || '')
  const [tipo, setTipo] = useState('debito')
  const [aprobado, setAprobado] = useState(null)
  const semilla = useMemo(() => `${metodo}-${monto}-${Date.now()}`, [metodo, monto])
  const esTarjeta = metodo === 'tarjeta'

  function aprobar() {
    if (aprobado) return
    const resultado = {
      nro_operacion: numeroOperacion(),
      proveedor: esTarjeta ? proveedor : null,
      marca_tarjeta: esTarjeta ? marca : null,
      tipo_tarjeta: esTarjeta ? tipo : null,
    }
    setAprobado(resultado)
    setTimeout(() => onDone(resultado), 900)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); aprobar() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <Modal size="sm" onClose={() => !aprobado && onDone(null)}
      titulo={esTarjeta ? `POS ${proveedor || ''}`.trim() : `Pago con ${metodoLabel(metodo)}`}
      subtitulo="Modo de prueba: no se realiza ningún cargo real."
      footer={aprobado ? null : (
        <>
          <button type="button" className="btn btn-ghost" onClick={() => onDone(null)}>Cancelar <kbd>Esc</kbd></button>
          <button type="button" className="btn btn-primary" onClick={aprobar} autoFocus>
            <Icon name="check" /> Se realizó el pago <kbd>Enter</kbd>
          </button>
        </>
      )}>
      <div className="pos-pantalla">
        <div className="pos-monto">{money(monto)}</div>
        {aprobado ? (
          <div className="pos-aprobado">
            <Icon name="check" size={40} />
            <strong>Pago aprobado</strong>
            <span className="mono">Operación {aprobado.nro_operacion}</span>
          </div>
        ) : esTarjeta ? (
          <>
            <div className="pos-instruccion"><Icon name="card" size={36} /> Inserte, deslice o acerque su tarjeta</div>
            <div className="pos-lectura">
              <span className="muted">Tarjeta leída</span>
              <div className="chip-row">
                {marcas.map((m) => (
                  <button key={m} type="button" className={`chip ${marca === m ? 'chip-on' : ''}`} onClick={() => setMarca(m)}>{m}</button>
                ))}
              </div>
              <div className="segmented">
                {[['debito', 'Débito'], ['credito', 'Crédito']].map(([id, l]) => (
                  <button key={id} type="button" className={tipo === id ? 'active' : ''} onClick={() => setTipo(id)}>{l}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <QrPrueba semilla={semilla} />
            <div className="pos-instruccion">Escanee el QR con {metodoLabel(metodo)} y pague {money(monto)}</div>
          </>
        )}
      </div>
    </Modal>
  )
}
