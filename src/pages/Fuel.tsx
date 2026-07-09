import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { FuelLog, Farm, Machine, LookupItem } from '../types';
import Modal from '../components/Modal';
import { 
  Fuel, Plus, Trash2, Search, Calendar, AlertTriangle, 
  Info, Check, HelpCircle, FileText, Pencil
} from 'lucide-react';

interface FuelProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function FuelPage({ selectedFarmId, selectedPeriod, userRole }: FuelProps) {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formFarmId, setFormFarmId] = useState('');
  const [formMachineId, setFormMachineId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16));
  const [formFuelType, setFormFuelType] = useState('diesel_s10');
  const [formPumpStart, setFormPumpStart] = useState<number | ''>('');
  const [formPumpEnd, setFormPumpEnd] = useState<number | ''>('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formPrice, setFormPrice] = useState<number | ''>(5.85);
  const [formSupplier, setFormSupplier] = useState('Bomba Própria');
  const [formResponsible, setFormResponsible] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Discrepancy Check state
  const [discrepancyInfo, setDiscrepancyInfo] = useState<{ lastEnd: number; hasDiscrepancy: boolean } | null>(null);

  // Edit Form States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editFarmId, setEditFarmId] = useState('');
  const [editMachineId, setEditMachineId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editFuelType, setEditFuelType] = useState('diesel_s10');
  const [editPumpStart, setEditPumpStart] = useState<number | ''>('');
  const [editPumpEnd, setEditPumpEnd] = useState<number | ''>('');
  const [editHourKm, setEditHourKm] = useState<number | ''>('');
  const [editPrice, setEditPrice] = useState<number | ''>(5.85);
  const [editSupplier, setEditSupplier] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDiscrepancyInfo, setEditDiscrepancyInfo] = useState<{ lastEnd: number; hasDiscrepancy: boolean } | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('ALL');

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fLogs, fList, mList, lData] = await Promise.all([
          fleetService.getFuelLogs(),
          fleetService.getFarms(),
          fleetService.getMachines(),
          fleetService.getLookups()
        ]);
        setFuelLogs(fLogs);
        setFarms(fList);
        setMachines(mList);
        setLookups(lData);

        const initialFarm = selectedFarmId === 'ALL' ? (fList[0]?.id || '') : selectedFarmId;
        setFormFarmId(initialFarm);
        const farmMachs = mList.filter(m => m.farm_id === initialFarm);
        if (farmMachs.length > 0) {
          setFormMachineId(farmMachs[0].id);
        } else if (mList.length > 0) {
          setFormMachineId(mList[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshList = async () => {
    const list = await fleetService.getFuelLogs();
    setFuelLogs(list);
  };

  // Monitorar discrepâncias de bomba ao alterar a fazenda e a leitura inicial
  useEffect(() => {
    if (!formFarmId || formPumpStart === '') {
      setDiscrepancyInfo(null);
      return;
    }

    async function checkPump() {
      try {
        const res = await fleetService.getPumpDiscrepancy(formFarmId, Number(formPumpStart));
        setDiscrepancyInfo(res);
      } catch (e) {
        console.error(e);
      }
    }
    checkPump();
  }, [formFarmId, formPumpStart]);

  // Atualizar horímetro sugerido ao selecionar a máquina
  useEffect(() => {
    if (!formMachineId) return;
    const mach = machines.find(m => m.id === formMachineId);
    if (mach) {
      setFormHourKm(mach.current_hour_km || mach.initial_hour_km);
    }
  }, [formMachineId, machines]);

  // Sincronizar máquina com a fazenda selecionada no formulário
  useEffect(() => {
    if (!formFarmId) return;
    const farmMachines = machines.filter(m => m.farm_id === formFarmId);
    if (farmMachines.length > 0) {
      const isCurrentMachineInFarm = farmMachines.some(m => m.id === formMachineId);
      if (!isCurrentMachineInFarm) {
        setFormMachineId(farmMachines[0].id);
      }
    } else {
      setFormMachineId('');
    }
  }, [formFarmId, machines]);

  // Carregar dinamicamente o preço do diesel mais recente para a fazenda selecionada
  useEffect(() => {
    if (!formFarmId) return;
    fleetService.getLatestDieselPrice(formFarmId).then(price => {
      setFormPrice(price);
    });
  }, [formFarmId]);

  useEffect(() => {
    if (!editFarmId) return;
    fleetService.getLatestDieselPrice(editFarmId).then(price => {
      setEditPrice(price);
    });
  }, [editFarmId]);

  // Monitorar discrepâncias de bomba na edição
  useEffect(() => {
    if (!editFarmId || editPumpStart === '') {
      setEditDiscrepancyInfo(null);
      return;
    }

    async function checkPump() {
      try {
        const currentLog = fuelLogs.find(l => l.id === editingLogId);
        if (currentLog && currentLog.pump_reading_start === Number(editPumpStart) && currentLog.farm_id === editFarmId) {
          setEditDiscrepancyInfo({ lastEnd: Number(editPumpStart), hasDiscrepancy: false });
          return;
        }

        const res = await fleetService.getPumpDiscrepancy(editFarmId, Number(editPumpStart));
        setEditDiscrepancyInfo(res);
      } catch (e) {
        console.error(e);
      }
    }
    checkPump();
  }, [editFarmId, editPumpStart, editingLogId, fuelLogs]);

  // Atualizar horímetro sugerido na edição ao selecionar a máquina
  useEffect(() => {
    if (!editMachineId || !isEditOpen) return;
    const mach = machines.find(m => m.id === editMachineId);
    if (mach) {
      const currentLog = fuelLogs.find(l => l.id === editingLogId);
      if (currentLog && currentLog.machine_id !== editMachineId) {
        setEditHourKm(mach.current_hour_km || mach.initial_hour_km);
      }
    }
  }, [editMachineId, machines, isEditOpen, editingLogId, fuelLogs]);

  // Sincronizar máquina com a fazenda selecionada no formulário de edição
  useEffect(() => {
    if (!editFarmId || !isEditOpen) return;
    const farmMachines = machines.filter(m => m.farm_id === editFarmId);
    if (farmMachines.length > 0) {
      const isCurrentMachineInFarm = farmMachines.some(m => m.id === editMachineId);
      if (!isCurrentMachineInFarm) {
        setEditMachineId(farmMachines[0].id);
      }
    } else {
      setEditMachineId('');
    }
  }, [editFarmId, machines, isEditOpen]);

  const handleOpenEdit = (log: FuelLog) => {
    setEditingLogId(log.id);
    setEditFarmId(log.farm_id);
    setEditMachineId(log.machine_id);
    setEditDate(new Date(log.date).toISOString().slice(0, 16));
    setEditFuelType(log.fuel_type);
    setEditPumpStart(log.pump_reading_start);
    setEditPumpEnd(log.pump_reading_end);
    setEditHourKm(log.hour_km_at_fueling);
    setEditPrice(log.price_per_liter);
    setEditSupplier(log.supplier || '');
    setEditResponsible(log.responsible || '');
    setEditNotes(log.notes || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogId) return;

    if (Number(editPumpEnd) < Number(editPumpStart)) {
      alert('A leitura final da bomba deve ser maior ou igual à leitura inicial!');
      return;
    }

    try {
      await fleetService.updateFuelLog(editingLogId, {
        farm_id: editFarmId,
        machine_id: editMachineId,
        date: new Date(editDate).toISOString(),
        fuel_type: editFuelType,
        pump_reading_start: Number(editPumpStart),
        pump_reading_end: Number(editPumpEnd),
        hour_km_at_fueling: Number(editHourKm),
        supplier: editSupplier,
        responsible: editResponsible,
        notes: editNotes
      });
      setIsEditOpen(false);
      setEditingLogId(null);
      refreshList();
    } catch (err: any) {
      alert('Erro ao atualizar abastecimento: ' + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await fleetService.deleteFuelLog(deleteConfirmId);
      setDeleteConfirmId(null);
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir abastecimento: ' + err.message);
    }
  };

  // =========================================================================
  // SUBMISSÃO DO ABASTECIMENTO
  // =========================================================================
  const handleOpenAdd = () => {
    setFormDate(new Date().toISOString().slice(0, 16));
    setFormPumpStart('');
    setFormPumpEnd('');
    setFormNotes('');
    setFormResponsible('');
    const defaultFarm = selectedFarmId === 'ALL' ? (farms[0]?.id || '') : selectedFarmId;
    setFormFarmId(defaultFarm);
    const farmMachines = machines.filter(m => m.farm_id === defaultFarm);
    if (farmMachines.length > 0) {
      setFormMachineId(farmMachines[0].id);
      setFormHourKm(farmMachines[0].current_hour_km || farmMachines[0].initial_hour_km);
    } else if (machines.length > 0) {
      setFormMachineId(machines[0].id);
      setFormHourKm(machines[0].current_hour_km || machines[0].initial_hour_km);
    } else {
      setFormMachineId('');
      setFormHourKm('');
    }
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(formPumpEnd) < Number(formPumpStart)) {
      alert('A leitura final da bomba deve ser maior ou igual à leitura inicial!');
      return;
    }

    try {
      await fleetService.addFuelLog({
        farm_id: formFarmId,
        machine_id: formMachineId,
        date: new Date(formDate).toISOString(),
        fuel_type: formFuelType,
        pump_reading_start: Number(formPumpStart),
        pump_reading_end: Number(formPumpEnd),
        hour_km_at_fueling: Number(formHourKm),
        supplier: formSupplier,
        responsible: formResponsible,
        notes: formNotes
      });
      setIsAddOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao registrar abastecimento: ' + err.message);
    }
  };

  // =========================================================================
  // FILTRAGEM DE ABASTECIMENTOS
  // =========================================================================
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

  const filteredLogs = fuelLogs.filter(log => {
    const farmMatch = selectedFarmId === 'ALL' || log.farm_id === selectedFarmId;
    const periodMatch = isDateInPeriod(log.date);
    const machineMatch = machineFilter === 'ALL' || log.machine_id === machineFilter;
    
    const machine = machines.find(m => m.id === log.machine_id);
    const farm = farms.find(f => f.id === log.farm_id);
    const textMatch = 
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farm && (farm.name || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.responsible && log.responsible.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && periodMatch && machineMatch && textMatch;
  });

  // Totais no Rodapé
  const totalLitersSupplied = filteredLogs.reduce((sum, log) => sum + log.liters_supplied, 0);
  const totalValueSum = filteredLogs.reduce((sum, log) => sum + log.total_value, 0);

  // Calcular as médias de consumo agregadas para os registros filtrados
  const kmLogsForAvg = filteredLogs.filter(log => {
    const machine = machines.find(m => m.id === log.machine_id);
    return machine?.type === 'caminhao' && log.hours_km_since_last > 0 && log.liters_supplied > 0;
  });

  const hourLogsForAvg = filteredLogs.filter(log => {
    const machine = machines.find(m => m.id === log.machine_id);
    return machine?.type !== 'caminhao' && log.hours_km_since_last > 0 && log.liters_supplied > 0;
  });

  const totalKmForAvg = kmLogsForAvg.reduce((sum, log) => sum + log.hours_km_since_last, 0);
  const totalLitersForKmAvg = kmLogsForAvg.reduce((sum, log) => sum + log.liters_supplied, 0);
  const overallKmAverage = totalLitersForKmAvg > 0 ? (totalKmForAvg / totalLitersForKmAvg) : 0;

  const totalHoursForAvg = hourLogsForAvg.reduce((sum, log) => sum + log.hours_km_since_last, 0);
  const totalLitersForHourAvg = hourLogsForAvg.reduce((sum, log) => sum + log.liters_supplied, 0);
  const overallHourAverage = totalHoursForAvg > 0 ? (totalLitersForHourAvg / totalHoursForAvg) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <Fuel size={18} className="text-[#1B3022]" />
            Abastecimento e Consumo de Combustível
          </h3>
          <p className="text-xs text-slate-500 mt-1">Lançamento de horímetros e bombas com auditoria automática de sequência.</p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            <Plus size={14} />
            <span>Registrar Abastecimento</span>
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-4 items-center shadow-xs">
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por notas, responsável, equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
          />
        </div>

        {/* Filtrar por Máquina */}
        <select
          value={machineFilter}
          onChange={(e) => setMachineFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Máquinas</option>
          {machines.map(m => (
            <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
          ))}
        </select>

        <div className="flex-1 text-right text-xs text-slate-500 font-mono">
          Registros Filtrados: <strong className="text-slate-800">{filteredLogs.length}</strong>
        </div>
      </div>

      {/* TABELA HISTÓRICA */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {filteredLogs.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Equipamento</th>
                  <th className="py-3 px-3">Fazenda</th>
                  <th className="py-3 px-3">Combustível</th>
                  <th className="py-3 px-3">Bomba (Início/Fim)</th>
                  <th className="py-3 px-3 font-mono text-right">Lts Fornecidos</th>
                  <th className="py-3 px-3 font-mono text-right">Valor Total</th>
                  <th className="py-3 px-3">Horímetro/Km</th>
                  <th className="py-3 px-3 text-right">Média Consumo</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3">Responsável</th>
                  {userRole !== 'viewer' && (
                    <th className="py-3 px-3 text-center">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const machine = machines.find(m => m.id === log.machine_id);
                  const farmName = farms.find(f => f.id === log.farm_id)?.name || 'N/A';
                  const fuelLabel = lookups?.fuelTypes.find((f: LookupItem) => f.id === log.fuel_type)?.label || log.fuel_type;

                  const isKm = machine?.type === 'caminhao';
                  const hasHistory = log.hours_km_since_last > 0 && log.liters_supplied > 0;
                  
                  let averageText = 'N/A';
                  if (hasHistory) {
                    if (isKm) {
                      const avg = log.hours_km_since_last / log.liters_supplied;
                      averageText = `${avg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`;
                    } else {
                      const avg = log.consumption_rate || (log.liters_supplied / log.hours_km_since_last);
                      averageText = `${avg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L/h`;
                    }
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                      <td className="py-3 px-3 text-slate-550 font-mono">
                        {new Date(log.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-3">
                        {machine ? (
                          <div>
                            <span className="font-mono font-bold text-slate-800">{machine.code}</span>
                            <span className="text-[10px] text-slate-400 block">{machine.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Excluída</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{farmName}</td>
                      <td className="py-3 px-3 text-slate-500">{fuelLabel}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {log.pump_reading_start} → {log.pump_reading_end}
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-bold text-[#1B3022]">
                        {log.liters_supplied.toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-bold text-slate-800">
                        R$ {log.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-right">
                        {log.hour_km_at_fueling.toLocaleString('pt-BR')} {isKm ? 'km' : 'h'}
                        <span className="text-[9px] text-slate-400 block">+{log.hours_km_since_last} {isKm ? 'km' : 'h'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-700">
                        {averageText !== 'N/A' ? (
                          <span className="font-semibold text-slate-800">{averageText}</span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {machine?.driver_name || 'Não informado'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 truncate max-w-[120px]">{log.responsible || 'Carlos'}</td>
                      {userRole !== 'viewer' && (
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(log)}
                              className="p-1 text-[#1B3022] hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(log.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              
              {/* TABLE FOOTER / TOTAIS */}
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="font-mono text-xs font-bold text-slate-800">
                  <td colSpan={5} className="py-3 px-3 uppercase tracking-wider text-[10px] font-bold text-slate-500 text-left">Totais Filtrados:</td>
                  <td className="py-3 px-3 text-right text-[#1B3022]">{totalLitersSupplied.toLocaleString('pt-BR')} L</td>
                  <td className="py-3 px-3 text-right text-[#1B3022]">R$ {totalValueSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right"></td>
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="flex flex-col items-end text-[10px] leading-tight">
                      {overallHourAverage > 0 && (
                        <span className="text-[#1B3022] font-bold">
                          {overallHourAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L/h
                        </span>
                      )}
                      {overallKmAverage > 0 && (
                        <span className="text-slate-700 font-bold">
                          {overallKmAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L
                        </span>
                      )}
                      {overallHourAverage === 0 && overallKmAverage === 0 && (
                        <span className="text-slate-400 font-normal">N/A</span>
                      )}
                    </div>
                  </td>
                  <td colSpan={userRole !== 'viewer' ? 3 : 2} className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Fuel size={40} className="mb-2" />
              <p className="text-xs font-medium">Nenhum abastecimento encontrado no período.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: REGISTRAR ABASTECIMENTO */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Lançar Abastecimento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda</label>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data / Hora</label>
              <input
                type="datetime-local"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Máquina / Equipamento</label>
              <select
                value={formMachineId}
                onChange={(e) => setFormMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines
                  .filter(m => formFarmId === '' || m.farm_id === formFarmId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Combustível</label>
              <select
                value={formFuelType}
                onChange={(e) => setFormFuelType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.fuelTypes.map((t: LookupItem) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Leitura INICIAL da Bomba (L)</label>
              <input
                type="number"
                required
                placeholder="Ex: 1040"
                value={formPumpStart}
                onChange={(e) => setFormPumpStart(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Leitura FINAL da Bomba (L)</label>
              <input
                type="number"
                required
                placeholder="Ex: 1190"
                value={formPumpEnd}
                onChange={(e) => setFormPumpEnd(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km do Lançamento</label>
              <input
                type="number"
                required
                placeholder="Ex: 1350"
                value={formHourKm}
                onChange={(e) => setFormHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preencha o horímetro atual da máquina.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preço por Litro Estimado (R$)</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-500 font-mono select-none">
                R$ {formPrice !== '' ? Number(formPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '5,85'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Preço atual buscado do estoque de diesel mais recente da fazenda.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fornecedor / Origem</label>
              <input
                type="text"
                value={formSupplier}
                onChange={(e) => setFormSupplier(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Responsável pelo Lançamento</label>
              <input
                type="text"
                required
                placeholder="Ex: Gerente Carlos"
                value={formResponsible}
                onChange={(e) => setFormResponsible(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações / Notas</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Motivo do abastecimento, bico utilizado..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] h-16"
            />
          </div>

          {/* SIMULATED TRIGGERS / AUDITORIA DE BOMBA */}
          {discrepancyInfo && discrepancyInfo.hasDiscrepancy && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>ATENÇÃO: Desvio de sequência detectado!</span>
              </div>
              <p>
                A leitura inicial preenchida (<strong>{formPumpStart} L</strong>) não confere com o último lançamento de fechamento registrado para esta fazenda (<strong>{discrepancyInfo.lastEnd} L</strong>). Verifique se há erro de digitação antes de confirmar o envio.
              </p>
            </div>
          )}

          {discrepancyInfo && !discrepancyInfo.hasDiscrepancy && formPumpStart !== '' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              <span>Sequência de bomba auditada com sucesso! Confere com fechamento anterior ({discrepancyInfo.lastEnd} L).</span>
            </div>
          )}

          {/* Cálculos automáticos ao vivo no form */}
          {formPumpStart !== '' && formPumpEnd !== '' && Number(formPumpEnd) >= Number(formPumpStart) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Volume Total Fornecido</p>
                <p className="text-sm font-bold text-slate-800">{(Number(formPumpEnd) - Number(formPumpStart)).toLocaleString('pt-BR')} Litros</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Valor Calculado</p>
                <p className="text-sm font-bold text-[#1B3022]">R$ {((Number(formPumpEnd) - Number(formPumpStart)) * (Number(formPrice) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar Abastecimento
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDITAR ABASTECIMENTO */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Lançamento de Abastecimento">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda</label>
              <select
                value={editFarmId}
                onChange={(e) => setEditFarmId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data / Hora</label>
              <input
                type="datetime-local"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Máquina / Equipamento</label>
              <select
                value={editMachineId}
                onChange={(e) => setEditMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines
                  .filter(m => editFarmId === '' || m.farm_id === editFarmId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Combustível</label>
              <select
                value={editFuelType}
                onChange={(e) => setEditFuelType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.fuelTypes.map((t: LookupItem) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Leitura INICIAL da Bomba (L)</label>
              <input
                type="number"
                required
                placeholder="Ex: 1040"
                value={editPumpStart}
                onChange={(e) => setEditPumpStart(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Leitura FINAL da Bomba (L)</label>
              <input
                type="number"
                required
                placeholder="Ex: 1190"
                value={editPumpEnd}
                onChange={(e) => setEditPumpEnd(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km do Lançamento</label>
              <input
                type="number"
                required
                placeholder="Ex: 1350"
                value={editHourKm}
                onChange={(e) => setEditHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preencha o horímetro atual da máquina.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preço por Litro Estimado (R$)</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-500 font-mono select-none">
                R$ {editPrice !== '' ? Number(editPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '5,85'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Preço atual buscado do estoque de diesel mais recente da fazenda.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fornecedor / Origem</label>
              <input
                type="text"
                value={editSupplier}
                onChange={(e) => setEditSupplier(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Responsável pelo Lançamento</label>
              <input
                type="text"
                required
                placeholder="Ex: Gerente Carlos"
                value={editResponsible}
                onChange={(e) => setEditResponsible(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações / Notas</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Motivo do abastecimento, bico utilizado..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] h-16"
            />
          </div>

          {/* SIMULATED TRIGGERS / AUDITORIA DE BOMBA (EDIÇÃO) */}
          {editDiscrepancyInfo && editDiscrepancyInfo.hasDiscrepancy && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>ATENÇÃO: Desvio de sequência detectado!</span>
              </div>
              <p>
                A leitura inicial preenchida (<strong>{editPumpStart} L</strong>) não confere com o último lançamento de fechamento registrado para esta fazenda (<strong>{editDiscrepancyInfo.lastEnd} L</strong>). Verifique se há erro de digitação antes de confirmar o envio.
              </p>
            </div>
          )}

          {editDiscrepancyInfo && !editDiscrepancyInfo.hasDiscrepancy && editPumpStart !== '' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              <span>Sequência de bomba auditada com sucesso! Confere com fechamento anterior ({editDiscrepancyInfo.lastEnd} L).</span>
            </div>
          )}

          {/* Cálculos automáticos ao vivo no form de edição */}
          {editPumpStart !== '' && editPumpEnd !== '' && Number(editPumpEnd) >= Number(editPumpStart) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Volume Total Fornecido</p>
                <p className="text-sm font-bold text-slate-800">{(Number(editPumpEnd) - Number(editPumpStart)).toLocaleString('pt-BR')} Litros</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Valor Calculado</p>
                <p className="text-sm font-bold text-[#1B3022]">R$ {((Number(editPumpEnd) - Number(editPumpStart)) * (Number(editPrice) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

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
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal isOpen={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)} title="Excluir Lançamento">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-red-800 leading-normal">
              <p className="font-bold">Aviso importante</p>
              <p className="mt-1">
                Tem certeza de que deseja excluir permanentemente este lançamento de abastecimento? Esta ação não pode ser desfeita e irá reverter ou ajustar os cálculos de consumo de combustível e os horímetros correspondentes dos equipamentos envolvidos.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
