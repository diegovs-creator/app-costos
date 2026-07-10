import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportesApi } from '../api/client';
import { formatoMoneda } from '../utils/formato';

function TarjetaResumen({ titulo, valor, icono, colorClase }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{titulo}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${colorClase}`}>
          {icono}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{valor}</p>
    </div>
  );
}

export default function Dashboard() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportesApi
      .dashboard()
      .then(setDatos)
      .catch(() => setError('No se pudo conectar con el backend. Verifica que el servidor este corriendo en el puerto 4000.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <p className="text-gray-500">Cargando resumen...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const sinDatos = datos.totalProductos === 0 && datos.totalIngredientes === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Resumen general de costos, precios y ganancias.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaResumen
          titulo="Productos registrados"
          valor={datos.totalProductos}
          icono="🍞"
          colorClase="bg-brand-100 text-brand-700"
        />
        <TarjetaResumen
          titulo="Ingredientes registrados"
          valor={datos.totalIngredientes}
          icono="🧂"
          colorClase="bg-blue-100 text-blue-700"
        />
        <TarjetaResumen
          titulo="Ganancia estimada total"
          valor={formatoMoneda.format(datos.gananciaTotal)}
          icono="💰"
          colorClase="bg-green-100 text-green-700"
        />
        <TarjetaResumen
          titulo="Costo promedio por producto"
          valor={formatoMoneda.format(datos.costoPromedio)}
          icono="📦"
          colorClase="bg-amber-100 text-amber-700"
        />
      </div>

      {sinDatos ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-900">Todavía no hay datos cargados</p>
          <p className="mt-1 text-sm text-gray-500">
            Empieza registrando tus ingredientes y luego crea tu primera receta o producto.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/ingredientes"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Registrar ingrediente
            </Link>
            <Link
              to="/recetas"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Crear receta
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Ganancia por categoría</h2>
            <div className="mt-4 space-y-3">
              {datos.porCategoria.map((c) => (
                <div key={c.categoria} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{c.categoria}</span>
                  <span className="font-medium text-gray-900">{formatoMoneda.format(c.ganancia_total)}</span>
                </div>
              ))}
              {datos.porCategoria.length === 0 && (
                <p className="text-sm text-gray-400">Sin datos todavía.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Productos recientes</h2>
            <div className="mt-4 space-y-3">
              {datos.productosRecientes.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{p.nombre}</span>
                  <span className="font-medium text-gray-900">{formatoMoneda.format(p.ganancia_estimada)}</span>
                </div>
              ))}
              {datos.productosRecientes.length === 0 && (
                <p className="text-sm text-gray-400">Sin datos todavía.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
