import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { WorkOrder, Farm, Machine } from '../types';
import Modal from '../components/Modal';
import { 
  ClipboardList, Plus, Search, Calendar, ChevronRight, 
  ArrowRight, CheckCircle2, Clock, PlayCircle, Trash2, 
  AlertTriangle, Wrench, ArrowLeft, Filter, Edit
} from 'lucide-react';

interface WorkOrdersProps {
  selectedFarmId: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function WorkOrders({ selectedFarmId, userRole }: WorkOrdersProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Form States (Nova OS)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formMachineId, setFormMachineId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');
  const [formAssignedTo, setFormAssignedTo] = useState('');

  // Form States (Editar OS)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editMachineId, setEditMachineId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('Média');
  const [editStatus, setEditStatus] = useState<'Aberta' | 'Em Andamento' | 'Concluída' | 'Cancelada'>('Aberta');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editOpenDate, setEditOpenDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Target de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [woList, mList, fList] = await Promise.all([
          fleetService.getWorkOrders(),
          fleetService.getMachines(),
          fleetService.getFarms()
        ]);
        setWorkOrders(woList);
        setMachines(mList);
        setFarms(fList);

        const farmMachs = mList.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
        if (farmMachs.length > 0) {
          setFormMachineId(farmMachs[0].id);
        } else if (mList.length > 0) {
          setFormMachineId(mList[0].id);
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
    const list = await fleetService.getWorkOrders();
    setWorkOrders(list);
  };

  const handleOpenAdd = () => {
    setFormDescription('');
    setFormAssignedTo('');
    setFormPriority('Média');
    
    const farmMachines = machines.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
    if (farmMachines.length > 0) {
      setFormMachineId(farmMachines[0].id);
    } else if (machines.length > 0) {
      setFormMachineId(machines[0].id);
    } else {
      setFormMachineId('');
    }
    setIsAddOpen(true);
  };

  const handleOpenEdit = (wo: WorkOrder) => {
    setEditId(wo.id);
    setEditMachineId(wo.machine_id);
    setEditDescription(wo.reason || wo.description || '');
    setEditPriority(wo.priority || 'Média');
    setEditStatus(wo.status || 'Aberta');
    setEditAssignedTo(wo.responsible || wo.assigned_to || '');
    setEditOpenDate(wo.open_date ? wo.open_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditNotes(wo.notes || '');
    setIsEditOpen(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addWorkOrder({
        machine_id: formMachineId,
        description: formDescription,
        priority: formPriority,
        assigned_to: formAssignedTo
      });
      setIsAddOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao abrir OS: ' + err.message);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.updateWorkOrder(editId, {
        machine_id: editMachineId,
        reason: editDescription,
        priority: editPriority,
        status: editStatus,
        responsible: editAssignedTo,
        open_date: editOpenDate,
        notes: editNotes
      });
      setIsEditOpen(false);
      refreshList();
      alert('Ordem de serviço atualizada!');
    } catch (err: any) {
      alert('Erro ao atualizar OS: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'Aberta' | 'Em Andamento' | 'Concluída') => {
    try {
      await fleetService.updateWorkOrder(id, { status: nextStatus });
      refreshList();
    } catch (e: any) {
      alert('Erro ao atualizar status: ' + e.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await fleetService.deleteWorkOrder(deleteTarget.id);
      setDeleteTarget(null);
      refreshList();
    } catch (e: any) {
      alert('Erro ao excluir O.S.: ' + e.message);
    }
  };

  // =========================================================================
  // FILTRAGEM E SEPARAÇÃO DAS LANES (COLUNAS KANBAN)
  // =========================================================================
  const filteredOrders = workOrders.filter(wo => {
    const machine = machines.find(m => m.id === wo.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);
    const machineMatch = machineFilter === 'ALL' || wo.machine_id === machineFilter;
    
    const prioStr = (wo.priority || '').toLowerCase();
    const filterPrioStr = priorityFilter.toLowerCase();
    const priorityMatch = priorityFilter === 'ALL' || prioStr === filterPrioStr;

    const textMatch = 
      String(wo.os_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wo.description || wo.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wo.assigned_to || wo.responsible || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && machineMatch && priorityMatch && textMatch;
  });

  const laneAberta = filteredOrders.filter(wo => wo.status === 'Aberta');
  const laneAndamento = filteredOrders.filter(wo => wo.status === 'Em Andamento');
  const laneConcluida = filteredOrders.filter(wo => wo.status === 'Concluída');

  // Cores por prioridade
  const priorityColors: Record<string, string> = {
    'Alta': 'bg-rose-50 text-rose-700 border-rose-100',
    'alta': 'bg-rose-50 text-rose-700 border-rose-100',
    'Média': 'bg-amber-50 text-amber-700 border-amber-100',
    'media': 'bg-amber-50 text-amber-700 border-amber-100',
    'Baixa': 'bg-blue-50 text-blue-700 border-blue-100',
    'baixa': 'bg-blue-50 text-blue-700 border-blue-100',
  };

  const selectedMachineObj = machineFilter !== 'ALL' ? machines.find(m => m.id === machineFilter) : null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 flex flex-col min-h-screen">
      
      {/* HEADER DE OS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shrink-0 shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <ClipboardList size={18} className="text-[#1B3022]" />
            Ordens de Serviço (O.S.)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Quadro Kanban de controle operacional de corretivas, vistorias e manutenção com filtro por máquina e CRUD completo.</p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
          >
            <Plus size={14} />
            <span>Abrir Nova O.S.</span>
          </button>
        )}
      </div>

      {/* PAINEL DE INFORMAÇÃO DA MÁQUINA FILTRADA */}
      {selectedMachineObj && (
        <div className="bg-[#1B3022] text-white p-5 rounded-2xl shadow-md border border-[#1B3022]/80 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  Horímetro: <strong className="text-emerald-400">{selectedMachineObj.current_hour_km.toLocaleString('pt-BR')} H/km</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                Abertas: <strong className="text-red-300">{laneAberta.length}</strong>
              </div>
              <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                Em Andamento: <strong className="text-amber-300">{laneAndamento.length}</strong>
              </div>
              <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                Concluídas: <strong className="text-emerald-300">{laneConcluida.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS: MÁQUINA, PRIORIDADE E BUSCA */}
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

        {/* Filtro por Prioridade */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Prioridades</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>

        {/* Busca por texto */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por O.S., defeito, técnico, máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
          />
        </div>

        {(machineFilter !== 'ALL' || priorityFilter !== 'ALL' || searchTerm !== '') && (
          <button
            onClick={() => {
              setMachineFilter('ALL');
              setPriorityFilter('ALL');
              setSearchTerm('');
            }}
            className="text-xs text-red-600 hover:underline font-bold px-2 py-1 cursor-pointer"
          >
            Limpar Filtros
          </button>
        )}

        <div className="text-xs text-slate-500 font-mono ml-auto">
          Total O.S.: <strong className="text-slate-800">{filteredOrders.length}</strong>
        </div>
      </div>

      {/* QUADRO KANBAN (3 LANES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        
        {/* LANE 1: ABERTAS */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col h-full overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Abertas
            </span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {laneAberta.length}
            </span>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {laneAberta.map(wo => {
              const mach = machines.find(m => m.id === wo.machine_id);
              const descText = wo.description || wo.reason || '';
              const techText = wo.assigned_to || wo.responsible || 'Sem Técnico';

              return (
                <div key={wo.id} className="bg-white border border-slate-200 hover:border-[#1B3022]/30 rounded-xl p-4 text-xs space-y-3 shadow-xs group transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wide bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                        OS #{wo.os_number || wo.id.substring(0, 6)}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{mach?.code} - {mach?.name}</h4>
                    </div>
                    {userRole !== 'viewer' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(wo)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                          title="Editar O.S."
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget({ id: wo.id, title: `O.S. #${wo.os_number || ''} (${mach?.code})` })}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          title="Excluir O.S."
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-slate-600 leading-normal font-serif italic">&ldquo;{descText}&rdquo;</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-semibold border rounded-sm uppercase tracking-wider ${priorityColors[wo.priority] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                      Prioridade {wo.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Téc: {techText}</span>
                  </div>

                  {userRole !== 'viewer' && (
                    <button
                      onClick={() => handleUpdateStatus(wo.id, 'Em Andamento')}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                    >
                      <PlayCircle size={12} className="text-amber-500" />
                      Iniciar Serviço <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              );
            })}
            {laneAberta.length === 0 && (
              <div className="h-28 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 size={24} className="text-[#1B3022]/60" />
                <p className="text-[10px] mt-1 font-mono uppercase tracking-wide">Sem pendências</p>
              </div>
            )}
          </div>
        </div>

        {/* LANE 2: EM ANDAMENTO */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col h-full overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Em Andamento
            </span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {laneAndamento.length}
            </span>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {laneAndamento.map(wo => {
              const mach = machines.find(m => m.id === wo.machine_id);
              const descText = wo.description || wo.reason || '';
              const techText = wo.assigned_to || wo.responsible || 'Sem Técnico';

              return (
                <div key={wo.id} className="bg-white border border-slate-200 hover:border-[#1B3022]/30 rounded-xl p-4 text-xs space-y-3 shadow-xs group transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wide bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                        OS #{wo.os_number || wo.id.substring(0, 6)}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{mach?.code} - {mach?.name}</h4>
                    </div>
                    {userRole !== 'viewer' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(wo)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                          title="Editar O.S."
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget({ id: wo.id, title: `O.S. #${wo.os_number || ''} (${mach?.code})` })}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          title="Excluir O.S."
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-slate-600 leading-normal font-serif italic">&ldquo;{descText}&rdquo;</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-semibold border rounded-sm uppercase tracking-wider ${priorityColors[wo.priority] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                      Prioridade {wo.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Téc: {techText}</span>
                  </div>

                  {userRole !== 'viewer' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(wo.id, 'Aberta')}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 cursor-pointer"
                      >
                        <ArrowLeft size={10} /> Pausar
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(wo.id, 'Concluída')}
                        className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-[10px] font-bold text-emerald-800 rounded-lg border border-emerald-100 cursor-pointer"
                      >
                        <CheckCircle2 size={11} /> Concluir OS
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {laneAndamento.length === 0 && (
              <div className="h-28 flex flex-col items-center justify-center text-slate-400">
                <Clock size={24} className="text-slate-300" />
                <p className="text-[10px] mt-1 font-mono uppercase tracking-wide">Fila vazia</p>
              </div>
            )}
          </div>
        </div>

        {/* LANE 3: CONCLUÍDAS */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col h-full overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#1B3022]" />
              Concluídas
            </span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {laneConcluida.length}
            </span>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {laneConcluida.map(wo => {
              const mach = machines.find(m => m.id === wo.machine_id);
              const descText = wo.description || wo.reason || '';
              const techText = wo.assigned_to || wo.responsible || 'Técnico';

              return (
                <div key={wo.id} className="bg-white/80 border border-slate-200 rounded-xl p-4 text-xs space-y-3 opacity-75 group hover:opacity-100 transition-opacity shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        OS #{wo.os_number || wo.id.substring(0, 6)}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{mach?.code} - {mach?.name}</h4>
                    </div>
                    {userRole !== 'viewer' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(wo)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                          title="Editar O.S."
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget({ id: wo.id, title: `O.S. #${wo.os_number || ''} (${mach?.code})` })}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          title="Excluir O.S."
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-slate-500 leading-normal font-serif italic line-through">&ldquo;{descText}&rdquo;</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-[10px] text-slate-400 font-mono">Concluída por: {techText}</span>
                    <button
                      onClick={() => handleUpdateStatus(wo.id, 'Em Andamento')}
                      className="text-[10px] text-amber-700 hover:underline font-bold"
                    >
                      Reabrir
                    </button>
                  </div>
                </div>
              );
            })}
            {laneConcluida.length === 0 && (
              <div className="h-28 flex flex-col items-center justify-center text-slate-400">
                <Wrench size={24} className="text-slate-300" />
                <p className="text-[10px] mt-1 font-mono uppercase tracking-wide">Sem histórico recente</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL ADICIONAR OS */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Abertura de Chamado / Ordem de Serviço (O.S.)">
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento com Problema</label>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nível de Prioridade</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Baixa">Baixa (Pode esperar)</option>
                <option value="Média">Média (Atenção moderada)</option>
                <option value="Alta">ALTA (Equipamento inoperante)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Técnico / Oficina Encarregada</label>
            <input
              type="text"
              required
              placeholder="Ex: Auto Elétrica Diesel, Mecânico João"
              value={formAssignedTo}
              onChange={(e) => setFormAssignedTo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descrição Técnica do Defeito / Diagnóstico</label>
            <textarea
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descreva detalhadamente o problema no campo..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-24"
            />
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
              Emitir O.S.
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR OS */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Ordem de Serviço (O.S.)">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data de Abertura</label>
              <input
                type="date"
                required
                value={editOpenDate}
                onChange={(e) => setEditOpenDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nível de Prioridade</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status Atual</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Aberta">Aberta</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluída">Concluída</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Técnico / Oficina Encarregada</label>
            <input
              type="text"
              required
              value={editAssignedTo}
              onChange={(e) => setEditAssignedTo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descrição Técnica do Defeito / Motivo</label>
            <textarea
              required
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notas do Serviço / Observações Adicionais</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Peças utilizadas, laudo do mecânico..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-16"
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
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CONFIRMAR EXCLUSÃO DE OS */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão de O.S.">
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

    </div>
  );
}
