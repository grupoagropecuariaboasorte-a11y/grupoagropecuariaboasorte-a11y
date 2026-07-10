import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Farm, Machine, FuelLog, MaintenanceLog, Checklist30d } from '../types';
import { 
  FileText, Printer, Calendar, Database, Tractor, Fuel, 
  Wrench, CheckSquare, TrendingUp, Sparkles, Eye 
} from 'lucide-react';

interface MonthlyReportProps {
  selectedFarmId: string;
}

export default function MonthlyReport({ selectedFarmId }: MonthlyReportProps) {
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [checklists, setChecklists] = useState<Checklist30d[]>([]);

  // Filtros Locais do Relatório
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }); // Formato: YYYY-MM
  const [localFarmId, setLocalFarmId] = useState(selectedFarmId);

  // Sincronizar filtro de fazenda local com o global
  useEffect(() => {
    setLocalFarmId(selectedFarmId);
  }, [selectedFarmId]);

  // Carregar dados iniciais uma única vez ao montar
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fList, mList, fuel, maint, checks] = await Promise.all([
          fleetService.getFarms(),
          fleetService.getMachines(),
          fleetService.getFuelLogs(),
          fleetService.getMaintenanceLogs(),
          fleetService.getChecklists()
        ]);
        setFarms(fList);
        setMachines(mList);
        setFuelLogs(fuel);
        setMaintenanceLogs(maint);
        setChecklists(checks);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // CALCULO DO RELATÓRIO DO MÊS SELECIONADO
  // =========================================================================

  const filterLogsByMonthAndFarm = () => {
    const [year, month] = selectedMonth.split('-');
    const targetYear = Number(year);
    const targetMonth = Number(month) - 1; // 0-indexed no JS

    const isRecordInFilters = (dateStr: string, machId?: string, farmIdFromRecord?: string) => {
      const date = new Date(dateStr);
      const isMonthMatch = date.getFullYear() === targetYear && date.getMonth() === targetMonth;

      let isFarmMatch = true;
      if (localFarmId !== 'ALL') {
        if (farmIdFromRecord) {
          isFarmMatch = farmIdFromRecord === localFarmId;
        } else if (machId) {
          const mach = machines.find(m => m.id === machId);
          isFarmMatch = mach ? mach.farm_id === localFarmId : false;
        }
      }

      return isMonthMatch && isFarmMatch;
    };

    const fuel = fuelLogs.filter(log => isRecordInFilters(log.date, undefined, log.farm_id));
    const maintenance = maintenanceLogs.filter(log => isRecordInFilters(log.date, log.machine_id));
    const checks = checklists.filter(log => isRecordInFilters(log.date, log.machine_id));

    return { fuel, maintenance, checks };
  };

  const reportData = filterLogsByMonthAndFarm();

  // 1. Totais Básicos
  const totalFuelLiters = reportData.fuel.reduce((sum, log) => sum + log.liters_supplied, 0);
  const totalFuelCost = reportData.fuel.reduce((sum, log) => sum + log.total_value, 0);
  const totalMaintCost = reportData.maintenance.reduce((sum, log) => sum + log.total_cost, 0);
  const totalChecklistsCount = reportData.checks.length;

  // 2. Quebra de Custo de Manutenção por Categoria
  const maintenanceByCategory: { [key: string]: number } = {};
  reportData.maintenance.forEach(m => {
    maintenanceByCategory[m.main_item] = (maintenanceByCategory[m.main_item] || 0) + m.total_cost;
  });

  // 3. Quebra de Combustível por Tipo
  const fuelByType: { [key: string]: number } = {};
  reportData.fuel.forEach(f => {
    fuelByType[f.fuel_type] = (fuelByType[f.fuel_type] || 0) + f.liters_supplied;
  });

  // 4. Mapear veículos ativos no relatório
  const affectedMachineIds = new Set([
    ...reportData.fuel.map(f => f.machine_id),
    ...reportData.maintenance.map(m => m.machine_id),
    ...reportData.checks.map(c => c.machine_id)
  ]);
  const activeMachinesInReport = machines.filter(m => affectedMachineIds.has(m.id));

  const handlePrint = () => {
    window.print();
  };

  const formatMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const selectedFarmName = localFarmId === 'ALL' 
    ? 'Todas as Fazendas' 
    : farms.find(f => f.id === localFarmId)?.name || 'Fazenda Especificada';

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* FILTROS DO RELATÓRIO - ESCONDER AO IMPRIMIR */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <FileText size={18} className="text-[#1B3022]" />
            Consolidador de Relatórios Mensais
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Escolha o mês de referência e gere o laudo para assinatura ou impressão física da gerência.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Mês */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-2xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-800 outline-hidden font-bold cursor-pointer"
            />
          </div>

          {/* Seletor de Fazenda */}
          <select
            value={localFarmId}
            onChange={(e) => setLocalFarmId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold outline-hidden cursor-pointer shadow-2xs"
          >
            <option value="ALL">Todas as Fazendas</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Botão de Impressão */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            <Printer size={14} />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xs relative overflow-hidden text-slate-800 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        
        {/* Marca d'água de papel timbrado agrícola (visível no print) */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#1B3022]/5 rounded-full pointer-events-none print:hidden" />

        {/* Cabeçalho do Relatório */}
        <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-start print:border-black print:pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#1B3022] uppercase print:text-slate-600">
              Frota Agro • Relatório de Gestão Consolidado
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1 print:text-black">
              DEMONSTRATIVO MENSAL DE OPERAÇÕES
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 print:text-slate-600">
              Fazenda: <strong>{selectedFarmName}</strong> • Período: <strong>{formatMonthName(selectedMonth)}</strong>
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-mono print:text-slate-500">
            <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            <p className="mt-0.5">Sistema Digital FrotaAgro v1.0</p>
          </div>
        </div>

        {/* 4 CARDS RESUMO EXECUTIVO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4 print:mb-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl print:bg-white print:border-slate-300 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Lts Fornecidos</span>
            <span className="text-base font-bold text-slate-800 mt-1 font-mono block print:text-black">
              {totalFuelLiters.toLocaleString('pt-BR')} L
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl print:bg-white print:border-slate-300 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Diesel</span>
            <span className="text-base font-bold text-[#1B3022] mt-1 font-mono block print:text-black">
              R$ {totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl print:bg-white print:border-slate-300 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Custos Oficina</span>
            <span className="text-base font-bold text-amber-700 mt-1 font-mono block print:text-black">
              R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl print:bg-white print:border-slate-300 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Checklists Executados</span>
            <span className="text-base font-bold text-blue-700 mt-1 font-mono block print:text-black">
              {totalChecklistsCount} vistorias
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-6">
          {/* Col 1: Gastos Oficinas */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 print:bg-white print:border-slate-300 shadow-2xs">
            <h4 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-1.5 print:text-black print:border-slate-300">
              <Wrench size={12} className="text-amber-600" /> Detalhes de Despesas por Setor
            </h4>
            {Object.keys(maintenanceByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(maintenanceByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center text-xs text-slate-600 print:text-black">
                    <span className="font-medium">{cat}</span>
                    <span className="font-bold font-mono">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-xs font-bold text-slate-800 print:text-black print:border-slate-300">
                  <span>Despesa Operacional Oficina</span>
                  <span className="font-mono text-amber-700 print:text-black">R$ {totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 italic print:text-slate-500">Nenhum custo de manutenção lançado para este mês.</p>
            )}
          </div>

          {/* Col 2: Combustível */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 print:bg-white print:border-slate-300 shadow-2xs">
            <h4 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-1.5 print:text-black print:border-slate-300">
              <Fuel size={12} className="text-[#1B3022]" /> Litragem Abastecida por Fluido
            </h4>
            {Object.keys(fuelByType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(fuelByType).map(([type, liters]) => {
                  const label = type === 'diesel_s10' ? 'Diesel S10' : type === 'diesel_comum' ? 'Diesel Comum S500' : type;
                  return (
                    <div key={type} className="flex justify-between items-center text-xs text-slate-600 print:text-black">
                      <span className="font-medium">{label}</span>
                      <span className="font-bold font-mono">{liters.toLocaleString('pt-BR')} Litros</span>
                    </div>
                  );
                })}
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-xs font-bold text-slate-800 print:text-black print:border-slate-300">
                  <span>Valor Líquido Fornecido</span>
                  <span className="font-mono text-[#1B3022] print:text-black">R$ {totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 italic print:text-slate-500">Nenhum reabastecimento lançado para este mês.</p>
            )}
          </div>
        </div>

        {/* TABELA DE MÁQUINAS ATIVAS NO MÊS */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8 print:bg-white print:border-slate-300 shadow-2xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 print:bg-white print:border-slate-300">
            <h4 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider print:text-black">
              Equipamentos que Operaram ou Receberam Manutenção
            </h4>
          </div>
          
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 print:bg-white print:border-slate-300 print:text-black">
                <th className="py-3 px-4">Equipamento</th>
                <th className="py-3 px-4 text-right">Abastecimentos Lts</th>
                <th className="py-3 px-4 text-right">Gasto Combustível</th>
                <th className="py-3 px-4 text-right">Gasto Manutenção</th>
                <th className="py-3 px-4 text-right">Checklists Lançados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300 font-mono text-slate-700 print:text-black">
              {activeMachinesInReport.map(m => {
                const machineFuel = reportData.fuel.filter(f => f.machine_id === m.id);
                const machineMaint = reportData.maintenance.filter(f => f.machine_id === m.id);
                const machineChecks = reportData.checks.filter(f => f.machine_id === m.id);

                const mFuelLiters = machineFuel.reduce((sum, current) => sum + current.liters_supplied, 0);
                const mFuelCost = machineFuel.reduce((sum, current) => sum + current.total_value, 0);
                const mMaintCost = machineMaint.reduce((sum, current) => sum + current.total_cost, 0);

                return (
                  <tr key={m.id} className="print:bg-white hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800 print:text-black">
                      {m.code} - {m.name}
                    </td>
                    <td className="py-3 px-4 text-right">{mFuelLiters.toLocaleString('pt-BR')} L</td>
                    <td className="py-3 px-4 text-right">R$ {mFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">R$ {mMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-sans text-slate-600">{machineChecks.length} vistorias</td>
                  </tr>
                );
              })}
              {activeMachinesInReport.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-center italic text-slate-400 print:text-slate-500">
                    Nenhuma máquina teve atividade registrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CAMPO DE ASSINATURA PARA PRESTAÇÃO DE CONTAS - APENAS VISÍVEL NO PRINT */}
        <div className="hidden print:block border-t border-dashed border-slate-400 mt-16 pt-8 text-black">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t border-black w-48 mx-auto mt-8" />
              <p className="text-[10px] font-bold uppercase mt-1">Gerente de Operações / Frota</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Responsável técnico pela consolidação</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-48 mx-auto mt-8" />
              <p className="text-[10px] font-bold uppercase mt-1">Diretoria / Supervisor Geral</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Assinatura de Recebimento e Conferência</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
