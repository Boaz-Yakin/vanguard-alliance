-- Step 1: Add 'level' column to profiles (if missing)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Step 2: Set admin user to Level 5, Trust 9.99 (max for NUMERIC(3,2))
UPDATE public.profiles
SET level = 5, trust_score = 9.99
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'boaznyakin@gmail.com' LIMIT 1
);

-- Step 3: Verify
SELECT id, level, trust_score FROM public.profiles LIMIT 10;
