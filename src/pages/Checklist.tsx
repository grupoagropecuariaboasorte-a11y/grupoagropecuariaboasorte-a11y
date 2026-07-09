import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Checklist30d, Farm, Machine, LookupItem } from '../types';
import Modal from '../components/Modal';
import { 
  CheckSquare, Plus, Search, Calendar, ShieldCheck, 
  AlertTriangle, Eye, Info, Check, X, ShieldX 
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

  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formMachineId, setFormMachineId] = useState('');
  const [formOperator, setFormOperator] = useState('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formWorkType, setFormWorkType] = useState('Plantio');
  const [formOverallStatus, setFormOverallStatus] = useState<'OK' | 'Necessita Atenção' | 'Máquina Parada'>('OK');
  const [formFailedNotes, setFormFailedNotes] = useState('');

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

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');

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
  }, []);

  const refreshList = async () => {
    const list = await fleetService.getChecklists();
    setChecklists(list);
  };

  // Atualizar horímetro ao selecionar a máquina
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

  // Alternar valor do item do checklist
  const toggleItem = (key: keyof typeof items) => {
    setItems(prev => {
      const nextVal = prev[key] === 'OK' ? 'Regular/Ajustar' : 'OK';
      
      // Auto calcular sugestão de status geral ao alterar itens
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addChecklist({
        machine_id: formMachineId,
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
    const periodMatch = isDateInPeriod(log.date);

    const textMatch = 
      (log.operator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.work_type && log.work_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.failed_items_notes && log.failed_items_notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && periodMatch && textMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* HEADER DE SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <CheckSquare size={18} className="text-[#1B3022]" />
            Checklist 30 Dias / Diário de Campo
          </h3>
          <p className="text-xs text-slate-500 mt-1">Registros de inspeções visuais e funcionais das máquinas realizadas por operadores.</p>
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

      {/* FILTRO DE BUSCA LOCAL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-4 items-center shadow-xs">
        <div className="relative max-w-xs w-full">
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

        <div className="flex-1 text-right text-xs text-slate-500 font-mono">
          Vistorias Encontradas: <strong className="text-slate-800">{filteredLogs.length}</strong>
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
              'Necessita Atenção': 'border-amber-200 bg-amber-50 hover:border-amber-350',
              'Máquina Parada': 'border-rose-200 bg-rose-50 hover:border-rose-350'
            };

            const pillStyles = {
              'OK': 'bg-emerald-50 text-emerald-700 border-emerald-200',
              'Necessita Atenção': 'bg-amber-100 text-amber-800 border-amber-250',
              'Máquina Parada': 'bg-rose-100 text-rose-800 border-rose-250'
            };

            return (
              <div 
                key={log.id} 
                className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xs cursor-pointer ${statusStyles[log.overall_status] || statusStyles['OK']}`}
                onClick={() => setSelectedChecklist(log)}
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

                <div className="border-t border-slate-100 pt-3.5 mt-4 flex justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedChecklist(log); }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#1B3022] hover:underline cursor-pointer"
                  >
                    <Eye size={12} /> Ver Ficha de Inspeção
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

      {/* MODAL: FAZER VISTORIA */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Ficha de Checklist de Ativos (30 Dias)">
        <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
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

          {/* PARÂMETROS OBRIGATÓRIOS DO CHECKLIST - OPERATOR INTERFACE */}
          <div className="border-t border-b border-slate-200 py-4 my-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[#1B3022]" /> Vistoria e Avaliação de Componentes
            </h4>
            
            <div className="space-y-3">
              {/* Engine oil */}
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

              {/* Hydraulic oil */}
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

              {/* Radiator fluid */}
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

              {/* Tires */}
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

              {/* Brakes */}
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

              {/* Lights */}
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

              {/* Safety */}
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
                        {value}
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

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setSelectedChecklist(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs rounded-xl font-bold cursor-pointer"
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
