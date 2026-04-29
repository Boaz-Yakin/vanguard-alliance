import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ulsebfiycgmimqzmubaj.supabase.co',
  'sb_publishable_eG1GnZzcIOwJ3Lm7ZKsowA_pYzHovTd'
);

async function test() {
  // 1. Test as ANON first
  console.log("=== ANON (no login) ===");
  const { data: anonDeals, error: anonErr } = await supabase
    .from('deals')
    .select('id, item_name, status')
    .in('status', ['active', 'completed']);
  console.log(`Anon sees: ${anonDeals?.length} deals, error: ${anonErr?.message || 'none'}`);

  // 2. Login as tearofjob1
  console.log("\n=== LOGIN as tearofjob1@gmail.com ===");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'tearofjob1@gmail.com',
    password: '123456'
  });

  if (authErr) {
    console.error("Auth FAILED:", authErr.message);
    return;
  }
  console.log("Logged in:", authData.user?.email, "| ID:", authData.user?.id);

  // 3. Query deals as authenticated user
  console.log("\n=== DEALS as authenticated ===");
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: authDeals, error: dealsErr } = await supabase
    .from('deals')
    .select('*, deal_tiers(*)')
    .in('status', ['active', 'completed'])
    .gt('expires_at', threeDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (dealsErr) {
    console.error("DEALS ERROR:", JSON.stringify(dealsErr, null, 2));
  } else {
    console.log(`Authenticated sees: ${authDeals?.length} deals`);
    authDeals?.forEach(d => {
      console.log(`  [${d.status}] ${d.item_name} | tiers: ${d.deal_tiers?.length}`);
    });
  }

  // 4. Check deal_tiers separately
  console.log("\n=== DEAL_TIERS as authenticated ===");
  const { data: tiers, error: tiersErr } = await supabase
    .from('deal_tiers')
    .select('deal_id, threshold_pct, discount_rate')
    .limit(5);
  
  if (tiersErr) {
    console.error("TIERS ERROR:", JSON.stringify(tiersErr, null, 2));
  } else {
    console.log(`Tiers visible: ${tiers?.length}`);
  }

  // 5. Check suppliers
  console.log("\n=== SUPPLIERS as authenticated ===");
  const { data: sups, error: supsErr } = await supabase
    .from('suppliers')
    .select('id, name');
  
  if (supsErr) {
    console.error("SUPPLIERS ERROR:", JSON.stringify(supsErr, null, 2));
  } else {
    console.log(`Suppliers visible: ${sups?.length}`);
  }

  await supabase.auth.signOut();
}

test();
