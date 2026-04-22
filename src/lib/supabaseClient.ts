import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Check if credentials are valid
const isValidUrl = supabaseUrl && supabaseUrl.startsWith("http");

// ⚠️ DIAGNOSTIC: Log which client mode is active
console.log(`[VANGUARD] Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '⛔ MISSING'}`);
console.log(`[VANGUARD] Client Mode: ${(isValidUrl && !supabaseUrl.includes("your_supabase_project_url")) ? '✅ REAL CLIENT' : '⛔ MOCK CLIENT (env vars missing)'}`);

if (!isValidUrl || !supabaseAnonKey || supabaseUrl.includes("your_supabase_project_url")) {
  console.warn("VANGUARD: Supabase credentials missing/invalid. Engaging MOCK MODE for prototype safety.");
}

/**
 * Mocking a basic Supabase client for safe development/preview
 */
const mockClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
      order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (cb: any) => cb({ data: [], error: null })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null })
      }),
      then: (cb: any) => cb({ data: null, error: null })
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    })
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
};

export const supabase = (isValidUrl && !supabaseUrl.includes("your_supabase_project_url")) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (mockClient as any);
