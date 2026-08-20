import { Calendar, Filter, User, RefreshCw, Menu } from 'lucide-react';
import { Farm } from '../types';
import { useState } from 'react';

interface TopbarProps {
  title: string;
  farms: Farm[];
  selectedFarmId: string;
  onChangeFarm: (id: string) => void;
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
  userEmail: string;
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
}

export default function Topbar({ 
  title, 
  farms, 
  selectedFarmId, 
  onChangeFarm, 
  selectedPeriod, 
  onChangePeriod,
  userEmail,
  onToggleMenu,
  isMenuOpen
}: TopbarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
    } catch (e) {
      console.warn('Erro ao atualizar cache:', e);
    }
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 md:px-8 flex items-center justify-between no-print shadow-xs gap-2">
      {/* Botão de Menu para Tablet/Mobile & Título da Página */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Botão Abrir Abas no Tablet / Smartphone */}
        <button
          type="button"
          onClick={onToggleMenu}
          className="xl:hidden flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3022] hover:bg-[#122218] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir menu de abas e módulos"
          aria-label="Abrir menu"
        >
          <Menu size={16} />
          <span className="text-[11px]">Menu</span>
        </button>

        <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">{title}</h2>
      </div>

      {/* Global Controls & Filters */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Farm Filter */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-xs">
          <Filter size={13} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-500 hidden md:inline font-medium">Fazenda:</span>
          <select
            value={selectedFarmId}
            onChange={(e) => onChangeFarm(e.target.value)}
            className="bg-transparent text-[11px] sm:text-xs text-slate-700 focus:outline-hidden font-semibold cursor-pointer pr-1 border-none max-w-[110px] sm:max-w-[160px] truncate"
          >
            <option value="ALL">Todas Fazendas</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-xs">
          <Calendar size={13} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-500 hidden md:inline font-medium">Período:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => onChangePeriod(e.target.value)}
            className="bg-transparent text-[11px] sm:text-xs text-slate-700 focus:outline-hidden font-semibold cursor-pointer pr-1 border-none"
          >
            <option value="ALL">Qualquer Período</option>
            <option value="30_DAYS">Últimos 30 Dias</option>
            <option value="THIS_MONTH">Este Mês</option>
            <option value="THIS_YEAR">Este Ano</option>
          </select>
        </div>

        {/* Botão Sincronizar/Atualizar Versão */}
        <button
          onClick={handleHardRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Sincronizar e carregar a versão mais recente do aplicativo no seu tablet/dispositivo"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-emerald-700' : 'text-slate-500'} />
          <span className="hidden lg:inline text-[11px]">Atualizar App</span>
        </button>

        {/* User indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-[#1B3022]/10 border border-[#1B3022]/20 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-xs">
          <User size={13} className="text-[#1B3022]" />
          <span className="text-xs text-[#1B3022] font-semibold truncate max-w-[100px] sm:max-w-[120px] hidden md:inline">
            {userEmail.split('@')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
