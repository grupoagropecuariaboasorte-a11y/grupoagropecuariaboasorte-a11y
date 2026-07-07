import React, { useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabaseClient';
import { Tractor, Lock, Mail, ChevronRight, Play, User, ArrowLeft, CheckCircle2 } from 'lucide-react';

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

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isDemoMode) {
      setTimeout(() => {
        let role: 'viewer' | 'editor' | 'admin' = 'admin';
        if (email.includes('editor')) role = 'editor';
        if (email.includes('viewer')) role = 'viewer';
        
        onLoginSuccess(email, role);
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // Obter role do perfil
        const { data: profile } = await supabase!
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        onLoginSuccess(data.user.email || email, profile?.role || 'viewer');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'viewer' | 'editor' | 'admin') => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess(`diretoria@agroboasorte.com.br`, role);
      setLoading(false);
    }, 400);
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

    if (isDemoMode) {
      setTimeout(() => {
        onLoginSuccess(registerEmail, registerRole);
        setLoading(false);
      }, 600);
      return;
    }

    try {
      const { data, error } = await supabase!.auth.signUp({
        email: registerEmail,
        password: registerPassword,
      });

      if (error) throw error;

      if (data?.user) {
        const { error: profileError } = await supabase!
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

    if (isDemoMode) {
      setTimeout(() => {
        setSuccessMsg('Simulação: E-mail de redefinição de senha enviado para ' + forgotEmail);
        setView('login');
        setLoading(false);
      }, 600);
      return;
    }

    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(forgotEmail, {
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950 -z-10" />

      <div className="w-full max-w-md">
        {/* Logo and Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-emerald-600/10 text-emerald-500 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-950/30 mb-4">
            <Tractor size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">FROTA AGRO</h2>
          <p className="text-slate-400 text-sm mt-1">Gestão de Ativos, Manutenção e Combustível</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          {isDemoMode && showQuickDemo ? (
            /* DEMO LOGIN OPTIONS */
            <div className="space-y-6">
              <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl text-center">
                <span className="inline-block px-2.5 py-0.5 text-[9px] font-mono font-semibold tracking-wide bg-amber-500/20 text-amber-300 rounded-full mb-2 uppercase">
                  Modo de Demonstração Ativo
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para facilitar a visualização do applet no AI Studio, escolha uma das credenciais de testes abaixo para entrar instantaneamente:
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleDemoLogin('admin')}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Entrar como Administrador</p>
                    <p className="text-[10px] text-emerald-500 font-mono">Role: admin (Controle Total)</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleDemoLogin('editor')}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Entrar como Operador / Editor</p>
                    <p className="text-[10px] text-amber-500 font-mono">Role: editor (Lançar Dados)</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleDemoLogin('viewer')}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Entrar como Visualizador</p>
                    <p className="text-[10px] text-slate-500 font-mono">Role: viewer (Somente Leitura)</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                </button>
              </div>

              <div className="border-t border-slate-800 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowQuickDemo(false)}
                  className="text-xs text-slate-400 hover:underline cursor-pointer font-bold"
                >
                  Voltar para Login de E-mail/Senha
                </button>
              </div>
            </div>
          ) : view === 'register' ? (
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

                {isDemoMode && (
                  <button
                    type="button"
                    onClick={() => setShowQuickDemo(true)}
                    className="text-xs text-amber-400 hover:underline cursor-pointer font-bold"
                  >
                    Usar perfis rápidos de demonstração
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
