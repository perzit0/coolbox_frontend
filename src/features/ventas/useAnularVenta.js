import { ventasApi } from '../../api/client'
import { useAutorizacion } from '../../components/Autorizacion'
import { useFeedback } from '../../components/Feedback'
import { money } from '../../utils/format'

/** Anulación de una venta cobrada.
 *
 * - Supervisor de Caja / Administrador (puedeAnular): confirma y escribe el motivo.
 * - Cajero: el supervisor autoriza con su PIN en la misma caja; el motivo
 *   elegido en la autorización se usa como motivo de la anulación.
 *
 * Devuelve la venta anulada, o null si se canceló o falló.
 */
export default function useAnularVenta({ puedeAnular }) {
  const fb = useFeedback()
  const autorizar = useAutorizacion()

  return async function anular(venta) {
    try {
      let r
      if (puedeAnular) {
        const motivo = await fb.confirmar({
          titulo: `Anular venta ${venta.codigo}`,
          mensaje: `Se anulará la venta por ${money(venta.total)}, se devolverán las unidades al stock y el monto dejará de contar en la caja ${venta.caja_codigo || ''}. Esta acción queda registrada a tu nombre.`,
          textoConfirmar: 'Anular venta', peligro: true,
          pedirMotivo: true, etiquetaMotivo: 'Motivo de la anulación', minMotivo: 10,
        })
        if (!motivo) return null
        r = await ventasApi.anular(venta.id, motivo)
      } else {
        const aut = await autorizar({
          accion: 'ANULAR_VENTA', venta_id: venta.id, monto: venta.total,
          descripcion: `Venta ${venta.codigo}. Devuelve el dinero al cliente por el mismo medio con el que pagó.`,
        })
        if (!aut) return null
        r = await ventasApi.anular(venta.id, aut.motivoTexto, aut.token)
        fb.ok(`Venta ${venta.codigo} anulada con autorización de ${aut.supervisor_nombre}.`)
        return r.venta
      }
      fb.ok(`Venta ${venta.codigo} anulada. Stock devuelto.`)
      return r.venta
    } catch (err) {
      fb.error(err.detail || 'No fue posible anular la venta.')
      return null
    }
  }
}
