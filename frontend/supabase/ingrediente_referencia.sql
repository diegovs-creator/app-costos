-- ============================================================
-- Ingrediente de referencia por receta: para poder cargar produccion
-- diciendo "cuantos kilos de harina use" en vez de una cantidad suelta.
-- Ejecutar en: Supabase Dashboard > SQL Editor (una sola vez).
-- ============================================================

alter table recetas add column if not exists ingrediente_referencia_id bigint
  references ingredientes(id) on delete set null;

-- Se extiende recetas_publico para que el empleado tambien pueda usar el
-- modo "cargar por ingrediente de referencia" en Produccion, sin exponer
-- ningun costo/precio: solo nombre, cantidad base y unidad del ingrediente
-- de referencia (si la receta tiene uno configurado).
create or replace view recetas_publico
with (security_invoker = false)
as
  select
    r.id, r.nombre, r.categoria, r.lotes, r.fecha_creacion,
    r.unidad_venta, r.peso_final_kg, r.ingrediente_referencia_id,
    ri.cantidad_usada as referencia_cantidad_base,
    ri.medida as referencia_medida,
    i.nombre as referencia_nombre
  from recetas r
  left join receta_ingredientes ri
    on ri.receta_id = r.id and ri.ingrediente_id = r.ingrediente_referencia_id
  left join ingredientes i on i.id = r.ingrediente_referencia_id;
