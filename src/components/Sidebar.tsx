import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Tractor, Fuel, Database, Wrench, 
  CalendarDays, CheckSquare, TrendingUp, ClipboardList, 
  FileText, Settings, LogOut, Info
} from 'lucide-react';
import { isDemoMode } from '../lib/supabaseClient';
import logoBoaSorte from '../assets/images/logo_boa_sorte_1783538486473.jpg';

interface SidebarProps {
  userRole: 'viewer' | 'editor' | 'admin';
  userEmail: string;
  onLogout: () => void;
}

export default function Sidebar({ userRole, userEmail, onLogout }: SidebarProps) {
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: 'Painel Geral', icon: LayoutDashboard },
    { path: '/maquinas', label: 'Máquinas / Frota', icon: Tractor },
    { path: '/combustivel', label: 'Abastecimentos', icon: Fuel },
    { path: '/estoque-diesel', label: 'Estoque de Diesel', icon: Database },
    { path: '/manutencao', label: 'Manutenções', icon: Wrench },
    { path: '/plano-preventivo', label: 'Plano Preventivo', icon: CalendarDays },
    { path: '/checklist', label: 'Checklist 30 Dias', icon: CheckSquare },
    { path: '/ordens-servico', label: 'Ordens de Serviço', icon: ClipboardList },
    { path: '/ranking-custos', label: 'Ranking de Custos', icon: TrendingUp },
    { path: '/relatorio-mensal', label: 'Relatório Mensal', icon: FileText },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#1B3022] text-white flex flex-col justify-between h-screen sticky top-0 no-print shadow-md">
      {/* Brand Logo & Name */}
      <div className="p-5 border-b border-white/10 bg-[#122218]">
        <div className="flex items-center gap-3">
          <img 
            src={logoBoaSorte} 
            alt="Boa Sorte Logo" 
            className="w-10 h-10 rounded-full border border-amber-400/30 object-cover shadow-md shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="truncate">
            <h1 className="font-bold text-sm tracking-tight text-white leading-tight uppercase truncate">BOA SORTE</h1>
            <p className="text-[9px] text-amber-400 font-bold tracking-wider uppercase font-mono">AGROPECUÁRIA</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm font-bold border-l-4 border-amber-400 pl-2.5'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Demo banner indicator inside sidebar */}
      {isDemoMode && (
        <div className="mx-3 my-2 p-3 bg-white/5 border border-amber-400/20 rounded-xl flex items-start gap-2">
          <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-white/80 leading-normal font-medium">
            Modo Demo Ativo (Persistência Local). Conecte ao Supabase em Configurações.
          </div>
        </div>
      )}

      {/* User Area */}
      <div className="p-4 border-t border-white/10 bg-[#122218]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="truncate max-w-[150px]">
            <p className="text-xs font-semibold text-slate-100 truncate">{userEmail || 'operador@agro.com'}</p>
            <p className="text-[9px] font-mono font-bold tracking-wider text-amber-400 uppercase">
              Role: {userRole}
            </p>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-mono font-semibold bg-white/10 text-white/70 border border-white/5">
            PROD
          </span>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-white/10 text-xs font-medium text-white/80 hover:text-red-200 hover:bg-red-500/20 hover:border-red-500/30 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
