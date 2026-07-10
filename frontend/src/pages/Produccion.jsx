import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { empleadoApi } from '../api/empleado';
import { recetasApi } from '../api/client';
import { produccionApi } from '../api/produccion';
import ConfirmDialog from '../components/layout/ConfirmDialog';
import Modal from '../components/layout/Modal';
import { parsearCantidad, convertirAUnidad, valoresUnitarios } from '../utils/calculosReceta';
import { formatoMoneda } from '../utils/formato';

const MOTIVOS = [
  { valor: 'accidente', label: 'Accidente (se rompió/dañó)' },
  { valor: 'no_vendido', label: 'No se pudo dejar de un día para otro' },
];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function EditarPerdidaModal({ entrada, onClose, onGuardado }) {
  const [cantidadPerdida, setCantidadPerdida] = useState(entrada.cantidad_perdida ? String(entrada.cantidad_perdida) : '');
  const [motivoPerdida, setMotivoPerdida] = useState(entrada.motivo_perdida || MOTIVOS[0].valor);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    const perdida = cantidadPerdida.trim() === '' ? 0 : Number(cantidadPerdida);
    if (Number.isNaN(perdida) || perdida < 0) return setError('La cantidad perdida no es válida.');

    setGuardando(true);
    try {
      await produccionApi.actualizar(entrada.id, {
        cantidad_perdida: perdida,
        motivo_perdida: perdida > 0 ? motivoPerdida : null,
      });
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Pérdida de "${entrada.receta_nombre}"`} onClose={onClose}>
      <form onSubmit={manejarSubmit} className="space-y-4">
        <p className="text-xs text-gray-500">
          Se produjeron {entrada.cantidad_producida} el {entrada.fecha}. Poné acá cuánto de eso se perdió (ej: al
          cerrar el local).
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Cantidad perdida</span>
          <input
            type="number"
            min="0"
            value={cantidadPerdida}
            onChange={(e) => setCantidadPerdida(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        {Number(cantidadPerdida) > 0 && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Motivo</span>
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
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Produccion() {
  const { rol } = useAuth();
  const esPropietario = rol === 'propietario';

  const [fecha, setFecha] = useState(hoyISO());
  const [recetas, setRecetas] = useState([]);
  const [recetasConCosto, setRecetasConCosto] = useState(null); // solo propietario
  const [recetaId, setRecetaId] = useState('');
  const [modoCarga, setModoCarga] = useState('referencia'); // 'referencia' | 'directa'
  const [cantidadReferenciaTexto, setCantidadReferenciaTexto] = useState('');
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [cantidadPerdida, setCantidadPerdida] = useState('');
  const [motivoPerdida, setMotivoPerdida] = useState(MOTIVOS[0].valor);
  const [entradas, setEntradas] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [itemAEditar, setItemAEditar] = useState(null);

  useEffect(() => {
    empleadoApi.listarRecetas().then(setRecetas).catch(() => {});
  }, []);

  useEffect(() => {
    if (esPropietario) {
      recetasApi.listar().then(setRecetasConCosto).catch(() => {});
    }
  }, [esPropietario]);

  const costoPorRecetaId = useMemo(() => {
    const mapa = new Map();
    (recetasConCosto || []).forEach((r) => mapa.set(r.id, r));
    return mapa;
  }, [recetasConCosto]);

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

  const receta = useMemo(() => recetas.find((r) => r.id === Number(recetaId)) || null, [recetas, recetaId]);
  const tieneReferencia = Boolean(receta?.referencia_nombre);

  function elegirReceta(idTexto) {
    setRecetaId(idTexto);
    const nuevaReceta = recetas.find((r) => r.id === Number(idTexto));
    setModoCarga(nuevaReceta?.referencia_nombre ? 'referencia' : 'directa');
    setCantidadReferenciaTexto('');
    setCantidadProducida('');
  }

  // A partir de "cuanto se uso del ingrediente de referencia", calcula cuanto
  // se produjo realmente (factor de escala respecto de como esta armada la receta).
  const calculoPorReferencia = useMemo(() => {
    if (!receta || !tieneReferencia || !cantidadReferenciaTexto.trim()) return null;
    const { cantidad, medida } = parsearCantidad(cantidadReferenciaTexto, receta.referencia_medida);
    if (cantidad == null || cantidad <= 0 || !medida) return { error: 'Cantidad inválida. Ej: 5kg' };
    const cantidadEnMedidaBase = convertirAUnidad(cantidad, medida, receta.referencia_medida);
    if (cantidadEnMedidaBase == null) {
      return { error: `Unidad "${medida}" incompatible con "${receta.referencia_medida}"` };
    }
    const factor = cantidadEnMedidaBase / receta.referencia_cantidad_base;
    const base = receta.unidad_venta === 'kilo' ? receta.peso_final_kg : receta.lotes;
    if (!base) return { error: 'Esta receta no tiene rendimiento base cargado.' };
    return { cantidadProducida: Number((factor * base).toFixed(3)) };
  }, [receta, tieneReferencia, cantidadReferenciaTexto]);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!recetaId) return setError('Elegí una receta.');

    let producida;
    if (modoCarga === 'referencia') {
      if (!calculoPorReferencia) return setError(`Ingresá cuánto usaste de ${receta.referencia_nombre}.`);
      if (calculoPorReferencia.error) return setError(calculoPorReferencia.error);
      producida = calculoPorReferencia.cantidadProducida;
    } else {
      producida = Number(cantidadProducida);
      if (Number.isNaN(producida) || producida < 0) return setError('La cantidad producida no es válida.');
    }

    const perdida = cantidadPerdida.trim() === '' ? 0 : Number(cantidadPerdida);
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
      setCantidadReferenciaTexto('');
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
            onChange={(e) => elegirReceta(e.target.value)}
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

        {receta && tieneReferencia && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setModoCarga('referencia')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                modoCarga === 'referencia' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Por {receta.referencia_nombre}
            </button>
            <button
              type="button"
              onClick={() => setModoCarga('directa')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                modoCarga === 'directa' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cantidad directa
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {receta && tieneReferencia && modoCarga === 'referencia' ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Cuánto {receta.referencia_nombre} usaste
              </span>
              <input
                type="text"
                value={cantidadReferenciaTexto}
                onChange={(e) => setCantidadReferenciaTexto(e.target.value)}
                placeholder={`Ej: 5${receta.referencia_medida}`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {calculoPorReferencia?.error && (
                <p className="mt-1 text-xs text-red-600">{calculoPorReferencia.error}</p>
              )}
              {calculoPorReferencia?.cantidadProducida != null && (
                <p className="mt-1 text-xs text-gray-500">
                  ≈ produjiste{' '}
                  <span className="font-medium text-gray-900">
                    {calculoPorReferencia.cantidadProducida} {receta.unidad_venta === 'kilo' ? 'kg' : 'unidades'}
                  </span>
                </p>
              )}
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Cantidad producida{' '}
                {receta && <span className="font-normal text-gray-400">({receta.unidad_venta === 'kilo' ? 'kg' : 'unidades'})</span>}
              </span>
              <input
                type="number"
                min="0"
                value={cantidadProducida}
                onChange={(e) => setCantidadProducida(e.target.value)}
                placeholder="Ej: 10"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Cantidad perdida <span className="font-normal text-gray-400">(opcional, se puede cargar después)</span>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5">Receta</th>
                    <th className="px-4 py-2.5">Cantidad producida</th>
                    <th className="px-4 py-2.5">Perdido</th>
                    <th className="px-4 py-2.5">Motivo</th>
                    {esPropietario && (
                      <>
                        <th className="px-4 py-2.5">Costo</th>
                        <th className="px-4 py-2.5">Ganancia estimada</th>
                      </>
                    )}
                    <th className="px-4 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entradas.map((e) => {
                    const infoReceta = recetas.find((r) => r.id === e.receta_id);
                    const unidadLabel = infoReceta?.unidad_venta === 'kilo' ? 'kg' : 'u.';
                    const recetaConCosto = costoPorRecetaId.get(e.receta_id);
                    const { costoUnitario, precioUnitario } = esPropietario
                      ? valoresUnitarios(recetaConCosto)
                      : { costoUnitario: 0, precioUnitario: 0 };
                    const costo = costoUnitario * e.cantidad_producida;
                    const ganancia = precioUnitario * (e.cantidad_producida - e.cantidad_perdida) - costo;

                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{e.receta_nombre}</td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {e.cantidad_producida} {unidadLabel}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {e.cantidad_perdida ? `${e.cantidad_perdida} ${unidadLabel}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {e.motivo_perdida
                            ? MOTIVOS.find((m) => m.valor === e.motivo_perdida)?.label ?? e.motivo_perdida
                            : '-'}
                        </td>
                        {esPropietario && (
                          <>
                            <td className="px-4 py-2.5 text-gray-700">{formatoMoneda.format(costo)}</td>
                            <td className={`px-4 py-2.5 font-medium ${ganancia >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {formatoMoneda.format(ganancia)}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setItemAEditar(e)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                            >
                              {e.cantidad_perdida ? 'Editar pérdida' : 'Cargar pérdida'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemAEliminar(e)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {esPropietario && entradas && entradas.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Costo y ganancia estimada = precio de referencia menos costo de ingredientes/envase. No es ganancia real
            (no hay datos de ventas efectivas acá).
          </p>
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

      {itemAEditar && (
        <EditarPerdidaModal
          entrada={itemAEditar}
          onClose={() => setItemAEditar(null)}
          onGuardado={() => {
            setItemAEditar(null);
            cargarEntradas();
          }}
        />
      )}
    </div>
  );
}
