-- Vanguard Alliance: Sample Data for Prototype Testing

-- 1. Sample Suppliers
INSERT INTO public.suppliers (name, email, category)
VALUES 
  ('Vanguard Premium Meats', 'meat-supply@example.com', 'Meat'),
  ('Glacier Dairy Co.', 'dairy@example.com', 'Dairy'),
  ('Organic Fields', 'veggies@example.com', 'Vegetables'),
  ('General Provisions Corp', 'general@example.com', 'General')
ON CONFLICT DO NOTHING;

-- 2. Sample Profile (Optional, for testing RLS if needed)
-- Note: Replace with a real UUID if testing with actual auth
-- INSERT INTO public.profiles (id, email, display_name, points)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@vanguard.com', 'Vanguard Tester', 1000);
