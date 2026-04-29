import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ulsebfiycgmimqzmubaj.supabase.co',
  'sb_publishable_eG1GnZzcIOwJ3Lm7ZKsowA_pYzHovTd'
);

async function check() {
  console.log("=== DEALS TABLE ===");
  const { data: deals, error: dealsErr } = await supabase
    .from('deals')
    .select('id, item_name, status, current_volume, target_volume, expires_at, is_private')
    .order('created_at', { ascending: false });
  
  if (dealsErr) {
    console.error("DEALS ERROR:", dealsErr);
  } else {
    console.log(`Found ${deals?.length || 0} deals:`);
    deals?.forEach(d => {
      const expired = new Date(d.expires_at) < new Date();
      console.log(`  [${d.status}] ${d.item_name} | vol: ${d.current_volume}/${d.target_volume} | expired: ${expired} | private: ${d.is_private}`);
    });
  }

  console.log("\n=== DEAL TIERS ===");
  const { data: tiers, error: tiersErr } = await supabase
    .from('deal_tiers')
    .select('deal_id, threshold_pct, discount_rate');
  
  if (tiersErr) {
    console.error("TIERS ERROR:", tiersErr);
  } else {
    console.log(`Found ${tiers?.length || 0} tiers`);
  }

  console.log("\n=== SUPPLIERS ===");
  const { data: suppliers, error: supErr } = await supabase
    .from('suppliers')
    .select('id, name');
  
  if (supErr) {
    console.error("SUPPLIERS ERROR:", supErr);
  } else {
    console.log(`Found ${suppliers?.length || 0} suppliers:`);
    suppliers?.forEach(s => console.log(`  ${s.name} (${s.id})`));
  }
}

check();
