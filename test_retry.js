const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function safeInsert(table, payload) {
  let currentPayload = { ...payload };
  let retries = 5;
  
  while (retries > 0) {
    const { data, error } = await supabase.from(table).insert([currentPayload]).select().maybeSingle();
    if (error && error.code === 'PGRST204') {
      const match = error.message.match(/Could not find the '(.*?)' column/);
      if (match && match[1]) {
        console.log(`Stripping column ${match[1]} from ${table}`);
        delete currentPayload[match[1]];
        retries--;
        continue;
      }
    }
    return { data, error };
  }
  return { error: new Error('Too many retries for missing columns') };
}

async function run() {
  const { data, error } = await safeInsert('machines', {
    code: 'MAQ-NEW',
    name: 'Máquina Nova',
    type: 'trator',
    farm_id: '11111111-1111-1111-1111-111111111111',
    acquisition_date: '2026-07-21',
    acquisition_value: 100,
    insurance_expiration: '2026-07-21'
  });
  console.log(error);
}
run();
