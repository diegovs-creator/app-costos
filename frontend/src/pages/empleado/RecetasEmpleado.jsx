import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { empleadoApi } from '../../api/empleado';
import { formatoFecha } from '../../utils/formato';

export default function RecetasEmpleado() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    empleadoApi
      .listarRecetas()
      .then(setItems)
      .catch(() => setError('No se pudo conectar. Fijate la conexión e intentá de nuevo.'));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Recetas</h1>
        <Link
          to="/nueva"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <span aria-hidden="true">+</span> Nueva receta
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && !items && <p className="text-sm text-gray-500">Cargando...</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="font-medium text-gray-900">Todavía no hay recetas cargadas</p>
          <p className="mt-1 text-sm text-gray-500">Cargá la primera con el botón de arriba.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {items.map((r) => (
            <li key={r.id}>
              <Link to={`/recetas/${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{r.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {r.categoria} · {formatoFecha(r.fecha_creacion)}
                  </p>
                </div>
                <span className="text-gray-300" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
