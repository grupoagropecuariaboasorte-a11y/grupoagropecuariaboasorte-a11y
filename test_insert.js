import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('maintenance_logs').insert([{
    machine_id: "00000000-0000-0000-0000-000000000000",
    date: new Date().toISOString(),
    hour_km_at_service: 0,
    service_description: "test",
    main_item: "test",
    quantity: 1,
    parts_cost: 0,
    labor_cost: 0,
    responsible: "test",
    operator_name: "test"
  }]);
  console.log("Insert with operator_name:", error);
}
run();
