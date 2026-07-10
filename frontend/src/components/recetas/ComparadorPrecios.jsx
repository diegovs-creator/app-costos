import { formatoMoneda } from '../../utils/formato';
import { calcularPrecioMarkup, calcularPrecioMargen } from '../../utils/calculosReceta';

export default function ComparadorPrecios({
  costoTotal,
  margenPct,
  setMargenPct,
  precioElegido,
  setPrecioElegido,
  precioCustomTexto,
  setPrecioCustomTexto,
}) {
  const margenNum = Number(margenPct) || 0;
  const precioMarkup = calcularPrecioMarkup(costoTotal, margenNum);
  const precioMargen = calcularPrecioMargen(costoTotal, margenNum);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">Costo</p>
          <p className="text-base font-semibold text-gray-900">{formatoMoneda.format(costoTotal)}</p>
        </div>
        <label className="block">
          <span className="text-xs text-gray-500">Porcentaje (%)</span>
          <input
            type="number"
            min="0"
            value={margenPct}
            onChange={(e) => setMargenPct(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setPrecioElegido('markup')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            precioElegido === 'markup' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-xs font-medium text-gray-500">Markup ({margenNum}%)</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatoMoneda.format(precioMarkup)}</p>
          <p className="mt-0.5 text-xs text-gray-500">Ganancia {formatoMoneda.format(precioMarkup - costoTotal)}</p>
        </button>
        <button
          type="button"
          onClick={() => setPrecioElegido('margen')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            precioElegido === 'margen' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-xs font-medium text-gray-500">Margen ({margenNum}%)</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {precioMargen != null ? formatoMoneda.format(precioMargen) : 'N/A'}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {precioMargen != null
              ? `Ganancia ${formatoMoneda.format(precioMargen - costoTotal)}`
              : 'Porcentaje invalido (debe ser < 100)'}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setPrecioElegido('custom')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            precioElegido === 'custom' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-xs font-medium text-gray-500">Precio personalizado</p>
          <input
            type="number"
            min="0"
            value={precioCustomTexto}
            onFocus={() => setPrecioElegido('custom')}
            onChange={(e) => {
              setPrecioElegido('custom');
              setPrecioCustomTexto(e.target.value);
            }}
            placeholder="$"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </button>
      </div>
    </div>
  );
}

export function precioSegunEleccion({ precioElegido, costoTotal, margenPct, precioCustomTexto }) {
  const margenNum = Number(margenPct) || 0;
  if (precioElegido === 'markup') return calcularPrecioMarkup(costoTotal, margenNum);
  if (precioElegido === 'margen') return calcularPrecioMargen(costoTotal, margenNum);
  if (precioElegido === 'custom') {
    const custom = Number(precioCustomTexto);
    return Number.isNaN(custom) ? null : custom;
  }
  return null;
}
