import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';

// Determinar se estamos em modo demo de forma dinâmica
export const isDemoMode = false;

// Estado global para detectar se as tabelas do Supabase não existem
export let isSchemaMissing = false;
export function setSchemaMissing(value: boolean) {
  isSchemaMissing = value;
}

// Inicializar cliente real do Supabase se as chaves estiverem presentes
let client = null;
try {
  client = createClient(supabaseUrl, supabaseAnonKey);
  console.log('🔌 Conexão padrão ao Supabase configurada como original de produção.');
} catch (e) {
  console.error('Erro ao instanciar cliente do Supabase:', e);
}

export const supabase = client;


