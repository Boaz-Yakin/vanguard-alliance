-- Cyber-Nexus Core Schema Blueprint
-- These tables represent the "Universal Engine" for any Agentic SaaS.

-- 1. Universal Profiles (Extensible metadata)
CREATE TABLE IF NOT EXISTS public.sys_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  points BIGINT DEFAULT 0,
  trust_score DECIMAL(4,2) DEFAULT 0.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Loyalty & Point Ledger (Immutable history)
CREATE TABLE IF NOT EXISTS public.sys_loyalty_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.sys_profiles(id) ON DELETE CASCADE,
  points_change INTEGER NOT NULL,
  new_total BIGINT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Communication & Dispatch Log
CREATE TABLE IF NOT EXISTS public.sys_dispatch_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id),
  channel TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  recipient_identity TEXT NOT NULL, -- email address or phone number
  status TEXT NOT NULL, -- 'pending', 'sent', 'failed'
  payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies (Standard Security)
ALTER TABLE public.sys_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own
CREATE POLICY "Users can view own profile" ON public.sys_profiles FOR SELECT USING (auth.uid() = id);
-- Ledger: Users can read their own history
CREATE POLICY "Users can view own ledger" ON public.sys_loyalty_ledger FOR SELECT USING (auth.uid() = profile_id);
