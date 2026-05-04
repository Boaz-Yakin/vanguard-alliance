-- 1. Create a storage bucket for invoices
insert into storage.buckets (id, name, public) 
values ('invoices', 'invoices', false);

-- 2. Storage RLS Policies (Allow users to manage their own invoices)
create policy "Users can upload their own invoices"
  on storage.objects for insert
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view their own invoices"
  on storage.objects for select
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Create a table to track archived invoices
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  order_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  file_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(order_id)
);

-- 4. Enable RLS for the invoices table
alter table public.invoices enable row level security;

create policy "Users can view their own invoice records"
  on public.invoices for select
  using (auth.uid() = user_id);

create policy "Users can insert their own invoice records"
  on public.invoices for insert
  with check (auth.uid() = user_id);
