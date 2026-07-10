import { useState } from 'react';
import Modal from '../layout/Modal';
import { ingredientesApi } from '../../api/client';
import { MEDIDAS } from '../../utils/formato';

const VALORES_INICIALES = { nombre: '', precio: '', medida: 'kg', cantidad: '', tipo: 'ingrediente' };

export default function IngredienteFormModal({ ingrediente, nombreInicial, onClose, onGuardado }) {
  const esEdicion = Boolean(ingrediente);
  const [form, setForm] = useState(
    ingrediente
      ? {
          nombre: ingrediente.nombre,
          precio: String(ingrediente.precio),
          medida: ingrediente.medida,
          cantidad: String(ingrediente.cantidad),
          tipo: ingrediente.tipo || 'ingrediente',
        }
      : { ...VALORES_INICIALES, nombre: nombreInicial || '' }
  );
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    const precio = Number(form.precio);
    const cantidad = Number(form.cantidad);

    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (Number.isNaN(precio) || precio < 0) return setError('El precio debe ser un numero mayor o igual a 0.');
    if (Number.isNaN(cantidad) || cantidad <= 0) return setError('La cantidad debe ser un numero mayor a 0.');

    const payload = { nombre: form.nombre.trim(), precio, medida: form.medida, cantidad, tipo: form.tipo };

    setGuardando(true);
    try {
      const guardado = esEdicion
        ? await ingredientesApi.actualizar(ingrediente.id, payload)
        : await ingredientesApi.crear(payload);
      onGuardado(guardado);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el ingrediente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={esEdicion ? 'Editar ingrediente' : 'Nuevo ingrediente'} onClose={onClose}>
      <form onSubmit={manejarSubmit} className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { valor: 'ingrediente', label: '🧂 Ingrediente' },
              { valor: 'envase', label: '📦 Envase / Empaque' },
            ].map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => actualizarCampo('tipo', opcion.valor)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.tipo === opcion.valor
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</span>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => actualizarCampo('nombre', e.target.value)}
            placeholder="Ej: Harina, Caja de pastel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Precio</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={form.precio}
              onChange={(e) => actualizarCampo('precio', e.target.value)}
              placeholder="5000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Medida</span>
            <select
              value={form.medida}
              onChange={(e) => actualizarCampo('medida', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {MEDIDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">
            Cantidad por ese precio
            <span className="ml-1 font-normal text-gray-400">(ej: 5 si compraste "5kg" por ese precio)</span>
          </span>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.cantidad}
            onChange={(e) => actualizarCampo('cantidad', e.target.value)}
            placeholder="1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
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
