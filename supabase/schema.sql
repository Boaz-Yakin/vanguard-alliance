-- VANGUARD Order Engine: Database Schema v0.1

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (User State)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  display_name text,
  level int default 1,
  points bigint default 0,
  trust_score numeric(3, 2) default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Suppliers Table
create table if not exists public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  category text, -- e.g., 'Meat', 'Dairy', 'Vegetables'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Orders Table (Ledger)
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  status text default 'pending',
  total_amount numeric default 0,
  raw_text text, -- Unified naming
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Order Items
create table if not exists public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_name text not null,
  quantity text not null,
  price numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Alliance Deals Table (New for Phase 2+)
create table if not exists public.deals (
  id uuid default uuid_generate_v4() primary key,
  item_name text not null,
  supplier_id uuid references public.suppliers(id),
  current_volume numeric default 0,
  target_volume numeric not null,
  unit text default 'lb',
  status text default 'active',
  expires_at timestamp with time zone not null,
  price_per_unit numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Deal Tiers Table
create table if not exists public.deal_tiers (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade,
  threshold_pct numeric not null, -- 0.3 for 30%
  discount_rate numeric not null, -- 0.05 for 5%
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.deals enable row level security;
alter table public.deal_tiers enable row level security;

-- Policies
create policy "Public viewable deals" on public.deals for select using (true);
create policy "Public viewable deal tiers" on public.deal_tiers for select using (true);
create policy "Public suppliers are viewable by everyone" on public.suppliers for select using (true);
create policy "Users can view their own profiles" on public.profiles for select using (auth.uid() = id);
create policy "Users can view their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Anonymous order insertion" on public.orders for insert with check (true); -- Allowed for prototype
