# Database Migrations

Run these SQL statements in the Supabase SQL Editor when setting up or updating the v2 application.

> **Security note:** Every table below has Row Level Security enabled. Anonymous users cannot read or write any data. Edge Functions use the service role key and bypass RLS, so admin-level operations performed by `ai-proxy`, `zoominfo-proxy`, and `admin-delete-user` still work.

## Enable RLS on all public tables

Run this first to ensure RLS is enabled on every table that the app uses.

```sql
alter table public.leads enable row level security;
alter table public.contacts enable row level security;
alter table public.call_logs enable row level security;
alter table public.solutions enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
alter table public.pain_point_catalog enable row level security;
alter table public.ces_settings enable row level security;
```

## RLS policies for authenticated users

The v2 app treats all authenticated users as team members. Anonymous access is blocked.

```sql
-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Leads: full CRUD for any authenticated user
-- (sales team members need shared access)
drop policy if exists "Authenticated full access" on public.leads;
create policy "Authenticated full access" on public.leads
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Contacts: full CRUD for any authenticated user
-- (contacts belong to shared leads)
drop policy if exists "Authenticated full access" on public.contacts;
create policy "Authenticated full access" on public.contacts
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Call logs: full CRUD for any authenticated user
drop policy if exists "Authenticated full access" on public.call_logs;
create policy "Authenticated full access" on public.call_logs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Solutions: read-only for users, admin-only write
drop policy if exists "Authenticated read" on public.solutions;
drop policy if exists "Admin write" on public.solutions;
create policy "Authenticated read" on public.solutions
  for select using (auth.role() = 'authenticated');
create policy "Admin write" on public.solutions
  for all using (public.is_admin())
  with check (public.is_admin());

-- Profiles: read-only for users, admin-only write
drop policy if exists "Authenticated read" on public.profiles;
drop policy if exists "Admin write" on public.profiles;
create policy "Authenticated read" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Admin write" on public.profiles
  for all using (public.is_admin())
  with check (public.is_admin());

-- Audit log: insert only for users, read for admins
drop policy if exists "Authenticated insert" on public.audit_log;
drop policy if exists "Admin read" on public.audit_log;
create policy "Authenticated insert" on public.audit_log
  for insert with check (auth.role() = 'authenticated');
create policy "Admin read" on public.audit_log
  for select using (public.is_admin());

-- Pain point catalog: read-only for users, admin-only write
drop policy if exists "Authenticated read" on public.pain_point_catalog;
drop policy if exists "Admin write" on public.pain_point_catalog;
create policy "Authenticated read" on public.pain_point_catalog
  for select using (auth.role() = 'authenticated');
create policy "Admin write" on public.pain_point_catalog
  for all using (public.is_admin())
  with check (public.is_admin());

-- CES settings: read ai_keys for authenticated users, admin full access
drop policy if exists "Admin full access" on public.ces_settings;
drop policy if exists "Authenticated read ai_keys" on public.ces_settings;
create policy "Admin full access" on public.ces_settings
  for all using (public.is_admin())
  with check (public.is_admin());
create policy "Authenticated read ai_keys" on public.ces_settings
  for select using (auth.role() = 'authenticated');
```

## Fix leads table schema for v2

The v2 application expects these columns on `public.leads`. Run this once to add any that are missing.

```sql
alter table public.leads
  add column if not exists employees int,
  add column if not exists sales_rep text,
  add column if not exists assigned_rep text,
  add column if not exists imported_by text,
  add column if not exists company_source text,
  add column if not exists icp text,
  add column if not exists tier text,
  add column if not exists notes text;
```

If your existing data uses `assigned_rep` and you want to keep it in sync with the new `sales_rep` column, also run:

```sql
update public.leads
set sales_rep = assigned_rep
where sales_rep is null and assigned_rep is not null;
```

## Create contacts table

Each lead can have multiple contacts. The primary contact is also mirrored on the `leads` row for quick display.

```sql
create table if not exists public.contacts (
  id bigint generated by default as identity primary key,
  lead_id bigint not null references public.leads(id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  source text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.contacts enable row level security;

create index if not exists idx_contacts_lead_id on public.contacts(lead_id);
```

### Backfill contacts from existing leads

If you already have leads in the table, run this once to create primary contact records for them:

```sql
insert into public.contacts (lead_id, name, title, email, phone, is_primary, source)
select
  id,
  contact_name,
  nullif(contact_title, '—'),
  contact_email,
  contact_phone,
  true,
  coalesce(imported_by, 'Legacy')
from public.leads
where contact_name is not null and contact_name <> ''
  and not exists (
    select 1 from public.contacts where contacts.lead_id = leads.id
  );
```

## Create pain_point_catalog table

```sql
create table if not exists public.pain_point_catalog (
  id bigint generated by default as identity primary key,
  text text not null,
  theme text not null default 'General',
  tags text[] default array[]::text[],
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table public.pain_point_catalog enable row level security;
```

## Create ces_settings table for admin AI keys

```sql
create table if not exists public.ces_settings (
  id text primary key default 'global',
  ai_keys jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.ces_settings enable row level security;

-- Insert default row
insert into public.ces_settings (id, ai_keys)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;
```

## Create profiles on signup

New authenticated users need a `profiles` row so the app can read their role and approval status. Use a trigger that runs with elevated privileges.

```sql
-- Function that creates a profile row for a new auth user.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, approved)
  values (new.id, new.email, 'user', false)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger runs after every auth signup.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## Existing tables (from v1)

The v2 app reuses the existing Supabase tables: `leads`, `call_logs`, `solutions`, `profiles`, and `audit_log`.
No schema changes are required to those tables except for the migrations above.
