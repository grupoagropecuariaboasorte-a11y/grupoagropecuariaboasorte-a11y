import React, { useEffect, useState } from 'react';
import { fleetService } from '../lib/fleetService';
import { Checklist30d, Farm, Machine, UserRole } from '../types';
import Modal from '../components/Modal';
import { 
  CheckSquare, Plus, Search, ShieldCheck, 
  AlertTriangle, Eye, Info, Filter, Edit, Trash2, 
  ShieldX, Check, Minus, Clock, CheckCircle2, Wrench
} from 'lucide-react';

interface ChecklistProps {
  selectedFarmId: string;
  selectedPeriod: string;
  userRole: UserRole;
}

// =========================================================================
// CONSTANTES DO CHECKLIST OFICIAL DO PDF
// =========================================================================

export const COMPONENT_ITEMS = [
  'BATERIA',
  'RADIADOR',
  'FREIOS (PEDAL)',
  'FREIOS (ESTACIONARIOS)',
  'MOTOR',
  'TURBINA',
  'COLETOR/ESCAPAMENTO',
  'DIREÇÃO',
  'RETROVISORES',
  'RODAS DIANTEIRAS',
  'RODAS TRASEIRAS',
  'PORCAS E PARAFUSOS DAS RODAS',
  'ASSENTO DO OPERADOR',
  'ESTADO GERAL DA CABINE',
  'PAINEL',
  'EMBREAGEM',
  'FARÓIS DIANTEIROS',
  'LANTERNAS TRASEIRAS',
  'SINAIS LUMINOSOS',
  'BUZINA / SINAL SONORO',
  'GIROFLEX / SINALIZADOR',
  'CINTO DE SEGURANÇA',
  'EXTINTOR DE INCÊNDIO',
  'ALARME DE RÉ',
  'PROTEÇÕES DE PARTES MÓVEIS',
  'LATARIA E ESTRUTURA',
  'TRAÇÃO DIANT',
  'CUBOS',
  'CAIXA DE TRASMISSÃO',
  'ALAVANCA DE MARCHAS',
  'HIDRAULICO TRAZEIRO',
  'MANGUEIRA HIDRAULICA',
  'VAZAMENTO EM CILINDROS',
  'CORREIAS',
  'ENGATE RAPIDO SEM VAZAMENTO',
  'LIMPEZA INTERNA E EXTERNA',
  'SISTEMA DE ALIMENTAÇÃO',
  'MOTOR DE PARTIDA',
  'PARTIDA DO MOTOR',
  'MARCHA LENTA DO MOTOR',
  'FUMAÇA PRETA / ESCAPAMENTO',
  'T.D.P.',
  'AR CONDICIONADO'
];

export const FLUID_LEVEL_ITEMS = [
  'NIVEL OLEO DO MOTOR',
  'LIQUIDO ARREFECIMENTO',
  'NIVEL OLEO HIDRAULICO',
  'CARGA DA BATERIA',
  'NIVEL OLEO TRASMISSAO',
  'NIVEL OLEO TRAÇÃO',
  'NIVEL OLEO DOS CUBO',
  'NIVEL OLEO DIREÇÃO'
];

export const REVISION_ITEMS = [
  'OLEO DE MOTOR',
  'OLEO DA TRASMISSAO',
  'FILTRO OLEO DO MOTOR',
  'FILTRO DA TRASMISSAO',
  'FILTRO DE COMBUSTIVEL',
  'LIQUIDO ARREFECIMENTO',
  'FILTRO AR DO MOTOR (INTERNO)',
  'FILTRO DE AR MOTOR (EXTERNO)',
  'OLEO DO DIFERENCIAL',
  'FILTROS DE CABINE (INTERNO)',
  'OLEO DOS CUBOS',
  'FILTRO DE CABINE (EXTERNO)',
  'OLEO DE DIREÇÃO',
  'FILTRO DO AR CONDICIONADO',
  'CARGA DA BATERIA',
  'LAVAGEM COMPLETA MAQUINA'
];

export const COMPLEMENTARY_ITEMS = [
  'MAQUINA ESTA ENGRAXADA?',
  'IMPLEMENTO ESTÁ ENGRAXADO?',
  'MAQUINA/EMPLEMENTO POSSUI ALGUM RUIDO ESTRANHO?',
  'VIBRAÇÃO ANORMAL OU EXCESSIVA?',
  'ALGUM VAZAMENTO NA MAQUINA/IMPLEMENTO?',
  'EXISTE MANGUEIRA ESTOURADA OU DANIFICADA?',
  'EXISTE CONEXÃO OU ENGATE VAZANDO?',
  'PNEUS APRESENTA AVARIAS?',
  'MAQUINA EM COND.USO?',
  'PEITO DE AÇO PARA PROTEÇÃO ESTA NA MAQUINA?',
  'CAPO ESTÁ FECHANDO?',
  'AR CONDICIONADO ESTÁ GELANDO?',
  'A CALIBRAGEM DOS PNEUS ESTAO CORRETAS?',
  'APRESENTA PECAS DANIFICADAS?',
  'INTERFERENCIA DE MANGUEIRAS-CHICOTE-TUBO E CABOS?',
  'AVARIA NA PINTURA OU ALGUMA PARTE DA MAQUINA?',
  'DOCUMENTAÇÃO DA MÁQUINA OK?',
  'MANUAL DO OPERADOR PRESENTE?',
  'CHAVES DA MÁQUINA OK?',
  'KIT DE FERRAMENTAS E CHAVE DE RODA PRESENTE?'
];

