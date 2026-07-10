// Barril: reexporta las cuatro APIs para que las paginas sigan importando
// desde '../api/client' sin cambios, aunque cada una ahora vive en su propio
// archivo (ingredientes.js, recetas.js, configuracion.js, reportes.js) y habla
// con Supabase en vez de con el backend Express (eliminado en la migracion).
export { ingredientesApi } from './ingredientes';
export { recetasApi } from './recetas';
export { configuracionApi } from './configuracion';
export { reportesApi } from './reportes';
