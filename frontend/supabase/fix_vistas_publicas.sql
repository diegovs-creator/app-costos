-- ============================================================
-- FIX DE SEGURIDAD: las vistas "_publico" (pensadas solo para
-- usuarios logeados) tambien eran legibles sin ningun login, porque
-- Supabase le da acceso por defecto al rol "anon" (visitante sin
-- sesion) sobre las tablas/vistas nuevas, y el "grant ... to
-- authenticated" de las migraciones anteriores nunca le saco ese
-- acceso a "anon". No exponian precios/costos, pero si nombres de
-- recetas e ingredientes y su composicion.
-- Ejecutar en: Supabase Dashboard > SQL Editor (una sola vez).
-- ============================================================

revoke select on ingredientes_publico from public, anon;
revoke select on recetas_publico from public, anon;
revoke select on receta_ingredientes_publico from public, anon;
revoke select on produccion_diaria_detalle from public, anon;

grant select on ingredientes_publico to authenticated;
grant select on recetas_publico to authenticated;
grant select on receta_ingredientes_publico to authenticated;
grant select on produccion_diaria_detalle to authenticated;
