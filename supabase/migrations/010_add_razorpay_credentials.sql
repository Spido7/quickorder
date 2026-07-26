-- Migration: Add secure cafe secrets table for Razorpay credentials
create table if not exists public.cafe_secrets (
  id uuid references public.cafes(id) on delete cascade primary key,
  razorpay_key_id text,
  razorpay_key_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.cafe_secrets enable row level security;

-- Owner policies (allows merchant to read and update their own credentials)
create policy "Owner secrets select"
  on public.cafe_secrets for select
  using (auth.uid() = id);

create policy "Owner secrets insert"
  on public.cafe_secrets for insert
  with check (auth.uid() = id);

create policy "Owner secrets update"
  on public.cafe_secrets for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Owner secrets delete"
  on public.cafe_secrets for delete
  using (auth.uid() = id);
