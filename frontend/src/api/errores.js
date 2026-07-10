// Los componentes existentes leen errores con la forma err.response.data.error
// (patron heredado de axios/Express). Esta funcion arma esa misma forma a partir
// de un mensaje, para no tener que tocar el manejo de errores en cada pagina.
export function lanzarError(mensaje) {
  const err = new Error(mensaje);
  err.response = { data: { error: mensaje } };
  throw err;
}
