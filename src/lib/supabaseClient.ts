import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Determinar se estamos em modo demo (sem chaves válidas do Supabase)
export const isDemoMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-supabase-project') || 
  supabaseAnonKey.includes('your-anon-key');

// Inicializar cliente real do Supabase se possível, caso contrário exportar null
export const supabase = !isDemoMode 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (isDemoMode) {
  console.warn(
    '⚠️ MODO DE DEMONSTRAÇÃO ATIVO: Nenhuma chave do Supabase foi configurada ou chaves padrão foram encontradas. O aplicativo usará localStorage para persistência de dados. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env para conectar ao banco de dados real.'
  );
} else {
  console.log('✅ Supabase conectado com sucesso em produção!');
}
