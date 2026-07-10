export const formatoMoneda = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function formatoFecha(fechaSql) {
  if (!fechaSql) return '-';
  const fecha = new Date(fechaSql.replace(' ', 'T') + 'Z');
  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const MEDIDAS = ['kg', 'g', 'l', 'ml', 'unidades'];

export const CATEGORIAS = [
  { valor: 'Pasteleria', label: 'Pastelería' },
  { valor: 'Panaderia', label: 'Panadería' },
  { valor: 'Comida Rapida', label: 'Comida Rápida' },
];
