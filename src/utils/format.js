const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })

/** S/ 1,234.50 */
export const money = (n) => soles.format(Number(n || 0)).replace('PEN', 'S/').replace(/ /g, ' ')

export const fecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' }) : '—'

export const fechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      })
    : '—'

/** Fecha de hoy en Lima como AAAA-MM-DD (para inputs type=date). */
export function hoyLima(offsetDias = 0) {
  const d = new Date(Date.now() + offsetDias * 86400000)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
}

/** Medios de pago de una caja real en Lima. "mixto" = venta pagada con varios medios. */
export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta (POS)',
  qr: 'QR (POS)',
  yape: 'Yape',
  plin: 'Plin',
}
export const METODO_LABEL = { ...METODOS_PAGO, mixto: 'Pago mixto' }
export const metodoLabel = (m) => METODO_LABEL[m] || m

/** Ayuda corta que ve el cajero al elegir el medio de pago. */
export const AYUDA_METODO = {
  efectivo: 'Cuenta el dinero frente al cliente y entrega el vuelto.',
  tarjeta: 'Cobra en el POS y copia el N° de operación (REF) del voucher.',
  qr: 'Genera el QR en el POS (Yape, Plin u otra billetera) y copia el N° de operación del voucher.',
  yape: 'Pago al Yape de la tienda: verifica que llegó y copia el N° de operación de la constancia.',
  plin: 'Pago al Plin de la tienda: verifica que llegó y copia el N° de operación de la constancia.',
}

export const PROVEEDORES_POS = ['OpenPay', 'Niubiz', 'Izipay', 'Culqi', 'Otro']

export const ACCIONES_AUTORIZACION = {
  ANULAR_ITEM: 'Retirar producto del carrito',
  VACIAR_CARRITO: 'Cancelar venta en curso',
  DESCUENTO: 'Descuento mayor al permitido',
  ANULAR_VENTA: 'Anular venta cobrada',
  RETIRO_EFECTIVO: 'Retiro parcial de efectivo',
  CIERRE_DIFERENCIA: 'Cierre de caja con diferencia',
  REIMPRESION: 'Reimpresión de comprobante',
}

export const TIPOS_MOVIMIENTO = {
  inicial: { label: 'Stock inicial', clase: 'badge-gray' },
  entrada: { label: 'Entrada', clase: 'badge-green' },
  salida: { label: 'Salida', clase: 'badge-red' },
  ajuste: { label: 'Ajuste', clase: 'badge-yellow' },
  venta: { label: 'Venta', clase: 'badge-black' },
  anulacion: { label: 'Anulación', clase: 'badge-blue' },
}

export const ESTADO_STOCK = {
  normal: { label: 'Disponible', clase: 'badge-green' },
  bajo: { label: 'Stock bajo', clase: 'badge-yellow' },
  agotado: { label: 'Agotado', clase: 'badge-red' },
}

/** plural(1, 'venta') -> "1 venta"; plural(3, 'unidad', 'unidades') -> "3 unidades" */
export const plural = (n, singular, pluralTxt) => `${n} ${n === 1 ? singular : (pluralTxt || `${singular}s`)}`
