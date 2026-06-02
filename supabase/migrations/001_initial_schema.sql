-- ============================================================
-- QR Menu SaaS — Initial Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Cafes table (one row per merchant, id = auth.users.id)
create table if not exists public.cafes (
  id uuid references auth.users(id) on delete cascade primary key,
  business_name text not null,
  upi_id text not null,
  has_seating boolean not null default true,
  table_count integer,
  created_at timestamptz not null default now()
);

-- 2. Menu items table
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id),
  table_number text,
  total_amount numeric(10, 2) not null,
  cart_items jsonb not null default '[]'::jsonb,
  order_status text not null default 'pending'
    check (order_status in ('pending', 'preparing', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.cafes enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

-- Cafes: owner full access, public can read details
create policy "Cafe owner full access"
  on public.cafes for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Public cafe read"
  on public.cafes for select
  using (true);

-- Menu items: public can read, owner can write
create policy "Public menu read"
  on public.menu_items for select
  using (true);

create policy "Owner menu write"
  on public.menu_items for all
  using (cafe_id = auth.uid())
  with check (cafe_id = auth.uid());

-- Orders: anyone can insert (customers placing orders)
create policy "Public order insert"
  on public.orders for insert
  with check (true);

-- Owners read/update their own orders
create policy "Owner order read"
  on public.orders for select
  using (cafe_id = auth.uid());

create policy "Owner order update"
  on public.orders for update
  using (cafe_id = auth.uid());

-- ── Realtime (enable for merchant dashboard alerts) ───────────────────────────
-- Run these in the Supabase dashboard under Database > Replication
-- or uncomment and execute:
-- alter publication supabase_realtime add table public.orders;

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_menu_items_cafe_id on public.menu_items(cafe_id);
create index if not exists idx_orders_cafe_id on public.orders(cafe_id);
create index if not exists idx_orders_status on public.orders(order_status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
