import React, { useState, useEffect } from 'react';
import { supabase, isDemoMode, isSchemaMissing } from '../lib/supabaseClient';
import { Tractor, Lock, Mail, ChevronRight, Play, User, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import SupabaseSetupAssistant from '../components/SupabaseSetupAssistant';
import { fleetService } from '../lib/fleetService';
import logoBoaSorte from '../assets/images/logo_boa_sorte_transparent.png';

interface LoginProps {
  onLoginSuccess: (email: string, role: 'viewer' | 'editor' | 'admin') => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('grupoagropecuariaboasorte@gmail.com');
  const [password, setPassword] = useState('123456789');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'viewer' | 'editor' | 'admin'>('admin');
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showQuickDemo, setShowQuickDemo] = useState(false);
  const [showSupaWarning, setShowSupaWarning] = useState(!supabase);
  const [schemaMissing, setSchemaMissing] = useState(isSchemaMissing);

  useEffect(() => {
    async function checkSchema() {
      try {
        await fleetService.getFarms();
        if (isSchemaMissing) {
          setSchemaMissing(true);
        }
      } catch (e) {
        setSchemaMissing(true);
      }
    }
    if (supabase) {
      checkSchema();
    }
  }, []);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!supabase) {
      setErrorMsg('Conexão ao banco de dados Supabase indisponível. O modo demo foi desativado e o sistema só funciona conectado ao banco de dados online.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // Obter role do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        let finalRole = profile?.role || 'viewer';
        if ((data.user.email || email).toLowerCase() === 'grupoagropecuariaboasorte@gmail.com') {
          finalRole = 'admin';
        }

        onLoginSuccess(data.user.email || email, finalRole as any);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (!supabase) {
      setErrorMsg('Conexão ao banco de dados Supabase indisponível. O modo demo foi desativado e o sistema só funciona conectado ao banco de dados online.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
      });

      if (error) throw error;

      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email || registerEmail,
              role: registerRole,
            },
          ]);

        if (profileError) {
          console.error('Erro ao cadastrar perfil:', profileError);
          throw new Error('Usuário criado na autenticação, mas falhou ao registrar perfil: ' + profileError.message);
        }

        setSuccessMsg('Conta criada com sucesso! Faça login abaixo.');
        setView('login');
        setEmail(registerEmail);
        setPassword(registerPassword);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!supabase) {
      setErrorMsg('O cliente do Supabase não está inicializado.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      setSuccessMsg('Instruções de redefinição enviadas! Verifique seu e-mail.');
      setView('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-y-auto`}>
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950 -z-10" />

      <div className={`w-full ${schemaMissing ? 'max-w-4xl' : 'max-w-md'} flex flex-col gap-6`}>
        {/* Logo and Intro */}
        <div className="text-center">
          <div className="inline-block relative mb-4">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl" />
            <img 
              src={logoBoaSorte} 
              alt="Boa Sorte Agropecuária Logo" 
              className="w-28 h-28 rounded-full border-2 border-emerald-500/30 shadow-xl object-cover relative z-10 mx-auto hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">BOA SORTE AGROPECUÁRIA</h2>
          <p className="text-slate-400 text-sm mt-1">Gestão de Ativos, Manutenção e Combustível</p>
        </div>

        {schemaMissing && <SupabaseSetupAssistant />}

        <div className="w-full max-w-md mx-auto">
          {/* Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-400 flex flex-col gap-2">
              <span>{errorMsg}</span>
              {(errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('fetch') || errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('conexão') || errorMsg.toLowerCase().includes('conectar')) && (
                <div className="mt-1 pt-2 border-t border-red-900/30">
                  <p className="text-[11px] text-slate-300 leading-relaxed text-left">
                    <strong>Por que isso acontece?</strong> O aplicativo não conseguiu se conectar com o servidor do Supabase. Isso ocorre quando as credenciais de API estão ausentes, incorretas no arquivo de configuração, ou há um bloqueio de rede.
                  </p>
                </div>
              )}
            </div>
          )}

          {view === 'register' ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-sm font-bold text-slate-200">Criar Nova Conta</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Cadastre suas credenciais para acessar o Frota Agro</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="ex: voce@empresa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha de Acesso</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="No mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar Senha</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Perfil / Permissão no Sistema</label>
                <select
                  value={registerRole}
                  onChange={(e: any) => setRegisterRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-hidden focus:border-emerald-600 transition-colors cursor-pointer"
                >
                  <option value="admin">Administrador (Controle Total)</option>
                  <option value="editor">Operador / Editor (Lançar Dados)</option>
                  <option value="viewer">Visualizador (Somente Leitura)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Cadastrando...' : 'Criar Usuário e Acessar'}
                <Play size={14} fill="currentColor" />
              </button>

              <div className="border-t border-slate-800 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-slate-400 hover:underline cursor-pointer font-bold flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft size={14} /> Voltar para o Login
                </button>
              </div>
            </form>
          ) : view === 'forgot' ? (
            /* FORGOT PASSWORD FORM */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-sm font-bold text-slate-200">Recuperar Senha</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Insira seu e-mail cadastrado para receber as instruções de recuperação</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail Cadastrado</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ex: gerente@fazenda.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                <Play size={14} fill="currentColor" />
              </button>

              <div className="border-t border-slate-800 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-slate-400 hover:underline cursor-pointer font-bold flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft size={14} /> Voltar para o Login
                </button>
              </div>
            </form>
          ) : (
            /* REAL LOGIN FORM */
            <form onSubmit={handleRealLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: gerente@fazenda.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-400">Senha de Acesso</label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-emerald-500 hover:underline cursor-pointer font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
                <Play size={14} fill="currentColor" />
              </button>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-slate-300 hover:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <User size={14} /> Não tem uma conta? Criar Usuário
                </button>
              </div>
            </form>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
