import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { MaintenanceLog, Farm, Machine, LookupItem } from '../types';
import Modal from '../components/Modal';
import { 
  Wrench, Plus, Trash2, Search, Calendar, DollarSign, 
  Settings, CheckSquare, Info, ClipboardCheck
} from 'lucide-react';

interface MaintenanceProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function Maintenance({ selectedFarmId, selectedPeriod, userRole }: MaintenanceProps) {
  const [maintLogs, setMaintLogs] = useState<MaintenanceLog[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formMachineId, setFormMachineId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMainItem, setFormMainItem] = useState('Motor e Filtros');
  const [formDesc, setFormDesc] = useState('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formPartsCost, setFormPartsCost] = useState<number | ''>('');
  const [formLaborCost, setFormLaborCost] = useState<number | ''>('');
  const [formPartsReplaced, setFormPartsReplaced] = useState('');
  const [formResponsible, setFormResponsible] = useState('');

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mLogs, fList, mList, lData] = await Promise.all([
          fleetService.getMaintenanceLogs(),
          fleetService.getFarms(),
          fleetService.getMachines(),
          fleetService.getLookups()
        ]);
        setMaintLogs(mLogs);
        setFarms(fList);
        setMachines(mList);
        setLookups(lData);

        if (mList.length > 0) {
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
    const list = await fleetService.getMaintenanceLogs();
    setMaintLogs(list);
  };

  // Atualizar horímetro ao selecionar a máquina no formulário
  useEffect(() => {
    if (!formMachineId) return;
    const mach = machines.find(m => m.id === formMachineId);
    if (mach) {
      setFormHourKm(mach.current_hour_km || mach.initial_hour_km);
    }
  }, [formMachineId, machines]);

