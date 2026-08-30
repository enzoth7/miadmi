begin;

-- Keep the owner account and fail closed if it cannot be verified.
do $$
declare
  keep_user_id uuid;
begin
  select id into keep_user_id
  from auth.users
  where lower(email) = lower('enzothome1@gmail.com')
  limit 1;

  if keep_user_id is null then
    raise exception 'The protected Mi Admi account was not found';
  end if;

  if not exists (
    select 1
    from auth.identities
    where user_id = keep_user_id and provider = 'google'
  ) then
    raise exception 'The protected Mi Admi account does not have a Google identity';
  end if;

  delete from auth.users where id <> keep_user_id;
end
$$;

-- Remove products and integrations that are no longer part of Mi Admi.
drop view if exists public.ai_usage_daily;
drop view if exists public.ai_usage_user_daily;
drop view if exists public.ai_usage_users_summary;

drop table if exists public.ai_usage_logs;
drop table if exists public.control_mensual_history;
drop table if exists public.control_mensual;
drop table if exists public.mp_events;
drop table if exists public.mp_messages;
drop table if exists public.payments;
drop table if exists public.metas;
drop table if exists public.tasks;
drop table if exists public.budget_profile;
drop table if exists public.feedback;
drop table if exists public.simple_movements;
drop table if exists public.simple_flow_state;
drop table if exists public.simple_profile;

drop function if exists public.apply_premium_on_payment();

-- Remove onboarding and paid-plan remnants while preserving estimation settings.
update public.app_settings
set data = data - 'onboarding', updated_at = now()
where data ? 'onboarding';

alter table public.profiles
  drop column if exists plan,
  drop column if exists premium_until,
  drop column if exists trial_ends_at,
  drop column if exists first_name,
  drop column if exists last_name,
  drop column if exists age,
  drop column if exists location,
  drop column if exists occupation;

update public.profiles as profile
set
  display_name = coalesce(
    nullif(profile.display_name, ''),
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    split_part(auth_user.email, '@', 1)
  ),
  avatar_url = coalesce(
    nullif(profile.avatar_url, ''),
    nullif(auth_user.raw_user_meta_data ->> 'avatar_url', '')
  ),
  updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id;

-- One current record per user. Keep the most recently updated row if legacy
-- duplicates are present.
delete from public.estimacion_general as target
using (
  select id
  from (
    select id, row_number() over (
      partition by user_id order by updated_at desc nulls last, id desc
    ) as row_number
    from public.estimacion_general
  ) ranked
  where row_number > 1
) duplicates
where target.id = duplicates.id;

delete from public.estimacion_especifica as target
using (
  select id
  from (
    select id, row_number() over (
      partition by user_id order by updated_at desc nulls last, id desc
    ) as row_number
    from public.estimacion_especifica
  ) ranked
  where row_number > 1
) duplicates
where target.id = duplicates.id;

delete from public.egresos_estimables as target
using (
  select id
  from (
    select id, row_number() over (
      partition by user_id order by updated_at desc nulls last, id desc
    ) as row_number
    from public.egresos_estimables
  ) ranked
  where row_number > 1
) duplicates
where target.id = duplicates.id;

alter table public.estimacion_general
  drop constraint if exists estimacion_general_user_fk;
alter table public.estimacion_especifica
  drop constraint if exists estimacion_especifica_user_fk;
alter table public.egresos_estimables
  drop constraint if exists egresos_estimables_user_fk;

drop index if exists public.estimacion_general_user_idx;
drop index if exists public.idx_estimacion_general_user_id;
drop index if exists public.estimacion_especifica_user_idx;
drop index if exists public.idx_estimacion_especifica_user_id;
drop index if exists public.egresos_estimables_user_idx;
drop index if exists public.idx_egresos_estimables_user_id;

alter table public.estimacion_general
  drop constraint if exists estimacion_general_user_id_key;
alter table public.estimacion_general
  add constraint estimacion_general_user_id_key unique (user_id);

