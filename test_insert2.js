import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const fallbackLog = {
    machine_id: "7cd19f72-7365-4f45-bbdb-81dcdeafdb7d", // Need a valid one maybe?
    date: new Date().toISOString(),
    hour_km_at_service: 0,
    service_description: "test",
    main_item: "test",
    quantity: 1,
    parts_cost: 0,
    labor_cost: 0,
    responsible: "test",
  };
  const res = await supabase.from('maintenance_logs').insert([fallbackLog]).select().single();
  console.log("Fallback result:", res.error);
}
run();
