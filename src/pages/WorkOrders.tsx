import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { WorkOrder, Farm, Machine } from '../types';
import Modal from '../components/Modal';
import { 
  ClipboardList, Plus, Search, Calendar, ChevronRight, 
  ArrowRight, CheckCircle2, Clock, PlayCircle, Trash2, 
  AlertTriangle, Wrench, ArrowLeft
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

  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formMachineId, setFormMachineId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');
  const [formAssignedTo, setFormAssignedTo] = useState('');

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');

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

        if (mList.length > 0) setFormMachineId(mList[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshList = async () => {
    const list = await fleetService.getWorkOrders();
    setWorkOrders(list);
  };

  const handleOpenAdd = () => {
    setFormDescription('');
    setFormAssignedTo('');
    setFormPriority('Média');
    if (machines.length > 0) setFormMachineId(machines[0].id);
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleUpdateStatus = async (id: string, nextStatus: 'Aberta' | 'Em Andamento' | 'Concluída') => {
    try {
      await fleetService.updateWorkOrder(id, { status: nextStatus });
      refreshList();
    } catch (e: any) {
      alert('Erro ao atualizar status: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta Ordem de Serviço?')) return;
    try {
      await fleetService.deleteWorkOrder(id);
      refreshList();
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  // =========================================================================
  // FILTRAGEM E SEPARAÇÃO DAS LANES (COLUNAS KANBAN)
  // =========================================================================
  const filteredOrders = workOrders.filter(wo => {
    const machine = machines.find(m => m.id === wo.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);

    const textMatch = 
      wo.os_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (machine && machine.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && machine.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && textMatch;
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12 flex flex-col h-[calc(100vh-6rem)]">
      
      {/* HEADER DE OS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shrink-0 shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <ClipboardList size={18} className="text-[#1B3022]" />
            Ordens de Serviço (O.S.)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Quadro Kanban de controle operacional de corretivas e vistorias pendentes.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Busca interna */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Filtro rápido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
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
      </div>

      {/* QUADRO KANBAN (3 LANES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
        
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
              return (
                <div key={wo.id} className="bg-white border border-slate-200 hover:border-[#1B3022]/30 rounded-xl p-4 text-xs space-y-3 shadow-xs group transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wide bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                        {wo.os_number}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{mach?.code} - {mach?.name}</h4>
                    </div>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDelete(wo.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Excluir O.S."
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-slate-600 leading-normal font-serif italic">&ldquo;{wo.description}&rdquo;</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-semibold border rounded-sm uppercase tracking-wider ${priorityColors[wo.priority] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                      Prioridade {wo.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Tec: {wo.assigned_to || 'Sem Técnico'}</span>
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
              return (
                <div key={wo.id} className="bg-white border border-slate-200 hover:border-[#1B3022]/30 rounded-xl p-4 text-xs space-y-3 shadow-xs group transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wide bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                        {wo.os_number}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{mach?.code} - {mach?.name}</h4>
                    </div>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDelete(wo.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Excluir O.S."
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-slate-600 leading-normal font-serif italic">&ldquo;{wo.description}&rdquo;</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-semibold border rounded-sm uppercase tracking-wider ${priorityColors[wo.priority] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                      Prioridade {wo.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Tec: {wo.assigned_to || 'Sem Técnico'}</span>
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
              return (
                <div key={wo.id} className="bg-white/80 border border-slate-200 rounded-xl p-4 text-xs space-y-3 opacity-70 group hover:opacity-100 transition-opacity shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {wo.os_number}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{mach?.code} - {mach?.name}</h4>
                    </div>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDelete(wo.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-slate-500 leading-normal font-serif italic line-through">&ldquo;{wo.description}&rdquo;</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-[10px] text-slate-400 font-mono">Concluída por: {wo.assigned_to || 'Técnico'}</span>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento com Problema</label>
              <select
                value={formMachineId}
                onChange={(e) => setFormMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines.map((m) => (
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
              placeholder="Descreva detalhadamente o problem no campo..."
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

    </div>
  );
}
