/** Muestra el SKU como texto simple: "SKU: 10020401". */
export default function SkuCode({ sku, producto, size = 'md' }) {
  if (!sku) return <span className="sku-text sku-empty">Sin SKU</span>
  const titulo = producto
    ? `Familia ${sku.slice(0, 2)} ${producto.familia || ''} · Subfamilia ${sku.slice(2, 4)} ${producto.subfamilia || ''} · Marca ${sku.slice(4, 6)} ${producto.marca || ''} · Correlativo ${sku.slice(6, 8)}`
    : undefined
  return (
    <span className={`sku-text sku-${size}`} title={titulo}>
      SKU: <strong>{sku}</strong>
    </span>
  )
}
