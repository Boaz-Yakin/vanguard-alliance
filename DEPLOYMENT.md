# 🛰️ VANGUARD ALLIANCE: DEPLOYMENT GUIDE

This document contains the tactical instructions for moving from **Mock Mode** to **Full Production Protocol**.

## 1. Supabase Infrastructure (The Heart)

Execute the following SQL in your Supabase SQL Editor to create the necessary intelligence tables:

```sql
-- 1. Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Alliance Deals Table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name TEXT NOT NULL,
    current_volume NUMERIC DEFAULT 0,
    target_volume NUMERIC NOT NULL,
    price_per_unit NUMERIC NOT NULL,
    status TEXT DEFAULT 'active',
    supplier_id UUID REFERENCES suppliers(id),
    expires_at TIMESTAMPTZ NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Deal Tiers
CREATE TABLE deal_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    threshold_pct NUMERIC NOT NULL,
    discount_rate NUMERIC NOT NULL
);

-- 4. Unified Orders Table
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id UUID,
    branch_id TEXT DEFAULT 'b1',
    raw_text TEXT,
    status TEXT DEFAULT 'dispatched',
    total_items INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Tactical Opening
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for active deals" ON deals FOR SELECT USING (true);
```

## 2. Environment Configuration (Secure Comms)

Create a `.env.local` file (for local test) or add these to your **Vercel Project Settings**:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Vercel Deployment (The Port)

1.  **Link GitHub**: Push this repository to a private/public GitHub repo.
2.  **Import to Vercel**: Choose the project and set the Framework Preset to `Next.js`.
3.  **Add Envs**: Paste the `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`.
4.  **Deploy**: Hit Deploy. Your alliance is now global.

## 4. Post-Deployment Verification
- Ensure the "VANGUARD: Supabase Credentials Missing" warning no longer appears in the console.
- Place a test order and verify it appears in the Supabase `orders` table.

---
© 2026 VANGUARD ALLIANCE - Cyber-Nexus AI Squad Special Edition
