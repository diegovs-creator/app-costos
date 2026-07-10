import { useEffect, useState } from 'react';
import { empleadoApi } from '../api/empleado';
import { produccionApi } from '../api/produccion';
import ConfirmDialog from '../components/layout/ConfirmDialog';

const MOTIVOS = [
  { valor: 'accidente', label: 'Accidente (se rompió/dañó)' },
  { valor: 'no_vendido', label: 'No se pudo dejar de un día para otro' },
];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Produccion() {
  const [fecha, setFecha] = useState(hoyISO());
  const [recetas, setRecetas] = useState([]);
  const [recetaId, setRecetaId] = useState('');
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [cantidadPerdida, setCantidadPerdida] = useState('');
  const [motivoPerdida, setMotivoPerdida] = useState(MOTIVOS[0].valor);
  const [entradas, setEntradas] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  useEffect(() => {
    empleadoApi.listarRecetas().then(setRecetas).catch(() => {});
  }, []);

  function cargarEntradas() {
    produccionApi
      .listar(fecha)
      .then((data) => {
        setEntradas(data);
        setError('');
      })
      .catch(() => setError('No se pudo conectar con el backend.'));
  }

  useEffect(cargarEntradas, [fecha]);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    const producida = Number(cantidadProducida);
    const perdida = cantidadPerdida.trim() === '' ? 0 : Number(cantidadPerdida);

    if (!recetaId) return setError('Elegí una receta.');
    if (Number.isNaN(producida) || producida < 0) return setError('La cantidad producida no es válida.');
    if (Number.isNaN(perdida) || perdida < 0) return setError('La cantidad perdida no es válida.');

    setGuardando(true);
    try {
      await produccionApi.crear({
        fecha,
        receta_id: Number(recetaId),
        cantidad_producida: producida,
        cantidad_perdida: perdida,
        motivo_perdida: perdida > 0 ? motivoPerdida : null,
      });
      setRecetaId('');
      setCantidadProducida('');
      setCantidadPerdida('');
      cargarEntradas();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la producción.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    const item = itemAEliminar;
    setEliminandoId(item.id);
    setErrorEliminar('');
    try {
      await produccionApi.eliminar(item.id);
      setItemAEliminar(null);
      cargarEntradas();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar el registro.');
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Producción</h1>
        <p className="mt-1 text-sm text-gray-500">Registrá cuánto hiciste cada día, y si se perdió algo.</p>
      </div>

      <form onSubmit={manejarSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-xs"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Receta</span>
          <select
            value={recetaId}
            onChange={(e) => setRecetaId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Seleccioná una receta...</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Cantidad producida</span>
            <input
              type="number"
              min="0"
              value={cantidadProducida}
              onChange={(e) => setCantidadProducida(e.target.value)}
              placeholder="Ej: 10"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Cantidad perdida <span className="font-normal text-gray-400">(opcional)</span>
            </span>
            <input
              type="number"
              min="0"
              value={cantidadPerdida}
              onChange={(e) => setCantidadPerdida(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        </div>

        {Number(cantidadPerdida) > 0 && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Motivo de la pérdida</span>
            <select
              value={motivoPerdida}
              onChange={(e) => setMotivoPerdida(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {MOTIVOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
        >
          {guardando ? 'Guardando...' : 'Agregar registro'}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-gray-900">Registros del {fecha}</h2>
        {!entradas && <p className="mt-2 text-sm text-gray-500">Cargando...</p>}
        {entradas && entradas.length === 0 && (
          <p className="mt-2 text-sm text-gray-400">Todavía no hay nada cargado para este día.</p>
        )}
        {entradas && entradas.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Receta</th>
                  <th className="px-4 py-2.5">Producido</th>
                  <th className="px-4 py-2.5">Perdido</th>
                  <th className="px-4 py-2.5">Motivo</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entradas.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{e.receta_nombre}</td>
                    <td className="px-4 py-2.5 text-gray-700">{e.cantidad_producida}</td>
                    <td className="px-4 py-2.5 text-gray-700">{e.cantidad_perdida || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {e.motivo_perdida
                        ? MOTIVOS.find((m) => m.valor === e.motivo_perdida)?.label ?? e.motivo_perdida
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setItemAEliminar(e)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {itemAEliminar && (
        <ConfirmDialog
          titulo="Eliminar registro"
          mensaje={`¿Eliminar el registro de "${itemAEliminar.receta_nombre}" del ${itemAEliminar.fecha}?`}
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
