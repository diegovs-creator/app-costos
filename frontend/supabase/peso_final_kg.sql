-- ============================================================
-- Guarda el peso final (despues de la merma) de las recetas "por kilo",
-- para poder calcular costo/precio por unidad en reportes sin tener que
-- recalcular todo desde los ingredientes cada vez.
-- Ejecutar en: Supabase Dashboard > SQL Editor (una sola vez).
-- ============================================================

alter table recetas add column if not exists peso_final_kg numeric;

-- Reemplaza crear_receta_empleado para que tambien calcule y guarde
-- peso_final_kg (ya calculaba v_peso_crudo internamente, pero nunca
-- lo guardaba en ningun lado).
create or replace function crear_receta_empleado(
  p_nombre text,
  p_categoria text,
  p_lotes integer,
  p_ingredientes jsonb,
  p_unidad_venta text default 'unidades',
  p_merma_pct numeric default null,
  p_tiempo_horneado_min numeric default null
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
  v_factor_peso numeric;
  v_costo_item numeric;
  v_peso_crudo numeric := 0;
  v_peso_final numeric;
begin
  if mi_rol() is null then
    raise exception 'No autorizado';
  end if;
  if p_nombre is null or p_categoria is null or p_ingredientes is null or jsonb_array_length(p_ingredientes) = 0 then
    raise exception 'Faltan campos requeridos';
  end if;
  if p_unidad_venta not in ('unidades', 'kilo') then
    raise exception 'unidad_venta invalida';
  end if;
  if p_unidad_venta = 'kilo' and (p_merma_pct is null or p_merma_pct < 0 or p_merma_pct >= 100) then
    raise exception 'Porcentaje de merma invalido';
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

    if p_unidad_venta = 'kilo' and v_ing.tipo <> 'envase' then
      v_factor_peso := case item->>'medida'
        when 'kg' then 1
        when 'g' then 0.001
        when 'l' then 1
        when 'ml' then 0.001
        else null
      end;
      if v_factor_peso is not null then
        v_peso_crudo := v_peso_crudo + (item->>'cantidad_usada')::numeric * v_factor_peso;
      end if;
    end if;
  end loop;

  v_peso_final := case when p_unidad_venta = 'kilo' then v_peso_crudo * (1 - p_merma_pct / 100) else null end;

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
    margen_base, precio_markup, precio_margen, ganancia_estimada,
    unidad_venta, merma_pct, peso_final_kg
  ) values (
    trim(p_nombre), p_categoria, coalesce(p_lotes, 1), v_costo_ingredientes, v_costo_envase, v_costo_total,
    v_margen_base, v_precio_markup, v_precio_margen, v_ganancia,
    p_unidad_venta, p_merma_pct, v_peso_final
  ) returning id into v_receta_id;

  insert into receta_ingredientes (receta_id, ingrediente_id, cantidad_usada, medida)
  select v_receta_id, (i->>'ingrediente_id')::bigint, (i->>'cantidad_usada')::numeric, i->>'medida'
  from jsonb_array_elements(p_ingredientes) as i;

  return v_receta_id;
end;
$$;
