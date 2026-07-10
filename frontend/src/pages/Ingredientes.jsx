import { useEffect, useState, useCallback } from 'react';
import { ingredientesApi } from '../api/client';
import { formatoMoneda } from '../utils/formato';
import IngredienteFormModal from '../components/ingredientes/IngredienteFormModal';
import HistorialPreciosModal from '../components/ingredientes/HistorialPreciosModal';
import ConfirmDialog from '../components/layout/ConfirmDialog';

const FILTROS_TIPO = [
  { valor: '', label: 'Todos' },
  { valor: 'ingrediente', label: 'Ingredientes' },
  { valor: 'envase', label: 'Envases' },
];

function BadgeTipo({ tipo }) {
  const esEnvase = tipo === 'envase';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        esEnvase ? 'bg-blue-100 text-blue-700' : 'bg-brand-100 text-brand-700'
      }`}
    >
      {esEnvase ? '📦 Envase' : '🧂 Ingrediente'}
    </span>
  );
}

export default function Ingredientes() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalForm, setModalForm] = useState({ abierto: false, ingrediente: null });
  const [modalHistorial, setModalHistorial] = useState(null);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  const cargar = useCallback(() => {
    setCargando(true);
    const params = {};
    if (busqueda.trim()) params.buscar = busqueda.trim();
    if (filtroTipo) params.tipo = filtroTipo;
    ingredientesApi
      .listar(params)
      .then((data) => {
        setItems(data);
        setError('');
      })
      .catch(() => setError('No se pudo conectar con el backend.'))
      .finally(() => setCargando(false));
  }, [busqueda, filtroTipo]);

  useEffect(() => {
    const timeoutId = setTimeout(cargar, 250);
    return () => clearTimeout(timeoutId);
  }, [cargar]);

  async function confirmarEliminar() {
    const item = itemAEliminar;
    setEliminandoId(item.id);
    setErrorEliminar('');
    try {
      await ingredientesApi.eliminar(item.id);
      setItemAEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar el ingrediente.');
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ingredientes</h1>
          <p className="mt-1 text-sm text-gray-500">Ingredientes y envases usados en tus recetas.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalForm({ abierto: true, ingrediente: null })}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <span aria-hidden="true">+</span> Nuevo ingrediente
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-xs"
        />
        <div className="flex gap-1.5">
          {FILTROS_TIPO.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltroTipo(f.valor)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filtroTipo === f.valor ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!error && cargando && <p className="text-sm text-gray-500">Cargando...</p>}

      {!error && !cargando && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-900">
            {busqueda || filtroTipo ? 'No se encontraron resultados' : 'Todavia no hay ingredientes'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {busqueda || filtroTipo
              ? 'Proba con otro nombre o filtro.'
              : 'Registra tu primer ingrediente o envase para empezar a armar recetas.'}
          </p>
        </div>
      )}

      {!error && !cargando && items.length > 0 && (
        <>
          {/* Tabla en desktop */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Presentacion</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-4 py-3">
                      <BadgeTipo tipo={item.tipo} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatoMoneda.format(item.precio)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.cantidad} {item.medida}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModalHistorial({ id: item.id, nombre: item.nombre })}
                          className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Historial
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalForm({ abierto: true, ingrediente: item })}
                          className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                        >
                          Editar
                        </button>
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

          {/* Cards en móvil */}
          <div className="space-y-3 sm:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.nombre}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatoMoneda.format(item.precio)} · {item.cantidad} {item.medida}
                    </p>
                  </div>
                  <BadgeTipo tipo={item.tipo} />
                </div>
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalHistorial({ id: item.id, nombre: item.nombre })}
                    className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    Historial
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalForm({ abierto: true, ingrediente: item })}
                    className="flex-1 rounded-md bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
                  >
                    Editar
                  </button>
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

      {modalForm.abierto && (
        <IngredienteFormModal
          ingrediente={modalForm.ingrediente}
          onClose={() => setModalForm({ abierto: false, ingrediente: null })}
          onGuardado={() => {
            setModalForm({ abierto: false, ingrediente: null });
            cargar();
          }}
        />
      )}

      {modalHistorial && (
        <HistorialPreciosModal
          ingredienteId={modalHistorial.id}
          nombre={modalHistorial.nombre}
          onClose={() => setModalHistorial(null)}
        />
      )}

      {itemAEliminar && (
        <ConfirmDialog
          titulo="Eliminar ingrediente"
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
