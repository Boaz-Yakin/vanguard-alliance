-- Step 1: Add 'level' column to profiles (if missing)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Step 2: Set admin user to max level 5 with full trust score
UPDATE public.profiles
SET level = 5, trust_score = 10.0
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'boaznyakin@gmail.com' LIMIT 1
);

-- Step 3: Verify
SELECT id, level, trust_score FROM public.profiles LIMIT 10;
