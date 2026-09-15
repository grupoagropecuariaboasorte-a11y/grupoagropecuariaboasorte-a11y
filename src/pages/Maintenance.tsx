import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { MaintenanceLog, Farm, Machine, LookupItem, UserRole } from '../types';
import Modal from '../components/Modal';
import AppLogo from '../components/AppLogo';
import { 
  Wrench, Plus, Trash2, Search, Calendar, DollarSign, 
  Settings, CheckSquare, Info, ClipboardCheck, Printer
} from 'lucide-react';
import { formatDateForInput, formatDisplayDate, formatDisplayDateTime } from '../lib/dateUtils';

interface MaintenanceProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: UserRole;
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
  const [formDate, setFormDate] = useState(() => formatDateForInput(new Date()));
  const [formMainItem, setFormMainItem] = useState('Motor e Filtros');
  const [formDesc, setFormDesc] = useState('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formPartsCost, setFormPartsCost] = useState<number | ''>('');
  const [formLaborCost, setFormLaborCost] = useState<number | ''>('');
  const [formPartsReplaced, setFormPartsReplaced] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formOperator, setFormOperator] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState('');

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [operatorFilter, setOperatorFilter] = useState('');

  // Reset machine filter when farm changes
  useEffect(() => {
    setMachineFilter('ALL');
  }, [selectedFarmId]);

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
    setFormDate(formatDateForInput(new Date()));
    setFormDesc('');
    setFormPartsCost('');
    setFormLaborCost('');
    setFormPartsReplaced('');
    setFormResponsible('');
    setFormOperator('');
    
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
    setEditingLogId('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (log: MaintenanceLog) => {
    setFormMachineId(log.machine_id);
    setFormDate(formatDateForInput(log.date));
    setFormMainItem(log.main_item);
    setFormDesc(log.service_description);
    setFormHourKm(log.hour_km_at_service);
    setFormPartsCost(log.parts_cost);
    setFormLaborCost(log.labor_cost);
    setFormPartsReplaced(log.parts_replaced || '');
    setFormResponsible(log.responsible || '');
    setFormOperator(log.operator_name || '');
    setEditingLogId(log.id);
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        machine_id: formMachineId,
        date: formDate,
        main_item: formMainItem,
        service_description: formDesc,
        hour_km_at_service: Number(formHourKm),
        parts_cost: Number(formPartsCost || 0),
        labor_cost: Number(formLaborCost || 0),
        parts_replaced: formPartsReplaced,
        responsible: formResponsible,
        operator_name: formOperator
      };

      if (editingLogId) {
        await fleetService.updateMaintenanceLog(editingLogId, payload);
      } else {
        await fleetService.addMaintenanceLog(payload);
      }
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
    const machineMatch = machineFilter === 'ALL' || log.machine_id === machineFilter;
    const opMatch = operatorFilter === '' || 
      (log.operator_name || '').toLowerCase().includes(operatorFilter.toLowerCase()) || 
      (machine && (machine.driver_name || '').toLowerCase().includes(operatorFilter.toLowerCase()));

    const textMatch = 
      (log.service_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.main_item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.responsible || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.parts_replaced && log.parts_replaced.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && periodMatch && catMatch && machineMatch && opMatch && textMatch;
  });

  // Totais
  const totalMaintCost = filteredLogs.reduce((sum, log) => sum + log.total_cost, 0);

  return (
    <>
      {/* SEÇÃO INTERATIVA PRINCIPAL (OCULTA NA IMPRESSÃO) */}
      <div className="space-y-6 animate-fadeIn pb-12 print:hidden">
      
      {/* SEÇÃO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <Wrench size={18} className="text-[#1B3022] animate-spin" style={{ animationDuration: '4s' }} />
            Ordens de Manutenção e Reparos
          </h3>
          <p className="text-xs text-slate-500 mt-1">Histórico completo de serviços, substituição de peças e somatório de gastos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
            title="Gerar e imprimir relatório completo em PDF"
          >
            <Printer size={15} className="text-[#1B3022]" />
            <span>Gerar Relatório em PDF</span>
          </button>

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

        {/* Equipamento */}
        <select
          value={machineFilter}
          onChange={(e) => setMachineFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Máquinas</option>
          {machines
            .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
            .map(m => (
              <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
            ))
          }
        </select>

        {/* Operador */}
        <input
          type="text"
          placeholder="Filtrar por operador..."
          value={operatorFilter}
          onChange={(e) => setOperatorFilter(e.target.value)}
          className="w-40 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
        />

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
                  <th className="py-4 px-6">Operador</th>
                  {userRole !== 'viewer' && <th className="py-4 px-6 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const machine = machines.find(m => m.id === log.machine_id);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 text-slate-500 font-mono">
                        {formatDisplayDate(log.date)}
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
                      <td className="py-4 px-6 text-slate-500 font-medium">{log.operator_name || (machine?.driver_name || '-')}</td>
                      {userRole !== 'viewer' && (
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(log)}
                              className="p-1.5 text-slate-400 hover:text-[#1B3022] transition-colors cursor-pointer"
                              title="Editar Registro"
                            >
                              <Settings size={14} />
                            </button>
                            {(userRole === 'admin' || userRole === 'control' || userRole === 'mechanic' || userRole === 'editor') && (
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remover Registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
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
                  <td colSpan={userRole !== 'viewer' ? 4 : 3}></td>
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
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title={editingLogId ? "Editar Serviço de Manutenção" : "Registrar Serviço de Manutenção"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mecânico / Responsável Técnico</label>
              <input
                type="text"
                required
                placeholder="Ex: Oficina Central, Marcos"
                value={formResponsible}
                onChange={(e) => setFormResponsible(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome do Operador</label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={formOperator}
                onChange={(e) => setFormOperator(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
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

    {/* ========================================================================= */}
    {/* RELATÓRIO OFICIAL COMPACTO E DETALHADO PARA IMPRESSÃO EM PDF              */}
    {/* ========================================================================= */}
    <div className="hidden print:block font-sans text-black">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #fff !important;
          }
        }
      `}</style>

      {/* CABEÇALHO INSTITUCIONAL */}
      <div className="border-b-2 border-[#1B3022] pb-2 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-sm font-black tracking-wider text-[#1B3022] uppercase">
              Grupo Agropecuária Boa Sorte
            </h1>
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
              Relatório Consolidado de Manutenções e Reparos Mecânicos
            </h2>
          </div>
        </div>
        <div className="text-right text-[8.5px] text-slate-600 space-y-0.5 font-mono">
          <div><strong>Data de Emissão:</strong> {formatDisplayDateTime(new Date().toISOString())}</div>
          <div>
            <strong>Fazenda:</strong> {selectedFarmId === 'ALL' ? 'Todas as Fazendas' : (farms.find(f => f.id === selectedFarmId)?.name || selectedFarmId)}
          </div>
          <div>
            <strong>Período:</strong> {selectedPeriod === 'ALL' ? 'Todo o Histórico' : selectedPeriod === '30_DAYS' ? 'Últimos 30 Dias' : selectedPeriod === 'THIS_MONTH' ? 'Mês Atual' : 'Ano Vigente'}
          </div>
          <div><strong>Categoria Filtrada:</strong> {categoryFilter === 'ALL' ? 'Todas as Categorias' : categoryFilter}</div>
          <div><strong>Total de Ordens Registradas:</strong> {filteredLogs.length} serviços</div>
        </div>
      </div>

      {/* RESUMO EXECUTIVO CONSOLIDADO */}
      <div className="grid grid-cols-5 gap-2 mb-2 text-center">
        <div className="border border-slate-400 rounded p-1 bg-slate-50">
          <span className="text-[7.5px] font-bold text-slate-600 block uppercase">Total de Serviços</span>
          <span className="text-[11px] font-black font-mono text-[#1B3022]">{filteredLogs.length}</span>
        </div>
        <div className="border border-slate-400 rounded p-1 bg-slate-50">
          <span className="text-[7.5px] font-bold text-slate-600 block uppercase">Custo Peças Trocadas</span>
          <span className="text-[11px] font-black font-mono text-slate-900">
            R$ {filteredLogs.reduce((s, l) => s + (Number(l.parts_cost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border border-slate-400 rounded p-1 bg-slate-50">
          <span className="text-[7.5px] font-bold text-slate-600 block uppercase">Custo de Mão de Obra</span>
          <span className="text-[11px] font-black font-mono text-slate-900">
            R$ {filteredLogs.reduce((s, l) => s + (Number(l.labor_cost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border border-slate-400 rounded p-1 bg-slate-50">
          <span className="text-[7.5px] font-bold text-slate-600 block uppercase">Custo Geral Total</span>
          <span className="text-[11px] font-black font-mono text-rose-700">
            R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border border-slate-400 rounded p-1 bg-slate-50">
          <span className="text-[7.5px] font-bold text-slate-600 block uppercase">Máquinas / Ativos Atendidos</span>
          <span className="text-[11px] font-black font-mono text-[#1B3022]">
            {new Set(filteredLogs.map(l => l.machine_id)).size} máquinas
          </span>
        </div>
      </div>

      {/* TABELA ULTRA COMPACTA DE MANUTENÇÕES */}
      <table className="w-full border-collapse border border-slate-400 text-[7.5px] leading-tight">
        <thead>
          <tr className="bg-slate-200 border-b border-slate-400 font-bold uppercase text-slate-900 text-center">
            <th className="border border-slate-400 p-0.5 w-5">#</th>
            <th className="border border-slate-400 p-0.5 whitespace-nowrap text-left">Data</th>
            <th className="border border-slate-400 p-0.5 text-left whitespace-nowrap">Máquina / Cód.</th>
            <th className="border border-slate-400 p-0.5 text-left whitespace-nowrap">Fazenda</th>
            <th className="border border-slate-400 p-0.5 text-left whitespace-nowrap">Item / Categoria</th>
            <th className="border border-slate-400 p-0.5 text-left">Descrição do Serviço Executado</th>
            <th className="border border-slate-400 p-0.5 font-mono text-right whitespace-nowrap">Horímetro / KM</th>
            <th className="border border-slate-400 p-0.5 text-left">Peças Substituídas</th>
            <th className="border border-slate-400 p-0.5 text-left whitespace-nowrap">Mecânico / Resp.</th>
            <th className="border border-slate-400 p-0.5 text-left whitespace-nowrap">Operador</th>
            <th className="border border-slate-400 p-0.5 font-mono text-right whitespace-nowrap">Peças (R$)</th>
            <th className="border border-slate-400 p-0.5 font-mono text-right whitespace-nowrap">Mão Obra (R$)</th>
            <th className="border border-slate-400 p-0.5 font-mono text-right whitespace-nowrap">Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log, index) => {
            const mach = machines.find(m => m.id === log.machine_id);
            const farmName = farms.find(f => f.id === mach?.farm_id)?.name || '-';
            const partsCost = Number(log.parts_cost) || 0;
            const laborCost = Number(log.labor_cost) || 0;
            const totalCost = Number(log.total_cost) || (partsCost + laborCost);

            return (
              <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 p-0.5 text-center font-mono font-bold text-slate-700">{index + 1}</td>
                <td className="border border-slate-300 p-0.5 font-mono whitespace-nowrap">{formatDisplayDate(log.date)}</td>
                <td className="border border-slate-300 p-0.5 whitespace-nowrap">
                  <span className="font-mono font-bold text-[#1B3022]">{mach?.code || '-'}</span>
                  <span className="text-slate-700 ml-1 font-medium">{mach?.name || ''}</span>
                </td>
                <td className="border border-slate-300 p-0.5 whitespace-nowrap">{farmName}</td>
                <td className="border border-slate-300 p-0.5 font-bold text-slate-800 whitespace-nowrap">{log.main_item || '-'}</td>
                <td className="border border-slate-300 p-0.5 max-w-[200px] truncate">{log.service_description || '-'}</td>
                <td className="border border-slate-300 p-0.5 font-mono text-right whitespace-nowrap font-bold text-[#1B3022]">
                  {log.hour_km_at_service ? `${log.hour_km_at_service.toLocaleString('pt-BR')} h/km` : '-'}
                </td>
                <td className="border border-slate-300 p-0.5 max-w-[140px] truncate text-slate-700">{log.parts_replaced || '-'}</td>
                <td className="border border-slate-300 p-0.5 whitespace-nowrap truncate max-w-[100px]">{log.responsible || '-'}</td>
                <td className="border border-slate-300 p-0.5 whitespace-nowrap truncate max-w-[100px]">{log.operator_name || '-'}</td>
                <td className="border border-slate-300 p-0.5 font-mono text-right whitespace-nowrap">
                  {partsCost > 0 ? partsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </td>
                <td className="border border-slate-300 p-0.5 font-mono text-right whitespace-nowrap">
                  {laborCost > 0 ? laborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </td>
                <td className="border border-slate-300 p-0.5 font-mono font-bold text-right whitespace-nowrap text-rose-700">
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-200 border-t-2 border-slate-500 font-bold">
          <tr>
            <td colSpan={6} className="border border-slate-400 p-1 text-right uppercase text-[8px]">
              TOTAIS CONSOLIDADOS DE MANUTENÇÃO:
            </td>
            <td colSpan={4} className="border border-slate-400 p-1 text-left text-[7.5px] text-slate-700">
              {filteredLogs.length} serviços realizados • {new Set(filteredLogs.map(l => l.machine_id)).size} equipamentos atendidos
            </td>
            <td className="border border-slate-400 p-1 text-right font-mono text-slate-900 text-[8px] whitespace-nowrap">
              R$ {filteredLogs.reduce((s, l) => s + (Number(l.parts_cost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="border border-slate-400 p-1 text-right font-mono text-slate-900 text-[8px] whitespace-nowrap">
              R$ {filteredLogs.reduce((s, l) => s + (Number(l.labor_cost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="border border-slate-400 p-1 text-right font-mono text-rose-700 text-[8px] whitespace-nowrap">
              R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* RODAPÉ DO DOCUMENTO */}
      <div className="mt-2 text-[7.5px] text-slate-500 flex justify-between border-t border-slate-300 pt-1">
        <span>Grupo Agropecuária Boa Sorte • Relatório Oficial de Manutenções e Reparos Mecânicos</span>
        <span>Documento emitido para controle técnico, gestão patrimonial e auditoria contábil</span>
      </div>
    </div>
  </>
  );
}
