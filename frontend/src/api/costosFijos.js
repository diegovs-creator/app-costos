import { supabase } from '../lib/supabaseClient';
import { lanzarError } from './errores';

export const costosFijosApi = {
  async listar() {
    const { data, error } = await supabase.from('costos_fijos').select('*').order('nombre');
    if (error) lanzarError(error.message);
    return data;
  },

  async crear({ nombre, monto_mensual }) {
    if (!nombre || !nombre.trim()) lanzarError('El nombre es obligatorio');
    if (monto_mensual == null || monto_mensual < 0) lanzarError('El monto debe ser mayor o igual a 0');

    const { data, error } = await supabase
      .from('costos_fijos')
      .insert({ nombre: nombre.trim(), monto_mensual })
      .select()
      .single();
    if (error) lanzarError(error.message);
    return data;
  },

  async actualizar(id, { nombre, monto_mensual, activo }) {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre.trim();
    if (monto_mensual !== undefined) cambios.monto_mensual = monto_mensual;
    if (activo !== undefined) cambios.activo = activo;

    const { data, error } = await supabase
      .from('costos_fijos')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) lanzarError(error.message);
    return data;
  },

  async eliminar(id) {
    const { error } = await supabase.from('costos_fijos').delete().eq('id', id);
    if (error) lanzarError(error.message);
  },
};
