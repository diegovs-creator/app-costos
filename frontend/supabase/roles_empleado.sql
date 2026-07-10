-- ============================================================
-- Rol "empleado": usuario de tienda que puede cargar recetas
-- pero nunca ve precios de ingredientes ni costos/margenes.
-- Ejecutar en: Supabase Dashboard > SQL Editor (una sola vez).
-- ============================================================

-- 1) Tabla de roles: quien es "propietario" (acceso total) y quien
--    es "empleado" (solo carga recetas, sin ver plata).
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('propietario', 'empleado')),
  nombre text
);

alter table perfiles enable row level security;

create policy "cada quien ve su propio perfil" on perfiles
  for select using (auth.uid() = id);

-- 2) Funcion helper para leer el rol del usuario actual. Va con
--    security definer para evitar problemas de RLS recursivo cuando
--    se usa dentro de las politicas de otras tablas.
create or replace function mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid();
$$;

-- 3) Cerrar las tablas reales (con precios/costos) a solo propietario.
--    Reemplaza las politicas "solo usuarios logeados" de auth_policies.sql.
drop policy if exists "solo usuarios logeados" on ingredientes;
drop policy if exists "solo usuarios logeados" on historial_precios;
drop policy if exists "solo usuarios logeados" on recetas;
drop policy if exists "solo usuarios logeados" on receta_ingredientes;
drop policy if exists "solo usuarios logeados" on configuracion_categoria;

create policy "propietario acceso total" on ingredientes
  for all using (mi_rol() = 'propietario') with check (mi_rol() = 'propietario');

create policy "propietario acceso total" on historial_precios
  for all using (mi_rol() = 'propietario') with check (mi_rol() = 'propietario');

create policy "propietario acceso total" on recetas
  for all using (mi_rol() = 'propietario') with check (mi_rol() = 'propietario');

create policy "propietario acceso total" on receta_ingredientes
  for all using (mi_rol() = 'propietario') with check (mi_rol() = 'propietario');

create policy "propietario acceso total" on configuracion_categoria
  for all using (mi_rol() = 'propietario') with check (mi_rol() = 'propietario');

-- 4) Vistas "publicas" sin ninguna columna de precio/costo. El empleado
--    consulta estas vistas, nunca las tablas reales. Se crean con
--    security_invoker = false a proposito: corren con los permisos de
--    quien las creo (este SQL Editor), no con los del empleado, por eso
--    pueden leer la tabla real (que para el empleado esta bloqueada) y
--    devolver solo las columnas sin plata.
create or replace view ingredientes_publico
with (security_invoker = false)
as
  select id, nombre, medida, tipo
  from ingredientes;

create or replace view recetas_publico
with (security_invoker = false)
as
  select id, nombre, categoria, lotes, fecha_creacion
  from recetas;

create or replace view receta_ingredientes_publico
with (security_invoker = false)
as
  select ri.id, ri.receta_id, ri.ingrediente_id, ri.cantidad_usada, ri.medida,
         i.nombre as nombre_ingrediente, i.medida as medida_ingrediente
  from receta_ingredientes ri
  join ingredientes i on i.id = ri.ingrediente_id;

grant select on ingredientes_publico to authenticated;
grant select on recetas_publico to authenticated;
grant select on receta_ingredientes_publico to authenticated;

-- 5) Funcion para que el empleado cree una receta: calcula el costo
--    ADENTRO del servidor (con security definer, puede leer precios)
--    y nunca le devuelve esos numeros a quien la llama.
create or replace function crear_receta_empleado(
  p_nombre text,
  p_categoria text,
  p_lotes integer,
  p_ingredientes jsonb -- [{"ingrediente_id": 1, "cantidad_usada": 500, "medida": "g"}, ...]
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receta_id bigint;
  v_costo_ingredientes numeric := 0;
  v_costo_envase numeric := 0;
  v_costo_total numeric;
  v_margen_base numeric;
  v_precio_markup numeric;
  v_precio_margen numeric;
  v_ganancia numeric;
  item jsonb;
  v_ing record;
  v_factor numeric;
  v_costo_item numeric;
begin
  if mi_rol() is null then
    raise exception 'No autorizado';
  end if;
  if p_nombre is null or p_categoria is null or p_ingredientes is null or jsonb_array_length(p_ingredientes) = 0 then
    raise exception 'Faltan campos requeridos';
  end if;

  for item in select * from jsonb_array_elements(p_ingredientes)
  loop
    select * into v_ing from ingredientes where id = (item->>'ingrediente_id')::bigint;
    if not found then
      raise exception 'Ingrediente % no existe', item->>'ingrediente_id';
    end if;

    v_factor := case
      when v_ing.medida = (item->>'medida') then 1
      when v_ing.medida = 'kg' and item->>'medida' = 'g' then 0.001
      when v_ing.medida = 'g' and item->>'medida' = 'kg' then 1000
      when v_ing.medida = 'l' and item->>'medida' = 'ml' then 0.001
      when v_ing.medida = 'ml' and item->>'medida' = 'l' then 1000
      else null
    end;

    if v_factor is null then
      raise exception 'Unidad incompatible para "%"', v_ing.nombre;
    end if;

    v_costo_item := (v_ing.precio / v_ing.cantidad) * ((item->>'cantidad_usada')::numeric * v_factor);

    if v_ing.tipo = 'envase' then
      v_costo_envase := v_costo_envase + v_costo_item;
    else
      v_costo_ingredientes := v_costo_ingredientes + v_costo_item;
    end if;
  end loop;

  v_costo_ingredientes := round(v_costo_ingredientes, 2);
  v_costo_envase := round(v_costo_envase, 2);
  v_costo_total := v_costo_ingredientes + v_costo_envase;

  select margen_base into v_margen_base from configuracion_categoria where categoria = p_categoria;
  v_margen_base := coalesce(v_margen_base, 50);

  v_precio_markup := round(v_costo_total * (1 + v_margen_base / 100), 2);
  v_precio_margen := case when v_margen_base >= 100 then null else round(v_costo_total / (1 - v_margen_base / 100), 2) end;
  v_ganancia := round(coalesce(v_precio_margen, v_precio_markup) - v_costo_total, 2);

  insert into recetas (
    nombre, categoria, lotes, costo_ingredientes, costo_envase, costo_total,
    margen_base, precio_markup, precio_margen, ganancia_estimada
  ) values (
    trim(p_nombre), p_categoria, coalesce(p_lotes, 1), v_costo_ingredientes, v_costo_envase, v_costo_total,
    v_margen_base, v_precio_markup, v_precio_margen, v_ganancia
  ) returning id into v_receta_id;

  insert into receta_ingredientes (receta_id, ingrediente_id, cantidad_usada, medida)
  select v_receta_id, (i->>'ingrediente_id')::bigint, (i->>'cantidad_usada')::numeric, i->>'medida'
  from jsonb_array_elements(p_ingredientes) as i;

  return v_receta_id;
end;
$$;

grant execute on function crear_receta_empleado(text, text, integer, jsonb) to authenticated;

-- ============================================================
-- Despues de correr todo esto, completar con los emails reales:
-- ============================================================
-- insert into perfiles (id, rol)
--   select id, 'propietario' from auth.users where email = 'TU_EMAIL_AQUI';
--
-- insert into perfiles (id, rol)
--   select id, 'empleado' from auth.users where email = 'EMAIL_DE_LA_TIENDA_AQUI';
