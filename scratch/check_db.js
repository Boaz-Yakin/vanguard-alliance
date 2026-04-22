
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('id, item_name, image_url')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching deals:', error);
    return;
  }

  console.log('Last 5 deals:');
  console.table(data);
}

checkDeals();