const ALL_PDF_ITEMS = [
  ...COMPONENT_ITEMS,
  ...FLUID_LEVEL_ITEMS,
  ...REVISION_ITEMS,
  ...COMPLEMENTARY_ITEMS
];

export const getInitialPdfState = (): Record<string, 'SIM' | 'NÃO' | 'N/A'> => {
  const state: Record<string, 'SIM' | 'NÃO' | 'N/A'> = {};
  ALL_PDF_ITEMS.forEach(item => {
    state[item] = 'SIM';
  });
  return state;
};

export const parseChecklistData = (notesStr?: string) => {
  if (!notesStr) return null;
  try {
    const parsed = JSON.parse(notesStr);
    if (parsed && typeof parsed === 'object' && (parsed.pdfItems || parsed.notes !== undefined)) {
      return parsed;
    }
  } catch (e) {
    // String comum
  }
  return null;
};

export const getValidityStatus = (dateStr?: string): { status: 'OK' | 'Vencido'; days: number } => {
  if (!dateStr) return { status: 'Vencido', days: 999 };
  const checkDate = new Date(dateStr);
  const today = new Date();
  const checkZero = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = todayZero.getTime() - checkZero.getTime();
  const days = Math.floor(diffTime / (1000 * 3600 * 24));
  return {
    status: days > 7 ? 'Vencido' : 'OK',
    days: days < 0 ? 0 : days
  };
};

