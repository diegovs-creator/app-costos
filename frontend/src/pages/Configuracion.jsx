import { useEffect, useState } from 'react';
import { configuracionApi } from '../api/client';
import { CATEGORIAS } from '../utils/formato';

export default function Configuracion() {
  const [margenes, setMargenes] = useState(null);
  const [valores, setValores] = useState({});
  const [guardandoCategoria, setGuardandoCategoria] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    configuracionApi
      .obtenerMargenes()
      .then((rows) => {
        setMargenes(rows);
        const mapa = {};
        rows.forEach((r) => (mapa[r.categoria] = String(r.margen_base)));
        setValores(mapa);
      })
      .catch(() => setError('No se pudo conectar con el backend.'));
  }, []);

  async function guardar(categoria) {
    setError('');
    setMensaje('');
    const nuevoValor = Number(valores[categoria]);
    if (Number.isNaN(nuevoValor) || nuevoValor < 0) {
      return setError('El margen debe ser un numero mayor o igual a 0.');
    }
    setGuardandoCategoria(categoria);
    try {
      await configuracionApi.actualizarMargen(categoria, nuevoValor);
      setMensaje(`Margen base de ${categoria} actualizado a ${nuevoValor}%.`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el margen.');
    } finally {
      setGuardandoCategoria(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Margen base por categoría. Se usa como valor por defecto al crear una receta nueva.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {mensaje && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{mensaje}</p>}

      {!margenes && !error && <p className="text-sm text-gray-500">Cargando...</p>}

      {margenes && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Margen base por categoría</h2>
          <div className="mt-4 space-y-4">
            {CATEGORIAS.map((c) => (
              <div key={c.valor} className="flex flex-col gap-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-gray-700">{c.label}</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={valores[c.valor] ?? ''}
                      onChange={(e) => setValores((prev) => ({ ...prev, [c.valor]: e.target.value }))}
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2 pr-7 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      %
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => guardar(c.valor)}
                    disabled={guardandoCategoria === c.valor}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {guardandoCategoria === c.valor ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Cambiar el margen base acá no modifica recetas ya creadas — solo aplica como valor sugerido para recetas
        nuevas. Para cambiar el precio de un producto existente, usá la Calculadora de precios o editá la receta.
      </p>
    </div>
  );
}
