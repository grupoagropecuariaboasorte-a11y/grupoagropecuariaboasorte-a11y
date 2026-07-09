import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { fleetService } from './lib/fleetService';
import { Farm } from './types';

// Importar Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
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

function AppContent() {
  const location = useLocation();
  const [farms, setFarms] = useState<Farm[]>([]);

  // Estados de Sessão
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('agro_user_email') || '');
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'admin'>(() => {
    const email = localStorage.getItem('agro_user_email') || '';
    if (email.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com') {
      return 'admin';
    }
    return (localStorage.getItem('agro_user_role') as any) || '';
  });

  // Filtros Globais
  const [selectedFarmId, setSelectedFarmId] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  useEffect(() => {
    async function loadFarms() {
      try {
        const list = await fleetService.getFarms();
        setFarms(list);
      } catch (e) {
        console.error('Erro ao buscar fazendas no layout:', e);
      }
    }
    loadFarms();
  }, []);

  const handleLoginSuccess = (email: string, role: 'viewer' | 'editor' | 'admin') => {
    let finalRole = role;
    if (email.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com') {
      finalRole = 'admin';
    }
    setUserEmail(email);
    setUserRole(finalRole);
    localStorage.setItem('agro_user_email', email);
    localStorage.setItem('agro_user_role', finalRole);
  };

  const handleLogout = () => {
    setUserEmail('');
    setUserRole('viewer');
    localStorage.removeItem('agro_user_email');
    localStorage.removeItem('agro_user_role');
  };

  // Se o usuário não estiver logado, exibe a tela de Login
  if (!userEmail) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Mapear Títulos Amigáveis de Páginas para o Topbar
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Painel Geral de Ativos';
      case '/maquinas': return 'Máquinas e Veículos da Frota';
      case '/combustivel': return 'Registro de Abastecimento';
      case '/estoque-diesel': return 'Estoque e Depósitos de Diesel';
      case '/manutencao': return 'Manutenção e Reparos de Oficinas';
      case '/plano-preventivo': return 'Cronograma de Revisões Preventivas';
      case '/checklist': return 'Vistorias e Checklists 30 Dias';
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
            <Route path="/" element={<Dashboard selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />} />
            <Route path="/maquinas" element={<Machines selectedFarmId={selectedFarmId} userRole={userRole} />} />
            <Route path="/combustivel" element={<FuelPage selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />} />
            <Route path="/estoque-diesel" element={<DieselStock selectedFarmId={selectedFarmId} userRole={userRole} />} />
            <Route path="/manutencao" element={<Maintenance selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />} />
            <Route path="/plano-preventivo" element={<PreventivePlan selectedFarmId={selectedFarmId} userRole={userRole} />} />
            <Route path="/checklist" element={<ChecklistPage selectedFarmId={selectedFarmId} selectedPeriod={selectedPeriod} userRole={userRole} />} />
            <Route path="/ordens-servico" element={<WorkOrders selectedFarmId={selectedFarmId} userRole={userRole} />} />
            <Route path="/ranking-custos" element={<CostRanking selectedFarmId={selectedFarmId} />} />
            <Route path="/relatorio-mensal" element={<MonthlyReport selectedFarmId={selectedFarmId} />} />
            <Route path="/configuracoes" element={<SettingsPage userRole={userRole} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
