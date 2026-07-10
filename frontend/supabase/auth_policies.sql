-- ============================================================
-- Restringe RLS a usuarios autenticados (segunda pasada de seguridad).
-- Reemplaza las politicas "permitir todo" de schema.sql, que dejaban
-- la base abierta a cualquiera con la anon key (necesario mientras
-- no existia login). Ejecutar en: Supabase Dashboard > SQL Editor.
-- ============================================================

drop policy if exists "permitir todo" on ingredientes;
drop policy if exists "permitir todo" on historial_precios;
drop policy if exists "permitir todo" on recetas;
drop policy if exists "permitir todo" on receta_ingredientes;
drop policy if exists "permitir todo" on configuracion_categoria;

create policy "solo usuarios logeados" on ingredientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "solo usuarios logeados" on historial_precios
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "solo usuarios logeados" on recetas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "solo usuarios logeados" on receta_ingredientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "solo usuarios logeados" on configuracion_categoria
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
