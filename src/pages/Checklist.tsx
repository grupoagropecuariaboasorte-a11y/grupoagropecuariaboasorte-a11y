import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Checklist30d, Farm, Machine } from '../types';
import Modal from '../components/Modal';
import { 
  CheckSquare, Plus, Search, Calendar, ShieldCheck, 
  AlertTriangle, Eye, Info, Filter, Edit, Trash2, 
  ShieldX, Wrench
} from 'lucide-react';

interface ChecklistProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function ChecklistPage({ selectedFarmId, selectedPeriod, userRole }: ChecklistProps) {
  const [checklists, setChecklists] = useState<Checklist30d[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form States (Nova Vistoria)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formMachineId, setFormMachineId] = useState('');
  const [formOperator, setFormOperator] = useState('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formWorkType, setFormWorkType] = useState('Plantio');
  const [formOverallStatus, setFormOverallStatus] = useState<'OK' | 'Necessita Atenção' | 'Máquina Parada'>('OK');
  const [formFailedNotes, setFormFailedNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States (Editar Vistoria)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editMachineId, setEditMachineId] = useState('');
  const [editOperator, setEditOperator] = useState('');
  const [editHourKm, setEditHourKm] = useState<number | ''>('');
  const [editWorkType, setEditWorkType] = useState('Plantio');
  const [editOverallStatus, setEditOverallStatus] = useState<'OK' | 'Necessita Atenção' | 'Máquina Parada'>('OK');
  const [editFailedNotes, setEditFailedNotes] = useState('');
  const [editDate, setEditDate] = useState('');

  // Target de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Checklist Items State (Os 7 itens de vistoria obrigatórios)
  const [items, setItems] = useState({
    engine_oil: 'OK',
    hydraulic_oil: 'OK',
    radiator_fluid: 'OK',
    tires_status: 'OK',
    brakes_status: 'OK',
    lights_status: 'OK',
    safety_gear: 'OK'
  });

  // Modal para Visualizar detalhes
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist30d | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cList, fList, mList] = await Promise.all([
          fleetService.getChecklists(),
          fleetService.getFarms(),
          fleetService.getMachines()
        ]);
        setChecklists(cList);
        setFarms(fList);
        setMachines(mList);

