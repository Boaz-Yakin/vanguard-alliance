-- VANGUARD Order Engine: Seed Data v0.1
-- Run this in your Supabase SQL Editor to populate the tables and remove the need for fallback mock data.

-- 1. Insert Suppliers
INSERT INTO public.suppliers (id, name, email, phone, category) VALUES
  ('s1000000-0000-0000-0000-000000000001', 'Green Harvest Produce', 'orders@greenharvest.test', '555-0101', 'Produce'),
  ('s2000000-0000-0000-0000-000000000002', 'Vanguard Premium Meats', 'sales@vanguardmeats.test', '555-0102', 'Meat'),
  ('s3000000-0000-0000-0000-000000000003', 'Elite Global Imports', 'contact@eliteglobal.test', '555-0103', 'Imports')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Alliance Deals
INSERT INTO public.deals (id, item_name, item_name_en, category, image_url, supplier_id, current_volume, target_volume, unit, status, expires_at, price_per_unit) VALUES
  ('d1000000-0000-0000-0000-000000000001', '1++ 한우 양지 특수부위 공동구매', 'A5 Wagyu Beef Brisket - Group Buy', 'Meat', 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&q=80', 's2000000-0000-0000-0000-000000000002', 85, 100, 'lb', 'active', now() + interval '12 hours', 35.50),
  ('d2000000-0000-0000-0000-000000000002', '제주산 친환경 깐양파 대용량', 'Jeju Eco-friendly Peeled Onions', 'Veggie', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&q=80', 's1000000-0000-0000-0000-000000000001', 300, 1000, 'box', 'active', now() + interval '2 days', 15.00),
  ('d3000000-0000-0000-0000-000000000003', '이탈리아 직수입 엑스트라 버진 올리브 오일', 'Imported Italian Extra Virgin Olive Oil', 'Sauce', 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=800&q=80', 's3000000-0000-0000-0000-000000000003', 10, 50, 'carton', 'active', now() + interval '5 days', 65.00),
  ('d4000000-0000-0000-0000-000000000004', 'Black Truffle Oil (Elite)', 'Black Truffle Oil (Elite)', 'Elite', 'https://images.unsplash.com/photo-1596645344837-128f73111818?w=800&q=80', 's3000000-0000-0000-0000-000000000003', 65, 100, 'bottle', 'active', now() + interval '1 day', 120.00)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Deal Tiers
-- Note: 'd4...04' is an Elite deal.
INSERT INTO public.deal_tiers (deal_id, threshold_pct, discount_rate) VALUES
  ('d1000000-0000-0000-0000-000000000001', 0.2, 0.05),
  ('d1000000-0000-0000-0000-000000000001', 0.5, 0.12),
  ('d1000000-0000-0000-0000-000000000001', 1.0, 0.20),
  
  ('d2000000-0000-0000-0000-000000000002', 0.3, 0.05),
  ('d2000000-0000-0000-0000-000000000002', 0.7, 0.10),
  ('d2000000-0000-0000-0000-000000000002', 1.0, 0.15),
  
  ('d4000000-0000-0000-0000-000000000004', 0.5, 0.15),
  ('d4000000-0000-0000-0000-000000000004', 1.0, 0.30);
