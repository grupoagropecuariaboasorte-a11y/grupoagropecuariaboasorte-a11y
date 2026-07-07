import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { FuelLog, Farm, Machine, LookupItem } from '../types';
import Modal from '../components/Modal';
import { 
  Fuel, Plus, Trash2, Search, Calendar, AlertTriangle, 
  Info, Check, HelpCircle, FileText
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

        if (fList.length > 0) setFormFarmId(fList[0].id);
        if (mList.length > 0) setFormMachineId(mList[0].id);
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

  // =========================================================================
  // SUBMISSÃO DO ABASTECIMENTO
  // =========================================================================
  const handleOpenAdd = () => {
    setFormDate(new Date().toISOString().slice(0, 16));
    setFormPumpStart('');
    setFormPumpEnd('');
    setFormNotes('');
    setFormResponsible('');
    if (farms.length > 0) setFormFarmId(farms[0].id);
    if (machines.length > 0) {
      setFormMachineId(machines[0].id);
      setFormHourKm(machines[0].current_hour_km || machines[0].initial_hour_km);
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
        price_per_liter: Number(formPrice),
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
      (machine && machine.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && machine.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farm && farm.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.responsible && log.responsible.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && periodMatch && machineMatch && textMatch;
  });

  // Totais no Rodapé
  const totalLitersSupplied = filteredLogs.reduce((sum, log) => sum + log.liters_supplied, 0);
  const totalValueSum = filteredLogs.reduce((sum, log) => sum + log.total_value, 0);

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
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Equipamento</th>
                  <th className="py-4 px-6">Fazenda</th>
                  <th className="py-4 px-6">Combustível</th>
                  <th className="py-4 px-6">Bomba (Início/Fim)</th>
                  <th className="py-4 px-6 font-mono text-right">Lts Fornecidos</th>
                  <th className="py-4 px-6 font-mono text-right">Preço/L</th>
                  <th className="py-4 px-6 font-mono text-right">Valor Total</th>
                  <th className="py-4 px-6">Horímetro/Km</th>
                  <th className="py-4 px-6">Consumo Rate</th>
                  <th className="py-4 px-6">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const machine = machines.find(m => m.id === log.machine_id);
                  const farmName = farms.find(f => f.id === log.farm_id)?.name || 'N/A';
                  const fuelLabel = lookups?.fuelTypes.find((f: LookupItem) => f.id === log.fuel_type)?.label || log.fuel_type;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                      <td className="py-4 px-6 text-slate-500 font-mono">
                        {new Date(log.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-4 px-6">
                        {machine ? (
                          <div>
                            <span className="font-mono font-bold text-slate-800">{machine.code}</span>
                            <span className="text-[10px] text-slate-400 block">{machine.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Excluída</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600">{farmName}</td>
                      <td className="py-4 px-6 text-slate-500">{fuelLabel}</td>
                      <td className="py-4 px-6 font-mono text-slate-500">
                        {log.pump_reading_start} → {log.pump_reading_end}
                      </td>
                      <td className="py-4 px-6 font-mono text-right font-bold text-[#1B3022]">
                        {log.liters_supplied.toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 font-mono text-right text-slate-500">
                        R$ {log.price_per_liter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 font-mono text-right font-bold text-slate-800">
                        R$ {log.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600 text-right">
                        {log.hour_km_at_fueling.toLocaleString('pt-BR')} h/km
                        <span className="text-[9px] text-slate-400 block">+{log.hours_km_since_last}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500 text-center">
                        {log.consumption_rate > 0 ? (
                          <span className="text-[#1B3022] font-semibold">
                            {log.consumption_rate.toFixed(2)} L/h
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500 truncate max-w-[120px]">{log.responsible || 'Carlos'}</td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* TABLE FOOTER / TOTAIS */}
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="font-mono text-xs font-bold text-slate-800">
                  <td colSpan={5} className="py-4 px-6 uppercase tracking-wider text-[10px] font-bold text-slate-500 text-left">Totais Filtrados:</td>
                  <td className="py-4 px-6 text-right text-[#1B3022]">{totalLitersSupplied.toLocaleString('pt-BR')} L</td>
                  <td></td>
                  <td className="py-4 px-6 text-right text-[#1B3022]">R$ {totalValueSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colSpan={3}></td>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preço por Litro (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
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

    </div>
  );
}
