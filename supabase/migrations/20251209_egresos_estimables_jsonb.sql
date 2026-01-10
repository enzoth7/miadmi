-- Agrega columnas jsonb para el bundle de egresos estimables y backfill desde el campo legacy "nombre"

alter table public.egresos_estimables
  add column if not exists prestamos jsonb not null default '[]'::jsonb,
  add column if not exists tarjetas jsonb not null default '[]'::jsonb,
  add column if not exists compras jsonb not null default '[]'::jsonb;

update public.egresos_estimables
set
  prestamos = coalesce((nombre::jsonb)->'prestamos', '[]'::jsonb),
  tarjetas  = coalesce((nombre::jsonb)->'tarjetas',  '[]'::jsonb),
  compras   = coalesce((nombre::jsonb)->'compras',   '[]'::jsonb)
where nombre is not null
  and nombre <> '';

update public.egresos_estimables
set estado = 'bundle'
where estado is null;
