import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Farm, FuelStock, FuelStockBalance } from '../types';
import Modal from '../components/Modal';
import { 
  Database, Plus, Calendar, ShieldAlert, CheckCircle, 
  TrendingUp, ArrowDownCircle, ArrowUpCircle, Info 
} from 'lucide-react';

interface DieselStockProps {
  selectedFarmId: string;
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function DieselStock({ selectedFarmId, userRole }: DieselStockProps) {
  const [stockHistory, setStockHistory] = useState<FuelStock[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [balances, setBalances] = useState<FuelStockBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formFarmId, setFormFarmId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLiters, setFormLiters] = useState<number | ''>('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formMinAlert, setFormMinAlert] = useState(1000);
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [hist, fList, bal] = await Promise.all([
          fleetService.getFuelStock(),
          fleetService.getFarms(),
          fleetService.getFuelStockBalance()
        ]);
        setStockHistory(hist);
        setFarms(fList);
        setBalances(bal);
        if (fList.length > 0) {
          setFormFarmId(selectedFarmId === 'ALL' ? fList[0].id : selectedFarmId);
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
    const [hist, bal] = await Promise.all([
      fleetService.getFuelStock(),
      fleetService.getFuelStockBalance()
    ]);
    setStockHistory(hist);
    setBalances(bal);
  };

  const handleOpenAdd = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormLiters('');
    setFormSupplier('');
    setFormMinAlert(1000);
    setFormNotes('');
    if (farms.length > 0) {
      setFormFarmId(selectedFarmId === 'ALL' ? farms[0].id : selectedFarmId);
    }
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(formLiters) <= 0) {
      alert('Quantidade de litros recebidos deve ser maior que zero!');
      return;
    }

    try {
      await fleetService.addFuelStock({
        farm_id: formFarmId,
        entry_date: formDate,
        liters_received: Number(formLiters),
        supplier: formSupplier,
        minimum_stock_alert: Number(formMinAlert),
        notes: formNotes
      });
      setIsAddOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao registrar entrada de estoque: ' + err.message);
    }
  };

  // Filtrar dados conforme a fazenda selecionada no cabeçalho global
  const filteredBalances = selectedFarmId === 'ALL'
    ? balances
    : balances.filter(b => b.farm_id === selectedFarmId);

  const filteredHistory = selectedFarmId === 'ALL'
    ? stockHistory
    : stockHistory.filter(h => h.farm_id === selectedFarmId);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* SEÇÃO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <Database size={18} className="text-[#1B3022]" />
            Estoque de Óleo Diesel por Fazenda
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Controle de depósitos, alertas de suprimentos mínimos e histórico de cargas recebidas.
          </p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
          >
            <Plus size={14} />
            <span>Registrar Entrada de Diesel</span>
          </button>
        )}
      </div>

      {/* CARDS COM PROGRESSO DO ESTOQUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBalances.map((item) => {
          const capMax = item.total_received || 5000;
          const perc = capMax > 0 ? Math.min(100, Math.max(0, (item.current_balance / capMax) * 100)) : 0;
          const isLow = item.current_balance <= item.min_alert;

          return (
            <div key={item.farm_id} className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
              {/* Background gradient if level is critical */}
              {isLow && (
                <div className="absolute inset-0 bg-rose-50/40 pointer-events-none -z-10" />
              )}
              
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{item.farm_name}</h4>
                  <p className="text-[10px] font-mono text-slate-400 uppercase font-bold mt-1 tracking-wider">Tanque de Combustível</p>
                </div>
                {isLow ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full uppercase tracking-wider">
                    <ShieldAlert size={12} /> Crítico
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-250 rounded-full uppercase tracking-wider">
                    <CheckCircle size={12} /> Adequado
                  </span>
                )}
              </div>

              {/* Balances list */}
              <div className="grid grid-cols-3 gap-4 text-xs mb-6">
                <div>
                  <p className="text-slate-400 font-medium">Lançado Entrada</p>
                  <p className="text-slate-800 font-bold font-mono mt-0.5 flex items-center gap-1">
                    <ArrowUpCircle size={14} className="text-emerald-600" />
                    {item.total_received.toLocaleString('pt-BR')} L
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Consumido</p>
                  <p className="text-slate-800 font-bold font-mono mt-0.5 flex items-center gap-1">
                    <ArrowDownCircle size={14} className="text-blue-600" />
                    {item.total_consumed.toLocaleString('pt-BR')} L
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Saldo Atual</p>
                  <p className={`text-sm font-black font-mono mt-0.5 ${isLow ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {item.current_balance.toLocaleString('pt-BR')} L
                  </p>
                </div>
              </div>

              {/* Progress visual */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Limite Alerta: {item.min_alert.toLocaleString('pt-BR')} L</span>
                  <span>{perc.toFixed(1)}% do total recebido</span>
                </div>
                <div className="w-full bg-slate-100 border border-slate-200/60 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLow ? 'bg-rose-600' : 'bg-[#1B3022]'
                    }`}
                    style={{ width: `${perc}%` }}
                  />
                </div>
              </div>

              {isLow && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-2 text-xs text-rose-800 leading-normal shadow-2xs">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5 text-rose-600" />
                  <span>
                    <strong>Nível de Alerta Crítico!</strong> O volume de diesel está abaixo do limite configurado de segurança ({item.min_alert.toLocaleString('pt-BR')} L) para a Fazenda {item.farm_name}. Solicite abastecimento de caminhão tanque com urgência.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* HISTÓRICO DE ENTRADAS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Log de Cargas Recebidas / Abastecimento Tanques
          </h4>
        </div>
        
        <div className="overflow-x-auto">
          {filteredHistory.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data de Entrada</th>
                  <th className="py-4 px-6">Fazenda</th>
                  <th className="py-4 px-6 font-mono text-right">Lts Recebidos</th>
                  <th className="py-4 px-6">Fornecedor</th>
                  <th className="py-4 px-6 font-mono text-right">Alerta Mínimo Definido</th>
                  <th className="py-4 px-6">Observações / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((h) => {
                  const farmName = farms.find(f => f.id === h.farm_id)?.name || 'N/A';
                  return (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-4 px-6 text-slate-550 font-mono">
                        {new Date(h.entry_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-bold">{farmName}</td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-[#1B3022]">
                        +{h.liters_received.toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 text-slate-600">{h.supplier || 'Não informado'}</td>
                      <td className="py-4 px-6 text-right font-mono text-slate-500">
                        {h.minimum_stock_alert.toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 text-slate-500 italic max-w-xs truncate">{h.notes || 'Nenhuma nota registrada'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400">
              <Database size={32} className="mb-1 text-slate-300" />
              <p className="text-xs">Nenhuma entrada cadastrada para esta fazenda.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ADICIONAR ENTRADA */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Lançar Carga de Diesel (Tanque)">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda Receptora</label>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data da Entrega</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quantidade Recebida (Litros)</label>
              <input
                type="number"
                required
                placeholder="Ex: 5000"
                value={formLiters}
                onChange={(e) => setFormLiters(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Alerta de Estoque Mínimo (L)</label>
              <input
                type="number"
                required
                value={formMinAlert}
                onChange={(e) => setFormMinAlert(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Limiar de aviso para abastecimento crítico.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Distribuidora / Fornecedor</label>
            <input
              type="text"
              placeholder="Ex: Distribuidora Ipiranga"
              value={formSupplier}
              onChange={(e) => setFormSupplier(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações / Detalhes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Nota fiscal, número do lacre, bocal utilizado..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-16"
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
              Confirmar Recebimento
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
