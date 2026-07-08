import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, AlertTriangle, ExternalLink, HelpCircle } from 'lucide-react';
import { SCHEMA_SQL, SEED_SQL } from '../data/supabaseSql';

export default function SupabaseSetupAssistant() {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [activeTab, setActiveTab] = useState<'schema' | 'seed'>('schema');
  const [refreshing, setRefreshing] = useState(false);

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(SEED_SQL);
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div id="supabase-setup-assistant" className="w-full max-w-4xl mx-auto my-6 bg-slate-900 border border-amber-500/20 rounded-2xl shadow-xl overflow-hidden text-slate-100">
      <div className="p-6 bg-amber-500/10 border-b border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/15 text-amber-500 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Tabelas do Supabase Ausentes / Não Inicializadas
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              O aplicativo conectou com sucesso ao seu projeto Supabase, mas detectou que as tabelas necessárias ainda não foram criadas no banco de dados Postgres. Siga os passos simples abaixo para ativar o sistema real.
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-amber-950/40 cursor-pointer shrink-0"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Verificando...' : 'Re-verificar Conexão'}</span>
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
              <Database size={13} /> Como Inicializar no Supabase:
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li>
                Acesse o seu painel do{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Supabase Dashboard <ExternalLink size={10} />
                </a>
              </li>
              <li>Entre no seu projeto e selecione a aba <strong>SQL Editor</strong> no menu lateral esquerdo.</li>
              <li>Clique em <strong>New Query</strong> (Nova Consulta) para abrir um editor limpo.</li>
              <li>Copie o conteúdo de <strong className="text-amber-400">schema.sql</strong> abaixo, cole no editor e clique em <strong>Run</strong> (Executar).</li>
              <li>Depois, crie outro arquivo, copie e execute o script de <strong className="text-amber-400">seed.sql</strong> para carregar as 53 máquinas e depósitos.</li>
              <li>Retorne a esta página e clique em <strong className="text-amber-400">Re-verificar Conexão</strong>!</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                activeTab === 'schema'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Passo 1: schema.sql
            </button>
            <button
              onClick={() => setActiveTab('seed')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                activeTab === 'seed'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Passo 2: seed.sql
            </button>
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-500/10 rounded-xl text-[11px] text-emerald-400/90 leading-relaxed flex items-start gap-2">
            <HelpCircle size={15} className="shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <strong>Dica Rápida:</strong> Se as tabelas RLS estiverem ativas, você também pode gerenciar usuários diretamente pelo menu Supabase Auth.
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col h-[340px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              {activeTab === 'schema' ? 'schema.sql' : 'seed.sql'}
            </span>
            {activeTab === 'schema' ? (
              <button
                onClick={handleCopySchema}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[11px] font-medium text-slate-200 rounded-md transition-all cursor-pointer"
              >
                {copiedSchema ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSchema ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            ) : (
              <button
                onClick={handleCopySeed}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[11px] font-medium text-slate-200 rounded-md transition-all cursor-pointer"
              >
                {copiedSeed ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSeed ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-[10px] text-slate-300 whitespace-pre scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {activeTab === 'schema' ? SCHEMA_SQL : SEED_SQL}
          </div>
        </div>
      </div>
    </div>
  );
}
