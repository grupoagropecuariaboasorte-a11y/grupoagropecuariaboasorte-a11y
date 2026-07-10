import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Farm, LookupItem } from '../types';
import Modal from '../components/Modal';
import { isDemoMode, isSchemaMissing } from '../lib/supabaseClient';
import SupabaseSetupAssistant from '../components/SupabaseSetupAssistant';
import { 
  Settings, Database, Play, Trash2, Plus, RefreshCw, 
  Map, Server, ShieldCheck, AlertCircle, Info 
} from 'lucide-react';

interface SettingsProps {
  userRole: 'viewer' | 'editor' | 'admin';
}

export default function SettingsPage({ userRole }: SettingsProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Farm
  const [isFarmOpen, setIsFarmOpen] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fList, lList] = await Promise.all([
          fleetService.getFarms(),
          fleetService.getLookups()
        ]);
        setFarms(fList);
        setLookups(lList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshList = async () => {
    const [fList, lList] = await Promise.all([
      fleetService.getFarms(),
      fleetService.getLookups()
    ]);
    setFarms(fList);
    setLookups(lList);
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addFarm({
        name: farmName,
        location: farmLocation
      });
      setIsFarmOpen(false);
      setFarmName('');
      setFarmLocation('');
      refreshList();
    } catch (err: any) {
      alert('Erro ao cadastrar fazenda: ' + err.message);
    }
  };

  const handleDeleteFarm = async (id: string) => {
    if (!window.confirm('Excluir esta fazenda? Todas as máquinas vinculadas perderão o vínculo.')) return;
    try {
      await fleetService.deleteFarm(id);
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleResetDemoData = () => {
    if (!window.confirm('Tem certeza de que quer reiniciar todos os dados locais? Qualquer alteração feita será apagada e os dados originais da planilha Excel de testes serão recarregados.')) return;
    const keys = [
      'farms', 'equipment_types', 'fuel_types', 'maintenance_types', 'priorities',
      'service_locations', 'machines', 'fuel_stock', 'fuel_logs', 'preventive_plan',
      'maintenance_logs', 'checklists', 'work_orders', 'profile'
    ];
    keys.forEach(k => localStorage.removeItem(`agro_fleet_${k}`));
    alert('Dados locais reiniciados! Atualizando página...');
    window.location.reload();
  };

  const handleClearDemoData = () => {
    if (!window.confirm('AVISO: Quer apagar todo o banco offline para começar com um sistema completamente limpo?')) return;
    const keys = [
      'farms', 'equipment_types', 'fuel_types', 'maintenance_types', 'priorities',
      'service_locations', 'machines', 'fuel_stock', 'fuel_logs', 'preventive_plan',
      'maintenance_logs', 'checklists', 'work_orders', 'profile'
    ];
    keys.forEach(k => {
      localStorage.removeItem(`agro_fleet_${k}`);
      if (k !== 'profile') {
        localStorage.setItem(`agro_fleet_${k}`, JSON.stringify([]));
      }
    });
    alert('Banco de dados local limpo com sucesso! Reiniciando...');
    window.location.reload();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* HEADER */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
          <Settings size={18} className="text-[#1B3022] animate-spin" style={{ animationDuration: '6s' }} />
          Configurações Gerais do Sistema
        </h3>
        <p className="text-xs text-slate-500 mt-1">Gerenciamento de tabelas auxiliares, conexão com o banco e dados locais.</p>
      </div>

      {isSchemaMissing && <SupabaseSetupAssistant />}

      {/* CONEXÃO E METADADOS */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Status Conexão */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
            <Server size={14} /> Status da Conexão do Sistema
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-normal flex items-start gap-3 shadow-2xs">
                <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-bold text-emerald-900">Produção Supabase Ativo e Online</span>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Este aplicativo está operando em modo estritamente online. O Modo de Demonstração Offline foi completamente removido do sistema. Todos os seus dados, cadastros de frotas, checklists e ordens de serviço estão protegidos na nuvem do Supabase PostgreSQL em tempo real.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-center h-full">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Status do Servidor</span>
              <span className="text-xs font-mono font-bold text-[#1B3022]">Provedor: Supabase Cloud</span>
              <span className="text-[10px] text-slate-400 font-mono mt-2">Versão: v1.2.0 (Online Only)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ADMINISTRAÇÃO DE FAZENDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Fazendas Cadastradas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Map size={14} className="text-[#1B3022]" /> Fazendas Cadastradas ({farms.length})
            </h4>
            {userRole === 'admin' && (
              <button
                onClick={() => setIsFarmOpen(true)}
                className="flex items-center gap-1 text-xs text-[#1B3022] hover:opacity-80 font-bold cursor-pointer transition-all"
              >
                <Plus size={14} /> Cadastrar Fazenda
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {farms.map(f => (
              <div key={f.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:bg-slate-100/50 transition-colors shadow-2xs">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">{f.name}</h5>
                  <p className="text-[10px] text-slate-400 mt-1">Localização: {f.location || 'Não descrita'}</p>
                </div>
                {userRole === 'admin' && farms.length > 1 && (
                  <button
                    onClick={() => handleDeleteFarm(f.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Excluir Fazenda"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tipos Auxiliares de Cadastros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-200 pb-4">
            Parâmetros Gerais do Sistema (Lookups)
          </h4>

          <div className="space-y-4 text-xs">
            {/* Tipos Equipamento */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipos de Máquinas Reguladas</p>
              <div className="flex flex-wrap gap-1.5">
                {lookups?.equipmentTypes.map((et: LookupItem) => (
                  <span key={et.id} className="inline-block px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-mono font-bold shadow-2xs">
                    {et.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Categorias Manutencao */}
            <div className="space-y-1.5 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itens Planos Preventivos</p>
              <div className="flex flex-wrap gap-1.5">
                {lookups?.maintenanceCategories.map((mc: string) => (
                  <span key={mc} className="inline-block px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-mono font-bold shadow-2xs">
                    {mc}
                  </span>
                ))}
              </div>
            </div>

            {/* Combustível */}
            <div className="space-y-1.5 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Combustíveis Suportados</p>
              <div className="flex flex-wrap gap-1.5">
                {lookups?.fuelTypes.map((ft: LookupItem) => (
                  <span key={ft.id} className="inline-block px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-mono font-bold shadow-2xs">
                    {ft.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CADASTRAR FAZENDA */}
      <Modal isOpen={isFarmOpen} onClose={() => setIsFarmOpen(false)} title="Cadastrar Nova Fazenda">
        <form onSubmit={handleCreateFarm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome da Fazenda</label>
            <input
              type="text"
              required
              placeholder="Ex: Fazenda Boa Sorte II"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Localização / Coordenadas</label>
            <input
              type="text"
              required
              placeholder="Ex: Campo Novo do Parecis - MT"
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsFarmOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Gravar Fazenda
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