export default function ChecklistPage({ selectedFarmId, selectedPeriod, userRole }: ChecklistProps) {
  const [checklists, setChecklists] = useState<Checklist30d[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [, setLoading] = useState(true);

  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [validityFilter, setValidityFilter] = useState<'ALL' | 'OK' | 'VENCIDO'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form States (Nova Vistoria / Editar)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Campos básicos
  const [formMachineId, setFormMachineId] = useState('');
  const [formOperator, setFormOperator] = useState('');
  const [formHourKm, setFormHourKm] = useState<number | ''>('');
  const [formWorkType, setFormWorkType] = useState('Plantio');
  const [formOverallStatus, setFormOverallStatus] = useState<'OK' | 'Prioridade Baixa' | 'Prioridade Média' | 'Prioridade Alta (Máquina Parada)'>('OK');
  const [formFailedNotes, setFormFailedNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Checklist do PDF
  const [pdfItems, setPdfItems] = useState<Record<string, 'SIM' | 'NÃO' | 'N/A'>>(getInitialPdfState());
  const [horimetroRevisao, setHorimetroRevisao] = useState('');
  const [horimetroProximo, setHorimetroProximo] = useState('');
  const [obsProximaRevisao, setObsProximaRevisao] = useState('');
  const [informacoesComplementares, setInformacoesComplementares] = useState('');

  // Aba ativa do modal de checklist
  const [activeChecklistTab, setActiveChecklistTab] = useState<'componentes' | 'niveis' | 'revisoes' | 'complementares'>('componentes');

  // Target de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Modal para Visualizar detalhes
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist30d | null>(null);
  const [viewTab, setViewTab] = useState<'componentes' | 'niveis' | 'revisoes' | 'complementares'>('componentes');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cList, fList, mList] = await Promise.all([
          fleetService.getChecklists(),
          fleetService.getFarms(),
          fleetService.getMachines()
        ]);
        setChecklists(cList);
        setFarms(fList);
        setMachines(mList);

        const farmMachs = mList.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
        if (farmMachs.length > 0) {
          setFormMachineId(farmMachs[0].id);
          setFormHourKm(farmMachs[0].current_hour_km || farmMachs[0].initial_hour_km);
        } else if (mList.length > 0) {
          setFormMachineId(mList[0].id);
          setFormHourKm(mList[0].current_hour_km || mList[0].initial_hour_km);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedFarmId]);

  const refreshList = async () => {
    try {
      const [list, mList] = await Promise.all([
        fleetService.getChecklists(),
        fleetService.getMachines()
      ]);
      setChecklists(list);
      setMachines(mList);
    } catch (e) {
      console.error('Erro ao recarregar checklists:', e);
    }
  };

  // Atualizar horímetro ao selecionar a máquina na criação
  useEffect(() => {
    if (!formMachineId) return;
    const mach = machines.find(m => m.id === formMachineId);
    if (mach) {
      setFormHourKm(mach.current_hour_km || mach.initial_hour_km);
      if (mach.driver_name && !formOperator) {
        setFormOperator(mach.driver_name);
      }
    }
  }, [formMachineId, machines]);

  const handleOpenAdd = () => {
    setFormOperator('');
    setFormFailedNotes('');
    setFormWorkType('Plantio');
    setFormOverallStatus('OK');
    setFormDate(new Date().toISOString().split('T')[0]);

    setPdfItems(getInitialPdfState());
    setHorimetroRevisao('');
    setHorimetroProximo('');
    setObsProximaRevisao('');
    setInformacoesComplementares('');
    setActiveChecklistTab('componentes');

    const farmMachines = machines.filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId);
    let defaultMachId = '';
    if (machineFilter !== 'ALL' && machines.some(m => m.id === machineFilter)) {
      defaultMachId = machineFilter;
    } else if (farmMachines.length > 0) {
      defaultMachId = farmMachines[0].id;
    } else if (machines.length > 0) {
      defaultMachId = machines[0].id;
    }

    setFormMachineId(defaultMachId);
    const mach = machines.find(m => m.id === defaultMachId);
    if (mach) {
      setFormHourKm(mach.current_hour_km || mach.initial_hour_km);
      if (mach.driver_name) {
        setFormOperator(mach.driver_name);
      }
    } else {
      setFormHourKm('');
    }

    setIsAddOpen(true);
  };

  const handleOpenEdit = (log: Checklist30d) => {
    setEditId(log.id);
    setFormMachineId(log.machine_id);
    setFormOperator(log.operator_name || '');
    setFormHourKm(log.hour_km ?? '');
    setFormWorkType(log.work_type || 'Plantio');

    const parsed = parseChecklistData(log.failed_items_notes);
    let normStatus = (parsed?.evalStatus || log.overall_status || 'OK') as string;
    if (normStatus === 'Necessita Atenção') normStatus = 'Prioridade Média';
    if (normStatus === 'Máquina Parada') normStatus = 'Prioridade Alta (Máquina Parada)';
    setFormOverallStatus(normStatus as any);
    if (parsed) {
      setFormFailedNotes(parsed.notes || '');
      setHorimetroRevisao(parsed.horimetroRevisao || '');
      setHorimetroProximo(parsed.horimetroProximo || '');
      setObsProximaRevisao(parsed.obsProximaRevisao || '');
      setInformacoesComplementares(parsed.informacoesComplementares || '');
      setPdfItems({ ...getInitialPdfState(), ...(parsed.pdfItems || {}) });
    } else {
      setFormFailedNotes(log.failed_items_notes || '');
      setHorimetroRevisao('');
      setHorimetroProximo('');
      setObsProximaRevisao('');
      setInformacoesComplementares('');
      setPdfItems(getInitialPdfState());
    }

    setActiveChecklistTab('componentes');
    setIsEditOpen(true);
  };

  const handleSetPdfItem = (itemKey: string, val: 'SIM' | 'NÃO' | 'N/A') => {
    setPdfItems(prev => {
      const next = { ...prev, [itemKey]: val };
      const hasNo = Object.values(next).some(v => v === 'NÃO');
      if (hasNo && formOverallStatus === 'OK') {
        setFormOverallStatus('Prioridade Média');
      }
      return next;
    });
  };

  const handleSetCategoryAll = (itemsList: string[], val: 'SIM' | 'NÃO' | 'N/A') => {
    setPdfItems(prev => {
      const next = { ...prev };
      itemsList.forEach(item => {
        next[item] = val;
      });
      return next;
    });
  };

  const buildNotesPayload = () => {
    return JSON.stringify({
      evalStatus: formOverallStatus,
      notes: formFailedNotes,
      horimetroRevisao,
      horimetroProximo,
      obsProximaRevisao,
      informacoesComplementares,
      pdfItems
    });
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMachineId) {
      alert('Por favor, selecione um equipamento/máquina para a vistoria.');
      return;
    }
    try {
      setSubmitting(true);
      const payloadNotes = buildNotesPayload();
      await fleetService.addChecklist({
        machine_id: formMachineId,
        date: formDate,
        operator_name: formOperator,
        hour_km: Number(formHourKm),
        work_type: formWorkType,
        overall_status: formOverallStatus,
        failed_items_notes: payloadNotes
      });
      setIsAddOpen(false);
      await refreshList();
      if (formOverallStatus !== 'OK') {
        alert('Vistoria salva com sucesso! Uma Ordem de Serviço (O.S.) foi aberta automaticamente na aba Ordens de Serviço.');
      } else {
        alert('Vistoria e checklist do maquinário salvos com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao registrar vistoria:', err);
      alert('Erro ao registrar vistoria: ' + (err?.message || err || 'Erro de conexão com banco de dados'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMachineId) {
      alert('Por favor, selecione um equipamento/máquina.');
      return;
    }
    try {
      setSubmitting(true);
      const payloadNotes = buildNotesPayload();
      await fleetService.updateChecklist(editId, {
        machine_id: formMachineId,
        date: formDate,
        operator_name: formOperator,
        hour_km: Number(formHourKm),
        work_type: formWorkType,
        overall_status: formOverallStatus,
        failed_items_notes: payloadNotes
      });
      setIsEditOpen(false);
      await refreshList();
      if (formOverallStatus !== 'OK') {
        alert('Vistoria atualizada com sucesso! A Ordem de Serviço (O.S.) correspondente foi atualizada/gerada na aba Ordens de Serviço.');
      } else {
        alert('Vistoria atualizada e salva com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar vistoria:', err);
      alert('Erro ao atualizar vistoria: ' + (err?.message || err || 'Erro de conexão com banco de dados'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateOSFromLaudo = async (checklistObj: Checklist30d) => {
    try {
      setSubmitting(true);
      const wo = await fleetService.syncWorkOrderFromChecklist(checklistObj);
      if (wo) {
        alert(`Ordem de Serviço (O.S.) gerada com sucesso para esta vistoria! Verifique na aba Ordens de Serviço.`);
      } else {
        alert(`Uma Ordem de Serviço (O.S.) foi criada/atualizada para esta vistoria na aba Ordens de Serviço.`);
      }
    } catch (err: any) {
      console.error('Erro ao gerar OS:', err);
      alert('Erro ao gerar Ordem de Serviço: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await fleetService.deleteChecklist(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedChecklist?.id === deleteTarget.id) {
        setSelectedChecklist(null);
      }
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir vistoria: ' + err.message);
    }
  };

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

  const filteredLogs = checklists.filter(log => {
    const machine = machines.find(m => m.id === log.machine_id);
    const farmMatch = selectedFarmId === 'ALL' || (machine && machine.farm_id === selectedFarmId);
    const machineMatch = machineFilter === 'ALL' || log.machine_id === machineFilter;
    
    const parsedData = parseChecklistData(log.failed_items_notes);
    let normStatus = (parsedData?.evalStatus || log.overall_status) as string;
    if (normStatus === 'Necessita Atenção') normStatus = 'Prioridade Média';
    if (normStatus === 'Máquina Parada') normStatus = 'Prioridade Alta (Máquina Parada)';
    const statusMatch = statusFilter === 'ALL' || normStatus === statusFilter || log.overall_status === statusFilter;

    const valObj = getValidityStatus(log.date);
    const validityMatch = validityFilter === 'ALL' || valObj.status.toUpperCase() === validityFilter.toUpperCase();

    const periodMatch = isDateInPeriod(log.date);

    const textMatch = 
      (log.operator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.work_type && log.work_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.failed_items_notes && log.failed_items_notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (machine && (machine.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return farmMatch && machineMatch && statusMatch && validityMatch && periodMatch && textMatch;
  });

  const selectedMachineObj = machineFilter !== 'ALL' ? machines.find(m => m.id === machineFilter) : null;
  const selectedMachineChecklists = selectedMachineObj ? checklists.filter(c => c.machine_id === selectedMachineObj.id) : [];

  // Componente de Seleção de Itens por Categoria no Modal
  const renderItemGrid = (itemsList: string[], categoryTitle: string) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">{categoryTitle} ({itemsList.length} itens)</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSetCategoryAll(itemsList, 'SIM')}
              className="text-[10px] font-bold px-2.5 py-1 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Check size={12} /> Marcar Todos SIM
            </button>
            <button
              type="button"
              onClick={() => handleSetCategoryAll(itemsList, 'N/A')}
              className="text-[10px] font-bold px-2.5 py-1 bg-slate-600 text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Minus size={12} /> Marcar Todos N/A
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
          {itemsList.map((item) => {
            const currentVal = pdfItems[item] || 'SIM';
            return (
              <div 
                key={item} 
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                  currentVal === 'NÃO' 
                    ? 'bg-rose-50 border-rose-200' 
                    : currentVal === 'SIM' 
                    ? 'bg-white border-slate-200' 
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <span className="font-semibold text-slate-800 pr-2 leading-tight">{item}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetPdfItem(item, 'SIM')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      currentVal === 'SIM'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    SIM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPdfItem(item, 'NÃO')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      currentVal === 'NÃO'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    NÃO
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPdfItem(item, 'N/A')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      currentVal === 'N/A'
                        ? 'bg-slate-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    N/A
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* HEADER DE SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
            <CheckSquare size={18} className="text-[#1B3022]" />
            Checklist 7 Dias / Diário de Campo Oficial
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Vistoria e avaliação de componentes completa com formulário oficial de 70+ itens do maquinário.
          </p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
          >
            <Plus size={15} />
            <span>Fazer Vistoria (Checklist)</span>
          </button>
        )}
      </div>

      {/* PAINEL DE INSPEÇÃO DA MÁQUINA SELECIONADA */}
      {selectedMachineObj && (
        <div className="bg-[#1B3022] text-white p-5 rounded-2xl shadow-md border border-[#1B3022]/80 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-mono font-bold text-emerald-300 text-sm shrink-0">
                {selectedMachineObj.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{selectedMachineObj.name}</h4>
                  <span className="text-[10px] bg-white/10 text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                    {farms.find(f => f.id === selectedMachineObj.farm_id)?.name || 'Fazenda'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  Horímetro Atual: <strong className="text-emerald-400">{selectedMachineObj.current_hour_km.toLocaleString('pt-BR')} H/km</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Vistorias da Máquina:</span>
              <span className="text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                {selectedMachineChecklists.length} registradas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS DE BUSCA E SELEÇÃO DE MÁQUINA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-xs">
        {/* Filtro por Máquina */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 max-w-xs w-full">
          <Filter size={14} className="text-[#1B3022] shrink-0" />
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-800 font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Todas as Máquinas</option>
            {machines
              .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
              .map((m) => {
                const farmName = farms.find(f => f.id === m.farm_id)?.name;
                return (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name} {farmName ? `(${farmName})` : ''}
                  </option>
                );
              })}
          </select>
        </div>

        {/* Filtro por Validade (7 dias) */}
        <select
          value={validityFilter}
          onChange={(e) => setValidityFilter(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Validades</option>
          <option value="OK">Validade: OK (≤ 7 dias)</option>
          <option value="VENCIDO">Validade: Vencido (&gt; 7 dias)</option>
        </select>

        {/* Filtro por Avaliação / Prioridade */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
        >
          <option value="ALL">Todas as Avaliações</option>
          <option value="OK">OK - Equipamento Liberado</option>
          <option value="Prioridade Baixa">Prioridade Baixa</option>
          <option value="Prioridade Média">Prioridade Média</option>
          <option value="Prioridade Alta (Máquina Parada)">Prioridade Alta (Máquina Parada)</option>
        </select>

        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar por operador, observação, equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022]"
          />
        </div>

        {(machineFilter !== 'ALL' || validityFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm !== '') && (
          <button
            onClick={() => {
              setMachineFilter('ALL');
              setValidityFilter('ALL');
              setStatusFilter('ALL');
              setSearchTerm('');
            }}
            className="text-xs text-red-600 hover:underline font-bold px-2 py-1 cursor-pointer"
          >
            Limpar Filtros
          </button>
        )}

        <div className="text-xs text-slate-500 font-mono ml-auto">
          Encontradas: <strong className="text-slate-800">{filteredLogs.length}</strong>
        </div>
      </div>

      {/* GRADE DE VISTORIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const mach = machines.find(m => m.id === log.machine_id);
            const farm = farms.find(f => f?.id === mach?.farm_id);
            const parsedData = parseChecklistData(log.failed_items_notes);

            const validity = getValidityStatus(log.date);

            let displayStatus = (parsedData?.evalStatus || log.overall_status) as string;
            if (displayStatus === 'Necessita Atenção') displayStatus = 'Prioridade Média';
            if (displayStatus === 'Máquina Parada') displayStatus = 'Prioridade Alta (Máquina Parada)';

            const evalStyles: Record<string, { cardBorder: string; pill: string }> = {
              'OK': {
                cardBorder: 'border-slate-200 bg-white hover:border-[#1B3022]/30',
                pill: 'bg-emerald-50 text-emerald-800 border-emerald-200'
              },
              'Prioridade Baixa': {
                cardBorder: 'border-blue-200 bg-blue-50/30 hover:border-blue-300',
                pill: 'bg-blue-100 text-blue-800 border-blue-200'
              },
              'Prioridade Média': {
                cardBorder: 'border-amber-200 bg-amber-50/50 hover:border-amber-350',
                pill: 'bg-amber-100 text-amber-800 border-amber-250'
              },
              'Prioridade Alta (Máquina Parada)': {
                cardBorder: 'border-rose-300 bg-rose-50/60 hover:border-rose-400',
                pill: 'bg-rose-600 text-white border-rose-700 font-extrabold'
              }
            };

            const currentStyle = evalStyles[displayStatus] || evalStyles['OK'];

            let failedCount = 0;
            if (parsedData?.pdfItems) {
              failedCount = Object.values(parsedData.pdfItems).filter(v => v === 'NÃO').length;
            }

            return (
              <div 
                key={log.id} 
                className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xs relative ${currentStyle.cardBorder}`}
              >
                <div>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3.5 mb-3.5 gap-2">
                    <div>
                      <span className="font-mono text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{farm?.name || 'Fazenda'}</span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1.5">{mach?.code} - {mach?.name}</h4>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* Validade do Lançamento: OK ou Vencido */}
                      {validity.status === 'OK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md uppercase tracking-wider">
                          <CheckCircle2 size={10} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 rounded-md uppercase tracking-wider">
                          <Clock size={10} /> Vencido
                        </span>
                      )}

                      <span className={`inline-flex px-2 py-0.5 text-[8px] font-bold border rounded-md uppercase tracking-wider ${currentStyle.pill}`}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Operador:</span>
                      <strong className="text-slate-700">{log.operator_name}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Data Lançamento:</span>
                      <span className="font-mono">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Status Validade (7d):</span>
                      <strong className={validity.status === 'OK' ? 'text-emerald-700 font-mono font-bold' : 'text-rose-700 font-mono font-bold'}>
                        {validity.status === 'OK' ? `OK (${validity.days}d atrás)` : `Vencido (${validity.days}d atrás)`}
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Horímetro h/Km:</span>
                      <span className="font-mono font-bold text-slate-800">{log.hour_km.toLocaleString('pt-BR')} h</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Atividade:</span>
                      <span className="text-slate-700 font-medium">{log.work_type || 'Geral'}</span>
                    </p>

                    {parsedData?.pdfItems ? (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">Itens Auditados:</span>
                        {failedCount > 0 ? (
                          <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            {failedCount} Inconformidades
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            Todos Conformes (OK)
                          </span>
                        )}
                      </div>
                    ) : log.failed_items_notes ? (
                      <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2 truncate font-serif italic" title={log.failed_items_notes}>
                        &ldquo;{log.failed_items_notes}&rdquo;
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* RODAPÉ E AÇÕES CRUD */}
                <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {userRole !== 'viewer' && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(log)}
                          title="Editar Vistoria"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: log.id, title: `Vistoria de ${mach?.code} (${log.operator_name})` })}
                          title="Excluir Vistoria"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedChecklist(log);
                      setViewTab('componentes');
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#1B3022] hover:underline cursor-pointer ml-auto"
                  >
                    <Eye size={12} /> Ver Ficha
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full h-48 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-xs">
            <CheckSquare size={32} className="mb-2 text-slate-300" />
            <p className="text-xs">Nenhum diário de checklist encontrado nos filtros.</p>
          </div>
        )}
      </div>

      {/* MODAL: FAZER VISTORIA (NOVA) OU EDITAR */}
      <Modal 
        isOpen={isAddOpen || isEditOpen} 
        onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} 
        title={isEditOpen ? "Editar Ficha de Vistoria Oficial" : "Nova Ficha de Vistoria Oficial do Maquinário"}
      >
        <form onSubmit={isEditOpen ? handleSubmitEdit : handleSubmitAdd} className="space-y-4">
          
          {/* DADOS DE IDENTIFICAÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Equipamento Vistoriado</label>
              <select
                value={formMachineId}
                onChange={(e) => setFormMachineId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                {machines
                  .filter(m => selectedFarmId === 'ALL' || m.farm_id === selectedFarmId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Data da Vistoria</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Operador Responsável</label>
              <input
                type="text"
                required
                placeholder="Ex: Pedro de Souza"
                value={formOperator}
                onChange={(e) => setFormOperator(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Horímetro / Km Atual</label>
              <input
                type="number"
                required
                value={formHourKm}
                onChange={(e) => setFormHourKm(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Atividade Operacional de Campo</label>
              <select
                value={formWorkType}
                onChange={(e) => setFormWorkType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="Plantio">Plantio</option>
                <option value="Colheita">Colheita</option>
                <option value="Pulverização">Pulverização</option>
                <option value="Preparo de Solo">Preparo de Solo</option>
                <option value="Transporte">Transporte / Logística</option>
                <option value="Outro">Outra Atividade</option>
              </select>
            </div>
          </div>

          {/* SEÇÕES DE AUDITORIA DO CHECKLIST DO PDF */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-[#1B3022] text-white p-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-400" /> Vistoria e Avaliação de Componentes (70+ Itens)
              </h4>
            </div>

            {/* BARRA DE NAVEGAÇÃO DE ABAS */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveChecklistTab('componentes')}
                className={`py-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
                  activeChecklistTab === 'componentes' 
                    ? 'border-[#1B3022] text-[#1B3022] bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Componentes (30)
              </button>
              <button
                type="button"
                onClick={() => setActiveChecklistTab('niveis')}
                className={`py-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
                  activeChecklistTab === 'niveis' 
                    ? 'border-[#1B3022] text-[#1B3022] bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Níveis de Óleo (8)
              </button>
              <button
                type="button"
                onClick={() => setActiveChecklistTab('revisoes')}
                className={`py-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
                  activeChecklistTab === 'revisoes' 
                    ? 'border-[#1B3022] text-[#1B3022] bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Revisões e Filtros (16)
              </button>
              <button
                type="button"
                onClick={() => setActiveChecklistTab('complementares')}
                className={`py-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
                  activeChecklistTab === 'complementares' 
                    ? 'border-[#1B3022] text-[#1B3022] bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                4. Obs. Complementares (13)
              </button>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div className="p-3 bg-white">
              {activeChecklistTab === 'componentes' && renderItemGrid(COMPONENT_ITEMS, 'Inspeção de Componentes e Estrutura')}
              {activeChecklistTab === 'niveis' && renderItemGrid(FLUID_LEVEL_ITEMS, 'Verificação de Níveis de Fluidos e Óleos')}
              
              {activeChecklistTab === 'revisoes' && (
                <div className="space-y-4">
                  {/* Horímetros da Revisão */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">Horímetro da Última Revisão</label>
                      <input
                        type="text"
                        placeholder="Ex: 1250"
                        value={horimetroRevisao}
                        onChange={(e) => setHorimetroRevisao(e.target.value)}
                        className="w-full bg-white border border-emerald-300 rounded-lg py-1.5 px-3 text-xs text-slate-800 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">Horímetro Próxima Revisão</label>
                      <input
                        type="text"
                        placeholder="Ex: 1500"
                        value={horimetroProximo}
                        onChange={(e) => setHorimetroProximo(e.target.value)}
                        className="w-full bg-white border border-emerald-300 rounded-lg py-1.5 px-3 text-xs text-slate-800 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  {renderItemGrid(REVISION_ITEMS, 'Filtros e Componentes de Revisão')}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Obs. para Próxima Revisão</label>
                    <input
                      type="text"
                      placeholder="Ex: Trocar filtro de ar secundário na próxima parada..."
                      value={obsProximaRevisao}
                      onChange={(e) => setObsProximaRevisao(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {activeChecklistTab === 'complementares' && (
                <div className="space-y-4">
                  {renderItemGrid(COMPLEMENTARY_ITEMS, 'Observações Complementares do Ativo')}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Informações Complementares Gerais</label>
                    <textarea
                      placeholder="Digite observações técnicas complementares..."
                      value={informacoesComplementares}
                      onChange={(e) => setInformacoesComplementares(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden h-20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL FINAL DE LIBERAÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Avaliação Final de Liberação</label>
              <select
                value={formOverallStatus}
                onChange={(e) => setFormOverallStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:outline-hidden focus:border-[#1B3022] cursor-pointer"
              >
                <option value="OK">OK - Equipamento Liberado</option>
                <option value="Prioridade Baixa">Prioridade Baixa</option>
                <option value="Prioridade Média">Prioridade Média</option>
                <option value="Prioridade Alta (Máquina Parada)">Prioridade Alta (Máquina Parada)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observações Finais do Operador</label>
              <input
                type="text"
                placeholder="Ex: Equipamento limpo e lubrificado..."
                value={formFailedNotes}
                onChange={(e) => setFormFailedNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#1B3022] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></span>
                  <span>Salvando Vistoria...</span>
                </>
              ) : isEditOpen ? (
                'Salvar Alterações'
              ) : (
                'Confirmar e Salvar Vistoria'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão">
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Tem certeza de que deseja excluir permanentemente <strong>{deleteTarget.title}</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: VER DETALHES DO CHECKLIST (LAUDO) */}
      {selectedChecklist && (() => {
        const parsed = parseChecklistData(selectedChecklist.failed_items_notes);
        const itemData: Record<string, string> = parsed?.pdfItems || selectedChecklist.details || {};
        const machineObj = machines.find(m => m.id === selectedChecklist.machine_id);
        const farmObj = farms.find(f => f.id === machineObj?.farm_id);

        const renderViewGrid = (itemsList: string[]) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {itemsList.map(item => {
              const val = itemData[item] || 'SIM';
              return (
                <div key={item} className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded-lg">
                  <span className="text-slate-700 font-medium pr-2">{item}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                    val === 'SIM' || val === 'OK'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : val === 'NÃO'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        );

        return (
          <Modal isOpen={!!selectedChecklist} onClose={() => setSelectedChecklist(null)} title="Laudo Técnico Oficial de Vistoria">
            <div className="space-y-5 text-xs text-slate-600">
              
              {/* CABEÇALHO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-y-3 shadow-xs">
                <div>
                  <p className="text-slate-400 text-[10px]">Máquina</p>
                  <p className="text-xs font-bold text-slate-800">
                    {machineObj?.code} - {machineObj?.name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Fazenda</p>
                  <p className="text-xs text-slate-800 font-bold">{farmObj?.name || 'Fazenda'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Data de Inspeção</p>
                  <p className="text-xs text-slate-800 font-mono font-semibold">{new Date(selectedChecklist.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Operador Vistoriador</p>
                  <p className="text-xs text-slate-800 font-semibold">{selectedChecklist.operator_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Horímetro h/Km no Dia</p>
                  <p className="text-xs text-[#1B3022] font-mono font-bold">{selectedChecklist.hour_km.toLocaleString('pt-BR')} h/km</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Atividade do Ativo</p>
                  <p className="text-xs text-slate-800 font-semibold">{selectedChecklist.work_type || 'Geral'}</p>
                </div>
              </div>

              {/* SITUAÇÃO GERAL DE LIBERAÇÃO E VALIDADE */}
              {(() => {
                const val = getValidityStatus(selectedChecklist.date);
                let st = (parsed?.evalStatus || selectedChecklist.overall_status) as string;
                if (st === 'Necessita Atenção') st = 'Prioridade Média';
                if (st === 'Máquina Parada') st = 'Prioridade Alta (Máquina Parada)';

                return (
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between p-3 rounded-xl border ${val.status === 'OK' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                      <div className="flex items-center gap-2">
                        {val.status === 'OK' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Clock size={18} className="text-rose-600" />}
                        <span className="font-bold text-xs">
                          Status Validade 7 Dias: <span className="uppercase">{val.status}</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-mono">
                        {val.days === 0 ? 'Lançamento efetuado hoje' : `Lançado há ${val.days} dia(s)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                      {st === 'OK' && (
                        <>
                          <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold text-emerald-700 uppercase text-xs">OK - Equipamento Liberado</p>
                            <p className="text-[10px] text-slate-500">Componentes de segurança e operacionais sem risco grave de pane.</p>
                          </div>
                        </>
                      )}

                      {st === 'Prioridade Baixa' && (
                        <>
                          <Info size={24} className="text-blue-600 shrink-0" />
                          <div>
                            <p className="font-bold text-blue-700 uppercase text-xs">Prioridade Baixa - Manutenção Leve</p>
                            <p className="text-[10px] text-slate-500">Observações preventivas sem retenção imediata.</p>
                          </div>
                        </>
                      )}

                      {st === 'Prioridade Média' && (
                        <>
                          <AlertTriangle size={24} className="text-amber-600 shrink-0" />
                          <div>
                            <p className="font-bold text-amber-700 uppercase text-xs">Prioridade Média - Atenção Requerida</p>
                            <p className="text-[10px] text-slate-500">Inconformidades operacionais que exigem agendamento de reparo.</p>
                          </div>
                        </>
                      )}

                      {st === 'Prioridade Alta (Máquina Parada)' && (
                        <>
                          <ShieldX size={24} className="text-rose-600 shrink-0" />
                          <div>
                            <p className="font-bold text-rose-700 uppercase text-xs">Prioridade Alta (Máquina Parada)</p>
                            <p className="text-[10px] text-slate-500">Avaria crítica detectada. Equipamento bloqueado para operação.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* SEÇÕES DE EXIBIÇÃO DE ITENS AUDITADOS */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold overflow-x-auto">
                  <button
                    onClick={() => setViewTab('componentes')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${viewTab === 'componentes' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Componentes (30)
                  </button>
                  <button
                    onClick={() => setViewTab('niveis')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${viewTab === 'niveis' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Níveis (8)
                  </button>
                  <button
                    onClick={() => setViewTab('revisoes')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${viewTab === 'revisoes' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Revisões (16)
                  </button>
                  <button
                    onClick={() => setViewTab('complementares')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${viewTab === 'complementares' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Obs. Complementares (13)
                  </button>
                </div>

                <div className="p-3 bg-white max-h-[280px] overflow-y-auto">
                  {viewTab === 'componentes' && renderViewGrid(COMPONENT_ITEMS)}
                  {viewTab === 'niveis' && renderViewGrid(FLUID_LEVEL_ITEMS)}
                  {viewTab === 'revisoes' && (
                    <div className="space-y-3">
                      {(parsed?.horimetroRevisao || parsed?.horimetroProximo) && (
                        <div className="grid grid-cols-2 gap-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg font-mono text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Horímetro Revisão:</span>
                            <strong className="text-emerald-900">{parsed.horimetroRevisao || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Próxima Revisão:</span>
                            <strong className="text-emerald-900">{parsed.horimetroProximo || 'N/A'}</strong>
                          </div>
                        </div>
                      )}
                      {renderViewGrid(REVISION_ITEMS)}
                      {parsed?.obsProximaRevisao && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <strong>Obs. Próxima Revisão:</strong> {parsed.obsProximaRevisao}
                        </p>
                      )}
                    </div>
                  )}
                  {viewTab === 'complementares' && (
                    <div className="space-y-3">
                      {renderViewGrid(COMPLEMENTARY_ITEMS)}
                      {parsed?.informacoesComplementares && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <strong>Informações Complementares:</strong> {parsed.informacoesComplementares}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* OBSERVAÇÕES FINAIS */}
              {(parsed?.notes || selectedChecklist.failed_items_notes) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <strong className="text-slate-700">Relatos do Operador / Observações:</strong>
                  <p className="mt-1 text-slate-600 italic">
                    &ldquo;{parsed?.notes || selectedChecklist.failed_items_notes}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {userRole !== 'viewer' && (
                    <button
                      onClick={() => {
                        const c = selectedChecklist;
                        setSelectedChecklist(null);
                        handleOpenEdit(c);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1B3022] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Edit size={13} /> Editar Vistoria
                    </button>
                  )}
                  {userRole !== 'viewer' && (
                    <button
                      onClick={() => handleGenerateOSFromLaudo(selectedChecklist)}
                      disabled={submitting}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Wrench size={13} /> Gerar/Atualizar O.S.
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedChecklist(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs rounded-xl font-bold cursor-pointer ml-auto"
                >
                  Fechar Laudo
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

    </div>
  );
}
