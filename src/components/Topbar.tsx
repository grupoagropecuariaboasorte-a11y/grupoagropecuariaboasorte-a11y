import { Calendar, Filter, User } from 'lucide-react';
import { Farm } from '../types';

interface TopbarProps {
  title: string;
  farms: Farm[];
  selectedFarmId: string;
  onChangeFarm: (id: string) => void;
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
  userEmail: string;
}

export default function Topbar({ 
  title, 
  farms, 
  selectedFarmId, 
  onChangeFarm, 
  selectedPeriod, 
  onChangePeriod,
  userEmail
}: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-8 flex items-center justify-between no-print shadow-xs">
      {/* Page Title */}
      <div>
        <h2 className="text-base font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      {/* Global Controls & Filters */}
      <div className="flex items-center gap-4">
        {/* Farm Filter */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
          <Filter size={14} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-500 hidden sm:inline font-medium">Fazenda:</span>
          <select
            value={selectedFarmId}
            onChange={(e) => onChangeFarm(e.target.value)}
            className="bg-transparent text-xs text-slate-700 focus:outline-hidden font-semibold cursor-pointer pr-1 border-none"
          >
            <option value="ALL">Todas as Fazendas</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
          <Calendar size={14} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-500 hidden sm:inline font-medium">Período:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => onChangePeriod(e.target.value)}
            className="bg-transparent text-xs text-slate-700 focus:outline-hidden font-semibold cursor-pointer pr-1 border-none"
          >
            <option value="ALL">Qualquer Período</option>
            <option value="30_DAYS">Últimos 30 Dias</option>
            <option value="THIS_MONTH">Este Mês</option>
            <option value="THIS_YEAR">Este Ano</option>
          </select>
        </div>

        {/* User indicator */}
        <div className="flex items-center gap-2 bg-[#1B3022]/10 border border-[#1B3022]/20 rounded-xl px-3 py-1.5 shadow-xs">
          <User size={14} className="text-[#1B3022]" />
          <span className="text-xs text-[#1B3022] font-semibold truncate max-w-[120px] hidden md:inline">
            {userEmail.split('@')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
