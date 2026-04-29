import { createClient } from '@supabase/supabase-js';

// Test as authenticated user (tearofjob1@gmail.com)
const supabase = createClient(
  'https://ulsebfiycgmimqzmubaj.supabase.co',
  'sb_publishable_eG1GnZzcIOwJ3Lm7ZKsowA_pYzHovTd'
);

async function testAuth() {
  // Login as the test user
  console.log("=== Signing in as tearofjob1@gmail.com ===");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tearofjob1@gmail.com',
    password: 'test1234'  // common test password
  });

  if (authError) {
    console.error("Auth failed:", authError.message);
    console.log("Trying with OTP or other methods...");
    
    // Even if login fails, let's just test the anon vs auth difference
    // by checking what anon key returns
    console.log("\n=== Testing as anon (no auth) ===");
    const { data: anonDeals, error: anonErr } = await supabase
      .from('deals')
      .select('id, item_name, status')
      .in('status', ['active', 'completed']);
    
    console.log("Anon result:", anonDeals?.length, "deals", anonErr?.message || "no error");
    return;
  }

  console.log("Logged in as:", authData.user?.email);
  console.log("User ID:", authData.user?.id);
  console.log("Role:", authData.session?.access_token ? "authenticated" : "anon");

  // Now query deals as authenticated user
  console.log("\n=== Querying deals as authenticated user ===");
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: deals, error: dealsErr } = await supabase
    .from('deals')
    .select('*, deal_tiers(*)')
    .in('status', ['active', 'completed'])
    .gt('expires_at', threeDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (dealsErr) {
    console.error("DEALS ERROR for authenticated user:", dealsErr);
  } else {
    console.log(`Authenticated user sees ${deals?.length || 0} deals:`);
    deals?.forEach(d => {
      console.log(`  [${d.status}] ${d.item_name} | tiers: ${d.deal_tiers?.length || 0}`);
    });
  }

  // Sign out
  await supabase.auth.signOut();
}

testAuth();
