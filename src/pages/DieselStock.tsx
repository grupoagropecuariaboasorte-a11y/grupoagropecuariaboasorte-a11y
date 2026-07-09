import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Farm, FuelStock, FuelStockBalance } from '../types';
import Modal from '../components/Modal';
import { 
  Database, Plus, Calendar, ShieldAlert, CheckCircle, 
  TrendingUp, ArrowDownCircle, ArrowUpCircle, Info,
  Pencil, Trash2, XCircle, AlertTriangle, FileText
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

  // Form States (Adicionar)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formFarmId, setFormFarmId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLiters, setFormLiters] = useState<number | ''>('');
  const [formPricePerLiter, setFormPricePerLiter] = useState<number | ''>(5.85);
  const [formSupplier, setFormSupplier] = useState('');
  const [formMinAlert, setFormMinAlert] = useState(1000);
  const [formNotes, setFormNotes] = useState('');

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFarmId, setEditFarmId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLiters, setEditLiters] = useState<number | ''>('');
  const [editPricePerLiter, setEditPricePerLiter] = useState<number | ''>(5.85);
  const [editSupplier, setEditSupplier] = useState('');
  const [editMinAlert, setEditMinAlert] = useState(1000);
  const [editNotes, setEditNotes] = useState('');
  const [editJustification, setEditJustification] = useState('');

  // Delete States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteJustification, setDeleteJustification] = useState('');

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
    setFormPricePerLiter(5.85);
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
        price_per_liter: Number(formPricePerLiter) || 5.85,
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

  const handleOpenEdit = (stock: FuelStock) => {
    setEditingId(stock.id);
    setEditFarmId(stock.farm_id || '');
    setEditDate(stock.entry_date || '');
    setEditLiters(stock.liters_received ?? '');
    setEditPricePerLiter(stock.price_per_liter ?? '');
    setEditSupplier(stock.supplier ?? '');
    setEditMinAlert(stock.minimum_stock_alert ?? 1000);
    setEditNotes(stock.notes ?? '');
    setEditJustification(stock.edit_justification ?? '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (Number(editLiters) <= 0) {
      alert('Quantidade de litros recebidos deve ser maior que zero!');
      return;
    }
    if (!editJustification.trim()) {
      alert('Por favor, informe a justificativa da alteração!');
      return;
    }

    try {
      await fleetService.updateFuelStock(editingId, {
        farm_id: editFarmId,
        entry_date: editDate,
        liters_received: Number(editLiters),
        price_per_liter: Number(editPricePerLiter) || 5.85,
        supplier: editSupplier,
        minimum_stock_alert: Number(editMinAlert),
        notes: editNotes,
        edit_justification: editJustification
      });
      setIsEditOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao atualizar entrada de estoque: ' + err.message);
    }
  };

  const handleOpenDelete = (stock: FuelStock) => {
    setDeletingId(stock.id);
    setDeleteJustification('');
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingId) return;
    if (!deleteJustification.trim()) {
      alert('Por favor, informe a justificativa da remoção!');
      return;
    }

    try {
      await fleetService.deleteFuelStock(deletingId, deleteJustification);
      setIsDeleteOpen(false);
      refreshList();
    } catch (err: any) {
      alert('Erro ao remover entrada de estoque: ' + err.message);
    }
  };

  // Filtrar dados conforme a fazenda selecionada no cabeçalho global
  const filteredBalances = selectedFarmId === 'ALL'
    ? balances
    : balances.filter(b => b.farm_id === selectedFarmId);

  const filteredHistory = selectedFarmId === 'ALL'
    ? stockHistory
    : stockHistory.filter(h => h.farm_id === selectedFarmId);

  const activeHistory = filteredHistory.filter(h => !h.is_deleted);
  const deletedHistory = filteredHistory.filter(h => h.is_deleted);

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
          const currentBal = item.current_balance || 0;
          const minAlert = item.min_alert || 0;
          const perc = capMax > 0 ? Math.min(100, Math.max(0, (currentBal / capMax) * 100)) : 0;
          const isLow = currentBal <= minAlert;

          const farmActiveStocks = stockHistory.filter(s => s.farm_id === item.farm_id && !s.is_deleted);
          const lastLaunch = farmActiveStocks.length > 0
            ? [...farmActiveStocks].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())[0]
            : null;

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
                    {(item.total_received ?? 0).toLocaleString('pt-BR')} L
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Consumido</p>
                  <p className="text-slate-800 font-bold font-mono mt-0.5 flex items-center gap-1">
                    <ArrowDownCircle size={14} className="text-blue-600" />
                    {(item.total_consumed ?? 0).toLocaleString('pt-BR')} L
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Saldo Atual</p>
                  <p className={`text-sm font-black font-mono mt-0.5 ${isLow ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {(item.current_balance ?? 0).toLocaleString('pt-BR')} L
                  </p>
                </div>
              </div>

              {/* Preço do Último Lançamento (Preço Atual) */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-6 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                    <TrendingUp size={13} />
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Preço Último Lançado (Atual)</p>
                  </div>
                </div>
                <div className="text-right">
                  {lastLaunch ? (
                    <p className="font-bold font-mono text-[#1B3022]">
                      R$ {Number(lastLaunch.price_per_liter || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">/ L</span>
                    </p>
                  ) : (
                    <p className="font-medium text-slate-400">Nenhum lançamento</p>
                  )}
                </div>
              </div>

              {/* Progress visual */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Limite Alerta: {(item.min_alert ?? 0).toLocaleString('pt-BR')} L</span>
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
                    <strong>Nível de Alerta Crítico!</strong> O volume de diesel está abaixo do limite configurado de segurança ({(item.min_alert ?? 0).toLocaleString('pt-BR')} L) para a Fazenda {item.farm_name}. Solicite abastecimento de caminhão tanque com urgência.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* HISTÓRICO DE ENTRADAS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Log de Cargas Recebidas / Abastecimento Tanques
          </h4>
          <span className="text-[11px] text-slate-500 font-medium font-mono">
            Ativos: {activeHistory.length}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {activeHistory.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data de Entrada</th>
                  <th className="py-4 px-6">Fazenda</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 font-mono text-right">Lts Recebidos</th>
                  <th className="py-4 px-6 font-mono text-right">Preço/L</th>
                  <th className="py-4 px-6">Fornecedor</th>
                  <th className="py-4 px-6 font-mono text-right">Alerta Mínimo Definido</th>
                  <th className="py-4 px-6">Observações / Notas</th>
                  {userRole !== 'viewer' && (
                    <th className="py-4 px-6 text-center">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeHistory.map((h) => {
                  const farmName = farms.find(f => f.id === h.farm_id)?.name || 'N/A';
                  return (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-4 px-6 text-slate-550 font-mono">
                        {new Date(h.entry_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-bold">
                        <div>
                          <span>{farmName}</span>
                          {h.edit_justification && (
                            <span className="block text-[10px] text-amber-700 font-normal mt-0.5" title={h.edit_justification}>
                              ✏️ Editado: {h.edit_justification}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {h.edit_justification ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                            Editado
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-850 uppercase tracking-wide">
                            Lançado
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-[#1B3022]">
                        +{(h.liters_received ?? 0).toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-650">
                        R$ {Number(h.price_per_liter || 5.85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-slate-600">{h.supplier || 'Não informado'}</td>
                      <td className="py-4 px-6 text-right font-mono text-slate-500">
                        {(h.minimum_stock_alert ?? 0).toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 text-slate-500 italic max-w-xs truncate" title={h.notes}>
                        {h.notes || 'Nenhuma nota registrada'}
                      </td>
                      {userRole !== 'viewer' && (
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(h)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Lançamento"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(h)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover Lançamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400">
              <Database size={32} className="mb-1 text-slate-300" />
              <p className="text-xs">Nenhuma entrada ativa cadastrada para esta fazenda.</p>
            </div>
          )}
        </div>
      </div>

      {/* HISTÓRICO DE LANÇAMENTOS REMOVIDOS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Histórico de Lançamentos Removidos / Cancelados (Sem impacto no saldo)
            </h4>
          </div>
          <span className="text-[11px] text-rose-700 font-bold font-mono">
            Removidos: {deletedHistory.length}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {deletedHistory.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-rose-50/20 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data Original</th>
                  <th className="py-4 px-6">Fazenda</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 font-mono text-right">Lts Recebidos</th>
                  <th className="py-4 px-6 font-mono text-right">Preço/L</th>
                  <th className="py-4 px-6">Fornecedor</th>
                  <th className="py-4 px-6 text-rose-800">Justificativa da Remoção</th>
                  <th className="py-4 px-6">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedHistory.map((h) => {
                  const farmName = farms.find(f => f.id === h.farm_id)?.name || 'N/A';
                  return (
                    <tr key={h.id} className="bg-slate-50/40 text-slate-500 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono line-through decoration-rose-300">
                        {new Date(h.entry_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 font-bold line-through decoration-rose-300">{farmName}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wide">
                          Removido
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-rose-600/70 line-through decoration-rose-300">
                        {(h.liters_received ?? 0).toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 text-right font-mono line-through decoration-rose-300">
                        R$ {Number(h.price_per_liter || 5.85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 line-through decoration-rose-300">{h.supplier || 'Não informado'}</td>
                      <td className="py-4 px-6 text-rose-800 font-semibold bg-rose-50/30 select-all">
                        {h.deletion_reason || 'Nenhuma justificativa informada'}
                      </td>
                      <td className="py-4 px-6 italic max-w-xs truncate" title={h.notes}>{h.notes || 'Nenhuma nota registrada'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-28 flex flex-col items-center justify-center text-slate-400">
              <CheckCircle size={24} className="mb-1 text-slate-300" />
              <p className="text-[11px]">Nenhum lançamento removido até o momento.</p>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preço por Litro (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 5.85"
                value={formPricePerLiter}
                onChange={(e) => setFormPricePerLiter(e.target.value !== '' ? Number(e.target.value) : '')}
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

      {/* MODAL EDITAR ENTRADA */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Entrada de Diesel (Tanque)">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda Receptora</label>
              <select
                value={editFarmId}
                onChange={(e) => setEditFarmId(e.target.value)}
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
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quantidade Recebida (Litros)</label>
              <input
                type="number"
                required
                placeholder="Ex: 5000"
                value={editLiters}
                onChange={(e) => setEditLiters(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preço por Litro (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 5.85"
                value={editPricePerLiter}
                onChange={(e) => setEditPricePerLiter(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Alerta de Estoque Mínimo (L)</label>
              <input
                type="number"
                required
                value={editMinAlert}
                onChange={(e) => setEditMinAlert(Number(e.target.value))}
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
              value={editSupplier}
              onChange={(e) => setEditSupplier(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações / Detalhes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Nota fiscal, número do lacre, bocal utilizado..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] h-16"
            />
          </div>

          {/* Campo obrigatório de justificativa de alteração */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-amber-800 flex items-center gap-1">
              <AlertTriangle size={14} />
              Justificativa da Alteração (Obrigatório)
            </label>
            <textarea
              required
              value={editJustification}
              onChange={(e) => setEditJustification(e.target.value)}
              placeholder="Descreva claramente o motivo de estar alterando este registro..."
              className="w-full bg-white border-amber-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-amber-600 h-16"
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

      {/* MODAL REMOVER ENTRADA */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirmar Remoção de Lançamento">
        <form onSubmit={handleDeleteSubmit} className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-3 text-xs text-rose-800 leading-normal">
            <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <strong className="block text-rose-900 font-bold mb-1">Atenção! Esta ação é irreversível nos saldos.</strong>
              Este lançamento deixará de ser somado e contabilizado no saldo de combustível do tanque desta fazenda. No entanto, o registro continuará visível no histórico de lançamentos removidos para fins de auditoria e transparência.
            </div>
          </div>

          {/* Campo obrigatório de justificativa de remoção */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Justificativa da Remoção (Obrigatório)
            </label>
            <textarea
              required
              value={deleteJustification}
              onChange={(e) => setDeleteJustification(e.target.value)}
              placeholder="Descreva detalhadamente o motivo da remoção deste lançamento de diesel..."
              className="w-full bg-white border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-rose-500 h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar Remoção
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
