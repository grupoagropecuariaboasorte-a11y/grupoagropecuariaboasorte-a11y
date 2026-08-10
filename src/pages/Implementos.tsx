import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Machine, Farm, UserRole, MaintenanceLog, PreventivePlanStatus, Checklist30d, isImplement } from '../types';
import Modal from '../components/Modal';
import { 
  Layers, Search, Plus, Trash2, Edit, X, Info, Wrench, 
  CheckSquare, Calendar, Sliders, ChevronRight, Settings, ShieldAlert
} from 'lucide-react';

interface ImplementosProps {
  selectedFarmId: string;
  userRole: UserRole;
}

const IMPLEMENT_CATEGORIES = [
  'Plantadeira / Semeadora',
  'Grade Aradora / Niveladora',
  'Pulverizador de Arrasto / Barras',
  'Adubadora / Distribuidor de Calcário',
  'Subsolador / Escarificador',
  'Carreta Agrícola / Transbordo',
  'Cultivador / Roçadeira',
  'Enfardadeira / Ceifadeira',
  'Plataforma de Corte / Cabeçote',
  'Outro Implemento'
];

export default function Implementos({ selectedFarmId, userRole }: ImplementosProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Drawer / Ficha do Implemento
  const [selectedImplement, setSelectedImplement] = useState<Machine | null>(null);
  const [drawerTab, setDrawerTab] = useState<'summary' | 'maintenance' | 'checklists'>('summary');
  const [maintLogs, setMaintLogs] = useState<MaintenanceLog[]>([]);
  const [checklists, setChecklists] = useState<Checklist30d[]>([]);

  // Modais de CRUD
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingImplement, setDeletingImplement] = useState<Machine | null>(null);

  // Form States
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(IMPLEMENT_CATEGORIES[0]);
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formSerial, setFormSerial] = useState('');
  const [formInitialHourKm, setFormInitialHourKm] = useState(0);
  const [formCurrentHourKm, setFormCurrentHourKm] = useState(0);
  const [formStatus, setFormStatus] = useState<'Ativa' | 'Em manutenção' | 'Parada' | 'Vendida/Baixada'>('Ativa');
  const [formFarmId, setFormFarmId] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [editId, setEditId] = useState('');

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, fList, mLogs, cLogs] = await Promise.all([
        fleetService.getMachines(),
        fleetService.getFarms(),
        fleetService.getMaintenanceLogs(),
        fleetService.getChecklists()
      ]);
      setMachines(mList);
      setFarms(fList);
      setMaintLogs(mLogs);
      setChecklists(cLogs);
      if (fList.length > 0 && !formFarmId) {
        setFormFarmId(selectedFarmId === 'ALL' ? fList[0].id : selectedFarmId);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de implementos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar implementos da lista geral de máquinas
  const implementsList = machines.filter(m => isImplement(m));

  // Cálculo automático do próximo código de implemento: IMP-01, IMP-02, ...
  const getNextImplementCode = (existing: Machine[]): string => {
    let maxNum = 0;
    if (existing && existing.length > 0) {
      for (const m of existing) {
        if (!m.code) continue;
        if (m.code.toUpperCase().startsWith('IMP-')) {
          const numPart = m.code.replace(/IMP-/i, '').trim();
          const matches = numPart.match(/\d+/g);
          if (matches) {
            for (const numStr of matches) {
              const val = parseInt(numStr, 10);
              if (!isNaN(val) && val > maxNum) {
                maxNum = val;
              }
            }
          }
        }
      }
    }
    const nextNum = maxNum + 1;
    const paddedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `IMP-${paddedNum}`;
  };

  const handleOpenCreate = () => {
    const nextCode = getNextImplementCode(implementsList);
    setFormCode(nextCode);
    setFormName('');
    setFormCategory(IMPLEMENT_CATEGORIES[0]);
    setFormBrand('');
    setFormModel('');
    setFormYear(new Date().getFullYear());
    setFormSerial('');
    setFormInitialHourKm(0);
    setFormCurrentHourKm(0);
    setFormStatus('Ativa');
    setFormFarmId(selectedFarmId === 'ALL' ? (farms[0]?.id || '') : selectedFarmId);
    setFormDriver('');
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const codeToUse = (formCode.trim() || getNextImplementCode(implementsList)).toUpperCase();
      const initVal = Number(formInitialHourKm) || 0;
      const currVal = Number(formCurrentHourKm) || initVal;
      await fleetService.addMachine({
        code: codeToUse,
        name: formName,
        type: 'implemento',
        brand: formBrand,
        model: formModel || formCategory,
        year: formYear,
        serial_number: formSerial,
        initial_hour_km: initVal,
        current_hour_km: currVal,
        status: formStatus,
        farm_id: formFarmId,
        driver_name: formDriver
      });
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Erro ao cadastrar implemento: ' + (err.message || err));
    }
  };

  const handleOpenEdit = (m: Machine) => {
    setEditId(m.id);
    setFormCode(m.code || '');
    setFormName(m.name || '');
    setFormCategory(m.model || IMPLEMENT_CATEGORIES[0]);
    setFormBrand(m.brand || '');
    setFormModel(m.model || '');
    setFormYear(m.year || new Date().getFullYear());
    setFormSerial(m.serial_number || '');
    setFormInitialHourKm(m.initial_hour_km || 0);
    setFormCurrentHourKm(m.current_hour_km || 0);
    setFormStatus(m.status || 'Ativa');
    setFormFarmId(m.farm_id || '');
    setFormDriver(m.driver_name || '');
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      await fleetService.updateMachine(editId, {
        code: formCode.toUpperCase(),
        name: formName,
        type: 'implemento',
        brand: formBrand,
        model: formModel || formCategory,
        year: formYear,
        serial_number: formSerial,
        initial_hour_km: Number(formInitialHourKm),
        current_hour_km: Number(formCurrentHourKm),
        status: formStatus,
        farm_id: formFarmId,
        driver_name: formDriver
      });
      setIsEditOpen(false);
      await loadData();
      if (selectedImplement && selectedImplement.id === editId) {
        const updated = (await fleetService.getMachines()).find(m => m.id === editId);
        if (updated) setSelectedImplement(updated);
      }
    } catch (err: any) {
      alert('Erro ao atualizar implemento: ' + (err.message || err));
    }
  };

  const handleOpenDelete = (m: Machine) => {
    setDeletingImplement(m);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingImplement) return;
    try {
      await fleetService.deleteMachine(deletingImplement.id);
      setIsDeleteOpen(false);
      setDeletingImplement(null);
      if (selectedImplement?.id === deletingImplement.id) {
        setSelectedImplement(null);
      }
      await loadData();
    } catch (err: any) {
      alert('Erro ao excluir implemento: ' + (err.message || err));
    }
  };

  // Filtrar lista com base na fazenda selecionada no topo + busca local
  const filteredImplements = implementsList.filter(item => {
    // Filtro por Fazenda Global
    if (selectedFarmId !== 'ALL' && item.farm_id !== selectedFarmId) {
      return false;
    }
    // Filtro por Status
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    // Filtro por Categoria
    if (categoryFilter !== 'ALL' && !item.model?.toLowerCase().includes(categoryFilter.toLowerCase())) {
      return false;
    }
    // Filtro de Busca
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchCode = (item.code || '').toLowerCase().includes(term);
      const matchName = (item.name || '').toLowerCase().includes(term);
      const matchBrand = (item.brand || '').toLowerCase().includes(term);
      const matchModel = (item.model || '').toLowerCase().includes(term);
      const matchSerial = (item.serial_number || '').toLowerCase().includes(term);
      return matchCode || matchName || matchBrand || matchModel || matchSerial;
    }
    return true;
  });

  // Mapeamento auxiliar de nomes de fazendas
  const getFarmName = (farmId: string) => {
    const f = farms.find(farm => farm.id === farmId);
    return f ? f.name : 'Fazenda não informada';
  };

  // Métricas
  const totalCount = filteredImplements.length;
  const activeCount = filteredImplements.filter(i => i.status === 'Ativa').length;
  const maintCount = filteredImplements.filter(i => i.status === 'Em manutenção').length;
  const stoppedCount = filteredImplements.filter(i => i.status === 'Parada' || i.status === 'Vendida/Baixada').length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Título */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="text-[#1B3022]" size={24} />
            <span>Implementos e Equipamentos Agrícolas</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Cadastro e controle operacional de plantadeiras, grades, pulverizadores e carretas
          </p>
        </div>

        {/* Botão de Cadastrar Implemento */}
        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B3022] hover:bg-[#284532] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Cadastrar Implemento</span>
          </button>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Registrado</p>
            <p className="text-xl font-black text-slate-800">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Em Operação / Ativos</p>
            <p className="text-xl font-black text-emerald-700">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 font-bold shrink-0">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Em Manutenção</p>
            <p className="text-xl font-black text-amber-700">{maintCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-700 font-bold shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Parados / Inativos</p>
            <p className="text-xl font-black text-red-700">{stoppedCount}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por código, nome, marca ou série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtro por Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-[#1B3022]"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Ativa">Ativo</option>
            <option value="Em manutenção">Em Manutenção</option>
            <option value="Parada">Parado</option>
            <option value="Vendida/Baixada">Vendida/Baixada</option>
          </select>
        </div>
      </div>

      {/* Lista / Tabela de Implementos */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
          Carregando lista de implementos...
        </div>
      ) : filteredImplements.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-3">
          <Layers className="mx-auto text-slate-300" size={36} />
          <p className="text-sm font-semibold text-slate-700">Nenhum implemento encontrado</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Tente ajustar seus filtros de busca para visualizar outros resultados.'
              : 'Clique em "Cadastrar Implemento" para adicionar o primeiro equipamento.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Implemento / Equipamento</th>
                  <th className="py-3.5 px-4">Marca / Modelo</th>
                  <th className="py-3.5 px-4">Nº de Série / Chassi / Placa</th>
                  <th className="py-3.5 px-4">Fazenda</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredImplements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{item.model || 'Implemento Agrícola'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.brand} {item.model ? `• ${item.model}` : ''} {item.year ? `(${item.year})` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.serial_number || 'Não informado'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {getFarmName(item.farm_id)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Ativa' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.status === 'Em manutenção' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedImplement(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="Ver Ficha Detalhada"
                      >
                        <Info size={15} />
                      </button>

                      {userRole !== 'viewer' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Implemento */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Cadastrar Novo Implemento"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <span>Código do Implemento</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">Automático</span>
              </label>
              <input
                type="text"
                required
                readOnly
                disabled
                value={formCode}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold font-mono cursor-not-allowed uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome do Implemento *</label>
              <input
                type="text"
                required
                placeholder="Ex: Plantadeira Stara Absoluta 44L"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Categoria / Tipo de Implemento</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              >
                {IMPLEMENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Marca / Fabricante *</label>
              <input
                type="text"
                required
                placeholder="Ex: Stara, Baldan, Jacto, Tatu"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Modelo</label>
              <input
                type="text"
                placeholder="Ex: Absoluta 44"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ano</label>
              <input
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nº de Série / Chassi / Placa</label>
              <input
                type="text"
                placeholder="Opcional"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda Pertencente *</label>
              <select
                required
                value={formFarmId}
                onChange={(e) => setFormFarmId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status Inicial</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              >
                <option value="Ativa">Ativo</option>
                <option value="Em manutenção">Em Manutenção</option>
                <option value="Parada">Parado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Operador / Responsável Principal</label>
            <input
              type="text"
              placeholder="Ex: João da Silva (Opcional)"
              value={formDriver}
              onChange={(e) => setFormDriver(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:bg-[#284532] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Salvar Implemento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Implemento */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar Implemento"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Código do Implemento</label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold font-mono focus:outline-hidden focus:border-[#1B3022] uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome do Implemento *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Marca / Fabricante *</label>
              <input
                type="text"
                required
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Modelo</label>
              <input
                type="text"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ano</label>
              <input
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nº de Série / Chassi / Placa</label>
              <input
                type="text"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              >
                <option value="Ativa">Ativo</option>
                <option value="Em manutenção">Em Manutenção</option>
                <option value="Parada">Parado</option>
                <option value="Vendida/Baixada">Vendida / Baixada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km Inicial</label>
              <input
                type="number"
                value={formInitialHourKm}
                onChange={(e) => setFormInitialHourKm(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Horímetro / Km Atual</label>
              <input
                type="number"
                value={formCurrentHourKm}
                onChange={(e) => setFormCurrentHourKm(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fazenda Pertencente *</label>
              <select
                required
                value={formFarmId}
                onChange={(e) => setFormFarmId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Operador / Responsável</label>
              <input
                type="text"
                value={formDriver}
                onChange={(e) => setFormDriver(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:bg-[#284532] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Atualizar Implemento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Exclusão */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Excluir Implemento"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Tem certeza que deseja excluir o implemento <strong className="text-slate-800">{deletingImplement?.code} - {deletingImplement?.name}</strong>?
            Esta ação removerá o registro do sistema.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>

      {/* Drawer / Modal: Ficha do Implemento */}
      {selectedImplement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header do Drawer */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1B3022] text-white flex items-center justify-center font-bold">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-md">
                      {selectedImplement.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedImplement.status === 'Ativa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedImplement.status}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-800 mt-1">{selectedImplement.name}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedImplement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Informações Gerais</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Marca / Fabricante</p>
                    <p className="font-bold text-slate-700">{selectedImplement.brand}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Modelo</p>
                    <p className="font-bold text-slate-700">{selectedImplement.model || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ano</p>
                    <p className="font-bold text-slate-700">{selectedImplement.year}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Nº de Série / Chassi / Placa</p>
                    <p className="font-bold text-slate-700 font-mono">{selectedImplement.serial_number || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Fazenda</p>
                    <p className="font-bold text-slate-700">{getFarmName(selectedImplement.farm_id)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Operador / Responsável</p>
                    <p className="font-bold text-slate-700">{selectedImplement.driver_name || 'Não atribuído'}</p>
                  </div>
                </div>
              </div>

              {/* Histórico de Manutenções Vinculadas ao Implemento */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Wrench size={14} />
                  <span>Histórico de Manutenções</span>
                </h3>

                {maintLogs.filter(l => l.machine_id === selectedImplement.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                    Nenhuma manutenção registrada para este implemento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {maintLogs.filter(l => l.machine_id === selectedImplement.id).map(log => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{log.service_description || log.main_item}</p>
                          <p className="text-[10px] text-slate-500">{log.date} • {log.type}</p>
                        </div>
                        <span className="font-bold text-slate-700">R$ {Number(log.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer do Drawer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedImplement(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
