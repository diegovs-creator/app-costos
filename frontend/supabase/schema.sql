-- ============================================================
-- Esquema Postgres para Supabase: app-costos
-- Migrado desde el schema.sql de SQLite del backend (ya eliminado).
-- Pegar y ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Ingredientes (incluye envases, distinguidos por "tipo")
create table if not exists ingredientes (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  precio numeric not null check (precio >= 0),
  medida text not null, -- kg, g, ml, l, unidades
  cantidad numeric not null check (cantidad > 0), -- ej: 5 para "5kg"
  tipo text not null default 'ingrediente' check (tipo in ('ingrediente', 'envase')),
  fecha_creacion timestamptz not null default now()
);

-- Historial de precios de cada ingrediente
create table if not exists historial_precios (
  id bigint generated always as identity primary key,
  ingrediente_id bigint not null references ingredientes(id) on delete cascade,
  precio numeric not null,
  fecha timestamptz not null default now()
);

-- Recetas / productos
create table if not exists recetas (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text not null check (categoria in ('Pasteleria', 'Panaderia', 'Comida Rapida')),
  lotes integer not null default 1 check (lotes > 0),
  costo_ingredientes numeric not null default 0,
  costo_envase numeric not null default 0,
  costo_total numeric not null default 0, -- costo_ingredientes + costo_envase
  margen_base numeric not null default 50, -- porcentaje
  margen_individual numeric, -- porcentaje opcional, sobreescribe margen_base
  precio_markup numeric not null default 0,
  precio_margen numeric not null default 0,
  precio_final numeric, -- precio elegido/custom por el usuario
  ganancia_estimada numeric not null default 0,
  fecha_creacion timestamptz not null default now(),
  fecha_modificacion timestamptz not null default now()
);

-- Detalle de ingredientes usados en cada receta
create table if not exists receta_ingredientes (
  id bigint generated always as identity primary key,
  receta_id bigint not null references recetas(id) on delete cascade,
  ingrediente_id bigint not null references ingredientes(id) on delete restrict,
  cantidad_usada numeric not null check (cantidad_usada > 0),
  medida text not null -- unidad en la que se especifico la cantidad usada
);

-- Margen base configurable por categoria
create table if not exists configuracion_categoria (
  categoria text primary key check (categoria in ('Pasteleria', 'Panaderia', 'Comida Rapida')),
  margen_base numeric not null default 50
);

insert into configuracion_categoria (categoria, margen_base) values
  ('Pasteleria', 50),
  ('Panaderia', 50),
  ('Comida Rapida', 50)
on conflict (categoria) do nothing;

-- Indices
create index if not exists idx_receta_ingredientes_receta on receta_ingredientes(receta_id);
create index if not exists idx_receta_ingredientes_ingrediente on receta_ingredientes(ingrediente_id);
create index if not exists idx_historial_ingrediente on historial_precios(ingrediente_id);

-- fecha_modificacion se actualiza sola en cada UPDATE de recetas
-- (antes esto lo hacia el backend a mano en cada query; aca lo resuelve un trigger)
create or replace function set_fecha_modificacion()
returns trigger as $$
begin
  new.fecha_modificacion = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_recetas_fecha_modificacion
before update on recetas
for each row execute function set_fecha_modificacion();

-- ============================================================
-- Row Level Security
-- ============================================================
-- Esta app no tiene login (es de un solo usuario). El frontend habla
-- directo con Supabase usando la anon key, que queda visible en el
-- navegador (cualquiera puede verla si inspecciona el sitio). Sin RLS,
-- Supabase muestra las tablas como "Unrestricted" y cualquiera con la
-- URL podria leer/escribir. Activamos RLS con politicas abiertas para
-- que el nivel de exposicion sea el mismo que ya tenias (nunca hubo
-- login), pero dejando el interruptor listo para restringir despues
-- si en algun momento sumamos autenticacion.

alter table ingredientes enable row level security;
alter table historial_precios enable row level security;
alter table recetas enable row level security;
alter table receta_ingredientes enable row level security;
alter table configuracion_categoria enable row level security;

create policy "permitir todo" on ingredientes for all using (true) with check (true);
create policy "permitir todo" on historial_precios for all using (true) with check (true);
create policy "permitir todo" on recetas for all using (true) with check (true);
create policy "permitir todo" on receta_ingredientes for all using (true) with check (true);
create policy "permitir todo" on configuracion_categoria for all using (true) with check (true);