alter table public.estimacion_especifica
  drop constraint if exists estimacion_especifica_user_id_key;
alter table public.estimacion_especifica
  add constraint estimacion_especifica_user_id_key unique (user_id);

alter table public.egresos_estimables
  drop constraint if exists egresos_estimables_user_id_key;
alter table public.egresos_estimables
  add constraint egresos_estimables_user_id_key unique (user_id);

-- Trigger helpers use a fixed search path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function private.handle_new_user();

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings
before update on public.app_settings
for each row execute function public.set_updated_at();

-- Replace accumulated/duplicate policies with one explicit authenticated policy
-- per operation.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles',
        'app_settings',
        'estimacion_general',
        'estimacion_general_history',
        'estimacion_especifica',
        'estimacion_especifica_history',
        'egresos_estimables',
        'egresos_estimables_history'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.estimacion_general enable row level security;
alter table public.estimacion_general_history enable row level security;
alter table public.estimacion_especifica enable row level security;
alter table public.estimacion_especifica_history enable row level security;
alter table public.egresos_estimables enable row level security;
alter table public.egresos_estimables_history enable row level security;

revoke all on table
  public.profiles,
  public.app_settings,
  public.estimacion_general,
  public.estimacion_general_history,
  public.estimacion_especifica,
  public.estimacion_especifica_history,
  public.egresos_estimables,
  public.egresos_estimables_history
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.app_settings to authenticated;
grant select, insert, update, delete on
  public.estimacion_general,
  public.estimacion_especifica,
  public.egresos_estimables
to authenticated;
grant select, insert, update on
  public.estimacion_general_history,
  public.estimacion_especifica_history,
  public.egresos_estimables_history
to authenticated;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy app_settings_select_own on public.app_settings
for select to authenticated
using ((select auth.uid()) = user_id);
create policy app_settings_insert_own on public.app_settings
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy app_settings_update_own on public.app_settings
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy estimacion_general_select_own on public.estimacion_general
for select to authenticated using ((select auth.uid()) = user_id);
create policy estimacion_general_insert_own on public.estimacion_general
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy estimacion_general_update_own on public.estimacion_general
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy estimacion_general_delete_own on public.estimacion_general
for delete to authenticated using ((select auth.uid()) = user_id);

create policy estimacion_especifica_select_own on public.estimacion_especifica
for select to authenticated using ((select auth.uid()) = user_id);
create policy estimacion_especifica_insert_own on public.estimacion_especifica
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy estimacion_especifica_update_own on public.estimacion_especifica
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy estimacion_especifica_delete_own on public.estimacion_especifica
for delete to authenticated using ((select auth.uid()) = user_id);

create policy egresos_estimables_select_own on public.egresos_estimables
for select to authenticated using ((select auth.uid()) = user_id);
create policy egresos_estimables_insert_own on public.egresos_estimables
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy egresos_estimables_update_own on public.egresos_estimables
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy egresos_estimables_delete_own on public.egresos_estimables
for delete to authenticated using ((select auth.uid()) = user_id);

create policy estimacion_general_history_select_own
on public.estimacion_general_history
for select to authenticated using ((select auth.uid()) = user_id);
create policy estimacion_general_history_insert_own
on public.estimacion_general_history
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy estimacion_general_history_update_own
on public.estimacion_general_history
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy estimacion_especifica_history_select_own
on public.estimacion_especifica_history
for select to authenticated using ((select auth.uid()) = user_id);
create policy estimacion_especifica_history_insert_own
on public.estimacion_especifica_history
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy estimacion_especifica_history_update_own
on public.estimacion_especifica_history
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy egresos_estimables_history_select_own
on public.egresos_estimables_history
for select to authenticated using ((select auth.uid()) = user_id);
create policy egresos_estimables_history_insert_own
on public.egresos_estimables_history
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy egresos_estimables_history_update_own
on public.egresos_estimables_history
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

commit;
