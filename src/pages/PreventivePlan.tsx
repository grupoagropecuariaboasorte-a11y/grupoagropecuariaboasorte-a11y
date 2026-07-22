import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { PreventivePlanStatus, Farm, Machine, MaintenanceLog } from '../types';
import Modal from '../components/Modal';
import { 
  CalendarDays, Plus, Search, CheckCircle, AlertTriangle, 
  Clock, ArrowRight, Wrench, ChevronRight, Info,
  Filter, Edit, Trash2, FileText, History, ShieldCheck, Check
} from 'lucide-react';

interface PreventivePlanProps {
  selectedFarmId: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function PreventivePlan({ selectedFarmId, userRole }: PreventivePlanProps) {
  const [plans, setPlans] = useState<PreventivePlanStatus[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [maintLogs, setMaintLogs] = useState<MaintenanceLog[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Navegação de Visualização: Cronograma/Configurações ou Histórico de Lançamentos
  const [activeTab, setActiveTab] = useState<'cronograma' | 'historico'>('cronograma');

  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');

  // Modais
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isEditConfigOpen, setIsEditConfigOpen] = useState(false);
  const [isPerformOpen, setIsPerformOpen] = useState(false);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'config' | 'log'; id: string; title: string } | null>(null);

  // Form Config States (Nova Configuração)
  const [configMachineId, setConfigMachineId] = useState('');
  const [configItem, setConfigItem] = useState('Motor e Filtros');
  const [configIntervalDays, setConfigIntervalDays] = useState<number | ''>('');
  const [configIntervalHours, setConfigIntervalHours] = useState<number | ''>('');
  const [configLastDate, setConfigLastDate] = useState('');
  const [configLastHourKm, setConfigLastHourKm] = useState<number | ''>('');

  // Form Edit Config States (Editar Configuração)
  const [editConfigId, setEditConfigId] = useState('');
  const [editConfigMachineId, setEditConfigMachineId] = useState('');
  const [editConfigItem, setEditConfigItem] = useState('');
  const [editConfigIntervalDays, setEditConfigIntervalDays] = useState<number | ''>('');
  const [editConfigIntervalHours, setEditConfigIntervalHours] = useState<number | ''>('');

  // Form Perform States (Registrar Manutenção Concluída)
  const [performMachineId, setPerformMachineId] = useState('');
  const [performItem, setPerformItem] = useState('');
  const [performDate, setPerformDate] = useState(new Date().toISOString().split('T')[0]);
  const [performHourKm, setPerformHourKm] = useState<number | ''>('');
  const [performPartsCost, setPerformPartsCost] = useState<number | ''>('');
  const [performLaborCost, setPerformLaborCost] = useState<number | ''>('');
  const [performParts, setPerformParts] = useState('');
  const [performResponsible, setPerformResponsible] = useState('');
  const [performDesc, setPerformDesc] = useState('');
  const [planItemId, setPlanItemId] = useState('');

  // Form Edit Log States (Editar Lançamento Histórico)
  const [editLogId, setEditLogId] = useState('');
  const [editLogMachineId, setEditLogMachineId] = useState('');
  const [editLogItem, setEditLogItem] = useState('');
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogHourKm, setEditLogHourKm] = useState<number | ''>('');
  const [editLogPartsCost, setEditLogPartsCost] = useState<number | ''>('');
  const [editLogLaborCost, setEditLogLaborCost] = useState<number | ''>('');
  const [editLogParts, setEditLogParts] = useState('');
  const [editLogResponsible, setEditLogResponsible] = useState('');
  const [editLogDesc, setEditLogDesc] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prevList, mList, fList, lData, mLogs] = await Promise.all([
          fleetService.getPreventivePlanStatus(),
          fleetService.getMachines(),
          fleetService.getFarms(),
          fleetService.getLookups(),
          fleetService.getMaintenanceLogs()
        ]);
        setPlans(prevList);
        setMachines(mList);
        setFarms(fList);
        setLookups(lData);
        setMaintLogs(mLogs);

        const farmMachs = mList.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
        if (farmMachs.length > 0) {
          setConfigMachineId(farmMachs[0].id);
          setConfigLastHourKm(farmMachs[0].current_hour_km || farmMachs[0].initial_hour_km);
        } else if (mList.length > 0) {
          setConfigMachineId(mList[0].id);
          setConfigLastHourKm(mList[0].current_hour_km || mList[0].initial_hour_km);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedFarmId]);

  const refreshList = async () => {
    try {
      const [prevList, mList, mLogs] = await Promise.all([
        fleetService.getPreventivePlanStatus(),
        fleetService.getMachines(),
        fleetService.getMaintenanceLogs()
      ]);
      setPlans(prevList);
      setMachines(mList);
      setMaintLogs(mLogs);
    } catch (err) {
      console.error(err);
    }
  };

  // Preencher horímetro ao selecionar máquina no form de config
  useEffect(() => {
    if (!configMachineId) return;
    const mach = machines.find(m => m.id === configMachineId);
    if (mach) {
      setConfigLastHourKm(mach.current_hour_km || mach.initial_hour_km);
    }
  }, [configMachineId, machines]);

  // Submissão de novo item de plano preventivo
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configIntervalDays && !configIntervalHours) {
      alert('Você deve preencher ao menos um intervalo de controle (dias ou horímetro)!');
      return;
    }

    try {
      await fleetService.addPreventivePlan({
        machine_id: configMachineId,
        maintenance_item: configItem,
        interval_days: Number(configIntervalDays || 0),
        interval_hour_km: Number(configIntervalHours || 0)
      });

      // Se informou dados de última realização na criação, salva o log correspondente
      if (configLastDate || configLastHourKm) {
        await fleetService.addMaintenanceLog({
          machine_id: configMachineId,
          date: configLastDate || new Date().toISOString().split('T')[0],
          main_item: configItem,
          type: 'preventiva',
          service_description: `Ajuste / Registro Inicial da Preventiva: ${configItem}`,
          hour_km_at_service: Number(configLastHourKm || 0),
          responsible: 'Sistema / Registro Inicial'
        });
      }

      setIsConfigOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao configurar plano: ' + err.message);
    }
  };

  const handleOpenConfig = () => {
    setConfigIntervalDays('');
    setConfigIntervalHours('');
    setConfigLastDate('');
    
    const farmMachines = machines.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
    if (farmMachines.length > 0) {
      setConfigMachineId(farmMachines[0].id);
      setConfigLastHourKm(farmMachines[0].current_hour_km || farmMachines[0].initial_hour_km);
    } else if (machines.length > 0) {
      setConfigMachineId(machines[0].id);
      setConfigLastHourKm(machines[0].current_hour_km || machines[0].initial_hour_km);
    } else {
      setConfigMachineId('');
      setConfigLastHourKm('');
    }
    
    if (lookups && lookups.maintenanceCategories && lookups.maintenanceCategories.length > 0) {
      setConfigItem(lookups.maintenanceCategories[0]);
    }
    setIsConfigOpen(true);
  };

  // Abrir modal de Edição de Configuração
  const handleOpenEditConfig = (p: PreventivePlanStatus) => {
    setEditConfigId(p.plan_item_id);
    setEditConfigMachineId(p.machine_id);
    setEditConfigItem(p.maintenance_item);
    setEditConfigIntervalDays(p.interval_days || '');
    setEditConfigIntervalHours(p.interval_hour_km || '');
    setIsEditConfigOpen(true);
  };

  const handleEditConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editConfigIntervalDays && !editConfigIntervalHours) {
      alert('Informe ao menos um intervalo de controle (dias ou horímetro)!');
      return;
    }

    try {
      await fleetService.updatePreventivePlan(editConfigId, {
        machine_id: editConfigMachineId,
        maintenance_item: editConfigItem,
        interval_days: Number(editConfigIntervalDays || 0),
        interval_hour_km: Number(editConfigIntervalHours || 0)
      });
      setIsEditConfigOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao atualizar plano: ' + err.message);
    }
  };

  // Abrir modal de Realizar Manutenção
  const handleOpenPerform = (p: PreventivePlanStatus) => {
    setPlanItemId(p.plan_item_id);
    setPerformMachineId(p.machine_id);
    setPerformItem(p.maintenance_item);
    setPerformDate(new Date().toISOString().split('T')[0]);
    
    const mach = machines.find(m => m.id === p.machine_id);
    setPerformHourKm(mach ? mach.current_hour_km : '');
    
    setPerformPartsCost('');
    setPerformLaborCost('');
    setPerformParts('');
    setPerformResponsible('');
    setPerformDesc(`Manutenção preventiva periódica do item: ${p.maintenance_item}.`);
    setIsPerformOpen(true);
  };

  // Salvar manutenção e reajustar plano preventivo
  const handlePerformSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addMaintenanceLog({
        machine_id: performMachineId,
        date: performDate,
        type: 'preventiva',
        main_item: performItem,
        service_description: performDesc,
        hour_km_at_service: Number(performHourKm),
        parts_cost: Number(performPartsCost || 0),
        labor_cost: Number(performLaborCost || 0),
        parts_replaced: performParts,
        responsible: performResponsible
      });

      await fleetService.performPreventiveMaintenance(planItemId, performDate, Number(performHourKm));

      setIsPerformOpen(false);
      refreshList();
      alert('Manutenção preventiva registrada e cronograma atualizado!');
    } catch (err: any) {
      alert('Erro ao registrar: ' + err.message);
    }
  };

  // Abrir modal de Edição de Lançamento Histórico
  const handleOpenEditLog = (log: MaintenanceLog) => {
    setEditLogId(log.id);
    setEditLogMachineId(log.machine_id);
    setEditLogItem(log.main_item || 'Geral');
    setEditLogDate(log.date ? log.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditLogHourKm(log.hour_km_at_service ?? '');
    setEditLogPartsCost(log.parts_cost ?? '');
    setEditLogLaborCost(log.labor_cost ?? '');
    setEditLogParts(log.parts_replaced || '');
    setEditLogResponsible(log.responsible || '');
    setEditLogDesc(log.service_description || '');
    setIsEditLogOpen(true);
  };

  const handleEditLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.updateMaintenanceLog(editLogId, {
        machine_id: editLogMachineId,
        date: editLogDate,
        main_item: editLogItem,
        hour_km_at_service: Number(editLogHourKm),
        parts_cost: Number(editLogPartsCost || 0),
        labor_cost: Number(editLogLaborCost || 0),
        parts_replaced: editLogParts,
        responsible: editLogResponsible,
        service_description: editLogDesc
      });
      setIsEditLogOpen(false);
      refreshList();
      alert('Lançamento de manutenção atualizado!');
    } catch (err: any) {
      alert('Erro ao atualizar lançamento: ' + err.message);
    }
  };

  // Exclusão genérica com confirmação
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'config') {
        await fleetService.deletePreventivePlan(deleteTarget.id);
      } else if (deleteTarget.type === 'log') {
        await fleetService.deleteMaintenanceLog(deleteTarget.id);
      }
      setDeleteTarget(null);
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // =========================================================================
  // LÓGICA DE FILTRAGEM
  // =========================================================================
  const filteredPlans = plans.filter(p => {
    const farmMatch = selectedFarmId === 'ALL' || p.farm_id === selectedFarmId;
    const machineMatch = machineFilter === 'ALL' || p.machine_id === machineFilter;
    const statusMatch = statusFilter === 'ALL' || p.status === statusFilter;
    
    const machine = machines.find(m => m.id === p.machine_id);
    const textMatch = 
      (p.maintenance_item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && machineMatch && statusMatch && textMatch;
  });

  const filteredMaintLogs = maintLogs.filter(log => {
    if (log.type !== 'preventiva') return false;
    const machine = machines.find(m => m.id === log.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);
    const machineMatch = machineFilter === 'ALL' || log.machine_id === machineFilter;
    const textMatch = 
      (log.main_item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.service_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.responsible || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && machineMatch && textMatch;
  });

  // Estatísticas da Máquina Selecionada para a Inspeção Rápida
  const selectedMachineObj = machineFilter !== 'ALL' ? machines.find(m => m.id === machineFilter) : null;
  const selectedMachinePlans = selectedMachineObj ? plans.filter(p => p.machine_id === selectedMachineObj.id) : [];
  const overdueCount = selectedMachinePlans.filter(p => p.status === 'VENCIDA').length;
  const warningCount = selectedMachinePlans.filter(p => p.status === 'PRÓXIMA').length;
  const okCount = selectedMachinePlans.filter(p => p.status === 'OK').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <CalendarDays size={18} className="text-[#1B3022]" />
            Cronograma e Lançamentos de Manutenção Preventiva
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Controle de revisões por dias acumulados e horímetro. Inspeção individual por máquina com histórico de alterações.
          </p>
        </div>

        {userRole !== 'viewer' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenConfig}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus size={14} />
              <span>Configurar Nova Preventiva</span>
            </button>
          </div>
        )}
      </div>

      {/* PAINEL DE INSPEÇÃO RÁPIDA DA MÁQUINA SELECIONADA */}
      {selectedMachineObj && (
        <div className="bg-[#1B3022] text-white p-5 rounded-2xl shadow-md border border-[#1B3022]/80 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-mono font-bold text-emerald-300 text-sm shrink-0">
                {selectedMachineObj.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{selectedMachineObj.name}</h4>
                  <span className="text-[10px] bg-white/10 text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                    {farms.find(f => f.id === selectedMachineObj.farm_id)?.name || 'Fazenda'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  Horímetro Atual: <strong className="text-emerald-400">{selectedMachineObj.current_hour_km.toLocaleString('pt-BR')} H/km</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Diagnóstico de Inspeção:</span>
              {overdueCount > 0 ? (
                <span className="text-red-300 font-bold bg-red-950/60 px-2 py-0.5 rounded-md border border-red-500/30">
                  {overdueCount} {overdueCount === 1 ? 'item vencido' : 'itens vencidos'}
                </span>
              ) : warningCount > 0 ? (
                <span className="text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                  {warningCount} em atenção
                </span>
              ) : (
                <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Todas em dia ({okCount})
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <p className="text-[#A3B18A] text-[10px] uppercase font-bold tracking-wider">Itens Mapeados</p>
              <p className="text-lg font-bold font-mono text-white mt-1">{selectedMachinePlans.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <p className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider">Em Dia (OK)</p>
              <p className="text-lg font-bold font-mono text-emerald-300 mt-1">{okCount}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <p className="text-amber-400 text-[10px] uppercase font-bold tracking-wider">Próximos (Atenção)</p>
              <p className="text-lg font-bold font-mono text-amber-300 mt-1">{warningCount}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">Vencidos / Atrasados</p>
              <p className="text-lg font-bold font-mono text-red-300 mt-1">{overdueCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* SELETOR DE NAVEGAÇÃO ENTRE TABS E FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Tabs principais */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('cronograma')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'cronograma' 
                  ? 'bg-white text-[#1B3022] shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays size={14} />
              <span>Plano & Regras Preventivas</span>
              <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {filteredPlans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'historico' 
                  ? 'bg-white text-[#1B3022] shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History size={14} />
              <span>Histórico de Manutenções Realizadas</span>
              <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {filteredMaintLogs.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {machineFilter !== 'ALL' ? (
              <span>Inspecionando: <strong className="text-slate-800">{selectedMachineObj?.name}</strong></span>
            ) : (
              <span>Exibindo todas as máquinas registradas</span>
            )}
          </div>
        </div>

        {/* BARRA DE FILTROS: MÁQUINA, STATUS E BUSCA */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filtro por Máquina */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 max-w-xs w-full">
            <Filter size={14} className="text-[#1B3022] shrink-0" />
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todas as Máquinas</option>
              {machines
                .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
                .map((m) => {
                  const farmName = farms.find(f => f.id === m.farm_id)?.name;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} {farmName ? `(${farmName})` : ''}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Filtro por Status (visível na aba Cronograma) */}
          {activeTab === 'cronograma' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="VENCIDA">Vencida (Atrasada)</option>
              <option value="PRÓXIMA">Próxima (Atenção)</option>
              <option value="OK">Em Dia (OK)</option>
            </select>
          )}

          {/* Campo de Busca Texto */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por equipamento, peça, serviço ou mecânico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          {(machineFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm !== '') && (
            <button
              onClick={() => {
                setMachineFilter('ALL');
                setStatusFilter('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-red-600 hover:underline font-bold px-2 py-1 cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL: TAB CRONOGRAMA DE PREVENTIVAS */}
      {activeTab === 'cronograma' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.length > 0 ? (
            filteredPlans.map((p) => {
              const mach = machines.find(m => m.id === p.machine_id);

              const cardStyles = {
                'VENCIDA': {
                  border: 'border-red-250 bg-red-50/30 hover:border-red-300',
                  badge: 'bg-red-50 text-red-700 border-red-100',
                  indicator: 'bg-red-500'
                },
                'PRÓXIMA': {
                  border: 'border-amber-250 bg-amber-50/30 hover:border-amber-300',
                  badge: 'bg-amber-50 text-amber-700 border-amber-100',
                  indicator: 'bg-amber-500'
                },
                'OK': {
                  border: 'border-slate-200 bg-white hover:border-[#1B3022]/30',
                  badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                  indicator: 'bg-emerald-500'
                }
              };

              const styles = cardStyles[p.status] || cardStyles['OK'];

              return (
                <div 
                  key={p.plan_item_id} 
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xs relative ${styles.border}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5 mb-3.5">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400">{mach?.code}</span>
                        <h4 className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[160px]">{mach?.name}</h4>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${styles.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`} />
                        {p.status}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-600">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-medium">Item Preventivo:</span>
                        <strong className="text-slate-800 font-semibold">{p.maintenance_item}</strong>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <p className="text-slate-400 leading-normal">Última Data</p>
                          <p className="text-slate-700 font-bold">
                            {p.last_performed_date && p.last_performed_date !== '1970-01-01' ? new Date(p.last_performed_date).toLocaleDateString('pt-BR') : 'Nunca'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 leading-normal">Último Horímetro</p>
                          <p className="text-slate-700 font-bold">{p.last_performed_hour_km.toLocaleString('pt-BR')} h/km</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2.5 mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-slate-400 font-mono">Dias Restantes</p>
                          <p className={`font-mono font-bold ${p.days_remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {p.interval_days > 0 ? `${p.days_remaining} dias` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-mono">Horas Restantes</p>
                          <p className={`font-mono font-bold ${p.hour_km_remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {p.interval_hour_km > 0 ? `${p.hour_km_remaining} h` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RODAPÉ DO CARD COM AÇÕES CRUD */}
                  {userRole !== 'viewer' && (
                    <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditConfig(p)}
                          title="Editar Parâmetros deste Item"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'config', id: p.plan_item_id, title: `${p.maintenance_item} (${mach?.name})` })}
                          title="Remover Item do Plano Preventivo"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenPerform(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3022] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                      >
                        <Wrench size={12} />
                        <span>Realizar Manutenção</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full h-48 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-xs">
              <CalendarDays size={32} className="mb-2 text-slate-300" />
              <p className="text-xs">Nenhum item preventivo configurado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA TAB HISTÓRICO DE LANÇAMENTOS DE PREVENTIVAS */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1B3022]">
              <History size={16} />
              <span>Registros de Manutenções Preventivas Executadas</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total de lançamentos: <strong>{filteredMaintLogs.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Equipamento</th>
                  <th className="py-3 px-4">Item Preventivo</th>
                  <th className="py-3 px-4 font-mono text-right">Horímetro h/Km</th>
                  <th className="py-3 px-4 font-mono text-right">Peças (R$)</th>
                  <th className="py-3 px-4 font-mono text-right">Mão de Obra (R$)</th>
                  <th className="py-3 px-4">Mecânico / Responsável</th>
                  <th className="py-3 px-4">Peças Substituídas</th>
                  {userRole !== 'viewer' && <th className="py-3 px-4 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMaintLogs.length > 0 ? (
                  filteredMaintLogs.map((log) => {
                    const mach = machines.find(m => m.id === log.machine_id);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {log.date ? new Date(log.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="font-mono text-slate-400 text-[10px] block">{mach?.code}</span>
                          {mach?.name || 'Máquina'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                            {log.main_item || 'Geral'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {log.hour_km_at_service.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-normal">h/km</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          R$ {Number(log.parts_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          R$ {Number(log.labor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {log.responsible || 'Não informado'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">
                          {log.parts_replaced || '-'}
                        </td>
                        {userRole !== 'viewer' && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditLog(log)}
                                title="Editar Lançamento"
                                className="p-1 hover:bg-slate-200 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'log', id: log.id, title: `Lançamento de ${log.main_item} em ${new Date(log.date).toLocaleDateString('pt-BR')}` })}
                                title="Excluir Lançamento"
                                className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      Nenhum lançamento de manutenção preventiva encontrado para os filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAR NOVO PLANO PREVENTIVO */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Configurar Parâmetros de Revisão Preventiva">
        <form onSubmit={handleConfigSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
              <select
                value={configMachineId}
                onChange={(e) => setConfigMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer font-medium"
              >
                {machines
                  .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
                  .map((m) => {
                    const farmName = farms.find(f => f.id === m.farm_id)?.name;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.code} - {m.name} {farmName ? `(${farmName})` : ''}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Item de Manutenção</label>
              <select
                value={configItem}
                onChange={(e) => setConfigItem(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer font-medium"
              >
                {lookups?.maintenanceCategories?.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intervalo em DIAS</label>
              <input
                type="number"
                placeholder="Ex: 180 (ou vazio)"
                value={configIntervalDays}
                onChange={(e) => setConfigIntervalDays(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intervalo em HORAS/KM</label>
              <input
                type="number"
                placeholder="Ex: 250 (ou vazio)"
                value={configIntervalHours}
                onChange={(e) => setConfigIntervalHours(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Última Data Realizada</label>
              <input
                type="date"
                value={configLastDate}
                onChange={(e) => setConfigLastDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Último Horímetro h/Km</label>
              <input
                type="number"
                value={configLastHourKm}
                onChange={(e) => setConfigLastHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Criar Cronograma
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR CONFIGURAÇÃO DO PLANO */}
      <Modal isOpen={isEditConfigOpen} onClose={() => setIsEditConfigOpen(false)} title="Editar Regra de Manutenção Preventiva">
        <form onSubmit={handleEditConfigSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
              <select
                value={editConfigMachineId}
                onChange={(e) => setEditConfigMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer font-medium"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Item de Manutenção</label>
              <select
                value={editConfigItem}
                onChange={(e) => setEditConfigItem(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer font-medium"
              >
                {lookups?.maintenanceCategories?.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intervalo em DIAS</label>
              <input
                type="number"
                placeholder="Ex: 180"
                value={editConfigIntervalDays}
                onChange={(e) => setEditConfigIntervalDays(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intervalo em HORAS/KM</label>
              <input
                type="number"
                placeholder="Ex: 250"
                value={editConfigIntervalHours}
                onChange={(e) => setEditConfigIntervalHours(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditConfigOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL REALIZAR MANUTENÇÃO PREVENTIVA */}
      <Modal isOpen={isPerformOpen} onClose={() => setIsPerformOpen(false)} title="Registrar Manutenção Preventiva Concluída">
        <form onSubmit={handlePerformSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-start gap-2 mb-2">
            <Info size={14} className="text-[#1B3022] shrink-0 mt-0.5" />
            <div>
              <span>Este processo vai registrar um log histórico de manutenção e resetar a contagem do plano preventivo desta máquina.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
              <input
                type="text"
                disabled
                value={machines.find(m => m.id === performMachineId)?.name || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Item de Manutenção</label>
              <input
                type="text"
                disabled
                value={performItem}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data de Realização</label>
              <input
                type="date"
                required
                value={performDate}
                onChange={(e) => setPerformDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km na Execução</label>
              <input
                type="number"
                required
                value={performHourKm}
                onChange={(e) => setPerformHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custo com Peças (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Opcional"
                value={performPartsCost}
                onChange={(e) => setPerformPartsCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custo Mão de Obra (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Opcional"
                value={performLaborCost}
                onChange={(e) => setPerformLaborCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Peças Substituídas</label>
            <input
              type="text"
              placeholder="Ex: Filtro lubrificante diesel, Anéis, O-rings..."
              value={performParts}
              onChange={(e) => setPerformParts(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Responsável Técnico / Mecânico</label>
            <input
              type="text"
              required
              placeholder="Ex: Marcos da Oficina Central"
              value={performResponsible}
              onChange={(e) => setPerformResponsible(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Laudo / Descrição Adicional</label>
            <textarea
              required
              value={performDesc}
              onChange={(e) => setPerformDesc(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] h-16"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsPerformOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar e Concluir
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR LANÇAMENTO HISTÓRICO DE MANUTENÇÃO */}
      <Modal isOpen={isEditLogOpen} onClose={() => setIsEditLogOpen(false)} title="Editar Lançamento de Manutenção Preventiva">
        <form onSubmit={handleEditLogSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
              <select
                value={editLogMachineId}
                onChange={(e) => setEditLogMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer font-medium"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Item de Manutenção</label>
              <input
                type="text"
                required
                value={editLogItem}
                onChange={(e) => setEditLogItem(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data de Realização</label>
              <input
                type="date"
                required
                value={editLogDate}
                onChange={(e) => setEditLogDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km na Execução</label>
              <input
                type="number"
                required
                value={editLogHourKm}
                onChange={(e) => setEditLogHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custo Peças (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editLogPartsCost}
                onChange={(e) => setEditLogPartsCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custo Mão de Obra (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editLogLaborCost}
                onChange={(e) => setEditLogLaborCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Peças Substituídas</label>
            <input
              type="text"
              value={editLogParts}
              onChange={(e) => setEditLogParts(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mecânico / Responsável</label>
            <input
              type="text"
              required
              value={editLogResponsible}
              onChange={(e) => setEditLogResponsible(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descrição do Serviço</label>
            <textarea
              required
              value={editLogDesc}
              onChange={(e) => setEditLogDesc(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-16"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditLogOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Tem certeza de que deseja excluir o item abaixo? Esta ação não poderá ser desfeita.
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800">
            {deleteTarget?.title}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
