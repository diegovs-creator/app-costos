// Registro diario de produccion y perdidas. Sin ningun dato de costo/precio,
// asi que la usan por igual el propietario y el empleado (RLS solo exige
// estar logeado, sin importar el rol).
import { supabase } from '../lib/supabaseClient';
import { lanzarError } from './errores';

export const produccionApi = {
  async listar(fecha) {
    let query = supabase.from('produccion_diaria_detalle').select('*').order('receta_nombre');
    if (fecha) query = query.eq('fecha', fecha);
    const { data, error } = await query;
    if (error) lanzarError(error.message);
    return data;
  },

  async crear({ fecha, receta_id, cantidad_producida, cantidad_perdida, motivo_perdida }) {
    if (!receta_id) lanzarError('Elegí una receta.');
    if (cantidad_producida == null || cantidad_producida < 0) {
      lanzarError('La cantidad producida debe ser mayor o igual a 0.');
    }
    const perdida = cantidad_perdida || 0;
    if (perdida < 0) lanzarError('La cantidad perdida no puede ser negativa.');
    if (perdida > 0 && !motivo_perdida) lanzarError('Elegí el motivo de la pérdida.');

    const { data, error } = await supabase
      .from('produccion_diaria')
      .insert({
        fecha: fecha || new Date().toISOString().slice(0, 10),
        receta_id,
        cantidad_producida,
        cantidad_perdida: perdida,
        motivo_perdida: perdida > 0 ? motivo_perdida : null,
      })
      .select()
      .single();
    if (error) lanzarError(error.message);
    return data;
  },

  async eliminar(id) {
    const { error } = await supabase.from('produccion_diaria').delete().eq('id', id);
    if (error) lanzarError(error.message);
  },
};
