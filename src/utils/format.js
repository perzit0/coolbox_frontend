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

export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
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
