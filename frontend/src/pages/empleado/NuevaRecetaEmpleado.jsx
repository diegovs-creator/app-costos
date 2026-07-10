import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { empleadoApi } from '../../api/empleado';
import { CATEGORIAS } from '../../utils/formato';
import { parsearCantidad } from '../../utils/calculosReceta';
import IngredienteAutocompletePublico from '../../components/empleado/IngredienteAutocompletePublico';

let contadorFilas = 0;
function filaVacia() {
  contadorFilas += 1;
  return { id: contadorFilas, ingrediente: null, ingredienteTexto: '', cantidadTexto: '' };
}

export default function NuevaRecetaEmpleado() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Pasteleria');
  const [lotes, setLotes] = useState('1');
  const [filas, setFilas] = useState([filaVacia()]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function actualizarFila(filaId, patch) {
    setFilas((prev) => prev.map((f) => (f.id === filaId ? { ...f, ...patch } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(filaId) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== filaId) : prev));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) return setError('Poné el nombre del producto.');

    const filasCompletas = filas.filter((f) => f.ingrediente && f.cantidadTexto.trim());
    if (filasCompletas.length === 0) return setError('Agregá al menos un ingrediente.');

    const ingredientesPayload = [];
    for (const fila of filasCompletas) {
      const { cantidad, medida } = parsearCantidad(fila.cantidadTexto, fila.ingrediente.medida);
      if (cantidad == null || cantidad <= 0 || !medida) {
        return setError(`Revisá la cantidad de "${fila.ingrediente.nombre}". Ej: 500g`);
      }
      ingredientesPayload.push({ ingrediente_id: fila.ingrediente.id, cantidad_usada: cantidad, medida });
    }

    setGuardando(true);
    try {
      await empleadoApi.crearReceta({
        nombre: nombre.trim(),
        categoria,
        lotes: Number(lotes) || 1,
        ingredientes: ingredientesPayload,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la receta.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver a Recetas
      </Link>
      <h1 className="text-xl font-semibold text-gray-900">Nueva receta</h1>

      <form onSubmit={manejarSubmit} className="space-y-5">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Nombre del producto</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Torta de chocolate"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Categoría</span>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Rinde (lotes)</span>
              <input
                type="number"
                min="1"
                value={lotes}
                onChange={(e) => setLotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Ingredientes</h2>
          <div className="mt-4 space-y-3">
            {filas.map((fila) => (
              <div key={fila.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <IngredienteAutocompletePublico
                    texto={fila.ingredienteTexto}
                    onChangeTexto={(t) => actualizarFila(fila.id, { ingredienteTexto: t, ingrediente: null })}
                    onSeleccionar={(ing) => actualizarFila(fila.id, { ingrediente: ing, ingredienteTexto: ing.nombre })}
                  />
                </div>
                <div className="sm:w-40">
                  <input
                    type="text"
                    value={fila.cantidadTexto}
                    onChange={(e) => actualizarFila(fila.id, { cantidadTexto: e.target.value })}
                    placeholder="Ej: 500g"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => quitarFila(fila.id)}
                  disabled={filas.length === 1}
                  className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Quitar ingrediente"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarFila}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-brand-400 hover:text-brand-700"
          >
            <span aria-hidden="true">+</span> Agregar ingrediente
          </button>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar receta'}
          </button>
        </div>
      </form>
    </div>
  );
}
