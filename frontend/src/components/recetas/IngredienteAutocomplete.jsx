import { useEffect, useRef, useState } from 'react';
import { ingredientesApi } from '../../api/client';

export default function IngredienteAutocomplete({ texto, onChangeTexto, onSeleccionar, onCrearNuevo }) {
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
      ingredientesApi
        .listar({ buscar: texto.trim() })
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
    // Delay para que un click en una sugerencia registre antes de cerrar el dropdown.
    cerrarTimeout.current = setTimeout(() => setAbierto(false), 150);
  }

  const hayCoincidenciaExacta = sugerencias.some(
    (s) => s.nombre.toLowerCase() === texto.trim().toLowerCase()
  );

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
          {!buscando && !hayCoincidenciaExacta && (
            <button
              type="button"
              onMouseDown={() => onCrearNuevo(texto.trim())}
              className="flex w-full items-center gap-1.5 border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              <span aria-hidden="true">+</span> Crear ingrediente "{texto.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
