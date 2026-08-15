import { useState, useEffect, JSX } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ShieldAlert, Lock, LogOut, UserCheck } from 'lucide-react';
import { fleetService } from './lib/fleetService';
import { supabase } from './lib/supabaseClient';
import { Farm, UserRole } from './types';

// Importar Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import Implementos from './pages/Implementos';
import FuelPage from './pages/Fuel';
import DieselStock from './pages/DieselStock';
import Maintenance from './pages/Maintenance';
import PreventivePlan from './pages/PreventivePlan';
import ChecklistPage from './pages/Checklist';
import WorkOrders from './pages/WorkOrders';
import CostRanking from './pages/CostRanking';
import MonthlyReport from './pages/MonthlyReport';
import SettingsPage from './pages/Settings';

// Importar Componentes Compartilhados
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AppLogo from './components/AppLogo';
import { useTablet12Inch } from './lib/useTablet12Inch';

const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: [
    '/',
    '/maquinas',
    '/implementos',
    '/combustivel',
    '/estoque-diesel',
    '/manutencao',
    '/plano-preventivo',
    '/checklist',
    '/ordens-servico',
    '/ranking-custos',
    '/relatorio-mensal',
    '/configuracoes'
  ],
  control: [
    '/',
    '/maquinas',
    '/implementos',
    '/combustivel',
    '/estoque-diesel',
    '/manutencao',
    '/plano-preventivo',
    '/checklist',
    '/ordens-servico',
    '/ranking-custos',
    '/relatorio-mensal'
  ],
  fuel: [
    '/combustivel',
    '/estoque-diesel'
  ],
  mechanic: [
    '/manutencao',
    '/plano-preventivo',
    '/checklist',
    '/ordens-servico'
  ],
  editor: [
    '/',
    '/maquinas',
    '/implementos',
    '/combustivel',
    '/estoque-diesel',
    '/manutencao',
    '/plano-preventivo',
    '/checklist',
    '/ordens-servico',
    '/ranking-custos',
    '/relatorio-mensal'
  ],
  viewer: [],
  registered: []
};

const ROLE_DEFAULT_PATH: Record<UserRole, string> = {
  admin: '/',
  control: '/',
  fuel: '/combustivel',
  mechanic: '/manutencao',
  editor: '/',
  viewer: '/',
  registered: '/'
};

function ProtectedRoute({ 
  path, 
  userRole, 
  children 
}: { 
  path: string; 
  userRole: UserRole; 
  children: JSX.Element 
}) {
  const allowedPaths = ROLE_ALLOWED_PATHS[userRole] || [];
  if (!allowedPaths.includes(path)) {
    const defaultPath = ROLE_DEFAULT_PATH[userRole] || '/';
    return <Navigate to={defaultPath} replace />;
  }
  return children;
}

