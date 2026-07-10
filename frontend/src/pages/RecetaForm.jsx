import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { recetasApi, configuracionApi } from '../api/client';
import { formatoMoneda, CATEGORIAS } from '../utils/formato';
import {
  costoIngredienteUsado,
  parsearCantidad,
  calcularPesoTotalKg,
  calcularPrecioMarkup,
  calcularPrecioMargen,
} from '../utils/calculosReceta';
import IngredienteAutocomplete from '../components/recetas/IngredienteAutocomplete';
import IngredienteFormModal from '../components/ingredientes/IngredienteFormModal';
import ComparadorPrecios, { precioSegunEleccion } from '../components/recetas/ComparadorPrecios';

let contadorFilas = 0;
function filaVacia() {
  contadorFilas += 1;
  return { id: contadorFilas, ingrediente: null, ingredienteTexto: '', cantidadTexto: '' };
}

function filaDesdeIngredienteReceta(ri) {
  contadorFilas += 1;
  return {
    id: contadorFilas,
    ingrediente: {
      id: ri.ingrediente_id,
      nombre: ri.nombre,
      precio: ri.precio_ingrediente,
      medida: ri.medida_ingrediente,
      cantidad: ri.cantidad_ingrediente,
      tipo: ri.tipo_ingrediente,
    },
    ingredienteTexto: ri.nombre,
    cantidadTexto: `${ri.cantidad_usada}${ri.medida}`,
  };
}

