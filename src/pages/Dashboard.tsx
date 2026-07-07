import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fleetService } from '../lib/fleetService';
import { Farm, Machine, FuelLog, MaintenanceLog, PreventivePlanStatus, ChecklistSummary } from '../types';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Clock, Truck, 
  Wrench, Fuel, BarChart3, ChevronRight, FileX2, CheckSquare, Database 
} from 'lucide-react';

interface DashboardProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function Dashboard({ selectedFarmId, selectedPeriod, userRole }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // States para armazenar os dados brutos
  const [allFarms, setAllFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [preventivePlan, setPreventivePlan] = useState<PreventivePlanStatus[]>([]);
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary[]>([]);
  const [stockBalances, setStockBalances] = useState<any[]>([]);

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [farmsData, machinesData, fuelData, maintData, prevData, checkData, stockData] = await Promise.all([
          fleetService.getFarms(),
          fleetService.getMachines(),
          fleetService.getFuelLogs(),
          fleetService.getMaintenanceLogs(),
          fleetService.getPreventivePlanStatus(),
          fleetService.getChecklistSummary(),
          fleetService.getFuelStockBalance()
        ]);

        setAllFarms(farmsData);
        setMachines(machinesData);
        setFuelLogs(fuelData);
        setMaintenanceLogs(maintData);
        setPreventivePlan(prevData);
        setChecklistSummary(checkData);
        setStockBalances(stockData);
      } catch (e) {
        console.error('Erro ao carregar dados do painel:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs font-mono">Processando indicadores agrícolas...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LOGICA DE FILTRO GLOBAL (EM MEMÓRIA - ALTA VELOCIDADE)
  // =========================================================================

  // 1. Filtrar Máquinas e Checklists por Fazenda
  const filteredMachines = selectedFarmId === 'ALL' 
    ? machines 
    : machines.filter(m => m.farm_id === selectedFarmId);

  const filteredChecklistSummary = selectedFarmId === 'ALL'
    ? checklistSummary
    : checklistSummary.filter(c => c.farm_id === selectedFarmId);

  const filteredPreventivePlan = selectedFarmId === 'ALL'
    ? preventivePlan
    : preventivePlan.filter(p => p.farm_id === selectedFarmId);

  // Helper para verificar datas do período selecionado
  const isDateInPeriod = (dateStr: string) => {
    if (selectedPeriod === 'ALL') return true;
    const date = new Date(dateStr);
    const today = new Date();
    
    if (selectedPeriod === '30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return date >= thirtyDaysAgo;
    }
    
    if (selectedPeriod === 'THIS_MONTH') {
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
    
    if (selectedPeriod === 'THIS_YEAR') {
      return date.getFullYear() === today.getFullYear();
    }
    
    return true;
  };

  // 2. Filtrar abastecimentos por Fazenda e Período
  const filteredFuelLogs = fuelLogs.filter(log => {
    const farmMatch = selectedFarmId === 'ALL' || log.farm_id === selectedFarmId;
    const periodMatch = isDateInPeriod(log.date);
    return farmMatch && periodMatch;
  });

  // 3. Filtrar manutenções por Fazenda e Período
  const filteredMaintLogs = maintenanceLogs.filter(log => {
    const machine = machines.find(m => m.id === log.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);
    const periodMatch = isDateInPeriod(log.date);
    return farmMatch && periodMatch;
  });

  // =========================================================================
  // METRICAS CALCULADAS
  // =========================================================================

  // KPI 1: Gasto em Combustível
  const totalFuelCost = filteredFuelLogs.reduce((sum, current) => sum + current.total_value, 0);

  // KPI 2: Gasto em Manutenção
  const totalMaintCost = filteredMaintLogs.reduce((sum, current) => sum + current.total_cost, 0);

  // KPI 3: Litros Abastecidos
  const totalLiters = filteredFuelLogs.reduce((sum, current) => sum + current.liters_supplied, 0);

  // KPI 4: Máquinas Ativas / Cadastradas
  const activeMachinesCount = filteredMachines.filter(m => m.status === 'Ativa').length;
  const totalMachinesCount = filteredMachines.length;

  // Situação Geral de Manutenções (Badges)
  const maintStatus = {
    vencidas: filteredPreventivePlan.filter(p => p.status === 'VENCIDA').length,
    proximas: filteredPreventivePlan.filter(p => p.status === 'PRÓXIMA').length,
    ok: filteredPreventivePlan.filter(p => p.status === 'OK').length,
  };

  // Checklists 30 Dias (Badges)
  const checklistStatus = {
    vencidos: filteredChecklistSummary.filter(c => c.status === 'VENCIDO').length,
    proximos: filteredChecklistSummary.filter(c => c.status === 'PRÓXIMO').length,
    ok: filteredChecklistSummary.filter(c => c.status === 'OK').length,
    nunca: filteredChecklistSummary.filter(c => c.status === 'NUNCA').length,
  };

  // =========================================================================
  // DADOS DOS GRÁFICOS
  // =========================================================================

  // Gráfico A: Consumo de diesel últimos meses (Últimos 12 meses)
  const monthlyAggregates: { [key: string]: { litros: number; custo: number } } = {};
  filteredFuelLogs.forEach(log => {
    const d = new Date(log.date);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyAggregates[label]) {
      monthlyAggregates[label] = { litros: 0, custo: 0 };
    }
    monthlyAggregates[label].litros += log.liters_supplied;
    monthlyAggregates[label].custo += log.total_value;
  });

  const chartDieselData = Object.keys(monthlyAggregates)
    .sort()
    .map(key => ({
      name: key,
      'Litros Consumidos': Number(monthlyAggregates[key].litros.toFixed(1)),
      'Custo Total (R$)': Number(monthlyAggregates[key].custo.toFixed(2))
    }));

  // Gráfico B: Ranking de Máquinas mais caras (Top 10)
  const machineCosts: { [key: string]: { code: string; name: string; fuel: number; maint: number; total: number } } = {};
  
  // somar combustível
  filteredFuelLogs.forEach(log => {
    const m = machines.find(x => x.id === log.machine_id);
    if (!m) return;
    if (!machineCosts[log.machine_id]) {
      machineCosts[log.machine_id] = { code: m.code, name: m.name, fuel: 0, maint: 0, total: 0 };
    }
    machineCosts[log.machine_id].fuel += log.total_value;
    machineCosts[log.machine_id].total += log.total_value;
  });

  // somar manutenção
  filteredMaintLogs.forEach(log => {
    const m = machines.find(x => x.id === log.machine_id);
    if (!m) return;
    if (!machineCosts[log.machine_id]) {
      machineCosts[log.machine_id] = { code: m.code, name: m.name, fuel: 0, maint: 0, total: 0 };
    }
    machineCosts[log.machine_id].maint += log.total_cost;
    machineCosts[log.machine_id].total += log.total_cost;
  });

  const chartMachineCostsData = Object.values(machineCosts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(m => ({
      name: m.code,
      'Combustível': Number(m.fuel.toFixed(2)),
      'Manutenção': Number(m.maint.toFixed(2)),
      'Total': Number(m.total.toFixed(2)),
      fullName: m.name
    }));

  // Alerta de máquinas sem nenhum checklist
  const machinesNoChecklist = filteredChecklistSummary.filter(c => c.status === 'NUNCA');

  // Alerta de baixo estoque de diesel por fazenda
  const activeStocksFiltered = stockBalances.filter(sb => {
    if (selectedFarmId !== 'ALL' && sb.farm_id !== selectedFarmId) return false;
    return sb.current_balance <= sb.min_alert;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden group hover:border-[#1B3022]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#1B3022]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Combustível Total</span>
            <div className="p-2 bg-[#1B3022]/10 text-[#1B3022] rounded-xl border border-[#1B3022]/20">
              <Fuel size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-[#1B3022] font-sans">
              R$ {totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-[#1B3022] font-semibold">{totalLiters.toLocaleString('pt-BR')} L</span> fornecidos no total
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Manutenções</span>
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
              <Wrench size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-[#1B3022] font-sans">
              R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Reflete serviços preventivos e corretivos
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Diesel Abastecido</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-[#1B3022] font-sans">
              {totalLiters.toLocaleString('pt-BR')} L
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Total de litros transferidos para tanques internos
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all duration-300">
          <div className="absolute top-0 left-0 w-2 h-full bg-slate-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Frota / Máquinas</span>
            <div className="p-2 bg-slate-100 text-[#1B3022] rounded-xl border border-slate-200">
              <Truck size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-[#1B3022] font-sans">
              {totalMachinesCount} Equipamentos
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{activeMachinesCount} ativas</span> de {totalMachinesCount} cadastradas
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Situação de Manutenções & Checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bloco Situação Geral de Manutenções */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Wrench size={16} className="text-[#1B3022]" />
              Plano de Revisão Preventiva
            </h4>
            <button 
              onClick={() => navigate('/plano-preventivo')} 
              className="text-xs text-[#1B3022] hover:underline font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver Plano <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center cursor-pointer hover:border-red-500/20 transition-all" onClick={() => navigate('/plano-preventivo')}>
              <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Vencidas</p>
              <h5 className="text-3xl font-black text-red-600 mt-1 font-sans">{maintStatus.vencidas}</h5>
              <span className="inline-block mt-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center cursor-pointer hover:border-amber-500/20 transition-all" onClick={() => navigate('/plano-preventivo')}>
              <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Próximos 7d</p>
              <h5 className="text-3xl font-black text-amber-600 mt-1 font-sans">{maintStatus.proximas}</h5>
              <span className="inline-block mt-2 w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-500/20 transition-all" onClick={() => navigate('/plano-preventivo')}>
              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Em Dia</p>
              <h5 className="text-3xl font-black text-emerald-600 mt-1 font-sans">{maintStatus.ok}</h5>
              <span className="inline-block mt-2 w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* Bloco Checklists de 30 Dias */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <CheckSquare size={16} className="text-[#1B3022]" />
              Checklists de 30 Dias
            </h4>
            <button 
              onClick={() => navigate('/checklist')} 
              className="text-xs text-[#1B3022] hover:underline font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver Logs <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center cursor-pointer hover:border-red-500/20 transition-all" onClick={() => navigate('/checklist')}>
              <p className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Vencidos</p>
              <h5 className="text-2xl font-black text-red-600 mt-1 font-sans">{checklistStatus.vencidos}</h5>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center cursor-pointer hover:border-amber-500/20 transition-all" onClick={() => navigate('/checklist')}>
              <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">Perto (30d)</p>
              <h5 className="text-2xl font-black text-amber-600 mt-1 font-sans">{checklistStatus.proximos}</h5>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-500/20 transition-all" onClick={() => navigate('/checklist')}>
              <p className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Em Dia</p>
              <h5 className="text-2xl font-black text-emerald-600 mt-1 font-sans">{checklistStatus.ok}</h5>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center cursor-pointer hover:border-slate-300 transition-all" onClick={() => navigate('/checklist')}>
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Sem Hist.</p>
              <h5 className="text-2xl font-black text-slate-600 mt-1 font-sans">{checklistStatus.nunca}</h5>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Gráficos de Consumo e Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico 1: Consumo Mensal */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6 flex items-center gap-2">
            <Fuel size={16} className="text-[#1B3022]" />
            Consumo de Diesel — Histórico
          </h4>
          <div className="h-80 w-full">
            {chartDieselData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDieselData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis yAxisId="left" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#16a34a" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: 12, color: '#1e293b' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="Litros Consumidos" stroke="#1B3022" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Custo Total (R$)" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileX2 size={40} className="mb-2" />
                <p className="text-xs">Nenhum abastecimento no período para plotar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Top Máquinas por Custo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#1B3022]" />
              Top Máquinas por Custo Acumulado (R$)
            </h4>
            <button 
              onClick={() => navigate('/ranking-custos')} 
              className="text-xs text-[#1B3022] hover:underline font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ranking Geral <ChevronRight size={14} />
            </button>
          </div>
          <div className="h-80 w-full">
            {chartMachineCostsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMachineCostsData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: 12, color: '#1e293b' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Combustível" stackId="a" fill="#1B3022" />
                  <Bar dataKey="Manutenção" stackId="a" fill="#eab308" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileX2 size={40} className="mb-2" />
                <p className="text-xs">Nenhum custo registrado para plotar.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Estoque por fazenda & Alertas críticos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Estoque de Combustível por Fazenda */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Database size={16} className="text-[#1B3022]" />
              Estoque de Diesel das Fazendas
            </h4>
            <button 
              onClick={() => navigate('/estoque-diesel')} 
              className="text-xs text-[#1B3022] hover:underline font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              Gerenciar Estoques <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-5">
            {stockBalances.map((sb) => {
              const capMax = sb.total_received || 5000;
              const perc = capMax > 0 ? Math.min(100, Math.max(0, (sb.current_balance / capMax) * 100)) : 0;
              const isLow = sb.current_balance <= sb.min_alert;
              
              return (
                <div key={sb.farm_id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{sb.farm_name}</h5>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Alerta Mínimo: {sb.min_alert.toLocaleString('pt-BR')} L
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black font-mono ${isLow ? 'text-red-600' : 'text-[#1B3022]'}`}>
                        {sb.current_balance.toLocaleString('pt-BR')} L
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Saldo Atual</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? 'bg-red-500' : 'bg-[#1B3022]'
                      }`}
                      style={{ width: `${perc}%` }}
                    />
                  </div>

                  {isLow && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-2 font-medium">
                      <AlertTriangle size={12} className="shrink-0" />
                      <span>Alerta: Estoque crítico! Abaixo de {sb.min_alert.toLocaleString('pt-BR')} L. Necessita reabastecimento.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas Críticos: Máquinas Sem Checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-5 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Alertas e Vistorias Pendentes
          </h4>

          {machinesNoChecklist.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 leading-normal flex items-start gap-2 mb-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>As seguintes máquinas <strong>nunca realizaram</strong> vistoria de checklist 30 dias:</span>
              </div>
              {machinesNoChecklist.map((m) => (
                <div 
                  key={m.machine_id}
                  className="bg-slate-50 border border-slate-100 hover:border-slate-200 p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  onClick={() => navigate('/checklist')}
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{m.machine_code}</h5>
                    <p className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5">{m.machine_name}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                    ⚠️ Sem Checklist
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center px-4">
              <CheckCircle size={32} className="text-[#1B3022] mb-2" />
              <p className="text-xs font-bold text-slate-800">Nenhum alerta crítico ativo</p>
              <p className="text-[10px] text-slate-500 mt-1">Todas as máquinas possuem histórico recente de checklist.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
