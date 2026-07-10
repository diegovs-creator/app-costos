import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { empleadoApi } from '../../api/empleado';

export default function RecetaEmpleadoDetalle() {
  const { id } = useParams();
  const [receta, setReceta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    empleadoApi
      .obtenerReceta(id)
      .then(setReceta)
      .catch(() => setError('No se pudo cargar la receta.'));
  }, [id]);

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver a Recetas
      </Link>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!error && !receta && <p className="text-sm text-gray-500">Cargando...</p>}

      {receta && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h1 className="text-xl font-semibold text-gray-900">{receta.nombre}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {receta.categoria} · rinde {receta.lotes}
          </p>

          <h2 className="mt-5 text-sm font-semibold text-gray-900">Ingredientes</h2>
          <ul className="mt-2 divide-y divide-gray-100">
            {receta.ingredientes.map((ri) => (
              <li key={ri.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-900">{ri.nombre_ingrediente}</span>
                <span className="text-gray-500">
                  {ri.cantidad_usada} {ri.medida}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
