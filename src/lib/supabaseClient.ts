import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Determinar se estamos em modo demo - desativado permanentemente conforme solicitado pelo usuário
export const isDemoMode = false;

// Inicializar cliente real do Supabase se as chaves estiverem presentes
let client = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
    console.log('🔌 Conexão padrão ao Supabase configurada como original de produção.');
  } catch (e) {
    console.error('Erro ao instanciar cliente do Supabase:', e);
  }
} else {
  console.warn('⚠️ Credenciais do Supabase ausentes. Por favor, adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações ou arquivo .env.');
}

export const supabase = client;

