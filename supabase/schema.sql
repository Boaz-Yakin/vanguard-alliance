-- VANGUARD Order Engine: Database Schema v0.1

-- 1. 기존 구형 테이블 찌꺼기들 전부 초기화 (의존성 충돌 방지)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.deal_tiers CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. UUID 확장 활성화
create extension if not exists "uuid-ossp";

-- 3. Profiles Table (User State & B2B Info)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  display_name text,
  restaurant_name text,
  restaurant_address text,
  phone_number text,
  prologue text,
  level int default 1,
  points bigint default 0,
  trust_score numeric(3, 2) default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Suppliers Table
create table public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Orders Table (Ledger)
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  status text default 'pending',
  total_amount numeric default 0,
  raw_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Order Items
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_name text not null,
  quantity text not null,
  price numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Alliance Deals Table
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  item_name text not null,
  item_name_en text,
  category text,
  image_url text,
  supplier_id uuid references public.suppliers(id),
  current_volume numeric default 0,
  target_volume numeric not null,
  unit text default 'lb',
  status text default 'active',
  expires_at timestamp with time zone not null,
  price_per_unit numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Deal Tiers Table
create table public.deal_tiers (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade,
  threshold_pct numeric not null,
  discount_rate numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Row Level Security (RLS) & Policies
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.deals enable row level security;
alter table public.deal_tiers enable row level security;

create policy "Public viewable deals" on public.deals for select using (true);
create policy "Authenticated users can update volume" on public.deals for update using (auth.role() = 'authenticated');
create policy "Public viewable deal tiers" on public.deal_tiers for select using (true);
create policy "Public suppliers are viewable by everyone" on public.suppliers for select using (true);

create policy "Users can view their own profiles" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profiles" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profiles" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Anonymous order insertion" on public.orders for insert with check (true);
