import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('--- STARTING DIAGNOSTIC ---');

  // 1. Sign IN with previously created test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test_1776539963439@gmail.com',
    password: 'password123!'
  });

  if (authError || !authData.user) {
    console.error('Failed to sign in', authError);
    return;
  }
  
  const user = authData.user;
  console.log('Signed up test user as:', user.id, randomEmail);

  // Auto-create minimal profile like the frontend does
  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email
  });
  
  console.log('Signed in as:', user.id);

  // 2. Fetch Deals
  const { data: deals } = await supabase.from('deals').select('*');
  const targetDeal = deals && deals.length > 0 ? deals[0] : null;

  if (!targetDeal) {
     console.error('No deals found to join!');
     return;
  }

  console.log('Attempting to join deal:', targetDeal.item_name);

  // 3. Insert Order
  console.log('Testing raw order insertion...');
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      total_amount: 99.99,
      status: 'pending'
    });
    
  if (orderError) {
    console.error('Order insertion failed!', orderError);
    return;
  } 
  console.log('Order insertion succeeded!');
  // cannot fetch id without select, so orderData is null.
  return;

  // 4. Insert Order Items
  console.log('Testing order_items insertion...');
  const { data: itemData, error: itemError } = await supabase
    .from('order_items')
    .insert({
      order_id: orderData.id,
      supplier_id: targetDeal.supplier_id,
      product_name: targetDeal.item_name,
      quantity: "50",
      price: targetDeal.price_per_unit
    })
    .select();

  if (itemError) {
    console.error('Order Item insertion failed!', itemError);
  } else {
    console.log('Order Item insertion succeeded!', itemData);
  }
}

runTest();
