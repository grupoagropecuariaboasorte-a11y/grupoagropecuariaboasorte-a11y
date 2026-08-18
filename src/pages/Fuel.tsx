import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { FuelLog, Farm, Machine, LookupItem, UserRole, isImplement } from '../types';
import Modal from '../components/Modal';
import { 
  Fuel, Plus, Trash2, Search, Calendar, AlertTriangle, 
  Info, Check, HelpCircle, FileText, Pencil, Clock
} from 'lucide-react';
import { formatDateTimeForInput, parseInputDateTimeToISO, formatDisplayDateTime } from '../lib/dateUtils';

interface FuelProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: UserRole;
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
  const [formDate, setFormDate] = useState(() => formatDateTimeForInput(new Date()));
  const [formFuelType, setFormFuelType] = useState('diesel_s10');
  const [formPumpStart, setFormPumpStart] = useState<number | ''>('');
  const [formPumpEnd, setFormPumpEnd] = useState<number | ''>('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formPrice, setFormPrice] = useState<number | ''>(5.85);
  const [formSupplier, setFormSupplier] = useState('Bomba Própria');
  const [formResponsible, setFormResponsible] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Discrepancy Check state
  const [discrepancyInfo, setDiscrepancyInfo] = useState<{ lastEnd: number | null; hasDiscrepancy: boolean; isFirstLog?: boolean } | null>(null);
  const [isLoadingPump, setIsLoadingPump] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addDateSynced, setAddDateSynced] = useState(false);

  // Edit Form States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editDateSynced, setEditDateSynced] = useState(false);
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
  const [editDiscrepancyInfo, setEditDiscrepancyInfo] = useState<{ lastEnd: number | null; hasDiscrepancy: boolean; isFirstLog?: boolean } | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteJustification, setDeleteJustification] = useState('');

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('ALL');

  // Reset local machine filter when global farm filter changes
  useEffect(() => {
    setMachineFilter('ALL');
  }, [selectedFarmId]);

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
        const onlyMachs = mList.filter(m => !isImplement(m));
        const farmMachs = onlyMachs.filter(m => m.farm_id === initialFarm);
        if (farmMachs.length > 0) {
          setFormMachineId(farmMachs[0].id);
        } else if (onlyMachs.length > 0) {
          setFormMachineId(onlyMachs[0].id);
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
    const [list, mList] = await Promise.all([
      fleetService.getFuelLogs(),
      fleetService.getMachines()
    ]);
    setFuelLogs(list);
    setMachines(mList);
  };

  // Carregar sequência de bomba para a fazenda
  const loadPumpSequenceForFarm = async (farmId: string) => {
    if (!farmId || farmId === 'ALL') {
      setDiscrepancyInfo(null);
      return;
    }
    setIsLoadingPump(true);
    try {
      const lastReading = await fleetService.getLatestPumpReading(farmId);
      if (lastReading !== null) {
        setFormPumpStart(lastReading);
        setDiscrepancyInfo({ lastEnd: lastReading, hasDiscrepancy: false, isFirstLog: false });
      } else {
        setFormPumpStart('');
        setDiscrepancyInfo({ lastEnd: null, hasDiscrepancy: false, isFirstLog: true });
      }
    } catch (e) {
      console.error('Erro ao carregar leitura da bomba:', e);
      setDiscrepancyInfo(null);
    } finally {
      setIsLoadingPump(false);
    }
  };

  // Monitorar discrepâncias de bomba ao alterar a fazenda e a leitura inicial manualmente
  useEffect(() => {
    if (!formFarmId || formPumpStart === '') {
      return;
    }

    if (discrepancyInfo && !discrepancyInfo.isFirstLog && discrepancyInfo.lastEnd !== null) {
      const isDiff = Number(formPumpStart) !== Number(discrepancyInfo.lastEnd);
      if (discrepancyInfo.hasDiscrepancy !== isDiff) {
        setDiscrepancyInfo({
          ...discrepancyInfo,
          hasDiscrepancy: isDiff
        });
      }
    }
  }, [formFarmId, formPumpStart, discrepancyInfo]);

  // Helper para obter o horímetro mais recente e consolidado da máquina
  const getMachineEffectiveHourKm = (mach: Machine) => {
    const machLogs = fuelLogs.filter(l => l.machine_id === mach.id && l.hour_km_at_fueling !== undefined && l.hour_km_at_fueling !== null);
    const maxFuelHour = machLogs.length > 0 ? Math.max(...machLogs.map(l => Number(l.hour_km_at_fueling) || 0)) : 0;
    const baseHour = Number(mach.current_hour_km || mach.initial_hour_km || 0);
    return Math.max(baseHour, maxFuelHour);
  };

  // Atualizar horímetro sugerido ao selecionar a máquina
  useEffect(() => {
    if (!formMachineId) return;
    const mach = machines.find(m => m.id === formMachineId);
    if (mach) {
      setFormHourKm(getMachineEffectiveHourKm(mach));
    }
  }, [formMachineId, machines, fuelLogs]);

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
          setEditDiscrepancyInfo({ lastEnd: Number(editPumpStart), hasDiscrepancy: false, isFirstLog: false });
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

  const handleOpenEdit = (log: FuelLog) => {
    setEditingLogId(log.id);
    setEditFarmId(log.farm_id);
    setEditMachineId(log.machine_id);
    setEditDate(formatDateTimeForInput(log.date));
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

  // =========================================================================
  // VALIDAÇÕES E ALERTAS DE ABASTECIMENTO
  // =========================================================================
  // Validações do Modal de Cadastro (ADD)
  const selectedAddMachine = machines.find(m => m.id === formMachineId);
  const lastAddMachineHour = selectedAddMachine ? getMachineEffectiveHourKm(selectedAddMachine) : 0;

  const isAddPumpMissing = formPumpStart === '' || formPumpEnd === '';
  const isAddPumpEndInvalid = formPumpStart !== '' && formPumpEnd !== '' && Number(formPumpEnd) <= Number(formPumpStart);
  const isAddPumpDiscrepancy = Boolean(
    discrepancyInfo &&
    !discrepancyInfo.isFirstLog &&
    discrepancyInfo.lastEnd !== null &&
    (formPumpStart === '' || Number(formPumpStart) !== Number(discrepancyInfo.lastEnd))
  );
  const isAddHourKmInvalid = formHourKm !== '' && selectedAddMachine !== undefined && lastAddMachineHour > 0 && Number(formHourKm) < lastAddMachineHour;
  const isAddNegative = (formPumpStart !== '' && Number(formPumpStart) < 0) || (formPumpEnd !== '' && Number(formPumpEnd) < 0) || (formHourKm !== '' && Number(formHourKm) < 0);

  const hasAddAlert = isAddPumpMissing || isAddPumpEndInvalid || isAddPumpDiscrepancy || isAddHourKmInvalid || isAddNegative;

  // Validações do Modal de Edição (EDIT)
  const selectedEditMachine = machines.find(m => m.id === editMachineId);
  const lastEditMachineHour = selectedEditMachine ? (selectedEditMachine.initial_hour_km || 0) : 0;

  const isEditPumpMissing = editPumpStart === '' || editPumpEnd === '';
  const isEditPumpEndInvalid = editPumpStart !== '' && editPumpEnd !== '' && Number(editPumpEnd) <= Number(editPumpStart);
  const isEditPumpDiscrepancy = Boolean(editDiscrepancyInfo && editDiscrepancyInfo.hasDiscrepancy);
  const isEditHourKmInvalid = editHourKm !== '' && selectedEditMachine !== undefined && lastEditMachineHour > 0 && Number(editHourKm) < lastEditMachineHour;
  const isEditNegative = (editPumpStart !== '' && Number(editPumpStart) < 0) || (editPumpEnd !== '' && Number(editPumpEnd) < 0) || (editHourKm !== '' && Number(editHourKm) < 0);

  const hasEditAlert = isEditPumpMissing || isEditPumpEndInvalid || isEditPumpDiscrepancy || isEditHourKmInvalid || isEditNegative;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogId || isEditSubmitting) return;

    if (hasEditAlert) {
      if (isEditPumpDiscrepancy) {
        alert('Alteração não permitida: A leitura inicial da bomba não confere com o fechamento anterior!');
      } else if (isEditPumpEndInvalid) {
        alert('Alteração não permitida: A leitura final da bomba deve ser estritamente maior que a leitura inicial!');
      } else if (isEditHourKmInvalid) {
        alert('Alteração não permitida: O horímetro/km informado é menor que o horímetro inicial da máquina!');
      } else if (isEditNegative) {
        alert('Alteração não permitida: Leituras de bomba e horímetro não podem ser negativas!');
      } else {
        alert('Alteração não permitida devido a campos vazios ou divergência de informações!');
      }
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updatedLog = await fleetService.updateFuelLog(editingLogId, {
        farm_id: editFarmId,
        machine_id: editMachineId,
        date: parseInputDateTimeToISO(editDate),
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
      if (editMachineId && editHourKm !== '') {
        setMachines(prev => prev.map(m => m.id === editMachineId ? {
          ...m,
          current_hour_km: Math.max(Number(m.current_hour_km || 0), Number(editHourKm)),
          ...(editFarmId && editFarmId !== 'ALL' ? { farm_id: editFarmId } : {})
        } : m));
      }
      await refreshList();
    } catch (err: any) {
      alert('Erro ao atualizar abastecimento: ' + (err.message || err));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    if (!deleteJustification.trim()) {
      alert('Por favor, informe uma justificativa para a exclusão.');
      return;
    }
    try {
      await fleetService.deleteFuelLog(deleteConfirmId, deleteJustification);
      setDeleteConfirmId(null);
      setDeleteJustification('');
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir abastecimento: ' + err.message);
    }
  };

  // =========================================================================
  // SUBMISSÃO DO ABASTECIMENTO COM TRAVA ANTI-DUPLICIDADE
  // =========================================================================
  const handleOpenAdd = async () => {
    setFormDate(formatDateTimeForInput(new Date()));
    setFormPumpEnd('');
    setFormNotes('');
    setFormResponsible('');
    const defaultFarm = selectedFarmId === 'ALL' ? (farms[0]?.id || '') : selectedFarmId;
    setFormFarmId(defaultFarm);
    const nonImplMachines = machines.filter(m => !isImplement(m));
    const farmMachines = nonImplMachines.filter(m => m.farm_id === defaultFarm);
    if (farmMachines.length > 0) {
      setFormMachineId(farmMachines[0].id);
      setFormHourKm(getMachineEffectiveHourKm(farmMachines[0]));
    } else if (nonImplMachines.length > 0) {
      setFormMachineId(nonImplMachines[0].id);
      setFormHourKm(getMachineEffectiveHourKm(nonImplMachines[0]));
    } else {
      setFormMachineId('');
      setFormHourKm('');
    }
    setIsAddOpen(true);
    if (defaultFarm) {
      await loadPumpSequenceForFarm(defaultFarm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!formFarmId) {
      alert('Por favor, selecione uma fazenda.');
      return;
    }

    if (formPumpStart === '' || formPumpEnd === '') {
      alert('Por favor, preencha as leituras inicial e final da bomba.');
      return;
    }

    const startVal = Number(formPumpStart);
    const endVal = Number(formPumpEnd);

    if (isNaN(startVal) || isNaN(endVal)) {
      alert('As leituras da bomba devem ser valores numéricos válidos.');
      return;
    }

    if (endVal <= startVal) {
      alert(`Lançamento bloqueado: A leitura final da bomba (${endVal} L) deve ser estritamente maior que a leitura inicial (${startVal} L)!`);
      return;
    }

    if (hasAddAlert) {
      if (isAddPumpDiscrepancy) {
        alert(`Lançamento bloqueado: A leitura inicial (${startVal} L) não coincide com o fechamento anterior (${discrepancyInfo?.lastEnd} L)!`);
      } else if (isAddPumpEndInvalid) {
        alert('Lançamento bloqueado: A leitura final da bomba deve ser maior que a leitura inicial!');
      } else if (isAddHourKmInvalid) {
        alert('Lançamento bloqueado: O horímetro/km informado é menor que o horímetro atual da máquina!');
      } else if (isAddNegative) {
        alert('Lançamento bloqueado: Leituras de bomba e horímetro não podem ser negativas!');
      } else {
        alert('Lançamento bloqueado devido a alertas ou divergência de informações!');
      }
      return;
    }

    // Trava de submissão imediata contra duplo clique
    setIsSubmitting(true);
    try {
      const newHourVal = Number(formHourKm);
      await fleetService.addFuelLog({
        farm_id: formFarmId,
        machine_id: formMachineId,
        date: parseInputDateTimeToISO(formDate),
        fuel_type: formFuelType,
        pump_reading_start: startVal,
        pump_reading_end: endVal,
        hour_km_at_fueling: newHourVal,
        supplier: formSupplier,
        responsible: formResponsible,
        notes: formNotes
      });

      // Atualiza o estado local imediatamente para refletir na UI sem atraso
      if (formMachineId && !isNaN(newHourVal)) {
        setMachines(prev => prev.map(m => m.id === formMachineId ? {
          ...m,
          current_hour_km: newHourVal,
          ...(formFarmId && formFarmId !== 'ALL' ? { farm_id: formFarmId } : {})
        } : m));
      }

      setIsAddOpen(false);
      await refreshList();
    } catch (err: any) {
      alert('Erro ao registrar abastecimento: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
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

  const activeLogs = fuelLogs.filter((log: any) => !log.is_deleted);
  const deletedLogs = fuelLogs.filter((log: any) => log.is_deleted);

  const filteredLogs = activeLogs.filter(log => {
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
          {machines
            .filter(m => !isImplement(m))
            .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
            .map(m => (
              <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
            ))
          }
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
                        {formatDisplayDateTime(log.date)}
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

      {/* HISTÓRICO DE ABASTECIMENTOS REMOVIDOS */}
      {deletedLogs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mt-8">
          <div className="p-6 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Histórico de Abastecimentos Removidos / Cancelados
              </h4>
            </div>
            <span className="text-[11px] text-rose-700 font-bold font-mono">
              Removidos: {deletedLogs.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-rose-50/20 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Máquina / Fazenda</th>
                  <th className="py-4 px-6 font-mono text-right">Litros</th>
                  <th className="py-4 px-6 text-rose-800">Justificativa da Remoção</th>
                  <th className="py-4 px-6">Responsável / Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedLogs.map((log: any) => {
                  const machine = machines.find(m => m.id === log.machine_id);
                  const farm = farms.find(f => f.id === log.farm_id);
                  const lts = Number(log.pump_reading_end) - Number(log.pump_reading_start);
                  return (
                    <tr key={log.id} className="bg-slate-50/40 text-slate-500 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono line-through decoration-rose-300">
                        {formatDisplayDateTime(log.date)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold line-through decoration-rose-300">{machine?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{farm?.name || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-rose-600/70 line-through decoration-rose-300">
                        {lts > 0 ? lts.toLocaleString('pt-BR') : 0} L
                      </td>
                      <td className="py-4 px-6 text-rose-800 font-semibold bg-rose-50/30">
                        {log.deletion_reason || 'N/A'}
                      </td>
                      <td className="py-4 px-6 italic max-w-xs truncate" title={log.notes}>
                        <div className="font-semibold text-slate-600">{log.responsible || '-'}</div>
                        {log.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ABASTECIMENTO */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Lançar Abastecimento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda</label>
              <select
                value={formFarmId}
                onChange={async (e) => {
                  const selected = e.target.value;
                  setFormFarmId(selected);
                  const farmMachines = machines.filter(m => !isImplement(m) && m.farm_id === selected);
                  if (farmMachines.length > 0) {
                    setFormMachineId(farmMachines[0].id);
                    setFormHourKm(farmMachines[0].current_hour_km || farmMachines[0].initial_hour_km);
                  } else {
                    setFormMachineId('');
                    setFormHourKm('');
                  }
                  setFormPumpEnd('');
                  if (selected) {
                    await loadPumpSequenceForFarm(selected);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="block text-xs font-semibold text-slate-700">Data / Hora</label>
                <button
                  type="button"
                  id="btn-auto-device-datetime-add"
                  onClick={() => {
                    const nowStr = formatDateTimeForInput(new Date());
                    setFormDate(nowStr);
                    setAddDateSynced(true);
                    setTimeout(() => setAddDateSynced(false), 2000);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs border ${
                    addDateSynced
                      ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/90'
                  }`}
                  title="Capturar a data e a hora atual do relógio do seu dispositivo e preencher automaticamente"
                >
                  <Clock size={12} className={addDateSynced ? 'animate-spin' : 'text-emerald-700'} />
                  <span>{addDateSynced ? '✓ Atualizado Agora!' : 'Buscar Data/Hora Atual'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Máquina / Equipamento</label>
              <select
                value={formMachineId}
                onChange={(e) => setFormMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines
                  .filter(m => !isImplement(m))
                  .filter(m => !formFarmId || m.farm_id === formFarmId)
                  .map((m) => {
                  const mFarm = farms.find(f => f.id === m.farm_id)?.name;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} {mFarm ? `(${mFarm})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Combustível</label>
              <select
                value={formFuelType}
                onChange={(e) => setFormFuelType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.fuelTypes.filter((t: LookupItem) => t.id !== 'arla_32' && t.id !== 'gasolina' && !t.label?.toLowerCase().includes('arla') && !t.label?.toLowerCase().includes('gasolina')).map((t: LookupItem) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500">Leitura INICIAL da Bomba (L)</label>
                {isLoadingPump && <span className="text-[10px] text-amber-600 animate-pulse font-medium">Buscando último fechamento...</span>}
              </div>
              <input
                type="number"
                required
                placeholder={isLoadingPump ? "Carregando..." : "Ex: 1040"}
                value={formPumpStart}
                onChange={(e) => setFormPumpStart(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {discrepancyInfo?.isFirstLog
                  ? 'Primeiro abastecimento desta fazenda: defina o início da bomba.'
                  : discrepancyInfo?.lastEnd !== null
                    ? `Preenchido automaticamente com o fechamento anterior (${discrepancyInfo?.lastEnd} L).`
                    : 'Leitura inicial da bomba de combustível.'}
              </span>
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
              <span className="text-[10px] text-slate-400 mt-1 block">Leitura final registrada na bomba após o abastecimento.</span>
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

          {/* AUDITORIA DE BOMBA E VALIDACÕES DE ALERTAS */}
          {isAddPumpDiscrepancy && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Desvio de sequência de bomba detectado!</span>
              </div>
              <p>
                A leitura inicial preenchida (<strong>{formPumpStart} L</strong>) não confere com o último lançamento de fechamento registrado para esta fazenda (<strong>{discrepancyInfo?.lastEnd} L</strong>). Não é permitido lançar abastecimentos com desvio na leitura da bomba.
              </p>
            </div>
          )}

          {isAddPumpEndInvalid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Leitura final da bomba inválida!</span>
              </div>
              <p>
                A leitura final da bomba (<strong>{formPumpEnd} L</strong>) deve ser maior do que a leitura inicial (<strong>{formPumpStart} L</strong>).
              </p>
            </div>
          )}

          {isAddHourKmInvalid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Divergência no Horímetro/Km!</span>
              </div>
              <p>
                O horímetro/km informado (<strong>{formHourKm}</strong>) é menor do que o último horímetro registrado para a máquina <strong>{selectedAddMachine?.code}</strong> (<strong>{lastAddMachineHour}</strong>).
              </p>
            </div>
          )}

          {isAddNegative && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Valores negativos!</span>
              </div>
              <p>
                As leituras de bomba e horímetro devem ter valores positivos.
              </p>
            </div>
          )}

          {!hasAddAlert && discrepancyInfo && !discrepancyInfo.hasDiscrepancy && formPumpStart !== '' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              <span>Sequência de bomba auditada com sucesso! Confere com fechamento anterior ({discrepancyInfo.lastEnd} L).</span>
            </div>
          )}

          {/* Banner Resumo de Bloqueio se houver alerta */}
          {hasAddAlert && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <span>Lançamento bloqueado: Corrija os alertas acima para permitir a gravação.</span>
            </div>
          )}

          {/* Cálculos automáticos ao vivo no form */}
          {formPumpStart !== '' && formPumpEnd !== '' && Number(formPumpEnd) > Number(formPumpStart) && (
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
              disabled={isSubmitting}
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hasAddAlert || isSubmitting}
              className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 ${
                hasAddAlert || isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-[#1B3022] hover:opacity-90 cursor-pointer active:scale-98'
              }`}
              title={hasAddAlert ? 'Lançamento bloqueado devido a alertas ou divergências' : 'Confirmar Abastecimento'}
            >
              {isSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? 'Registrando Abastecimento...' : 'Confirmar Abastecimento'}</span>
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
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="block text-xs font-semibold text-slate-700">Data / Hora</label>
                <button
                  type="button"
                  id="btn-auto-device-datetime-edit"
                  onClick={() => {
                    const nowStr = formatDateTimeForInput(new Date());
                    setEditDate(nowStr);
                    setEditDateSynced(true);
                    setTimeout(() => setEditDateSynced(false), 2000);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs border ${
                    editDateSynced
                      ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/90'
                  }`}
                  title="Capturar a data e a hora atual do relógio do seu dispositivo e preencher automaticamente"
                >
                  <Clock size={12} className={editDateSynced ? 'animate-spin' : 'text-emerald-700'} />
                  <span>{editDateSynced ? '✓ Atualizado Agora!' : 'Buscar Data/Hora Atual'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Máquina / Equipamento</label>
              <select
                value={editMachineId}
                onChange={(e) => setEditMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines
                  .filter(m => !isImplement(m))
                  .map((m) => {
                  const mFarm = farms.find(f => f.id === m.farm_id)?.name;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} {mFarm ? `(${mFarm})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Combustível</label>
              <select
                value={editFuelType}
                onChange={(e) => setEditFuelType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.fuelTypes.filter((t: LookupItem) => t.id !== 'arla_32' && t.id !== 'gasolina' && !t.label?.toLowerCase().includes('arla') && !t.label?.toLowerCase().includes('gasolina')).map((t: LookupItem) => (
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

          {/* AUDITORIA DE BOMBA E VALIDAÇÕES DE ALERTAS (EDIÇÃO) */}
          {isEditPumpDiscrepancy && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Desvio de sequência de bomba detectado!</span>
              </div>
              <p>
                A leitura inicial preenchida (<strong>{editPumpStart} L</strong>) não confere com o último lançamento de fechamento registrado para esta fazenda (<strong>{editDiscrepancyInfo?.lastEnd} L</strong>). A alteração não será permitida com desvio na leitura da bomba.
              </p>
            </div>
          )}

          {isEditPumpEndInvalid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Leitura final da bomba inválida!</span>
              </div>
              <p>
                A leitura final da bomba (<strong>{editPumpEnd} L</strong>) deve ser maior do que a leitura inicial (<strong>{editPumpStart} L</strong>).
              </p>
            </div>
          )}

          {isEditHourKmInvalid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Divergência no Horímetro/Km!</span>
              </div>
              <p>
                O horímetro/km informado (<strong>{editHourKm}</strong>) é menor do que o horímetro atual da máquina <strong>{selectedEditMachine?.code}</strong> (<strong>{lastEditMachineHour}</strong>).
              </p>
            </div>
          )}

          {isEditNegative && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>BLOQUEADO: Valores negativos!</span>
              </div>
              <p>
                As leituras de bomba e horímetro devem ter valores positivos.
              </p>
            </div>
          )}

          {!hasEditAlert && editDiscrepancyInfo && !editDiscrepancyInfo.hasDiscrepancy && editPumpStart !== '' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              <span>Sequência de bomba auditada com sucesso! Confere com fechamento anterior ({editDiscrepancyInfo.lastEnd} L).</span>
            </div>
          )}

          {/* Banner Resumo de Bloqueio se houver alerta */}
          {hasEditAlert && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <span>Alteração bloqueada: Corrija os alertas acima para permitir a gravação.</span>
            </div>
          )}

          {/* Cálculos automáticos ao vivo no form de edição */}
          {editPumpStart !== '' && editPumpEnd !== '' && Number(editPumpEnd) > Number(editPumpStart) && (
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
              disabled={isEditSubmitting}
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hasEditAlert || isEditSubmitting}
              className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 ${
                hasEditAlert || isEditSubmitting
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-[#1B3022] hover:opacity-90 cursor-pointer active:scale-98'
              }`}
              title={hasEditAlert ? 'Alteração bloqueada devido a alertas ou divergências' : 'Salvar Alterações'}
            >
              {isEditSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEditSubmitting ? 'Salvando Alterações...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* DELETE CONFIRMATION MODAL */}
      <Modal isOpen={deleteConfirmId !== null} onClose={() => { setDeleteConfirmId(null); setDeleteJustification(''); }} title="Excluir Lançamento">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertTriangle size={24} />
            <h3 className="text-sm font-bold">Atenção!</h3>
          </div>
          <p className="text-xs text-slate-600 mb-6">
            Tem certeza que deseja excluir este lançamento de abastecimento? 
            Esta ação não pode ser desfeita, mas ficará registrada no histórico.
          </p>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Justificativa da Exclusão <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={deleteJustification}
              onChange={(e) => setDeleteJustification(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-red-500 min-h-[80px]"
              placeholder="Ex: Erro de digitação na leitura da bomba..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => { setDeleteConfirmId(null); setDeleteJustification(''); }}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={!deleteJustification.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
