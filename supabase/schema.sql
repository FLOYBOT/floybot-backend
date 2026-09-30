create extension if not exists pgcrypto;

create table if not exists public.tiktok_accounts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  open_id text not null unique,
  display_name text,
  avatar_url text,
  scope text not null default 'user.info.basic',
  access_token_enc text not null,
  refresh_token_enc text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oauth_handoffs (
  code_hash text primary key,
  session_id text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tiktok_accounts enable row level security;
alter table public.oauth_handoffs enable row level security;
revoke all on public.tiktok_accounts from anon, authenticated;
revoke all on public.oauth_handoffs from anon, authenticated;
grant all on public.tiktok_accounts to service_role;
grant all on public.oauth_handoffs to service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tiktok_accounts_updated_at on public.tiktok_accounts;
create trigger tiktok_accounts_updated_at before update on public.tiktok_accounts
for each row execute function public.set_updated_at();
