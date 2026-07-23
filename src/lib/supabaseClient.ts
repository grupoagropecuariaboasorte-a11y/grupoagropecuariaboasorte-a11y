import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';

// Determinar se estamos em modo demo de forma dinâmica - SEMPRE DESATIVADO
export const isDemoMode = false;
export function setDemoMode(value: boolean) {
  // Modo demo eliminado definitivamente
}

// Estado global para detectar se as tabelas do Supabase não existem
export let isSchemaMissing = false;
export function setSchemaMissing(value: boolean) {
  isSchemaMissing = value;
}

// Limpar caches antigos do localStorage no boot para garantir que dados antigos salvos localmente não poluam o estado
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove = ['deleted_fuel_logs', 'deleted_fuel_stock'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('agro_fleet_') && key !== 'agro_fleet_profile') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Erro ao limpar cache local legado:', e);
  }
}

// Inicializar cliente real do Supabase com cabeçalhos para evitar cache do navegador
let client = null;
try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  });
  console.log('🔌 Conexão padrão ao Supabase configurada com sincronização em tempo real e sem cache.');
} catch (e) {
  console.error('Erro ao instanciar cliente do Supabase:', e);
}

export const supabase = client;




