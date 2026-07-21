import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function safeInsert(table, payload) {
  let currentPayload = { ...payload };
  let retries = 5;
  while (retries > 0) {
    const { data, error } = await supabase.from(table).insert([currentPayload]).select().maybeSingle();
    if (error && (error.code === 'PGRST204' || error.code === '42703' || (error.message && error.message.includes('Could not find the')))) {
      const match = error.message.match(/'(.*?)' column/);
      if (match && match[1]) {
        console.log(`[SafeInsert] Stripping missing column ${match[1]} from ${table}`);
        delete currentPayload[match[1]];
        retries--;
        continue;
      }
    }
    return { data, error };
  }
  return { data: null, error: new Error('Too many retries for missing columns') };
}

async function run() {
  const { data, error } = await safeInsert('fuel_stock', {
    farm_id: '11111111-1111-1111-1111-111111111111',
    entry_date: '2026-07-21',
    liters_received: 100,
    price_per_liter: 5.85,
    supplier: 'test',
    minimum_stock_alert: 1000,
    notes: 'test'
  });
  console.log('Result error:', error);
}
run();
