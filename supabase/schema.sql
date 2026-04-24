create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'check_in_status'
  ) then
    create type public.check_in_status as enum ('draft', 'submitted');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  status public.check_in_status not null default 'draft',
  extract_request_id text,
  date text,
  ticket_number text,
  vendor text,
  material text,
  quantity text,
  truck_number text,
  arrival_time text,
  departure_time text,
  comments text,
  vehicle_number text,
  rad_ticket text,
  harsco_employee text,
  raw_ai_response jsonb not null default '{}'::jsonb,
  confidence_scores jsonb not null default '{}'::jsonb,
  confidence_reasons jsonb not null default '{}'::jsonb,
  ai_model text,
  upload_status text not null default 'idle',
  upload_error text,
  extraction_status text not null default 'idle',
  extraction_error text,
  excel_status text not null default 'idle',
  excel_error text,
  email_status text not null default 'idle',
  email_error text,
  excel_file_path text,
  master_log_path text,
  master_log_synced_at timestamptz,
  email_sent_at timestamptz,
  email_provider text,
  submitted_at timestamptz,
  submission_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.check_ins
  add column if not exists review_status text not null default 'idle',
  add column if not exists submission_status text not null default 'idle',
  add column if not exists export_status text not null default 'idle',
  add column if not exists error_message text,
  add column if not exists manually_edited_fields jsonb not null default '[]'::jsonb;

create table if not exists public.check_in_images (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists check_ins_status_created_at_idx
  on public.check_ins (status, created_at desc);

create unique index if not exists check_ins_extract_request_id_uidx
  on public.check_ins (extract_request_id)
  where extract_request_id is not null;

create index if not exists check_in_images_check_in_id_idx
  on public.check_in_images (check_in_id);

drop trigger if exists set_check_ins_updated_at on public.check_ins;

create trigger set_check_ins_updated_at
before update on public.check_ins
for each row
execute function public.set_updated_at();

alter table public.check_ins enable row level security;
alter table public.check_in_images enable row level security;

insert into storage.buckets (id, name, public)
values ('hot-load-check-ins', 'hot-load-check-ins', false)
on conflict (id) do nothing;

comment on table public.check_ins is
  'Draft and submitted truck paperwork records for the Hot Load Check-In app.';

comment on table public.check_in_images is
  'Supabase Storage metadata for one or more source images per check-in.';
