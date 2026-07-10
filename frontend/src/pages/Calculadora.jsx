import { useEffect, useState } from 'react';
import { recetasApi } from '../api/client';
import { formatoMoneda } from '../utils/formato';
import ComparadorPrecios, { precioSegunEleccion } from '../components/recetas/ComparadorPrecios';

export default function Calculadora() {
  const [modo, setModo] = useState('manual'); // 'manual' | 'producto'
  const [costoManual, setCostoManual] = useState('');
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [margenPct, setMargenPct] = useState('50');
  const [precioElegido, setPrecioElegido] = useState('margen');
  const [precioCustomTexto, setPrecioCustomTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    recetasApi.listar().then(setProductos).catch(() => {});
  }, []);

  const productoSeleccionado = productos.find((p) => String(p.id) === productoId);
  const costoTotal =
    modo === 'producto' && productoSeleccionado ? productoSeleccionado.costo_total : Number(costoManual) || 0;

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo);
    setMensaje('');
    setError('');
  }

  function elegirProducto(idTexto) {
    setProductoId(idTexto);
    setMensaje('');
    const producto = productos.find((p) => String(p.id) === idTexto);
    if (producto) {
      setMargenPct(String(producto.margen_individual ?? producto.margen_base));
    }
  }

  async function aplicarAProducto() {
    if (!productoSeleccionado) return;
    setError('');
    setMensaje('');
    const precio_final = precioSegunEleccion({ precioElegido, costoTotal, margenPct, precioCustomTexto });
    if (precio_final == null || precio_final < 0) {
      return setError('Elegí o ingresá un precio valido antes de aplicar.');
    }
    setGuardando(true);
    try {
      await recetasApi.actualizar(productoSeleccionado.id, {
        margen_base: Number(margenPct) || 0,
        precio_final,
      });
      setMensaje(`Precio actualizado en "${productoSeleccionado.nombre}": ${formatoMoneda.format(precio_final)}`);
      const actualizados = await recetasApi.listar();
      setProductos(actualizados);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo aplicar el precio.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calculadora de precios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compará precio por markup vs. margen a partir de un costo, sin necesidad de crear una receta.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => cambiarModo('manual')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              modo === 'manual' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Costo manual
          </button>
          <button
            type="button"
            onClick={() => cambiarModo('producto')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              modo === 'producto' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Producto existente
          </button>
        </div>

        <div className="mt-4">
          {modo === 'manual' ? (
            <label className="block max-w-xs">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Costo del producto</span>
              <input
                type="number"
                min="0"
                value={costoManual}
                onChange={(e) => setCostoManual(e.target.value)}
                placeholder="Ej: 2500"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          ) : (
            <label className="block max-w-sm">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Producto</span>
              <select
                value={productoId}
                onChange={(e) => elegirProducto(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Seleccioná un producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — costo {formatoMoneda.format(p.costo_total)}
                  </option>
                ))}
              </select>
              {productos.length === 0 && (
                <p className="mt-1.5 text-xs text-gray-400">Todavía no hay productos creados.</p>
              )}
            </label>
          )}
        </div>

        {(modo === 'manual' ? costoTotal > 0 : Boolean(productoSeleccionado)) && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <ComparadorPrecios
              costoTotal={costoTotal}
              margenPct={margenPct}
              setMargenPct={setMargenPct}
              precioElegido={precioElegido}
              setPrecioElegido={setPrecioElegido}
              precioCustomTexto={precioCustomTexto}
              setPrecioCustomTexto={setPrecioCustomTexto}
            />

            {modo === 'producto' && (
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={aplicarAProducto}
                  disabled={guardando}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {guardando ? 'Aplicando...' : `Aplicar precio a "${productoSeleccionado?.nombre}"`}
                </button>
              </div>
            )}

            {mensaje && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{mensaje}</p>}
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
