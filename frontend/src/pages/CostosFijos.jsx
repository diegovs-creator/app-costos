import { useEffect, useState } from 'react';
import { costosFijosApi } from '../api/costosFijos';
import { formatoMoneda } from '../utils/formato';
import Modal from '../components/layout/Modal';
import ConfirmDialog from '../components/layout/ConfirmDialog';

function CostoFijoFormModal({ costo, onClose, onGuardado }) {
  const esEdicion = Boolean(costo);
  const [nombre, setNombre] = useState(costo?.nombre ?? '');
  const [monto, setMonto] = useState(costo ? String(costo.monto_mensual) : '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    const montoNum = Number(monto);
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    if (Number.isNaN(montoNum) || montoNum < 0) return setError('El monto debe ser un numero mayor o igual a 0.');

    setGuardando(true);
    try {
      if (esEdicion) {
        await costosFijosApi.actualizar(costo.id, { nombre: nombre.trim(), monto_mensual: montoNum });
      } else {
        await costosFijosApi.crear({ nombre: nombre.trim(), monto_mensual: montoNum });
      }
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el costo fijo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={esEdicion ? 'Editar costo fijo' : 'Nuevo costo fijo'} onClose={onClose}>
      <form onSubmit={manejarSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Arriendo, Gas, Electricidad"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Monto mensual</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              $
            </span>
            <input
              type="number"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="750000"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </label>

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

export default function CostosFijos() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [modalForm, setModalForm] = useState({ abierto: false, costo: null });
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  function cargar() {
    costosFijosApi
      .listar()
      .then((data) => {
        setItems(data);
        setError('');
      })
      .catch(() => setError('No se pudo conectar con el backend.'));
  }

  useEffect(cargar, []);

  async function confirmarEliminar() {
    const item = itemAEliminar;
    setEliminandoId(item.id);
    setErrorEliminar('');
    try {
      await costosFijosApi.eliminar(item.id);
      setItemAEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar el costo fijo.');
    } finally {
      setEliminandoId(null);
    }
  }

  const totalMensual = (items || []).filter((c) => c.activo).reduce((acc, c) => acc + Number(c.monto_mensual), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Costos Fijos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Arriendo, gas, electricidad y demás gastos mensuales que no dependen de una receta puntual.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalForm({ abierto: true, costo: null })}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <span aria-hidden="true">+</span> Nuevo costo fijo
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!error && !items && <p className="text-sm text-gray-500">Cargando...</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-900">Todavía no hay costos fijos cargados</p>
          <p className="mt-1 text-sm text-gray-500">Empezá con arriendo, gas y electricidad.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div className="rounded-xl border border-gray-200 bg-brand-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Total mensual</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatoMoneda.format(totalMensual)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {formatoMoneda.format(totalMensual / 30)} por día (÷ 30)
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Monto mensual</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-4 py-3 text-gray-700">{formatoMoneda.format(item.monto_mensual)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModalForm({ abierto: true, costo: item })}
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
        </>
      )}

      {modalForm.abierto && (
        <CostoFijoFormModal
          costo={modalForm.costo}
          onClose={() => setModalForm({ abierto: false, costo: null })}
          onGuardado={() => {
            setModalForm({ abierto: false, costo: null });
            cargar();
          }}
        />
      )}

      {itemAEliminar && (
        <ConfirmDialog
          titulo="Eliminar costo fijo"
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
