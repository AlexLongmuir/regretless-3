/**
 * Diagnostic script to check subscription status for a user
 * Run with: node check-subscription.js <user_id>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSubscriptions(userId) {
  console.log(`\n🔍 Checking subscriptions for user: ${userId}\n`);

  // Check all subscriptions for this user
  const { data: allSubscriptions, error: allError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching subscriptions:', allError);
    return;
  }

  console.log(`📊 Total subscriptions found: ${allSubscriptions?.length || 0}\n`);

  if (!allSubscriptions || allSubscriptions.length === 0) {
    console.log('✅ No subscriptions found for this user');
    return;
  }

  // Show all subscriptions
  allSubscriptions.forEach((sub, index) => {
    console.log(`\n--- Subscription ${index + 1} ---`);
    console.log(`ID: ${sub.id}`);
    console.log(`RC App User ID: ${sub.rc_app_user_id}`);
    console.log(`Is Active: ${sub.is_active}`);
    console.log(`Is Trial: ${sub.is_trial}`);
    console.log(`Will Renew: ${sub.will_renew}`);
    console.log(`Product ID: ${sub.product_id}`);
    console.log(`Store: ${sub.store}`);
    console.log(`Current Period End: ${sub.current_period_end}`);
    console.log(`Created At: ${sub.created_at}`);
  });

  // Check for active subscriptions
  const activeSubscriptions = allSubscriptions.filter(sub => sub.is_active === true);
  console.log(`\n✅ Active subscriptions: ${activeSubscriptions.length}`);

  if (activeSubscriptions.length > 1) {
    console.log('⚠️  WARNING: Multiple active subscriptions found!');
    console.log('This violates the unique constraint on active subscriptions per user.');
  }

  // Check for duplicate rc_app_user_id values
  const rcAppUserIds = allSubscriptions.map(sub => sub.rc_app_user_id);
  const uniqueRcAppUserIds = new Set(rcAppUserIds);
  
  if (rcAppUserIds.length !== uniqueRcAppUserIds.size) {
    console.log('\n⚠️  WARNING: Duplicate rc_app_user_id values found!');
    const duplicates = rcAppUserIds.filter((id, index) => rcAppUserIds.indexOf(id) !== index);
    console.log('Duplicate IDs:', [...new Set(duplicates)]);
  }

  // Check if any rc_app_user_id exists for other users
  if (allSubscriptions.length > 0) {
    const rcAppUserIdsToCheck = [...new Set(rcAppUserIds)];
    console.log(`\n🔍 Checking if rc_app_user_id values are used by other users...`);
    
    for (const rcAppUserId of rcAppUserIdsToCheck) {
      const { data: otherUsers, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, is_active')
        .eq('rc_app_user_id', rcAppUserId);

      if (!checkError && otherUsers) {
        const otherUserRecords = otherUsers.filter(sub => sub.user_id !== userId);
        if (otherUserRecords.length > 0) {
          console.log(`⚠️  rc_app_user_id "${rcAppUserId}" is also used by:`, 
            otherUserRecords.map(r => r.user_id));
        }
      }
    }
  }
}

// Get user ID from command line or use the one from logs
const userId = process.argv[2] || '75394d3d-983d-497f-91c8-008fd06d641c';

checkSubscriptions(userId)
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