        const farmMachs = mList.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
        if (farmMachs.length > 0) {
          setFormMachineId(farmMachs[0].id);
          setFormHourKm(farmMachs[0].current_hour_km || farmMachs[0].initial_hour_km);
        } else if (mList.length > 0) {
          setFormMachineId(mList[0].id);
          setFormHourKm(mList[0].current_hour_km || mList[0].initial_hour_km);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedFarmId]);

  const refreshList = async () => {
    const list = await fleetService.getChecklists();
    setChecklists(list);
  };

  // Atualizar horímetro ao selecionar a máquina na criação
  useEffect(() => {
    if (!formMachineId) return;
    const mach = machines.find(m => m.id === formMachineId);
    if (mach) {
      setFormHourKm(mach.current_hour_km || mach.initial_hour_km);
    }
  }, [formMachineId, machines]);

  const handleOpenAdd = () => {
    setFormOperator('');
    setFormFailedNotes('');
    setFormWorkType('Plantio');
    setFormOverallStatus('OK');
    setFormDate(new Date().toISOString().split('T')[0]);
    setItems({
      engine_oil: 'OK',
      hydraulic_oil: 'OK',
      radiator_fluid: 'OK',
      tires_status: 'OK',
      brakes_status: 'OK',
      lights_status: 'OK',
      safety_gear: 'OK'
    });
    const farmMachines = machines.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
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

  const handleOpenEdit = (log: Checklist30d) => {
    setEditId(log.id);
    setEditMachineId(log.machine_id);
    setEditOperator(log.operator_name || '');
    setEditHourKm(log.hour_km ?? '');
    setEditWorkType(log.work_type || 'Plantio');
    setEditOverallStatus(log.overall_status || 'OK');
    setEditFailedNotes(log.failed_items_notes || '');
    setEditDate(log.date ? log.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setIsEditOpen(true);
  };

  // Alternar valor do item do checklist
  const toggleItem = (key: keyof typeof items) => {
    setItems(prev => {
      const nextVal = prev[key] === 'OK' ? 'Regular/Ajustar' : 'OK';
      
      setTimeout(() => {
        const anyFailed = Object.values({ ...prev, [key]: nextVal }).some(v => v !== 'OK');
        if (anyFailed) {
          setFormOverallStatus('Necessita Atenção');
        } else {
          setFormOverallStatus('OK');
        }
      }, 50);

      return { ...prev, [key]: nextVal };
    });
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addChecklist({
        machine_id: formMachineId,
        date: formDate,
        operator_name: formOperator,
        hour_km: Number(formHourKm),
        work_type: formWorkType,
        overall_status: formOverallStatus,
        failed_items_notes: formFailedNotes,
        details: items
      });
      setIsAddOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao registrar checklist: ' + err.message);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.updateChecklist(editId, {
        machine_id: editMachineId,
        date: editDate,
        operator_name: editOperator,
        hour_km: Number(editHourKm),
        work_type: editWorkType,
        overall_status: editOverallStatus,
        failed_items_notes: editFailedNotes
      });
      setIsEditOpen(false);
      refreshList();
      alert('Vistoria atualizada com sucesso!');
    } catch (err: any) {
      alert('Erro ao atualizar vistoria: ' + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await fleetService.deleteChecklist(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedChecklist?.id === deleteTarget.id) {
        setSelectedChecklist(null);
      }
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir vistoria: ' + err.message);
    }
  };

  // =========================================================================
  // FILTRAGEM GLOBAL E LOCAL
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

  const filteredLogs = checklists.filter(log => {
    const machine = machines.find(m => m.id === log.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);
    const machineMatch = machineFilter === 'ALL' || log.machine_id === machineFilter;
    const statusMatch = statusFilter === 'ALL' || log.overall_status === statusFilter;
    const periodMatch = isDateInPeriod(log.date);

    const textMatch = 
      (log.operator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.work_type && log.work_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.failed_items_notes && log.failed_items_notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && machineMatch && statusMatch && periodMatch && textMatch;
  });

  const selectedMachineObj = machineFilter !== 'ALL' ? machines.find(m => m.id === machineFilter) : null;
  const selectedMachineChecklists = selectedMachineObj ? checklists.filter(c => c.machine_id === selectedMachineObj.id) : [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* HEADER DE SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <CheckSquare size={18} className="text-[#1B3022]" />
            Checklist 30 Dias / Diário de Campo
          </h3>
          <p className="text-xs text-slate-500 mt-1">Registros de inspeções visuais e funcionais das máquinas realizadas por operadores com controle CRUD completo.</p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
          >
            <Plus size={14} />
            <span>Fazer Vistoria (Checklist)</span>
          </button>
        )}
      </div>

      {/* PAINEL DE INSPEÇÃO DA MÁQUINA SELECIONADA */}
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
              <span>Vistorias da Máquina:</span>
              <span className="text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                {selectedMachineChecklists.length} registradas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS DE BUSCA E SELEÇÃO DE MÁQUINA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-xs">
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

        {/* Filtro por Avaliação / Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Avaliações</option>
          <option value="OK">Aprovada (OK)</option>
          <option value="Necessita Atenção">Necessita Atenção</option>
          <option value="Máquina Parada">Máquina Parada</option>
        </select>

        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por operador, observação, equipamento..."
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

        <div className="text-xs text-slate-500 font-mono ml-auto">
          Encontradas: <strong className="text-slate-800">{filteredLogs.length}</strong>
        </div>
      </div>

      {/* GRADE DE VISTORIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const mach = machines.find(m => m.id === log.machine_id);
            const farm = farms.find(f => f?.id === mach?.farm_id);

            const statusStyles = {
              'OK': 'border-slate-200 bg-white hover:border-[#1B3022]/30',
              'Necessita Atenção': 'border-amber-200 bg-amber-50/50 hover:border-amber-350',
              'Máquina Parada': 'border-rose-200 bg-rose-50/50 hover:border-rose-350'
            };

            const pillStyles = {
              'OK': 'bg-emerald-50 text-emerald-700 border-emerald-200',
              'Necessita Atenção': 'bg-amber-100 text-amber-800 border-amber-250',
              'Máquina Parada': 'bg-rose-100 text-rose-800 border-rose-250'
            };

            return (
              <div 
                key={log.id} 
                className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xs relative ${statusStyles[log.overall_status] || statusStyles['OK']}`}
              >
                <div>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3.5 mb-3.5">
                    <div>
                      <span className="font-mono text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{farm?.name || 'Fazenda'}</span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1.5">{mach?.code} - {mach?.name}</h4>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-[8px] font-bold border rounded-md uppercase tracking-wider ${pillStyles[log.overall_status]}`}>
                      {log.overall_status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Operador:</span>
                      <strong className="text-slate-700">{log.operator_name}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Data Lançamento:</span>
                      <span className="font-mono">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Horímetro h/Km:</span>
                      <span className="font-mono font-bold text-slate-800">{log.hour_km.toLocaleString('pt-BR')} h</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Tipo de Trabalho:</span>
                      <span className="text-slate-700 font-medium">{log.work_type || 'Geral'}</span>
                    </p>

                    {log.failed_items_notes && (
                      <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2 truncate font-serif italic" title={log.failed_items_notes}>
                        &ldquo;{log.failed_items_notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* RODAPÉ E AÇÕES CRUD */}
                <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {userRole !== 'viewer' && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(log)}
                          title="Editar Vistoria"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: log.id, title: `Vistoria de ${mach?.code} (${log.operator_name})` })}
                          title="Excluir Vistoria"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => setSelectedChecklist(log)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#1B3022] hover:underline cursor-pointer ml-auto"
                  >
                    <Eye size={12} /> Ver Ficha
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full h-48 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-xs">
            <CheckSquare size={32} className="mb-2 text-slate-300" />
            <p className="text-xs">Nenhum diário de checklist encontrado nos filtros.</p>
          </div>
        )}
      </div>

      {/* MODAL: FAZER VISTORIA (NOVA) */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Ficha de Checklist de Ativos (30 Dias)">
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento Vistoriado</label>
              <select
                value={formMachineId}
                onChange={(e) => setFormMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines
                  .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data da Vistoria</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Operador Responsável</label>
              <input
                type="text"
                required
                placeholder="Ex: Pedro de Souza"
                value={formOperator}
                onChange={(e) => setFormOperator(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km de Entrada</label>
              <input
                type="number"
                required
                value={formHourKm}
                onChange={(e) => setFormHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Atividade de Campo</label>
              <select
                value={formWorkType}
                onChange={(e) => setFormWorkType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Plantio">Plantio</option>
                <option value="Colheita">Colheita</option>
                <option value="Pulverização">Pulverização</option>
                <option value="Preparo de Solo">Preparo de Solo</option>
                <option value="Transporte">Transporte / Logística</option>
                <option value="Outro">Outra Atividade</option>
              </select>
            </div>
          </div>

          {/* PARÂMETROS OBRIGATÓRIOS DO CHECKLIST */}
          <div className="border-t border-b border-slate-200 py-4 my-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[#1B3022]" /> Vistoria e Avaliação de Componentes
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Nível de óleo do motor</span>
                <button
                  type="button"
                  onClick={() => toggleItem('engine_oil')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.engine_oil === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.engine_oil}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Nível de óleo hidráulico</span>
                <button
                  type="button"
                  onClick={() => toggleItem('hydraulic_oil')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.hydraulic_oil === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.hydraulic_oil}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Água / Fluido do radiador</span>
                <button
                  type="button"
                  onClick={() => toggleItem('radiator_fluid')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.radiator_fluid === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.radiator_fluid}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Calibragem / Pneus / Esteira</span>
                <button
                  type="button"
                  onClick={() => toggleItem('tires_status')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.tires_status === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.tires_status}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Sistema de freio mecânico</span>
                <button
                  type="button"
                  onClick={() => toggleItem('brakes_status')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.brakes_status === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.brakes_status}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Lanternas / Faróis / Elétrica</span>
                <button
                  type="button"
                  onClick={() => toggleItem('lights_status')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.lights_status === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.lights_status}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-700 font-medium">Equipamento de segurança (Cinto/Extintor)</span>
                <button
                  type="button"
                  onClick={() => toggleItem('safety_gear')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all ${
                    items.safety_gear === 'OK' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                      : 'bg-amber-100 text-amber-800 border border-amber-250'
                  }`}
                >
                  {items.safety_gear}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Avaliação Final</label>
              <select
                value={formOverallStatus}
                onChange={(e) => setFormOverallStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="OK">OK - Equipamento Liberado</option>
                <option value="Necessita Atenção">Necessita Atenção (Manutenção Leve)</option>
                <option value="Máquina Parada">MÁQUINA PARADA (Crítico - Risco de pane)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descreva os Itens com Falhas</label>
              <input
                type="text"
                placeholder="Filtro necessita de troca em breve..."
                value={formFailedNotes}
                onChange={(e) => setFormFailedNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

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
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDITAR VISTORIA */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Lançamento de Vistoria (Checklist)">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento Vistoriado</label>
              <select
                value={editMachineId}
                onChange={(e) => setEditMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data da Vistoria</label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Operador Responsável</label>
              <input
                type="text"
                required
                value={editOperator}
                onChange={(e) => setEditOperator(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km</label>
              <input
                type="number"
                required
                value={editHourKm}
                onChange={(e) => setEditHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Atividade de Campo</label>
              <select
                value={editWorkType}
                onChange={(e) => setEditWorkType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Plantio">Plantio</option>
                <option value="Colheita">Colheita</option>
                <option value="Pulverização">Pulverização</option>
                <option value="Preparo de Solo">Preparo de Solo</option>
                <option value="Transporte">Transporte / Logística</option>
                <option value="Outro">Outra Atividade</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Avaliação Final</label>
              <select
                value={editOverallStatus}
                onChange={(e) => setEditOverallStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="OK">OK - Equipamento Liberado</option>
                <option value="Necessita Atenção">Necessita Atenção (Manutenção Leve)</option>
                <option value="Máquina Parada">MÁQUINA PARADA (Crítico - Risco de pane)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações / Itens com Falhas</label>
              <textarea
                value={editFailedNotes}
                onChange={(e) => setEditFailedNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-20"
              />
            </div>
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
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão">
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Tem certeza de que deseja excluir permanentemente <strong>{deleteTarget.title}</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: VER DETALHES DO CHECKLIST */}
      {selectedChecklist && (
        <Modal isOpen={!!selectedChecklist} onClose={() => setSelectedChecklist(null)} title="Laudo de Inspeção do Equipamento">
          <div className="space-y-6 text-xs text-slate-600">
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-y-3 shadow-xs">
              <div>
                <p className="text-slate-400">Máquina</p>
                <p className="text-sm font-bold text-slate-800">
                  {machines.find(m => m.id === selectedChecklist.machine_id)?.code} - {machines.find(m => m.id === selectedChecklist.machine_id)?.name}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Fazenda</p>
                <p className="text-slate-800 font-bold">
                  {farms.find(f => f.id === machines.find(m => m.id === selectedChecklist.machine_id)?.farm_id)?.name}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Data de Inspeção</p>
                <p className="text-slate-800 font-mono font-semibold">{new Date(selectedChecklist.date).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-slate-400">Operador Vistoriador</p>
                <p className="text-slate-800 font-semibold">{selectedChecklist.operator_name}</p>
              </div>
              <div>
                <p className="text-slate-400">Horímetro h/Km no Dia</p>
                <p className="text-[#1B3022] font-mono font-bold">{selectedChecklist.hour_km.toLocaleString('pt-BR')} h/km</p>
              </div>
              <div>
                <p className="text-slate-400">Atividade do Ativo</p>
                <p className="text-slate-800 font-semibold">{selectedChecklist.work_type || 'Geral'}</p>
              </div>
            </div>

            {/* ITENS DETALHADOS */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status das Peças Avaliadas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(selectedChecklist.details || {}).map(([key, value]) => {
                  const labels: { [key: string]: string } = {
                    engine_oil: 'Óleo do motor',
                    hydraulic_oil: 'Óleo hidráulico',
                    radiator_fluid: 'Líquido refrigerante',
                    tires_status: 'Pneus / Calibragem',
                    brakes_status: 'Freio',
                    lights_status: 'Luzes / Elétrica',
                    safety_gear: 'Equipamento segurança'
                  };

                  return (
                    <div key={key} className="flex justify-between items-center bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                      <span className="text-slate-500">{labels[key] || key}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        value === 'OK' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' : 'bg-amber-50 text-amber-800 border border-amber-150'
                      }`}>
                        {String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LAUDO E OBSERVAÇÕES */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Situação Geral de Liberação</h4>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs">
                {selectedChecklist.overall_status === 'OK' && (
                  <>
                    <ShieldCheck size={28} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-700 uppercase text-xs">APROVADA - Equipamento Liberado</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Nenhum componente crítico detectou desgaste ou falta de lubrificante.</p>
                    </div>
                  </>
                )}

                {selectedChecklist.overall_status === 'Necessita Atenção' && (
                  <>
                    <AlertTriangle size={28} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-700 uppercase text-xs">ATENÇÃO - Manutenção Leve Pendente</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Necessita realizar pequenas vistorias de lubrificantes e fluidos em breve.</p>
                    </div>
                  </>
                )}

                {selectedChecklist.overall_status === 'Máquina Parada' && (
                  <>
                    <ShieldX size={28} className="text-rose-600 shrink-0" />
                    <div>
                      <p className="font-bold text-rose-700 uppercase text-xs">BLOQUEADA - Máquina Parada</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Risco imediato de falha no motor ou transmissão. Bloqueada para campo.</p>
                    </div>
                  </>
                )}
              </div>

              {selectedChecklist.failed_items_notes && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-slate-700">
                  <strong>Laudo Técnico / Relatos do Operador:</strong>
                  <p className="mt-1 text-slate-500 font-serif italic">&ldquo;{selectedChecklist.failed_items_notes}&rdquo;</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              {userRole !== 'viewer' && (
                <button
                  onClick={() => {
                    const c = selectedChecklist;
                    setSelectedChecklist(null);
                    handleOpenEdit(c);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1B3022] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Edit size={13} /> Editar Vistoria
                </button>
              )}

              <button 
                onClick={() => setSelectedChecklist(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs rounded-xl font-bold cursor-pointer ml-auto"
              >
                Fechar Laudo
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
