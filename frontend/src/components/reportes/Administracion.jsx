import { useEffect, useMemo, useState } from 'react';
import { recetasApi } from '../../api/client';
import { produccionApi } from '../../api/produccion';
import { costosFijosApi } from '../../api/costosFijos';
import { formatoMoneda } from '../../utils/formato';
import { valoresUnitarios } from '../../utils/calculosReceta';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceDiasISO(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

function diasEnRango(desde, hasta) {
  const ms = new Date(hasta) - new Date(desde);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

export default function Administracion() {
  const [desde, setDesde] = useState(haceDiasISO(6));
  const [hasta, setHasta] = useState(hoyISO());
  const [entradas, setEntradas] = useState(null);
  const [recetas, setRecetas] = useState(null);
  const [totalCostosFijos, setTotalCostosFijos] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([produccionApi.listar({ desde, hasta }), recetasApi.listar(), costosFijosApi.listar()])
      .then(([produccion, todasLasRecetas, costosFijos]) => {
        setEntradas(produccion);
        setRecetas(todasLasRecetas);
        setTotalCostosFijos(costosFijos.filter((c) => c.activo).reduce((acc, c) => acc + Number(c.monto_mensual), 0));
        setError('');
      })
      .catch(() => setError('No se pudo conectar con el backend.'));
  }, [desde, hasta]);

  const recetasPorId = useMemo(() => {
    const mapa = new Map();
    (recetas || []).forEach((r) => mapa.set(r.id, r));
    return mapa;
  }, [recetas]);

  const filasPorReceta = useMemo(() => {
    if (!entradas) return [];
    const mapa = new Map();
    for (const entrada of entradas) {
      const receta = recetasPorId.get(entrada.receta_id);
      const { costoUnitario, precioUnitario } = valoresUnitarios(receta);
      const costo = costoUnitario * entrada.cantidad_producida;
      const ingreso = precioUnitario * (entrada.cantidad_producida - entrada.cantidad_perdida);

      const previo = mapa.get(entrada.receta_id) || {
        receta_id: entrada.receta_id,
        nombre: entrada.receta_nombre,
        producido: 0,
        perdido: 0,
        costo: 0,
        ingreso: 0,
      };
      previo.producido += entrada.cantidad_producida;
      previo.perdido += entrada.cantidad_perdida;
      previo.costo += costo;
      previo.ingreso += ingreso;
      mapa.set(entrada.receta_id, previo);
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [entradas, recetasPorId]);

  const dias = diasEnRango(desde, hasta);
  const costoFijoPeriodo = (totalCostosFijos / 30) * dias;
  const costoVariable = filasPorReceta.reduce((acc, f) => acc + f.costo, 0);
  const ingresoEstimado = filasPorReceta.reduce((acc, f) => acc + f.ingreso, 0);
  const costoTotalPeriodo = costoVariable + costoFijoPeriodo;
  const resultadoEstimado = ingresoEstimado - costoTotalPeriodo;

  const cargando = entradas === null || recetas === null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-gray-500">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-gray-500">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        </div>
        <p className="text-xs text-gray-400">
          {dias} día{dias === 1 ? '' : 's'} · valores estimados según precios de referencia, no ventas reales
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!error && cargando && <p className="text-sm text-gray-500">Cargando...</p>}

      {!cargando && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Costo del período</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatoMoneda.format(costoTotalPeriodo)}</p>
              <p className="mt-1 text-xs text-gray-500">
                {formatoMoneda.format(costoVariable)} producción + {formatoMoneda.format(costoFijoPeriodo)} fijos
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ingreso estimado</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatoMoneda.format(ingresoEstimado)}</p>
              <p className="mt-1 text-xs text-gray-500">Según precio de referencia de cada receta, sin lo perdido</p>
            </div>
            <div
              className={`rounded-xl border p-5 ${
                resultadoEstimado >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resultado estimado</p>
              <p
                className={`mt-1 text-2xl font-semibold ${resultadoEstimado >= 0 ? 'text-green-700' : 'text-red-700'}`}
              >
                {formatoMoneda.format(resultadoEstimado)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Por receta</h2>
            </div>
            {filasPorReceta.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">No hay producción cargada en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">Receta</th>
                      <th className="px-4 py-2.5">Producido</th>
                      <th className="px-4 py-2.5">Perdido</th>
                      <th className="px-4 py-2.5">Costo</th>
                      <th className="px-4 py-2.5">Ingreso estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filasPorReceta.map((f) => (
                      <tr key={f.receta_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{f.nombre}</td>
                        <td className="px-4 py-2.5 text-gray-700">{f.producido}</td>
                        <td className="px-4 py-2.5 text-gray-700">{f.perdido || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-700">{formatoMoneda.format(f.costo)}</td>
                        <td className="px-4 py-2.5 text-green-700">{formatoMoneda.format(f.ingreso)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
