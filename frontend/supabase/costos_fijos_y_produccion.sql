-- ============================================================
-- Costos fijos mensuales + registro diario de produccion y perdidas.
-- Reemplaza el intento anterior de "energia por receta" (esa parte
-- se deja de usar desde el frontend; las columnas viejas quedan sin
-- uso en la base, no hace falta borrarlas).
-- Ejecutar en: Supabase Dashboard > SQL Editor (una sola vez).
-- ============================================================

-- 1) Costos fijos: lista libre (nombre + monto mensual). Solo el propietario
--    la ve, igual que los precios de ingredientes.
create table if not exists costos_fijos (
  id bigint generated always as identity primary key,
  nombre text not null,
  monto_mensual numeric not null check (monto_mensual >= 0),
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now()
);

alter table costos_fijos enable row level security;

create policy "propietario acceso total" on costos_fijos
  for all using (mi_rol() = 'propietario') with check (mi_rol() = 'propietario');

-- 2) Produccion diaria: que se hizo cada dia (y que se perdio). Sin ningun
--    dato de plata, asi que la pueden usar los dos roles por igual.
create table if not exists produccion_diaria (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  receta_id bigint not null references recetas(id) on delete restrict,
  cantidad_producida numeric not null check (cantidad_producida >= 0),
  cantidad_perdida numeric not null default 0 check (cantidad_perdida >= 0),
  motivo_perdida text check (motivo_perdida in ('accidente', 'no_vendido')),
  fecha_creacion timestamptz not null default now()
);

alter table produccion_diaria enable row level security;

create policy "cualquier usuario logeado" on produccion_diaria
  for all using (mi_rol() is not null) with check (mi_rol() is not null);

create index if not exists idx_produccion_diaria_fecha on produccion_diaria(fecha);
create index if not exists idx_produccion_diaria_receta on produccion_diaria(receta_id);

-- 3) Vista con el nombre de la receta ya incluido, para que el empleado
--    tambien pueda leerla (recetas real esta bloqueada para el, y
--    produccion_diaria por si sola no tiene el nombre, solo el id).
--    security_invoker = false: corre con permisos de quien la creo, por
--    eso puede leer "recetas" (bloqueada) y devolver solo nombre/categoria,
--    sin ningun costo ni precio.
create or replace view produccion_diaria_detalle
with (security_invoker = false)
as
  select
    pd.id, pd.fecha, pd.receta_id, pd.cantidad_producida, pd.cantidad_perdida,
    pd.motivo_perdida, pd.fecha_creacion,
    r.nombre as receta_nombre, r.categoria as receta_categoria
  from produccion_diaria pd
  join recetas r on r.id = pd.receta_id;

grant select on produccion_diaria_detalle to authenticated;