function AppContent() {
  useTablet12Inch(); // Ativa detecção automática de tablets 12.8" (11" a 13.5") e aplica classes CSS touch-optimized
  const location = useLocation();
  const [farms, setFarms] = useState<Farm[]>([]);

  // Estados de Sessão
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('agro_user_email') || '');
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const email = localStorage.getItem('agro_user_email') || '';
    if (email.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com') {
      return 'admin';
    }
    return (localStorage.getItem('agro_user_role') as UserRole) || 'registered';
  });

  // Filtros Globais
  const [selectedFarmId, setSelectedFarmId] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  const refreshFarms = async () => {
    try {
      const list = await fleetService.getFarms();
      setFarms(list);
    } catch (e) {
      console.error('Erro ao buscar fazendas no layout:', e);
    }
  };

  useEffect(() => {
    refreshFarms();
  }, []);

  // Garantir que o perfil existe no Supabase para que o RLS funcionar (importante se recarregar a página já logado)
  useEffect(() => {
    async function ensureProfile() {
      if (userEmail && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
             const isAdmin = userEmail.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com';
             const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
             if (profile) {
                let role = profile.role as UserRole;
                if (profile.email && profile.email.includes('|role:')) {
                  const parts = profile.email.split('|role:');
                  if (parts[1]) role = parts[1] as UserRole;
                }
                const effectiveRole = isAdmin ? 'admin' : (role || 'registered');
                setUserRole(effectiveRole);
                localStorage.setItem('agro_user_role', effectiveRole);
             } else {
                const defaultRole: UserRole = isAdmin ? 'admin' : 'registered';
                await supabase.from('profiles').insert({
                   id: authData.user.id,
                   email: userEmail.toLowerCase(),
                   role: defaultRole,
                   updated_at: new Date().toISOString()
                }).catch(err => console.warn('Erro ao criar perfil default:', err));

                setUserRole(defaultRole);
                localStorage.setItem('agro_user_role', defaultRole);
             }
          }
        } catch (e) {
          console.error("Erro ao verificar perfil:", e);
        }
      }
    }
    ensureProfile();
  }, [userEmail]);

  const handleLoginSuccess = (email: string, role: UserRole) => {
    let finalRole = role;
    if (email.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com') {
      finalRole = 'admin';
    }
    setUserEmail(email);
    setUserRole(finalRole);
    localStorage.setItem('agro_user_email', email);
    localStorage.setItem('agro_user_role', finalRole);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUserEmail('');
    setUserRole('registered');
    localStorage.removeItem('agro_user_email');
    localStorage.removeItem('agro_user_role');
  };

  // Se o usuário não estiver logado, exibe a tela de Login
  if (!userEmail) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Se o usuário possui o perfil "visualizador" ou "cadastrado", não exibe NENHUMA aba do sistema
  if (userRole === 'viewer' || userRole === 'registered') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="flex flex-col items-center max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-sm">
          {/* Logo */}
          <AppLogo className="w-24 h-24 rounded-full border-2 border-amber-400/40 object-cover shadow-2xl mb-4 shrink-0" />

          {/* Nome da Empresa */}
          <h1 className="text-2xl font-black text-amber-400 tracking-tight mb-4 uppercase">
            Boa Sorte Agropecuária
          </h1>

          {/* Mensagem Solicitada */}
          <p className="text-slate-200 text-sm md:text-base leading-relaxed mb-6 font-medium">
            Seu cadastro é simplesmente visualizador, sem acesso a nenhuma funcionalidade. Aguarde alteração/autorização do administrador.
          </p>

          <p className="text-xs text-slate-400 mb-6">
            Usuário: <span className="text-slate-200 font-semibold">{userEmail}</span>
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <LogOut size={16} />
            <span>Sair da Conta / Trocar de Usuário</span>
          </button>
        </div>
      </div>
    );
  }

  // Mapear Títulos Amigáveis de Páginas para o Topbar
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Painel Geral de Ativos';
      case '/maquinas': return 'Máquinas e Veículos da Frota';
      case '/implementos': return 'Implementos e Equipamentos Agrícolas';
      case '/combustivel': return 'Registro de Abastecimento';
      case '/estoque-diesel': return 'Estoque e Depósitos de Diesel';
      case '/manutencao': return 'Manutenção e Reparos de Oficinas';
      case '/plano-preventivo': return 'Cronograma de Revisões Preventivas';
      case '/checklist': return 'Vistorias e Checklists 7 Dias';
      case '/ordens-servico': return 'Quadro de Ordens de Serviço';
      case '/ranking-custos': return 'Ranking de Custos Acumulados';
      case '/relatorio-mensal': return 'Relatório Mensal de Fechamento';
      case '/configuracoes': return 'Administração e Configurações';
      default: return 'Frota Agro';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      {/* Sidebar de Navegação - Esconder na Impressão */}
      <Sidebar userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />

      {/* Container Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar com filtros Globais - Esconder na Impressão */}
        <Topbar
          title={getPageTitle(location.pathname)}
          farms={farms}
          selectedFarmId={selectedFarmId}
          onChangeFarm={setSelectedFarmId}
          selectedPeriod={selectedPeriod}
          onChangePeriod={setSelectedPeriod}
          userEmail={userEmail}
        />

        {/* Corpo da Página / Scroll Área */}
        <main className="flex-1 overflow-y-auto px-8 py-6 print:p-0 print:overflow-visible">
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute path="/" userRole={userRole}>
                  <Dashboard selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/maquinas" 
              element={
                <ProtectedRoute path="/maquinas" userRole={userRole}>
                  <Machines selectedFarmId={selectedFarmId} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/implementos" 
              element={
                <ProtectedRoute path="/implementos" userRole={userRole}>
                  <Implementos selectedFarmId={selectedFarmId} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/combustivel" 
              element={
                <ProtectedRoute path="/combustivel" userRole={userRole}>
                  <FuelPage selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/estoque-diesel" 
              element={
                <ProtectedRoute path="/estoque-diesel" userRole={userRole}>
                  <DieselStock selectedFarmId={selectedFarmId} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manutencao" 
              element={
                <ProtectedRoute path="/manutencao" userRole={userRole}>
                  <Maintenance selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/plano-preventivo" 
              element={
                <ProtectedRoute path="/plano-preventivo" userRole={userRole}>
                  <PreventivePlan selectedFarmId={selectedFarmId} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/checklist" 
              element={
                <ProtectedRoute path="/checklist" userRole={userRole}>
                  <ChecklistPage selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ordens-servico" 
              element={
                <ProtectedRoute path="/ordens-servico" userRole={userRole}>
                  <WorkOrders selectedFarmId={selectedFarmId} userRole={userRole} userEmail={userEmail} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ranking-custos" 
              element={
                <ProtectedRoute path="/ranking-custos" userRole={userRole}>
                  <CostRanking selectedFarmId={selectedFarmId} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/relatorio-mensal" 
              element={
                <ProtectedRoute path="/relatorio-mensal" userRole={userRole}>
                  <MonthlyReport selectedFarmId={selectedFarmId} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/configuracoes" 
              element={
                <ProtectedRoute path="/configuracoes" userRole={userRole}>
                  <SettingsPage userRole={userRole} onRefreshFarms={refreshFarms} />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to={ROLE_DEFAULT_PATH[userRole] || '/'} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
