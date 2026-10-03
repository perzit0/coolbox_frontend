/** Muestra el SKU separado en sus 4 bloques (familia · subfamilia · marca · correlativo). */
export default function SkuCode({ sku, producto, size = 'md' }) {
  if (!sku) return <span className="sku sku-empty">Sin SKU</span>
  const partes = [sku.slice(0, 2), sku.slice(2, 4), sku.slice(4, 6), sku.slice(6, 8)]
  const titulos = producto
    ? [
        `Familia ${partes[0]}: ${producto.familia || ''}`,
        `Subfamilia ${partes[1]}: ${producto.subfamilia || ''}`,
        `Marca ${partes[2]}: ${producto.marca || ''}`,
        `Correlativo ${partes[3]}`,
      ]
    : ['Familia', 'Subfamilia', 'Marca', 'Correlativo']
  return (
    <span className={`sku sku-${size}`} aria-label={`SKU ${sku}`}>
      {partes.map((p, i) => (
        <span key={i} className={`sku-part sku-p${i}`} title={titulos[i]}>{p}</span>
      ))}
    </span>
  )
}
