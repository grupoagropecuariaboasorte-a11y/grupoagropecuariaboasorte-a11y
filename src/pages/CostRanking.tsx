import { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Machine, FuelLog, MaintenanceLog } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { TrendingUp, DollarSign, Calculator, HelpCircle, FileText } from 'lucide-react';

interface CostRankingProps {
  selectedFarmId: string;
}

export default function CostRanking({ selectedFarmId }: CostRankingProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mList, fList, maintList] = await Promise.all([
          fleetService.getMachines(),
          fleetService.getFuelLogs(),
          fleetService.getMaintenanceLogs()
        ]);
        setMachines(mList);
        setFuelLogs(fList);
        setMaintenanceLogs(maintList);
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
        <div className="w-8 h-8 border-4 border-[#1B3022] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // CALCULO DE CUSTOS ACUMULADOS
  // =========================================================================
  const rankings = machines
    .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
    .map(mach => {
      // Somar abastecimentos desta máquina
      const machFuel = fuelLogs
        .filter(f => f.machine_id === mach.id)
        .reduce((sum, current) => sum + current.total_value, 0);

      // Somar manutenções desta máquina
      const machMaint = maintenanceLogs
        .filter(m => m.machine_id === mach.id)
        .reduce((sum, current) => sum + current.total_cost, 0);

      const total = machFuel + machMaint;

      // Custo por hora (Evitando divisão por zero)
      const divider = mach.current_hour_km > 0 ? mach.current_hour_km : 1;
      const costPerHour = total / divider;

      return {
        id: mach.id,
        code: mach.code,
        name: mach.name,
        brand: mach.brand,
        model: mach.model,
        hours: mach.current_hour_km,
        fuelCost: machFuel,
        maintCost: machMaint,
        totalCost: total,
        costPerHour: costPerHour
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);

  // Dados para o gráfico Recharts (Top 15 mais caros)
  const chartData = rankings.slice(0, 15).map(r => ({
    name: r.code,
    'Gasto Combustível (R$)': Number(r.fuelCost.toFixed(2)),
    'Gasto Manutenção (R$)': Number(r.maintCost.toFixed(2)),
    'Total (R$)': Number(r.totalCost.toFixed(2))
  }));

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* HEADER DE CUSTOS */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
          <TrendingUp size={18} className="text-[#1B3022]" />
          Ranking de Custos de Equipamentos
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Análise econômica consolidada combinando despesas de diesel, lubrificação, reparos e custo-benefício por hora de trabalho.
        </p>
      </div>

      {/* GRÁFICO TOP 15 */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-6">
          Gráfico Comparativo: Top 15 Equipamentos Mais Caros (Acumulado R$)
        </h4>
        <div className="h-96 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: 12, color: '#1e293b' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Gasto Combustível (R$)" stackId="a" fill="#1B3022" />
                <Bar dataKey="Gasto Manutenção (R$)" stackId="a" fill="#eab308" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Nenhuma máquina cadastrada para gerar o ranking.
            </div>
          )}
        </div>
      </div>

      {/* TABELA DE EFICIÊNCIA ECONÔMICA */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Grid de Análise de Eficiência de Ativos e Custo por Hora
          </h4>
          <span className="text-[10px] bg-white text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md font-mono font-bold shadow-2xs">
            Equipamentos Ordenados por Custo Total
          </span>
        </div>

        <div className="overflow-x-auto">
          {rankings.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Posição</th>
                  <th className="py-4 px-6">Equipamento</th>
                  <th className="py-4 px-6">Marca/Modelo</th>
                  <th className="py-4 px-6 font-mono text-right">Horímetro Atual</th>
                  <th className="py-4 px-6 font-mono text-right">Despesa Combustível</th>
                  <th className="py-4 px-6 font-mono text-right">Despesa Manutenção</th>
                  <th className="py-4 px-6 font-mono text-right">Custo Total</th>
                  <th className="py-4 px-6 font-mono text-right text-[#1B3022]">Custo por Hora / Km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {rankings.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 text-xs">
                    <td className="py-4 px-6 text-slate-400 font-bold">
                      #{idx + 1}
                    </td>
                    <td className="py-4 px-6 font-sans">
                      <span className="font-mono font-bold text-slate-800 block">{r.code}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{r.name}</span>
                    </td>
                    <td className="py-4 px-6 font-sans text-slate-500">
                      {r.brand} {r.model}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-700">
                      {r.hours.toLocaleString('pt-BR')} h
                    </td>
                    <td className="py-4 px-6 text-right text-slate-600">
                      R$ {r.fuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-600">
                      R$ {r.maintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-800">
                      R$ {r.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-[#1B3022]">
                      R$ {r.costPerHour.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Não existem dados de custos ou frotas locadas nesta fazenda.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