export default function RecetaForm() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Pasteleria');
  const [unidadVenta, setUnidadVenta] = useState('unidades');
  const [lotes, setLotes] = useState('1');
  const [mermaPct, setMermaPct] = useState('10');
  const [filas, setFilas] = useState([filaVacia()]);
  const [margenPct, setMargenPct] = useState('50');
  const [margenesPorCategoria, setMargenesPorCategoria] = useState({});
  const [precioElegido, setPrecioElegido] = useState('margen');
  const [precioCustomTexto, setPrecioCustomTexto] = useState('');
  const [modalCrear, setModalCrear] = useState(null); // { filaId, nombreSugerido }
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    configuracionApi.obtenerMargenes().then((rows) => {
      const mapa = {};
      rows.forEach((r) => (mapa[r.categoria] = r.margen_base));
      setMargenesPorCategoria(mapa);
      if (!esEdicion && mapa['Pasteleria'] != null) setMargenPct(String(mapa['Pasteleria']));
    });
  }, [esEdicion]);

  useEffect(() => {
    if (!esEdicion) return;
    recetasApi
      .obtener(id)
      .then((receta) => {
        setNombre(receta.nombre);
        setCategoria(receta.categoria);
        setUnidadVenta(receta.unidad_venta || 'unidades');
        setLotes(String(receta.lotes));
        if (receta.merma_pct != null) setMermaPct(String(receta.merma_pct));
        setMargenPct(String(receta.margen_individual ?? receta.margen_base));
        setFilas(
          receta.ingredientes.length > 0 ? receta.ingredientes.map(filaDesdeIngredienteReceta) : [filaVacia()]
        );
        if (receta.precio_final != null) {
          setPrecioElegido('custom');
          setPrecioCustomTexto(String(receta.precio_final));
        }
      })
      .catch(() => setError('No se pudo cargar la receta.'))
      .finally(() => setCargando(false));
  }, [esEdicion, id]);

  function cambiarCategoria(nuevaCategoria) {
    setCategoria(nuevaCategoria);
    if (!esEdicion && margenesPorCategoria[nuevaCategoria] != null) {
      setMargenPct(String(margenesPorCategoria[nuevaCategoria]));
    }
  }

  function actualizarFila(filaId, patch) {
    setFilas((prev) => prev.map((f) => (f.id === filaId ? { ...f, ...patch } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(filaId) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== filaId) : prev));
  }

  // Calcula el costo en vivo de cada fila para mostrar preview (el backend recalcula el definitivo al guardar)
  const filasConCosto = useMemo(() => {
    return filas.map((fila) => {
      if (!fila.ingrediente || !fila.cantidadTexto.trim()) {
        return { ...fila, costo: null, errorFila: null };
      }
      const { cantidad, medida } = parsearCantidad(fila.cantidadTexto, fila.ingrediente.medida);
      if (cantidad == null || cantidad <= 0 || !medida) {
        return { ...fila, costo: null, errorFila: 'Cantidad invalida. Ej: 500g' };
      }
      const costo = costoIngredienteUsado(fila.ingrediente, cantidad, medida);
      if (costo == null) {
        return {
          ...fila,
          costo: null,
          errorFila: `Unidad "${medida}" incompatible con "${fila.ingrediente.medida}"`,
        };
      }
      return { ...fila, costo, cantidadParseada: { cantidad, medida }, errorFila: null };
    });
  }, [filas]);

  const costoIngredientes = filasConCosto
    .filter((f) => f.ingrediente && f.ingrediente.tipo !== 'envase' && f.costo != null)
    .reduce((acc, f) => acc + f.costo, 0);
  const costoEnvase = filasConCosto
    .filter((f) => f.ingrediente && f.ingrediente.tipo === 'envase' && f.costo != null)
    .reduce((acc, f) => acc + f.costo, 0);
  const costoTotal = costoIngredientes + costoEnvase;

  const pesoCrudoKg = useMemo(() => calcularPesoTotalKg(filasConCosto), [filasConCosto]);
  const mermaNum = Number(mermaPct) || 0;
  const pesoFinalKg = unidadVenta === 'kilo' ? pesoCrudoKg * (1 - mermaNum / 100) : null;

  // Precio total de la receta completa (mismos numeros que ComparadorPrecios calcula
  // internamente) para poder mostrar tambien el precio por unidad/kilo.
  const margenNum = Number(margenPct) || 0;
  const precioMarkupTotal = calcularPrecioMarkup(costoTotal, margenNum);
  const precioMargenTotal = calcularPrecioMargen(costoTotal, margenNum);
  const divisorUnitario = unidadVenta === 'kilo' ? pesoFinalKg : Number(lotes) || 1;

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) return setError('El nombre del producto es obligatorio.');

    const filasValidas = filasConCosto.filter((f) => f.ingrediente && f.cantidadTexto.trim());
    if (filasValidas.length === 0) return setError('Agrega al menos un ingrediente.');
    const filaConError = filasValidas.find((f) => f.errorFila);
    if (filaConError) return setError(`Revisa "${filaConError.ingrediente.nombre}": ${filaConError.errorFila}`);

    const precio_final = precioSegunEleccion({ precioElegido, costoTotal, margenPct, precioCustomTexto });
    if (precioElegido === 'custom' && (precio_final == null || precio_final < 0)) {
      return setError('Ingresa un precio personalizado valido.');
    }
    if (unidadVenta === 'kilo' && (mermaNum < 0 || mermaNum >= 100 || mermaPct.trim() === '')) {
      return setError('Ingresa un porcentaje de merma valido (entre 0 y 100).');
    }

    const payload = {
      nombre: nombre.trim(),
      categoria,
      unidad_venta: unidadVenta,
      lotes: Number(lotes) || 1,
      merma_pct: unidadVenta === 'kilo' ? mermaNum : null,
      margen_base: Number(margenPct) || 0,
      precio_final,
      ingredientes: filasValidas.map((f) => ({
        ingrediente_id: f.ingrediente.id,
        cantidad_usada: f.cantidadParseada.cantidad,
        medida: f.cantidadParseada.medida,
      })),
    };

    setGuardando(true);
    try {
      if (esEdicion) {
        await recetasApi.actualizar(id, payload);
      } else {
        await recetasApi.crear(payload);
      }
      navigate('/recetas');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la receta.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="text-gray-500">Cargando receta...</p>;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link to="/recetas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a Recetas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          {esEdicion ? 'Editar receta' : 'Nueva receta'}
        </h1>
      </div>

      <form onSubmit={manejarSubmit} className="space-y-6">
        {/* Datos generales */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Nombre del producto</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Torta de chocolate"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => cambiarCategoria(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Se vende</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnidadVenta('unidades')}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  unidadVenta === 'unidades'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                🔢 Por unidades
              </button>
              <button
                type="button"
                onClick={() => setUnidadVenta('kilo')}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  unidadVenta === 'kilo'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                ⚖️ Por kilo
              </button>
            </div>
          </div>

          {unidadVenta === 'unidades' ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Cantidad producida <span className="font-normal text-gray-400">(ej: 10 unidades)</span>
              </span>
              <input
                type="number"
                min="1"
                value={lotes}
                onChange={(e) => setLotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Merma por cocción (%) <span className="font-normal text-gray-400">(pérdida de peso en el horno)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={mermaPct}
                  onChange={(e) => setMermaPct(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <div className="flex flex-col justify-center rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                <span className="text-gray-500">
                  Peso de la receta: <span className="font-medium text-gray-900">{pesoCrudoKg.toFixed(3)} kg</span>
                </span>
                <span className="text-gray-500">
                  Peso vendible (con merma): <span className="font-medium text-gray-900">{pesoFinalKg?.toFixed(3) ?? '-'} kg</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Ingredientes */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Ingredientes y envases</h2>
          <div className="mt-4 space-y-3">
            {filasConCosto.map((fila) => (
              <div key={fila.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <IngredienteAutocomplete
                      texto={fila.ingredienteTexto}
                      onChangeTexto={(t) => actualizarFila(fila.id, { ingredienteTexto: t, ingrediente: null })}
                      onSeleccionar={(ing) =>
                        actualizarFila(fila.id, { ingrediente: ing, ingredienteTexto: ing.nombre })
                      }
                      onCrearNuevo={(texto) => setModalCrear({ filaId: fila.id, nombreSugerido: texto })}
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
                  <div className="flex items-center justify-between gap-2 sm:w-36 sm:justify-end">
                    <span className="text-sm font-medium text-gray-700">
                      {fila.costo != null ? formatoMoneda.format(fila.costo) : '-'}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarFila(fila.id)}
                      disabled={filas.length === 1}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Quitar ingrediente"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                {fila.errorFila && <p className="mt-1.5 text-xs text-red-600">{fila.errorFila}</p>}
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

        {/* Precios */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Precio de venta</h2>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>Costo ingredientes: {formatoMoneda.format(costoIngredientes)}</span>
            <span>Costo envase: {formatoMoneda.format(costoEnvase)}</span>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Total de la receta completa</p>
          <div className="mt-2">
            <ComparadorPrecios
              costoTotal={costoTotal}
              margenPct={margenPct}
              setMargenPct={setMargenPct}
              precioElegido={precioElegido}
              setPrecioElegido={setPrecioElegido}
              precioCustomTexto={precioCustomTexto}
              setPrecioCustomTexto={setPrecioCustomTexto}
            />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-400">
            Precio por {unidadVenta === 'kilo' ? 'kilo' : 'unidad'}
          </p>
          {divisorUnitario > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Costo</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatoMoneda.format(costoTotal / divisorUnitario)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Markup ({margenNum}%)</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatoMoneda.format(precioMarkupTotal / divisorUnitario)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Margen ({margenNum}%)</p>
                <p className="text-base font-semibold text-gray-900">
                  {precioMargenTotal != null ? formatoMoneda.format(precioMargenTotal / divisorUnitario) : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-400">
              {unidadVenta === 'kilo'
                ? 'Agregá ingredientes medidos en kg/g/l/ml para calcular el peso.'
                : 'Ingresá la cantidad producida arriba.'}
            </p>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link
            to="/recetas"
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

      {modalCrear && (
        <IngredienteFormModal
          nombreInicial={modalCrear.nombreSugerido}
          onClose={() => setModalCrear(null)}
          onGuardado={(ingredienteCreado) => {
            actualizarFila(modalCrear.filaId, {
              ingrediente: ingredienteCreado,
              ingredienteTexto: ingredienteCreado.nombre,
            });
            setModalCrear(null);
          }}
        />
      )}
    </div>
  );
}
