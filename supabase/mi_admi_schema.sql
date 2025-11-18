-- Mi Admi - Esquema Supabase (Postgres)
-- Ejecuta este script completo en el SQL editor de Supabase.

begin;

-- Extensiones necesarias
create extension if not exists pgcrypto;

-- Función utilitaria: actualizar columna updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tabla: profiles (perfil del usuario)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  first_name text,
  last_name text,
  age int,
  location text,
  occupation text,
  avatar_url text,
  plan text not null default 'free',
  premium_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla: app_settings (preferencias por usuario)
create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists age int,
  add column if not exists location text,
  add column if not exists occupation text,
  add column if not exists avatar_url text;

alter table public.profiles
  drop constraint if exists profiles_first_name_len;
alter table public.profiles
  add constraint profiles_first_name_len check (
    first_name is null or char_length(first_name) <= 120
  );

alter table public.profiles
  drop constraint if exists profiles_last_name_len;
alter table public.profiles
  add constraint profiles_last_name_len check (
    last_name is null or char_length(last_name) <= 120
  );

alter table public.profiles
  drop constraint if exists profiles_location_len;
alter table public.profiles
  add constraint profiles_location_len check (
    location is null or char_length(location) <= 160
  );

alter table public.profiles
  drop constraint if exists profiles_occupation_len;
alter table public.profiles
  add constraint profiles_occupation_len check (
    occupation is null or char_length(occupation) <= 160
  );

alter table public.profiles
  drop constraint if exists profiles_avatar_url_len;
alter table public.profiles
  add constraint profiles_avatar_url_len check (
    avatar_url is null or char_length(avatar_url) <= 400
  );

alter table public.profiles
  drop constraint if exists profiles_avatar_url_http;
alter table public.profiles
  add constraint profiles_avatar_url_http check (
    avatar_url is null or avatar_url like 'https://%'
  );

alter table public.profiles
  drop constraint if exists profiles_age_range;
alter table public.profiles
  add constraint profiles_age_range check (
    age is null or (age between 0 and 120)
  );

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings
before update on public.app_settings
for each row execute function public.set_updated_at();
-- Al crear un usuario en auth.users, insertar un perfil automáticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Tabla: estimacion_general
create table if not exists public.estimacion_general (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sueldos numeric(12,2) default 0,
  otros_ingresos numeric(12,2) default 0,
  ahorro_deseado numeric(12,2) default 0,
  saldo_inicial numeric(12,2) default 0,
  egresos jsonb default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_estimacion_general_user_id on public.estimacion_general(user_id);

drop trigger if exists set_updated_at_estimacion_general on public.estimacion_general;
create trigger set_updated_at_estimacion_general
before update on public.estimacion_general
for each row execute function public.set_updated_at();

-- Tabla: estimacion_especifica
create table if not exists public.estimacion_especifica (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingresos jsonb default '[]'::jsonb,
  egresos jsonb default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_estimacion_especifica_user_id on public.estimacion_especifica(user_id);

drop trigger if exists set_updated_at_estimacion_especifica on public.estimacion_especifica;
create trigger set_updated_at_estimacion_especifica
before update on public.estimacion_especifica
for each row execute function public.set_updated_at();

-- Tabla: egresos_estimables
create table if not exists public.egresos_estimables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text check (tipo in ('prestamo','tarjeta','compra')),
  nombre text not null,
  cuotas_rest int,
  monto_cuota numeric(12,2),
  mes_objetivo date,
  estado text default 'activo',
  updated_at timestamptz not null default now()
);
create index if not exists idx_egresos_estimables_user_id on public.egresos_estimables(user_id);

drop trigger if exists set_updated_at_egresos_estimables on public.egresos_estimables;
create trigger set_updated_at_egresos_estimables
before update on public.egresos_estimables
for each row execute function public.set_updated_at();

-- Tabla: metas
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  monto numeric(12,2) default 0,
  ahorrado numeric(12,2) default 0,
  done boolean default false,
  updated_at timestamptz not null default now()
);
create index if not exists idx_metas_user_id on public.metas(user_id);

drop trigger if exists set_updated_at_metas on public.metas;
create trigger set_updated_at_metas
before update on public.metas
for each row execute function public.set_updated_at();