  const handleOpenAdd = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDesc('');
    setFormPartsCost('');
    setFormLaborCost('');
    setFormPartsReplaced('');
    setFormResponsible('');
    if (machines.length > 0) {
      setFormMachineId(machines[0].id);
      setFormHourKm(machines[0].current_hour_km || machines[0].initial_hour_km);
    }
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addMaintenanceLog({
        machine_id: formMachineId,
        date: formDate,
        main_item: formMainItem,
        service_description: formDesc,
        hour_km_at_service: Number(formHourKm),
        parts_cost: Number(formPartsCost || 0),
        labor_cost: Number(formLaborCost || 0),
        parts_replaced: formPartsReplaced,
        responsible: formResponsible
      });
      setIsAddOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao registrar manutenção: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este registro de manutenção?')) return;
    try {
      await fleetService.deleteMaintenanceLog(id);
      refreshList();
    } catch (e: any) {
      alert('Erro ao deletar: ' + e.message);
    }
  };

  // =========================================================================
  // LOGICA DE FILTRO GLOBAL (FAZENDA / PERÍODO) E LOCAL (BUSCA / CATEGORIA)
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

  const filteredLogs = maintLogs.filter(log => {
    const machine = machines.find(m => m.id === log.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);
    const periodMatch = isDateInPeriod(log.date);
    const catMatch = categoryFilter === 'ALL' || log.main_item === categoryFilter;

    const textMatch = 
      log.service_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.main_item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.parts_replaced && log.parts_replaced.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && machine.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && machine.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && periodMatch && catMatch && textMatch;
  });

  // Totais
  const totalMaintCost = filteredLogs.reduce((sum, log) => sum + log.total_cost, 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* SEÇÃO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <Wrench size={18} className="text-[#1B3022] animate-spin" style={{ animationDuration: '4s' }} />
            Ordens de Manutenção e Reparos
          </h3>
          <p className="text-xs text-slate-500 mt-1">Histórico completo de serviços, substituição de peças e somatório de gastos.</p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            <Plus size={14} />
            <span>Registrar Manutenção</span>
          </button>
        )}
      </div>

      {/* FILTROS DE PESQUISA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-4 items-center shadow-xs">
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por descrição, técnico, peças..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
          />
        </div>

        {/* Categoria */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Categorias</option>
          {lookups?.maintenanceCategories?.map((c: string) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex-1 text-right text-xs text-slate-500 font-mono">
          Registros Filtrados: <strong className="text-slate-800">{filteredLogs.length}</strong>
        </div>
      </div>

      {/* LISTAGEM HISTÓRICA */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {filteredLogs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Equipamento</th>
                  <th className="py-4 px-6">Categoria</th>
                  <th className="py-4 px-6">Descrição do Serviço</th>
                  <th className="py-4 px-6">Peças Trocadas</th>
                  <th className="py-4 px-6 font-mono text-right">Custo Peças</th>
                  <th className="py-4 px-6 font-mono text-right">Custo Mão de Obra</th>
                  <th className="py-4 px-6 font-mono text-right">Custo Total</th>
                  <th className="py-4 px-6">Horímetro h/Km</th>
                  <th className="py-4 px-6">Mecânico / Técnico</th>
                  {userRole === 'admin' && <th className="py-4 px-6 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const machine = machines.find(m => m.id === log.machine_id);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 text-slate-500 font-mono">
                        {new Date(log.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        {machine ? (
                          <div>
                            <span className="font-mono font-bold text-slate-800">{machine.code}</span>
                            <span className="text-[10px] text-slate-400 block">{machine.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Excluído</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase text-[9px] font-bold">
                          {log.main_item}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium max-w-xs truncate" title={log.service_description}>
                        {log.service_description}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-serif italic">{log.parts_replaced || 'Nenhuma'}</td>
                      <td className="py-4 px-6 text-right font-mono text-slate-500">
                        R$ {log.parts_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-500">
                        R$ {log.labor_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-red-600">
                        R$ {log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-700 font-bold">
                        {log.hour_km_at_service.toLocaleString('pt-BR')} h/km
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{log.responsible}</td>
                      {userRole === 'admin' && (
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remover Registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* RODAPE COM GASTO TOTAL */}
              <tfoot className="bg-slate-50 border-t border-slate-100">
                <tr className="font-mono text-xs font-bold text-slate-700">
                  <td colSpan={7} className="py-4 px-6 uppercase tracking-wider text-[10px] font-bold text-slate-500 text-left">Gasto Total Acumulado:</td>
                  <td className="py-4 px-6 text-right text-red-600 font-extrabold text-xs">R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Wrench size={40} className="mb-2 text-slate-300 animate-pulse" />
              <p className="text-xs font-medium">Nenhum registro de manutenção cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: REGISTRAR MANUTENÇÃO */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Registrar Serviço de Manutenção">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data do Serviço</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Categoria do Serviço</label>
              <select
                value={formMainItem}
                onChange={(e) => setFormMainItem(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {lookups?.maintenanceCategories?.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km de Execução</label>
              <input
                type="number"
                required
                value={formHourKm}
                onChange={(e) => setFormHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Ajustará o horímetro atual da máquina automaticamente.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custo com Peças (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 850.00"
                value={formPartsCost}
                onChange={(e) => setFormPartsCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custo de Mão de Obra (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 350.00"
                value={formLaborCost}
                onChange={(e) => setFormLaborCost(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Peças Substituídas</label>
            <input
              type="text"
              placeholder="Ex: Filtro de óleo lubrificante, 2L óleo 15W40, etc"
              value={formPartsReplaced}
              onChange={(e) => setFormPartsReplaced(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mecânico / Responsável Técnico</label>
            <input
              type="text"
              required
              placeholder="Ex: Oficina Mecânica Central, Mecânico Marcos"
              value={formResponsible}
              onChange={(e) => setFormResponsible(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descrição Detalhada do Serviço</label>
            <textarea
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Troca preventiva dos lubrificantes do motor, verificação de vazamento..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] h-20"
            />
          </div>

          {/* Somatório live */}
          {(formPartsCost !== '' || formLaborCost !== '') && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Custo Total Estimado:</span>
              <span className="font-bold text-red-600 font-mono">
                R$ {((Number(formPartsCost || 0) + Number(formLaborCost || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
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
              Gravar Registro
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
