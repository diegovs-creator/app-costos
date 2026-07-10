import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recetasApi } from '../api/client';
import { formatoMoneda, CATEGORIAS } from '../utils/formato';
import ConfirmDialog from '../components/layout/ConfirmDialog';

const FILTROS_CATEGORIA = [{ valor: '', label: 'Todas' }, ...CATEGORIAS];

export default function Recetas() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  const cargar = useCallback(() => {
    setCargando(true);
    recetasApi
      .listar(filtroCategoria || undefined)
      .then((data) => {
        setItems(data);
        setError('');
      })
      .catch(() => setError('No se pudo conectar con el backend.'))
      .finally(() => setCargando(false));
  }, [filtroCategoria]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function confirmarEliminar() {
    const item = itemAEliminar;
    setEliminandoId(item.id);
    setErrorEliminar('');
    try {
      await recetasApi.eliminar(item.id);
      setItemAEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar la receta.');
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Recetas / Productos</h1>
          <p className="mt-1 text-sm text-gray-500">Productos armados con tus ingredientes, con costo y precio calculados.</p>
        </div>
        <Link
          to="/recetas/nueva"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <span aria-hidden="true">+</span> Nueva receta
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {FILTROS_CATEGORIA.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltroCategoria(f.valor)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filtroCategoria === f.valor ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!error && cargando && <p className="text-sm text-gray-500">Cargando...</p>}

      {!error && !cargando && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-900">
            {filtroCategoria ? 'No hay recetas en esta categoría' : 'Todavía no hay recetas'}
          </p>
          <p className="mt-1 text-sm text-gray-500">Creá tu primer producto usando los ingredientes ya cargados.</p>
          <Link
            to="/recetas/nueva"
            className="mt-4 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Nueva receta
          </Link>
        </div>
      )}

      {!error && !cargando && items.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Costo</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Ganancia est.</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{item.categoria}</td>
                    <td className="px-4 py-3 text-gray-700">{formatoMoneda.format(item.costo_total)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatoMoneda.format(item.precio_final ?? item.precio_margen)}
                    </td>
                    <td className="px-4 py-3 text-green-700">{formatoMoneda.format(item.ganancia_estimada)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/recetas/${item.id}`}
                          className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          disabled={eliminandoId === item.id}
                          onClick={() => setItemAEliminar(item)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 sm:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.nombre}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{item.categoria}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatoMoneda.format(item.precio_final ?? item.precio_margen)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm text-gray-500">
                  <span>Costo: {formatoMoneda.format(item.costo_total)}</span>
                  <span className="text-green-700">Ganancia: {formatoMoneda.format(item.ganancia_estimada)}</span>
                </div>
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <Link
                    to={`/recetas/${item.id}`}
                    className="flex-1 rounded-md bg-brand-50 px-3 py-2 text-center text-sm font-medium text-brand-700"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    disabled={eliminandoId === item.id}
                    onClick={() => setItemAEliminar(item)}
                    className="flex-1 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {itemAEliminar && (
        <ConfirmDialog
          titulo="Eliminar receta"
          mensaje={`¿Eliminar "${itemAEliminar.nombre}"? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          procesando={eliminandoId === itemAEliminar.id}
          error={errorEliminar}
          onConfirmar={confirmarEliminar}
          onCancelar={() => {
            setItemAEliminar(null);
            setErrorEliminar('');
          }}
        />
      )}
    </div>
  );
}
