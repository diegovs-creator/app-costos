import { useEffect, useRef, useState } from 'react';
import { empleadoApi } from '../../api/empleado';

// Igual que components/recetas/IngredienteAutocomplete, pero consulta la vista
// sin precios y no ofrece la opcion de "crear ingrediente nuevo" (el empleado
// no puede crear ingredientes).
export default function IngredienteAutocompletePublico({ texto, onChangeTexto, onSeleccionar }) {
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const cerrarTimeout = useRef(null);

  useEffect(() => {
    if (!texto.trim()) {
      setSugerencias([]);
      return;
    }
    setBuscando(true);
    const timeoutId = setTimeout(() => {
      empleadoApi
        .listarIngredientes(texto.trim())
        .then(setSugerencias)
        .finally(() => setBuscando(false));
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [texto]);

  function manejarFoco() {
    clearTimeout(cerrarTimeout.current);
    setAbierto(true);
  }

  function manejarBlur() {
    cerrarTimeout.current = setTimeout(() => setAbierto(false), 150);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={texto}
        onChange={(e) => onChangeTexto(e.target.value)}
        onFocus={manejarFoco}
        onBlur={manejarBlur}
        placeholder="Buscar ingrediente..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {abierto && texto.trim() && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {buscando && <p className="px-3 py-2 text-sm text-gray-400">Buscando...</p>}
          {!buscando && sugerencias.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">Sin resultados. Pedile a la dueña que lo cargue.</p>
          )}
          {!buscando &&
            sugerencias.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => onSeleccionar(s)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="text-gray-900">{s.nombre}</span>
                <span className="text-xs text-gray-400">
                  {s.tipo === 'envase' ? '📦' : '🧂'} {s.medida}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
