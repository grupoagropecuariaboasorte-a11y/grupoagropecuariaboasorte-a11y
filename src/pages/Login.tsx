import React, { useState, useEffect } from 'react';
import { supabase, isDemoMode, isSchemaMissing } from '../lib/supabaseClient';
import { Tractor, Lock, Mail, ChevronRight, Play, User, ArrowLeft, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import SupabaseSetupAssistant from '../components/SupabaseSetupAssistant';
import { fleetService } from '../lib/fleetService';
import AppLogo from '../components/AppLogo';
import { UserRole } from '../types';

interface LoginProps {
  onLoginSuccess: (email: string, role: UserRole) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [registerRole, setRegisterRole] = useState<UserRole>('registered');
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showQuickDemo, setShowQuickDemo] = useState(false);
  const [showSupaWarning, setShowSupaWarning] = useState(!supabase);
  const [schemaMissing, setSchemaMissing] = useState(isSchemaMissing);
  const isSubmittingRef = React.useRef(false);

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
    if (loading || isSubmittingRef.current) {
      console.warn('[SUPABASE AUTH DEBUG] Login ignorado: requisição já em andamento.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg('');

    console.log('[SUPABASE AUTH DEBUG] Tentativa de login iniciada (execução 1x) para:', email);

    if (!supabase) {
      setErrorMsg('Conexão ao banco de dados Supabase indisponível. O modo demo foi desativado e o sistema só funciona conectado ao banco de dados online.');
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // Garantir que o perfil existe no banco de dados para o RLS funcionar
        const userEmail = (data.user.email || cleanEmail).trim().toLowerCase();
        const isAdmin = userEmail === 'grupoagropecuariaboasorte@gmail.com';
        
        // Obter perfil completo existente para não sobrescrever permissões alteradas pelo administrador
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        let persistedMap: Record<string, UserRole> = {};
        try {
          persistedMap = JSON.parse(localStorage.getItem('agro_persisted_roles') || '{}');
        } catch (e) {}

        let finalRole: UserRole = 'registered';
        if (isAdmin) {
          finalRole = 'admin';
        } else if (profile) {
          let role = profile.role as UserRole;
          if (profile.email && profile.email.includes('|role:')) {
            const parts = profile.email.split('|role:');
            if (parts[1]) role = parts[1] as UserRole;
          }
          finalRole = role || 'registered';
        }

        // Se o Supabase retornou 'registered' mas há permissão concedida salva
        if (finalRole === 'registered') {
          if (persistedMap[data.user.id]) {
            finalRole = persistedMap[data.user.id];
          } else if (persistedMap[userEmail]) {
            finalRole = persistedMap[userEmail];
          }
        }

        // Atualizar timestamp sem sobrescrever o email com role codificado
        try {
          if (profile) {
            await supabase.from('profiles').update({
              updated_at: new Date().toISOString()
            }).eq('id', data.user.id);
          } else {
            await supabase.from('profiles').insert({
              id: data.user.id,
              email: userEmail,
              role: finalRole,
              updated_at: new Date().toISOString()
            });
          }
        } catch (dbErr) {
          console.warn('[LOGIN] Aviso ao atualizar timestamp no profiles:', dbErr);
        }

        onLoginSuccess(userEmail, finalRole);
      }
    } catch (err: any) {
      console.error('[SUPABASE AUTH DEBUG] Erro no login:', err);
      let msg = err.message || 'Erro ao realizar login. Verifique as credenciais.';
      const lower = msg.toLowerCase();
      if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
        msg = 'E-mail ou senha incorretos. Por favor, verifique se o e-mail e a senha foram digitados corretamente ou se você possui cadastro.';
      } else if (lower.includes('email not confirmed')) {
        msg = 'E-mail ainda não confirmado. Verifique a caixa de entrada do seu e-mail para confirmar a conta.';
      } else if (lower.includes('too many requests') || lower.includes('rate limit')) {
        msg = 'Muitas tentativas sem sucesso. Por favor, aguarde alguns instantes antes de tentar novamente.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) {
      console.warn('[SUPABASE AUTH DEBUG] Cadastro ignorado: requisição já em andamento.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetEmail = registerEmail.trim();
    console.log('[SUPABASE AUTH DEBUG] Disparando 1x única requisição supabase.auth.signUp para:', targetEmail);

    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (!supabase) {
      setErrorMsg('Conexão ao banco de dados Supabase indisponível. O modo demo foi desativado e o sistema só funciona conectado ao banco de dados online.');
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: targetEmail,
        password: registerPassword,
      });

      if (error) throw error;

      console.log('[SUPABASE AUTH DEBUG] Resposta de signUp recebida com sucesso. User ID:', data?.user?.id);

      if (data?.user) {
        const isAdmin = targetEmail.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com';
        const assignedRole: UserRole = isAdmin ? 'admin' : 'registered';

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: data.user.id,
              email: data.user.email || targetEmail,
              role: assignedRole,
              updated_at: new Date().toISOString(),
            },
          ]);

        if (profileError) {
          console.warn('[SUPABASE AUTH DEBUG] Alerta ao criar perfil em profiles:', profileError.message);
        }

        // Tentar login automático imediato para que o usuário acesse o sistema instantaneamente
        let loggedIn = false;
        if (data.session) {
          loggedIn = true;
        } else {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: registerPassword,
          });
          if (!signInError && signInData?.user) {
            loggedIn = true;
          } else if (signInError) {
            console.warn('[SUPABASE AUTH DEBUG] Tentativa de login automático pós-cadastro:', signInError.message);
          }
        }

        if (loggedIn) {
          console.log('[SUPABASE AUTH DEBUG] Login automático concluído com sucesso!');
          onLoginSuccess(targetEmail, assignedRole);
          return;
        }

        setSuccessMsg('Conta criada com sucesso! Faça login abaixo para acessar.');
        setView('login');
        setEmail(targetEmail);
        setPassword(registerPassword);
      }
    } catch (err: any) {
      console.error('[SUPABASE AUTH DEBUG] Erro no cadastro:', err);
      let msg = err.message || 'Erro ao realizar cadastro.';
      const lower = msg.toLowerCase();
      if (lower.includes('already registered') || lower.includes('user_already_exists')) {
        msg = 'Este e-mail já está cadastrado no sistema. Tente fazer login ou redefinir sua senha.';
      } else if (lower.includes('rate limit')) {
        msg = 'O limite de envios de e-mail do Supabase foi atingido (email rate limit exceeded). Por favor, aguarde alguns minutos antes de tentar cadastrar novamente.';
      } else if (lower.includes('password should be at least')) {
        msg = 'A senha deve conter no mínimo 6 caracteres.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) {
      console.warn('[SUPABASE AUTH DEBUG] Recuperação de senha ignorada: requisição já em andamento.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    console.log('[SUPABASE AUTH DEBUG] Disparando 1x solicitação de resetPasswordForEmail para:', forgotEmail);

    if (!supabase) {
      setErrorMsg('O cliente do Supabase não está inicializado.');
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      setSuccessMsg('Instruções de redefinição enviadas! Verifique seu e-mail.');
      setView('login');
    } catch (err: any) {
      console.error('[SUPABASE AUTH DEBUG] Erro na recuperação de senha:', err);
      let msg = err.message || 'Erro ao solicitar redefinição.';
      const lower = msg.toLowerCase();
      if (lower.includes('rate limit')) {
        msg = 'Limite de envio de e-mails do Supabase atingido. Aguarde alguns minutos.';
      } else if (lower.includes('user not found')) {
        msg = 'Nenhuma conta foi encontrada com este e-mail.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
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
            <AppLogo 
              className="w-28 h-28 rounded-full border-2 border-emerald-500/30 shadow-xl object-cover relative z-10 mx-auto hover:scale-105 transition-transform duration-300"
              alt="Boa Sorte Agropecuária Logo"
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

              {(errorMsg.toLowerCase().includes('incorretos') || errorMsg.toLowerCase().includes('invalid login credentials') || errorMsg.toLowerCase().includes('credenciais')) && (
                <div className="mt-1 pt-2 border-t border-red-900/30 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterEmail(email.trim());
                      setView('register');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Criar cadastro com este e-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email.trim());
                      setView('forgot');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Redefinir senha
                  </button>
                </div>
              )}

              {(errorMsg.toLowerCase().includes('já está cadastrado') || errorMsg.toLowerCase().includes('already registered')) && (
                <div className="mt-1 pt-2 border-t border-red-900/30 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(registerEmail.trim());
                      setView('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Entrar com este e-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(registerEmail.trim());
                      setView('forgot');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Redefinir senha
                  </button>
                </div>
              )}

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
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="No mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showRegisterPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar Senha</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    required
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                    className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showRegisterConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showRegisterConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Perfil e Permissão no Sistema</label>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-amber-400 border border-slate-700">
                      Cadastrado (Sem Acesso)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Novas contas entram automaticamente como "Cadastrado" sem acesso às abas. O Administrador liberará e configurará seu perfil no painel de Configurações.
                  </p>
                </div>
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