-- Tabla: payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  kind text not null check (kind in ('one_time','subscription')),
  provider_ref text,
  status text not null,
  paid_at timestamptz null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_user_id on public.payments(user_id);

alter table public.payments add column if not exists trial boolean default false;
alter table public.profiles add column if not exists trial_ends_at timestamptz;

drop trigger if exists set_updated_at_payments on public.payments;
create trigger set_updated_at_payments
before update on public.payments
for each row execute function public.set_updated_at();

-- RLS: habilitar y políticas por tabla
alter table public.profiles enable row level security;
alter table public.estimacion_general enable row level security;
alter table public.estimacion_especifica enable row level security;
alter table public.egresos_estimables enable row level security;
alter table public.metas enable row level security;
alter table public.payments enable row level security;
alter table public.app_settings enable row level security;

-- profiles policies
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

-- app_settings policies
drop policy if exists app_settings_select_own on public.app_settings;
create policy app_settings_select_own on public.app_settings
for select using (user_id = auth.uid());

drop policy if exists app_settings_upsert_own on public.app_settings;
create policy app_settings_upsert_own on public.app_settings
for insert with check (user_id = auth.uid());

drop policy if exists app_settings_update_own on public.app_settings;
create policy app_settings_update_own on public.app_settings
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- estimacion_general policies
drop policy if exists estimacion_general_select_own on public.estimacion_general;
create policy estimacion_general_select_own on public.estimacion_general
for select using (user_id = auth.uid());

drop policy if exists estimacion_general_insert_own on public.estimacion_general;
create policy estimacion_general_insert_own on public.estimacion_general
for insert with check (user_id = auth.uid());

drop policy if exists estimacion_general_update_own on public.estimacion_general;
create policy estimacion_general_update_own on public.estimacion_general
for update using (user_id = auth.uid());

drop policy if exists estimacion_general_delete_own on public.estimacion_general;
create policy estimacion_general_delete_own on public.estimacion_general
for delete using (user_id = auth.uid());

-- estimacion_especifica policies
drop policy if exists estimacion_especifica_select_own on public.estimacion_especifica;
create policy estimacion_especifica_select_own on public.estimacion_especifica
for select using (user_id = auth.uid());

drop policy if exists estimacion_especifica_insert_own on public.estimacion_especifica;
create policy estimacion_especifica_insert_own on public.estimacion_especifica
for insert with check (user_id = auth.uid());

drop policy if exists estimacion_especifica_update_own on public.estimacion_especifica;
create policy estimacion_especifica_update_own on public.estimacion_especifica
for update using (user_id = auth.uid());

drop policy if exists estimacion_especifica_delete_own on public.estimacion_especifica;
create policy estimacion_especifica_delete_own on public.estimacion_especifica
for delete using (user_id = auth.uid());

-- egresos_estimables policies
drop policy if exists egresos_estimables_select_own on public.egresos_estimables;
create policy egresos_estimables_select_own on public.egresos_estimables
for select using (user_id = auth.uid());

drop policy if exists egresos_estimables_insert_own on public.egresos_estimables;
create policy egresos_estimables_insert_own on public.egresos_estimables
for insert with check (user_id = auth.uid());

drop policy if exists egresos_estimables_update_own on public.egresos_estimables;
create policy egresos_estimables_update_own on public.egresos_estimables
for update using (user_id = auth.uid());

drop policy if exists egresos_estimables_delete_own on public.egresos_estimables;
create policy egresos_estimables_delete_own on public.egresos_estimables
for delete using (user_id = auth.uid());

-- metas policies
drop policy if exists metas_select_own on public.metas;
create policy metas_select_own on public.metas
for select using (user_id = auth.uid());

drop policy if exists metas_insert_own on public.metas;
create policy metas_insert_own on public.metas
for insert with check (user_id = auth.uid());

drop policy if exists metas_update_own on public.metas;
create policy metas_update_own on public.metas
for update using (user_id = auth.uid());

drop policy if exists metas_delete_own on public.metas;
create policy metas_delete_own on public.metas
for delete using (user_id = auth.uid());

-- payments policies
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
for select using (user_id = auth.uid());

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
for insert with check (user_id = auth.uid());

drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
for update using (user_id = auth.uid());

drop policy if exists payments_delete_own on public.payments;
create policy payments_delete_own on public.payments
for delete using (user_id = auth.uid());

commit;
