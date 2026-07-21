import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: logs } = await supabase.from('fuel_logs').select('id').limit(1);
  if (logs && logs.length > 0) {
    const { error } = await supabase.from('fuel_logs').delete().eq('id', logs[0].id);
    console.log('Delete error:', error);
  } else {
    console.log('No logs');
  }
}
run();
