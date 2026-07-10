function celdaCsv(valor) {
  const texto = valor == null ? '' : String(valor);
  if (/[",\n;]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/**
 * Descarga un CSV en el navegador.
 * columnas: [{ header: 'Nombre', accessor: (fila) => fila.nombre }]
 */
export function exportarCsv(nombreArchivo, columnas, filas) {
  const encabezado = columnas.map((c) => celdaCsv(c.header)).join(',');
  const lineas = filas.map((fila) => columnas.map((c) => celdaCsv(c.accessor(fila))).join(','));
  const contenido = [encabezado, ...lineas].join('\n');

  const BOM = '﻿'; // para que Excel detecte UTF-8 y muestre tildes/eñes bien
  const blob = new Blob([BOM + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
