import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Machine, Farm, LookupItem, FuelLog, MaintenanceLog, PreventivePlanStatus, Checklist30d } from '../types';
import Modal from '../components/Modal';
import { 
  Tractor, Search, Plus, Trash2, Edit, X, Info, Fuel, Wrench, 
  CheckSquare, Calendar, Sliders, ChevronRight, BarChart, Settings
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface MachinesProps {
  selectedFarmId: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function Machines({ selectedFarmId, userRole }: MachinesProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Drawer / Ficha da Máquina
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [drawerTab, setDrawerTab] = useState<'summary' | 'fuel' | 'maintenance' | 'preventive' | 'checklists'>('summary');
  const [machineFuelLogs, setMachineFuelLogs] = useState<FuelLog[]>([]);
  const [machineMaintLogs, setMachineMaintLogs] = useState<MaintenanceLog[]>([]);
  const [machinePrevStatus, setMachinePrevStatus] = useState<PreventivePlanStatus[]>([]);
  const [machineChecklists, setMachineChecklists] = useState<Checklist30d[]>([]);

  // Estados globais para cálculo de colunas
  const [allPrevStatuses, setAllPrevStatuses] = useState<PreventivePlanStatus[]>([]);
  const [allFuelLogs, setAllFuelLogs] = useState<FuelLog[]>([]);
  const [allMaintLogs, setAllMaintLogs] = useState<MaintenanceLog[]>([]);

  // Modais de CRUD
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Form States (Campos do cadastro)
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('trator');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formSerial, setFormSerial] = useState('');
  const [formInitialHourKm, setFormInitialHourKm] = useState(0);
  const [formStatus, setFormStatus] = useState<'Ativa' | 'Em manutenção' | 'Parada' | 'Vendida/Baixada'>('Ativa');
  const [formFarmId, setFormFarmId] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [editId, setEditId] = useState('');

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mList, fList, lData, pStatuses, fuelLogsList, maintLogsList] = await Promise.all([
          fleetService.getMachines(),
          fleetService.getFarms(),
          fleetService.getLookups(),
          fleetService.getPreventivePlanStatus(),
          fleetService.getFuelLogs(),
          fleetService.getMaintenanceLogs()
        ]);
        setMachines(mList);
        setFarms(fList);
        setLookups(lData);
        setAllPrevStatuses(pStatuses);
        setAllFuelLogs(fuelLogsList);
        setAllMaintLogs(maintLogsList);
        if (fList.length > 0) {
          setFormFarmId(selectedFarmId === 'ALL' ? fList[0].id : selectedFarmId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Recarregar lista
  const refreshList = async () => {
    try {
      const [mList, pStatuses, fuelLogsList, maintLogsList] = await Promise.all([
        fleetService.getMachines(),
        fleetService.getPreventivePlanStatus(),
        fleetService.getFuelLogs(),
        fleetService.getMaintenanceLogs()
      ]);
      setMachines(mList);
      setAllPrevStatuses(pStatuses);
      setAllFuelLogs(fuelLogsList);
      setAllMaintLogs(maintLogsList);
    } catch (err) {
      console.error(err);
    }
  };

  // Carrega o histórico de uma máquina específica para a Ficha Drawer
  const handleOpenDrawer = async (m: Machine) => {
    setSelectedMachine(m);
    setDrawerTab('summary');
    
    try {
      // Carrega em paralelo todos os dados históricos desta máquina
      const [fLogs, mLogs, prevStatus, checklists] = await Promise.all([
        fleetService.getFuelLogs(),
        fleetService.getMaintenanceLogs(),
        fleetService.getPreventivePlanStatus(),
        fleetService.getChecklists()
      ]);

      setMachineFuelLogs(fLogs.filter(l => l.machine_id === m.id));
      setMachineMaintLogs(mLogs.filter(l => l.machine_id === m.id));
      setMachinePrevStatus(prevStatus.filter(p => p.machine_id === m.id));
      setMachineChecklists(checklists.filter(c => c.machine_id === m.id));
    } catch (e) {
      console.error('Erro ao buscar histórico da máquina:', e);
    }
  };

  // =========================================================================
  // SUBMISSÃO DOS FORMULÁRIOS
  // =========================================================================

  const handleOpenCreate = () => {
    setFormCode('');
    setFormName('');
    setFormType('trator');
    setFormBrand('');
    setFormModel('');
    setFormYear(new Date().getFullYear());
    setFormSerial('');
    setFormInitialHourKm(0);
    setFormStatus('Ativa');
    if (farms.length > 0) {
      setFormFarmId(selectedFarmId === 'ALL' ? farms[0].id : selectedFarmId);
    }
    setFormDriver('');
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addMachine({
        code: formCode,
        name: formName,
        type: formType,
        brand: formBrand,
        model: formModel,
        year: Number(formYear),
        serial_number: formSerial,
        initial_hour_km: Number(formInitialHourKm),
        current_hour_km: Number(formInitialHourKm),
        status: formStatus,
        farm_id: formFarmId,
        driver_name: formDriver
      });
      setIsCreateOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao cadastrar: ' + err.message);
    }
  };

  const handleOpenEdit = (m: Machine) => {
    setEditId(m.id);
    setFormCode(m.code);
    setFormName(m.name);
    setFormType(m.type);
    setFormBrand(m.brand);
    setFormModel(m.model);
    setFormYear(m.year);
    setFormSerial(m.serial_number || '');
    setFormInitialHourKm(m.initial_hour_km);
    setFormStatus(m.status);
    setFormFarmId(m.farm_id);
    setFormDriver(m.driver_name || '');
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.updateMachine(editId, {
        code: formCode,
        name: formName,
        type: formType,
        brand: formBrand,
        model: formModel,
        year: Number(formYear),
        serial_number: formSerial,
        status: formStatus,
        farm_id: formFarmId,
        driver_name: formDriver
      });
      setIsEditOpen(false);
      refreshList();
      // Atualizar drawer se estiver aberto
      if (selectedMachine && selectedMachine.id === editId) {
        const updated = await fleetService.getMachines();
        const m = updated.find(x => x.id === editId);
        if (m) setSelectedMachine(m);
      }
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir permanentemente esta máquina?')) return;
    try {
      await fleetService.deleteMachine(id);
      setSelectedMachine(null);
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // =========================================================================
  // PROCESSAMENTO DE FILTROS E PESQUISAS
  // =========================================================================

  const filteredMachines = machines.filter(m => {
    const farmMatch = selectedFarmId === 'ALL' || m.farm_id === selectedFarmId;
    const statusMatch = statusFilter === 'ALL' || m.status === statusFilter;
    const typeMatch = typeFilter === 'ALL' || m.type === typeFilter;
    const textMatch = 
      (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.driver_name && m.driver_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return farmMatch && statusMatch && typeMatch && textMatch;
  });

  // Geração de dados de custo acumulado temporal para a máquina selecionada
  const getAccumulatedCostData = () => {
    const timeline: { date: string; amount: number; type: 'Combustível' | 'Manutenção' }[] = [];
    
    machineFuelLogs.forEach(f => {
      timeline.push({ date: f.date.split('T')[0], amount: f.total_value, type: 'Combustível' });
    });

    machineMaintLogs.forEach(m => {
      timeline.push({ date: m.date.split('T')[0], amount: m.total_cost, type: 'Manutenção' });
    });

    // Ordenar datas
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let acc = 0;
    return timeline.map(item => {
      acc += item.amount;
      return {
        Data: item.date,
        'Custo Acumulado (R$)': Number(acc.toFixed(2)),
        'Lançamento': item.type
      };
    });
  };

  return (
    <div className="flex gap-8 relative h-[calc(100vh-6rem)]">
      
      {/* SEÇÃO PRINCIPAL - TABELA DE MÁQUINAS */}
      <div className={`flex-1 transition-all ${selectedMachine ? 'max-w-[55%]' : 'w-full'} flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs`}>
        
        {/* FILTROS E ACESSÓRIOS */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar por código, marca, motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] shadow-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-hidden cursor-pointer shadow-xs"
            >
              <option value="ALL">Todos os Status</option>
              <option value="Ativa">Ativa</option>
              <option value="Em manutenção">Em manutenção</option>
              <option value="Parada">Parada</option>
              <option value="Vendida/Baixada">Vendida/Baixada</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-hidden cursor-pointer shadow-xs"
            >
              <option value="ALL">Todos os Tipos</option>
              {lookups?.equipmentTypes.map((t: LookupItem) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {userRole !== 'viewer' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus size={14} />
              <span>Cadastrar Máquina</span>
            </button>
          )}
        </div>

        {/* LISTA/TABELA */}
        <div className="flex-1 overflow-y-auto">
          {filteredMachines.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Equipamento</th>
                  <th className="py-2.5 px-3">Fazenda</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Status de Revisão</th>
                  <th className="py-2.5 px-3 text-right">Última Revisão</th>
                  <th className="py-2.5 px-3 text-right">Horímetro/Km Atual</th>
                  <th className="py-2.5 px-3 text-right">Próxima Revisão</th>
                  <th className="py-2.5 px-3">Motorista</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMachines.map((m) => {
                  const farmName = farms.find(f => f.id === m.farm_id)?.name || 'N/A';
                  const typeLabel = lookups?.equipmentTypes.find((t: LookupItem) => t.id === m.type)?.label || m.type;

                  // Cores para status
                  const statusColors: { [key: string]: string } = {
                    'Ativa': 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    'Em manutenção': 'bg-amber-50 text-amber-700 border-amber-100',
                    'Parada': 'bg-red-50 text-red-700 border-red-100',
                    'Vendida/Baixada': 'bg-slate-100 text-slate-600 border-slate-200'
                  };

                  // 1. Cálculo do Status de Revisão (Verde Tudo OK / Vermelho Vencida)
                  const machinePrevItems = allPrevStatuses.filter(p => p.machine_id === m.id);
                  const hasVencida = machinePrevItems.some(p => p.status === 'VENCIDA');
                  const revisionStatusText = hasVencida ? 'Vencida' : 'Tudo OK';
                  const revisionStatusColor = hasVencida 
                    ? 'bg-red-50 text-red-700 border-red-100' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100';

                  // 2. Horímetro/Km atual com base nos registros de abastecimento
                  const machineFuelLogsSorted = allFuelLogs
                    .filter(log => log.machine_id === m.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  let currentHourKmVal = m.current_hour_km;
                  if (machineFuelLogsSorted.length > 0) {
                    currentHourKmVal = machineFuelLogsSorted[0].hour_km_at_fueling;
                  }

                  // 3. Cálculo da Hora da Última Revisão
                  const machineMaintSorted = allMaintLogs
                    .filter(log => log.machine_id === m.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.hour_km_at_service - a.hour_km_at_service);

                  const prevLastHours = machinePrevItems.map(p => p.last_performed_hour_km).filter(h => h > 0);
                  const maxPrevLastHour = prevLastHours.length > 0 ? Math.max(...prevLastHours) : null;
                  const lastMaintLogHour = machineMaintSorted.length > 0 ? machineMaintSorted[0].hour_km_at_service : null;

                  let lastRevisionHourVal: number | null = null;
                  if (lastMaintLogHour !== null && maxPrevLastHour !== null) {
                    lastRevisionHourVal = Math.max(lastMaintLogHour, maxPrevLastHour);
                  } else if (lastMaintLogHour !== null) {
                    lastRevisionHourVal = lastMaintLogHour;
                  } else if (maxPrevLastHour !== null) {
                    lastRevisionHourVal = maxPrevLastHour;
                  }

                  // 4. Cálculo do Horímetro Próxima Revisão
                  const hourKmItems = machinePrevItems.filter(p => p.interval_hour_km > 0);
                  const nextRevisionHourKm = hourKmItems.length > 0
                    ? Math.min(...hourKmItems.map(p => p.last_performed_hour_km + p.interval_hour_km))
                    : null;

                  const isNextRevisionOverdue = nextRevisionHourKm !== null && currentHourKmVal >= nextRevisionHourKm;

                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => handleOpenDrawer(m)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        selectedMachine?.id === m.id ? 'bg-slate-50 border-r-2 border-[#1B3022]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-xs font-bold text-[#1B3022]">{m.code}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-xs text-slate-800">{m.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{typeLabel} • {m.brand} {m.model}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{farmName}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${statusColors[m.status]}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${revisionStatusColor}`}>
                          {revisionStatusText}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-bold text-[#1B3022]">
                        {lastRevisionHourVal !== null ? (
                          <>
                            {lastRevisionHourVal.toLocaleString('pt-BR')} <span className="text-[9px] font-normal text-slate-400">H/km</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[10px]">Sem registro</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-bold text-slate-800">
                        {currentHourKmVal.toLocaleString('pt-BR')} <span className="text-[9px] font-normal text-slate-400">H/km</span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono text-xs font-bold ${isNextRevisionOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {nextRevisionHourKm !== null ? (
                          <>
                            {nextRevisionHourKm.toLocaleString('pt-BR')} <span className="text-[9px] font-normal text-slate-400">H/km</span>
                          </>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">{m.driver_name || 'Sem motorista'}</td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDrawer(m)}
                            className="p-1 text-slate-400 hover:text-[#1B3022] transition-colors"
                            title="Ficha da Máquina"
                          >
                            <ChevronRight size={16} />
                          </button>
                          {userRole !== 'viewer' && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Editar"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Tractor size={40} className="mb-2" />
              <p className="text-xs font-medium">Nenhum equipamento correspondente encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* DRAWER LATERAL - FICHA TÉCNICA E HISTÓRICO */}
      {selectedMachine && (
        <div className="w-[43%] bg-white border border-slate-200 rounded-2xl flex flex-col h-full overflow-hidden animate-slideIn shadow-md">
          {/* Drawer Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1B3022]/10 text-[#1B3022] rounded-xl border border-[#1B3022]/20">
                <Tractor size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{selectedMachine.code}</span>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                    {farms.find(f => f.id === selectedMachine.farm_id)?.name}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px] mt-0.5">{selectedMachine.name}</h3>
              </div>
            </div>
            <button 
              onClick={() => setSelectedMachine(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 overflow-x-auto text-xs no-scrollbar">
            <button 
              onClick={() => setDrawerTab('summary')}
              className={`py-3 px-4 font-bold transition-colors border-b-2 cursor-pointer ${drawerTab === 'summary' ? 'border-[#1B3022] text-[#1B3022]' : 'border-transparent text-slate-500 hover:text-[#1B3022]'}`}
            >
              Ficha
            </button>
            <button 
              onClick={() => setDrawerTab('fuel')}
              className={`py-3 px-4 font-bold transition-colors border-b-2 cursor-pointer ${drawerTab === 'fuel' ? 'border-[#1B3022] text-[#1B3022]' : 'border-transparent text-slate-500 hover:text-[#1B3022]'}`}
            >
              Abastecimentos ({machineFuelLogs.length})
            </button>
            <button 
              onClick={() => setDrawerTab('maintenance')}
              className={`py-3 px-4 font-bold transition-colors border-b-2 cursor-pointer ${drawerTab === 'maintenance' ? 'border-[#1B3022] text-[#1B3022]' : 'border-transparent text-slate-500 hover:text-[#1B3022]'}`}
            >
              Serviços ({machineMaintLogs.length})
            </button>
            <button 
              onClick={() => setDrawerTab('preventive')}
              className={`py-3 px-4 font-bold transition-colors border-b-2 cursor-pointer ${drawerTab === 'preventive' ? 'border-[#1B3022] text-[#1B3022]' : 'border-transparent text-slate-500 hover:text-[#1B3022]'}`}
            >
              Plano ({machinePrevStatus.length})
            </button>
            <button 
              onClick={() => setDrawerTab('checklists')}
              className={`py-3 px-4 font-bold transition-colors border-b-2 cursor-pointer ${drawerTab === 'checklists' ? 'border-[#1B3022] text-[#1B3022]' : 'border-transparent text-slate-500 hover:text-[#1B3022]'}`}
            >
              Checklists ({machineChecklists.length})
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* TAB: SUMMARY / FICHA */}
            {drawerTab === 'summary' && (() => {
              const sortedFuelLogs = [...machineFuelLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              let drawerCurrentHourKm = selectedMachine.current_hour_km;
              let drawerPreviousHourKm = selectedMachine.initial_hour_km;

              if (sortedFuelLogs.length > 0) {
                drawerCurrentHourKm = sortedFuelLogs[0].hour_km_at_fueling;
                if (sortedFuelLogs.length > 1) {
                  drawerPreviousHourKm = sortedFuelLogs[1].hour_km_at_fueling;
                } else {
                  drawerPreviousHourKm = selectedMachine.initial_hour_km;
                }
              }

              return (
                <div className="space-y-6">
                  {/* Metadados */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3.5">
                    <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                      <Info size={12} /> Dados Cadastrais
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-500 font-medium">Marca / Modelo</p>
                        <p className="text-slate-800 font-bold mt-0.5">{selectedMachine.brand} • {selectedMachine.model}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Ano Fabricação</p>
                        <p className="text-slate-800 font-bold mt-0.5">{selectedMachine.year}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Nº de Série</p>
                        <p className="text-slate-700 font-mono mt-0.5 truncate">{selectedMachine.serial_number || 'Não informado'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Data de Aquisição</p>
                        <p className="text-slate-800 font-bold mt-0.5">
                          {selectedMachine.acquisition_date ? new Date(selectedMachine.acquisition_date).toLocaleDateString('pt-BR') : 'Não informada'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Horímetro Inicial</p>
                        <p className="text-slate-800 font-mono font-bold mt-0.5">{selectedMachine.initial_hour_km.toLocaleString('pt-BR')} h/km</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Horímetro Anterior</p>
                        <p className="text-slate-800 font-mono font-bold mt-0.5">{drawerPreviousHourKm.toLocaleString('pt-BR')} h/km</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Horímetro Atual (Abastecimento)</p>
                        <p className="text-[#1B3022] font-mono font-black mt-0.5">{drawerCurrentHourKm.toLocaleString('pt-BR')} h/km</p>
                      </div>
                    </div>
                  </div>

                  {/* Grafico de Custo Acumulado */}
                  {machineFuelLogs.length > 0 || machineMaintLogs.length > 0 ? (
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-4 border-b border-slate-200 pb-2">
                        <BarChart size={12} /> Custo Temporal Acumulado (R$)
                      </h4>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getAccumulatedCostData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1B3022" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#1B3022" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="Data" stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: 11, color: '#1e293b' }} />
                            <Area type="monotone" dataKey="Custo Acumulado (R$)" stroke="#1B3022" fillOpacity={1} fill="url(#colorCost)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-400 text-xs">
                      Sem dados de custo para gerar gráfico.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB: FUEL LOGS / ABASTECIMENTOS */}
            {drawerTab === 'fuel' && (
              <div className="space-y-4">
                {machineFuelLogs.length > 0 ? (
                  machineFuelLogs.map(log => (
                    <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-start text-xs hover:border-slate-200 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Fuel size={14} className="text-[#1B3022]" />
                          <span className="font-bold text-slate-800">
                            {log.liters_supplied} Litros ({lookups?.fuelTypes.find((f: any) => f.id === log.fuel_type)?.label || log.fuel_type})
                          </span>
                        </div>
                        <p className="text-slate-500">
                          {new Date(log.date).toLocaleDateString('pt-BR')} • {log.responsible || 'Responsável'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Horímetro: {log.hour_km_at_fueling.toLocaleString('pt-BR')} (+{log.hours_km_since_last}h) • {log.consumption_rate ? `${log.consumption_rate} L/h` : 'Consumo N/A'}
                        </p>
                        {log.notes && <p className="text-[11px] text-slate-500 italic mt-1.5">Obs: {log.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 font-mono">R$ {log.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-500 font-mono">R$ {log.price_per_liter}/L</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Fuel size={24} className="mb-2" />
                    Nenhum registro de abastecimento para esta máquina.
                  </div>
                )}
              </div>
            )}

            {/* TAB: SERVICES / SERVIÇOS */}
            {drawerTab === 'maintenance' && (
              <div className="space-y-4">
                {machineMaintLogs.length > 0 ? (
                  machineMaintLogs.map(log => (
                    <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2 hover:border-slate-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Wrench size={14} className="text-amber-600" />
                          <span className="font-bold text-slate-800">{log.main_item}</span>
                        </div>
                        <span className="font-bold text-slate-800 font-mono">R$ {log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-slate-600">{log.service_description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                        <span>Data: {new Date(log.date).toLocaleDateString('pt-BR')}</span>
                        <span>Horímetro: {log.hour_km_at_service.toLocaleString('pt-BR')} h/km</span>
                        <span>Responsável: {log.responsible}</span>
                        <span>Peças: {log.parts_replaced || 'Nenhuma'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Wrench size={24} className="mb-2" />
                    Nenhum registro de manutenção para esta máquina.
                  </div>
                )}
              </div>
            )}

            {/* TAB: PREVENTIVE PLAN STATUS */}
            {drawerTab === 'preventive' && (
              <div className="space-y-4">
                {machinePrevStatus.length > 0 ? (
                  machinePrevStatus.map(p => {
                    const colors: { [key: string]: string } = {
                      'VENCIDA': 'bg-red-50 text-red-700 border-red-100',
                      'PRÓXIMA': 'bg-amber-50 text-amber-700 border-amber-100',
                      'OK': 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    };

                    return (
                      <div key={p.plan_item_id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{p.maintenance_item}</span>
                          <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-bold border rounded-sm uppercase tracking-wider ${colors[p.status]}`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
                          <div>
                            <p className="text-slate-400">Intervalo</p>
                            <p className="text-slate-700 font-bold">{p.interval_days > 0 ? `${p.interval_days} dias` : ''} {p.interval_hour_km > 0 ? `/ {p.interval_hour_km} h/km` : ''}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Última Realização</p>
                            <p className="text-slate-700 font-bold">{p.last_performed_date && p.last_performed_date !== '1970-01-01' ? new Date(p.last_performed_date).toLocaleDateString('pt-BR') : 'Nunca'}</p>
                          </div>
                          {p.next_due_date && (
                            <div>
                              <p className="text-slate-400">Próxima Vencimento</p>
                              <p className={p.days_remaining < 0 ? 'text-red-600 font-bold' : 'text-slate-700 font-bold'}>
                                {new Date(p.next_due_date).toLocaleDateString('pt-BR')} ({p.days_remaining}d restantes)
                              </p>
                            </div>
                          )}
                          {p.interval_hour_km > 0 && (
                            <div>
                              <p className="text-slate-400 font-medium">Horas Restantes</p>
                              <p className={p.hour_km_remaining < 0 ? 'text-red-600 font-bold' : 'text-slate-700 font-bold'}>
                                {p.hour_km_remaining} h/km
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-400 text-xs">
                    Nenhum parâmetro de manutenção preventiva cadastrado para este equipamento. Vá no Plano Preventivo para configurar.
                  </div>
                )}
              </div>
            )}

            {/* TAB: CHECKLISTS */}
            {drawerTab === 'checklists' && (
              <div className="space-y-4">
                {machineChecklists.length > 0 ? (
                  machineChecklists.map(c => {
                    const checklistColors: { [key: string]: string } = {
                      'OK': 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      'Necessita Atenção': 'bg-amber-50 text-amber-700 border-amber-100',
                      'Máquina Parada': 'bg-red-50 text-red-700 border-red-100'
                    };

                    return (
                      <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2 hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CheckSquare size={14} className="text-emerald-600" />
                            <span className="font-bold text-slate-800">Operador: {c.operator_name}</span>
                          </div>
                          <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-bold border rounded-sm uppercase tracking-wider ${checklistColors[c.overall_status]}`}>
                            {c.overall_status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Data: {new Date(c.date).toLocaleDateString('pt-BR')} • Horímetro: {c.hour_km.toLocaleString('pt-BR')} h/km • Atividade: {c.work_type || 'Geral'}
                        </p>
                        {c.failed_items_notes && (
                          <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-[11px] text-slate-500 leading-normal">
                            <strong>Notas de Vistoria:</strong> {c.failed_items_notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <CheckSquare size={24} className="mb-2" />
                    Nenhum checklist registrado para esta máquina.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL: CRIAR MÁQUINA */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Cadastrar Equipamento">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Código da Máquina</label>
              <input
                type="text"
                required
                placeholder="Ex: MAQ-020"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome / Equipamento</label>
              <input
                type="text"
                required
                placeholder="Ex: Trator John Deere 6125J"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tipo de Ativo</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.equipmentTypes?.map((t: LookupItem) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda Locada</label>
              <select
                value={formFarmId}
                onChange={(e) => setFormFarmId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Marca</label>
              <input
                type="text"
                required
                placeholder="Ex: John Deere"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Modelo</label>
              <input
                type="text"
                required
                placeholder="Ex: 6125J"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ano</label>
              <input
                type="number"
                required
                value={formYear}
                onChange={(e) => setFormYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nº de Série / Chassi</label>
              <input
                type="text"
                placeholder="Opcional"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km Inicial</label>
              <input
                type="number"
                required
                value={formInitialHourKm}
                onChange={(e) => setFormInitialHourKm(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status Inicial</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Ativa">Ativa</option>
                <option value="Em manutenção">Em manutenção</option>
                <option value="Parada">Parada</option>
                <option value="Vendida/Baixada">Vendida/Baixada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Motorista / Responsável</label>
            <input
              type="text"
              placeholder="Ex: João da Silva"
              value={formDriver}
              onChange={(e) => setFormDriver(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar Cadastro
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDITAR MÁQUINA */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Equipamento">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Código da Máquina</label>
              <input
                type="text"
                required
                disabled
                value={formCode}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-500 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome / Equipamento</label>
              <input
                type="text"
                required
                placeholder="Ex: Trator John Deere"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tipo de Ativo</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.equipmentTypes?.map((t: LookupItem) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda Locada</label>
              <select
                value={formFarmId}
                onChange={(e) => setFormFarmId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Marca</label>
              <input
                type="text"
                required
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Modelo</label>
              <input
                type="text"
                required
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ano</label>
              <input
                type="number"
                required
                value={formYear}
                onChange={(e) => setFormYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nº de Série</label>
              <input
                type="text"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Ativa">Ativa</option>
                <option value="Em manutenção">Em manutenção</option>
                <option value="Parada">Parada</option>
                <option value="Vendida/Baixada">Vendida/Baixada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Motorista / Responsável</label>
            <input
              type="text"
              value={formDriver}
              onChange={(e) => setFormDriver(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Atualizar Cadastro
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
