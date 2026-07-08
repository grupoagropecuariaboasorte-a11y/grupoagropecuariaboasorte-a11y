import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { PreventivePlanStatus, Farm, Machine, LookupItem, PreventivePlanItem } from '../types';
import Modal from '../components/Modal';
import { 
  CalendarDays, Plus, Search, CheckCircle, AlertTriangle, 
  Clock, ArrowRight, Settings, Wrench, ChevronRight, Info 
} from 'lucide-react';

interface PreventivePlanProps {
  selectedFarmId: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function PreventivePlan({ selectedFarmId, userRole }: PreventivePlanProps) {
  const [plans, setPlans] = useState<PreventivePlanStatus[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters local
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modais
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPerformOpen, setIsPerformOpen] = useState(false);

  // Form Config States
  const [configMachineId, setConfigMachineId] = useState('');
  const [configItem, setConfigItem] = useState('Motor e Filtros');
  const [configIntervalDays, setConfigIntervalDays] = useState<number | ''>('');
  const [configIntervalHours, setConfigIntervalHours] = useState<number | ''>('');
  const [configLastDate, setConfigLastDate] = useState('');
  const [configLastHourKm, setConfigLastHourKm] = useState<number | ''>('');

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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prevList, mList, fList, lData] = await Promise.all([
          fleetService.getPreventivePlanStatus(),
          fleetService.getMachines(),
          fleetService.getFarms(),
          fleetService.getLookups()
        ]);
        setPlans(prevList);
        setMachines(mList);
        setFarms(fList);
        setLookups(lData);

        if (mList.length > 0) {
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
  }, []);

  const refreshList = async () => {
    const list = await fleetService.getPreventivePlanStatus();
    setPlans(list);
  };

  // Preencher horímetro ao selecionar máquina no form de config
  useEffect(() => {
    if (!configMachineId) return;
    const mach = machines.find(m => m.id === configMachineId);
    if (mach) {
      setConfigLastHourKm(mach.current_hour_km || mach.initial_hour_km);
    }
  }, [configMachineId, machines]);

  // Submissão do novo item de plano preventivo
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
        interval_hour_km: Number(configIntervalHours || 0),
        last_performed_date: configLastDate || '1970-01-01',
        last_performed_hour_km: Number(configLastHourKm || 0)
      });
      setIsConfigOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao configurar plano: ' + err.message);
    }
  };

  // Abrir modal de Realizar Manutenção pré-preenchido
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
      // 1. Gravar log de manutenção real
      await fleetService.addMaintenanceLog({
        machine_id: performMachineId,
        date: performDate,
        main_item: performItem,
        service_description: performDesc,
        hour_km_at_service: Number(performHourKm),
        parts_cost: Number(performPartsCost || 0),
        labor_cost: Number(performLaborCost || 0),
        parts_replaced: performParts,
        responsible: performResponsible
      });

      // 2. Atualizar datas do plano preventivo correspondente
      await fleetService.performPreventiveMaintenance(planItemId, performDate, Number(performHourKm));

      setIsPerformOpen(false);
      refreshList();
      alert('Manutenção preventiva registrada e cronograma atualizado!');
    } catch (err: any) {
      alert('Erro ao registrar: ' + err.message);
    }
  };

  // =========================================================================
  // LOGICA DE FILTRO GLOBAL E LOCAL
  // =========================================================================
  const filteredPlans = plans.filter(p => {
    const farmMatch = selectedFarmId === 'ALL' || p.farm_id === selectedFarmId;
    const statusMatch = statusFilter === 'ALL' || p.status === statusFilter;
    
    const machine = machines.find(m => m.id === p.machine_id);
    const textMatch = 
      (p.maintenance_item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && statusMatch && textMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* HEADER SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <CalendarDays size={18} className="text-[#1B3022]" />
            Cronograma de Manutenção Preventiva
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Controle de revisões por dias acumulados ou horas trabalhadas (Horímetro). Alerta de vencimentos ativo.
          </p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            <Plus size={14} />
            <span>Configurar Nova Preventiva</span>
          </button>
        )}
      </div>

      {/* FILTROS LOCAL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-4 items-center shadow-xs">
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por equipamento ou peça..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todos os Status</option>
          <option value="VENCIDA">Vencida (Atrasada)</option>
          <option value="PRÓXIMA">Próxima (Atenção)</option>
          <option value="OK">Em Dia (OK)</option>
        </select>

        <div className="flex-1 text-right text-xs text-slate-500 font-mono">
          Itens Mapeados: <strong className="text-slate-800">{filteredPlans.length}</strong>
        </div>
      </div>

      {/* GRADE DE PLANS / STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((p) => {
            const mach = machines.find(m => m.id === p.machine_id);

            // Estilos visuais por status
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
                      <h4 className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[150px]">{mach?.name}</h4>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${styles.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`} />
                      {p.status}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600">
                    <p className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-medium">Item Preventivo:</span>
                      <strong className="text-slate-800">{p.maintenance_item}</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <p className="text-slate-400 leading-normal">Última Data</p>
                        <p className="text-slate-700">{p.last_performed_date && p.last_performed_date !== '1970-01-01' ? new Date(p.last_performed_date).toLocaleDateString('pt-BR') : 'Nunca'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 leading-normal">Último Horímetro</p>
                        <p className="text-slate-700">{p.last_performed_hour_km.toLocaleString('pt-BR')} h/km</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-slate-400 font-mono">Dias Restantes</p>
                        <p className={`font-mono font-bold ${p.days_remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {p.days_remaining} dias
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

                {/* Ações no rodapé do card */}
                {userRole !== 'viewer' && (
                  <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenPerform(p)}
                      className="flex items-center gap-1 text-xs text-[#1B3022] hover:opacity-80 font-bold cursor-pointer transition-colors"
                    >
                      <span>Realizar Manutenção</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full h-48 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-xs">
            <CalendarDays size={32} className="mb-2 text-slate-300" />
            <p className="text-xs">Nenhum plano preventivo configurado para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* MODAL CONFIGURAR PLANO */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Configurar Parâmetros de Revisão Preventiva">
        <form onSubmit={handleConfigSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Equipamento</label>
              <select
                value={configMachineId}
                onChange={(e) => setConfigMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Item de Manutenção</label>
              <select
                value={configItem}
                onChange={(e) => setConfigItem(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
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
                placeholder="Ex: 180 (Deixar vazio para ignorar)"
                value={configIntervalDays}
                onChange={(e) => setConfigIntervalDays(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intervalo em HORAS/KM</label>
              <input
                type="number"
                placeholder="Ex: 250 (Deixar vazio para ignorar)"
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

      {/* MODAL REALIZAR MANUTENÇÃO (PRE-PREENCHIDO) */}
      <Modal isOpen={isPerformOpen} onClose={() => setIsPerformOpen(false)} title="Registrar Manutenção Preventiva Concluída">
        <form onSubmit={handlePerformSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-start gap-2 mb-2">
            <Info size={14} className="text-[#1B3022] shrink-0 mt-0.5" />
            <div>
              <span>Este processo vai registrar um log histórico de manutenção de forma automática e resetar a contagem de prazo do plano preventivo desta máquina.</span>
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

    </div>
  );
}
