# App Costos

App para llevar el costo real y el margen de ganancia de cada producto de una
panadería, pastelería o local de comida rápida.

Permite cargar ingredientes (con precio, unidad y presentación), armar recetas /
productos combinándolos, y calcular automáticamente el costo, el precio de venta
sugerido (por markup o por margen) y la ganancia estimada de cada uno. Incluye
un dashboard y reportes con gráficos y filtros.

## Estructura

```
app-costos/
  frontend/    React + Vite + Tailwind CSS + Supabase (Postgres en la nube)
```

Nota: el proyecto tuvo un backend Node.js + Express + SQLite local que se eliminó
al migrar a Supabase. Los cálculos de costo/markup/margen que antes vivían en el
backend ahora corren en el navegador (`frontend/src/api/recetas.js`), y la
persistencia va directo del navegador a Supabase con `@supabase/supabase-js`.

## Requisitos

- Node.js 18 o superior
- Un proyecto Supabase creado, con las tablas de `frontend/supabase/schema.sql` ya ejecutadas

## Clonar y correr localmente

```bash
git clone <url-de-este-repo>
cd app-costos
npm install --prefix frontend
```

## Variables de entorno

El proyecto necesita credenciales de Supabase para funcionar, que **no están en el
repo** (cada quien usa las suyas). Copiar el archivo de ejemplo y completarlo:

```bash
cp frontend/.env.local.example frontend/.env.local
```

Y completar `frontend/.env.local` con los valores de tu proyecto Supabase
(Supabase → Settings → API):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`frontend/.env.local` está en `.gitignore` — nunca se sube al repositorio. Si no
tenés todavía un proyecto Supabase, hay que crear uno y correr una vez el SQL de
`frontend/supabase/schema.sql` (ver sección "Base de datos" más abajo).

## Desarrollo

```bash
npm run dev --prefix frontend
```

La app queda en http://localhost:5173, y habla directo con Supabase (no hay backend propio ni proxy).

## Base de datos

Postgres administrado por Supabase. El esquema (tablas, constraints, índices, trigger
de `fecha_modificacion`, políticas de Row Level Security) está en `frontend/supabase/schema.sql`
— se ejecuta una sola vez desde el SQL Editor del dashboard de Supabase.

**Seguridad**: esta app no tiene login (es de un solo usuario). El frontend usa la
`anon key`, que queda visible en el navegador. Las políticas de RLS están abiertas
(mismo nivel de exposición que la app local de antes, que tampoco tenía autenticación).
Si en algún momento se comparte la URL de la app públicamente, conviene sumar
autenticación antes.

## Respaldo de datos

Supabase hace backups automáticos del proyecto (ver Settings → Database → Backups en
el dashboard; en el plan gratuito son point-in-time limitados). Ya no aplica el sistema
de backup a archivo local (`npm run backup`) que tenía la versión con SQLite.

## Estado actual

Las 6 secciones del roadmap original están implementadas y probadas end-to-end:

- [x] Dashboard (resumen de productos, ingredientes y ganancia total)
- [x] Ingredientes (crear/editar/eliminar, tipo ingrediente vs. envase, historial de precios, búsqueda)
- [x] Recetas / Productos (autocompletado de ingredientes, creación de ingredientes al vuelo, parseo de cantidades tipo "500g", costo en vivo separado por ingredientes/envase)
- [x] Calculadora de precios (modo manual o sobre un producto existente, aplica el precio elegido directamente)
- [x] Reportes (gráfico costo vs. ganancia por categoría, tabla costo/precio por producto, ingredientes más caros, filtros por categoría y fecha)
- [x] Configuración (margen base editable por categoría)
- [x] Edición de ingredientes/envases directamente desde la tabla de Reportes
- [x] Exportar reportes (costo vs. precio, ingredientes más caros) a CSV
- [x] Confirmaciones con modal propio en vez de `confirm()`/`alert()` nativos del navegador
- [x] Migración de backend local (Express + SQLite) a Supabase (Postgres en la nube)

### Pendiente / mejoras futuras posibles

- Exportar reportes a PDF (se implementó CSV, que abre directo en Excel/Sheets)
- Autenticación (si la app se comparte más allá de uso personal)
