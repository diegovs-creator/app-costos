import { useEffect, useState } from 'react';
import Modal from '../layout/Modal';
import { ingredientesApi } from '../../api/client';
import { formatoMoneda, formatoFecha } from '../../utils/formato';

export default function HistorialPreciosModal({ ingredienteId, nombre, onClose }) {
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    ingredientesApi
      .obtener(ingredienteId)
      .then((data) => setHistorial(data.historial_precios))
      .catch(() => setError('No se pudo cargar el historial.'));
  }, [ingredienteId]);

  return (
    <Modal titulo={`Historial de precios: ${nombre}`} onClose={onClose}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !historial && <p className="text-sm text-gray-500">Cargando...</p>}
      {historial && historial.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay cambios de precio registrados.</p>
      )}
      {historial && historial.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {historial.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">{formatoFecha(h.fecha)}</span>
              <span className="font-medium text-gray-900">{formatoMoneda.format(h.precio)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
