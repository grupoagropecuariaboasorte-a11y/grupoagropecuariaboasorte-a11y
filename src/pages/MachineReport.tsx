import React, { useEffect, useState, useMemo } from 'react';
import { fleetService } from '../lib/fleetService';
import { 
  Farm, Machine, FuelLog, MaintenanceLog, Checklist30d, 
  WorkOrder, PreventivePlanStatus, UserRole, isImplement 
} from '../types';
import { 
  FileSpreadsheet, Printer, Search, Tractor, Calendar, 
  Wrench, Fuel, CheckSquare, ClipboardList, AlertTriangle, 
  CheckCircle2, Clock, Download, ArrowLeft, ShieldAlert,
  Info, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { formatDisplayDate, formatDisplayDateTime } from '../lib/dateUtils';
import AppLogo from '../components/AppLogo';

interface MachineReportProps {
  selectedFarmId: string;
  userRole: UserRole;
  userEmail?: string;
}

export default function MachineReport({ selectedFarmId, userRole, userEmail = '' }: MachineReportProps) {
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [checklists, setChecklists] = useState<Checklist30d[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [preventiveStatuses, setPreventiveStatuses] = useState<PreventivePlanStatus[]>([]);
  const [lookups, setLookups] = useState<any>(null);

  // Filtros Locais
  const [localFarmId, setLocalFarmId] = useState(selectedFarmId);
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  // Sincronizar filtro global de fazenda
  useEffect(() => {
    setLocalFarmId(selectedFarmId);
  }, [selectedFarmId]);

  // Carregar todos os dados necessários
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fList, mList, fLogs, mMaint, checks, wOrders, prevStatus, lData] = await Promise.all([
          fleetService.getFarms(),
          fleetService.getMachines(),
          fleetService.getFuelLogs(),
          fleetService.getMaintenanceLogs(),
          fleetService.getChecklists(),
          fleetService.getWorkOrders(),
          fleetService.getPreventivePlanStatus(),
          fleetService.getLookups()
        ]);

        setFarms(fList);
        setMachines(mList);
        setFuelLogs(fLogs);
        setMaintenanceLogs(mMaint);
        setChecklists(checks);
        setWorkOrders(wOrders);
        setPreventiveStatuses(prevStatus);
        setLookups(lData);

        // Se houver máquinas, seleciona a primeira por padrão
        const nonImplements = mList
          .filter(m => !isImplement(m))
          .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));

        if (nonImplements.length > 0) {
          setSelectedMachineId(nonImplements[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar dados para o Relatório de Máquinas:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Lista de tipos de equipamento disponíveis
  const equipmentTypes = useMemo(() => {
    if (lookups?.equipment_types && Array.isArray(lookups.equipment_types)) {
      return lookups.equipment_types;
    }
    return [
      { id: 'trator', label: 'Trator' },
      { id: 'colheitadeira', label: 'Colheitadeira' },
      { id: 'caminhao', label: 'Caminhão' },
      { id: 'pa_carregadeira', label: 'Pá Carregadeira' },
      { id: 'gerador', label: 'Gerador' },
      { id: 'escavadeira', label: 'Escavadeira' },
      { id: 'retroescavadeira', label: 'Retroescavadeira' },
      { id: 'esteira', label: 'Trator de Esteira' },
      { id: 'rolo', label: 'Rolo Compactador' },
      { id: 'outro', label: 'Outro' }
    ];
  }, [lookups]);

  // Lista de máquinas filtradas conforme os critérios da tela
  const availableMachines = useMemo(() => {
    return machines
      .filter(m => !isImplement(m))
      .filter(m => {
        const farmMatch = localFarmId === 'ALL' || m.farm_id === localFarmId;
        const typeMatch = selectedType === 'ALL' || m.type === selectedType;
        const statusMatch = selectedStatus === 'ALL' || m.status === selectedStatus;
        const textMatch = !searchTerm.trim() || 
          (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase());

        return farmMatch && typeMatch && statusMatch && textMatch;
      })
      .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [machines, localFarmId, selectedType, selectedStatus, searchTerm]);

  // Ajusta a máquina selecionada se a atual não estiver mais na lista filtrada
  useEffect(() => {
    if (availableMachines.length > 0) {
      const exists = availableMachines.some(m => m.id === selectedMachineId);
      if (!exists) {
        setSelectedMachineId(availableMachines[0].id);
      }
    } else {
      setSelectedMachineId('');
    }
  }, [availableMachines, selectedMachineId]);

  // Máquina atualmente selecionada para o relatório
  const selectedMachine = useMemo(() => {
    return machines.find(m => m.id === selectedMachineId) || null;
  }, [machines, selectedMachineId]);

  // Fazenda da máquina selecionada
  const machineFarm = useMemo(() => {
    if (!selectedMachine) return null;
    return farms.find(f => f.id === selectedMachine.farm_id) || null;
  }, [selectedMachine, farms]);

  // Dados específicos da máquina selecionada
  const machineData = useMemo(() => {
    if (!selectedMachine) return null;

    const mId = selectedMachine.id;

    // 1. Abastecimentos
    const fLogs = fuelLogs
      .filter(f => f.machine_id === mId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalLiters = fLogs.reduce((sum, item) => sum + (Number(item.liters_supplied) || 0), 0);
    const totalFuelCost = fLogs.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
    
    // Média de consumo (litros por hora ou km)
    const validConsumptions = fLogs.map(f => Number(f.consumption_rate)).filter(c => c > 0);
    const avgConsumption = validConsumptions.length > 0 
      ? validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length 
      : 0;

    // Horímetro atual mais recente (entre cadastro e último abastecimento/checklist/manutenção)
    const latestFuelHour = fLogs.length > 0 ? fLogs[0].hour_km_at_fueling : 0;
    const currentEffectiveHour = Math.max(
      Number(selectedMachine.current_hour_km) || 0,
      latestFuelHour
    );

    // Horas/KM trabalhadas acumuladas
    const hoursWorked = Math.max(0, currentEffectiveHour - (Number(selectedMachine.initial_hour_km) || 0));

    // 2. Manutenções
    const mLogs = maintenanceLogs
      .filter(m => m.machine_id === mId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPartsCost = mLogs.reduce((sum, item) => sum + (Number(item.parts_cost) || 0), 0);
    const totalLaborCost = mLogs.reduce((sum, item) => sum + (Number(item.labor_cost) || 0), 0);
    const totalMaintenanceCost = mLogs.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);

    // Custo operacional consolidado
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
    const costPerHourWorked = hoursWorked > 0 ? (totalOperationalCost / hoursWorked) : 0;

    // 3. Plano Preventivo
    const prevItems = preventiveStatuses
      .filter(p => p.machine_id === mId)
      .sort((a, b) => {
        // Ordena por prioridade de atenção: VENCIDA primeiro, depois PRÓXIMA, depois OK
        const order: Record<string, number> = { 'VENCIDA': 1, 'PRÓXIMA': 2, 'NUNCA REALIZADA': 3, 'OK': 4 };
        return (order[a.status] || 5) - (order[b.status] || 5);
      });

    // 4. Checklists / Vistorias 7 Dias
    const chkLogs = checklists
      .filter(c => c.machine_id === mId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5. Ordens de Serviço (O.S.)
    const wOrders = workOrders
      .filter(w => w.machine_id === mId)
      .sort((a, b) => new Date(b.open_date).getTime() - new Date(a.open_date).getTime());

    return {
      fLogs,
      totalLiters,
      totalFuelCost,
      avgConsumption,
      currentEffectiveHour,
      hoursWorked,
      mLogs,
      totalPartsCost,
      totalLaborCost,
      totalMaintenanceCost,
      totalOperationalCost,
      costPerHourWorked,
      prevItems,
      chkLogs,
      wOrders
    };
  }, [selectedMachine, fuelLogs, maintenanceLogs, preventiveStatuses, checklists, workOrders]);

  // Ação de Impressão / Salvar PDF
  const handlePrint = () => {
    window.print();
  };

  // Ação de Exportar CSV (Excel formatado para padrão brasileiro com delimitador ';' e BOM UTF-8)
  const handleExportCsv = () => {
    if (!selectedMachine || !machineData) return;

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatNumberBr = (num: number, decimals = 2) => {
      if (isNaN(num) || num === null || num === undefined) return '0';
      return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const rows: string[] = [];

    // Título Geral
    rows.push(`"GRUPO AGROPECUÁRIA BOA SORTE - RELATÓRIO INDIVIDUAL DE ATIVO (DOSSIÊ TÉCNICO)"`);
    rows.push(`"Data de Emissão";${escapeCsv(formatDisplayDateTime(new Date().toISOString()))};"Emitido por";${escapeCsv(userEmail || 'Administração')}`);
    rows.push('');

    // SEÇÃO 1: FICHA CADASTRAL
    rows.push(`"--- 1. IDENTIFICAÇÃO CADASTRAL E DADOS TÉCNICOS ---"`);
    rows.push(`"Código";"Nome da Máquina";"Tipo";"Marca";"Modelo";"Ano";"Chassi / Série";"Fazenda Alocada";"Status Operacional";"Motorista / Operador";"Data de Aquisição";"Horímetro Inicial";"Horímetro Atual";"Horas Trabalhadas Acumuladas"`);
    rows.push([
      escapeCsv(selectedMachine.code),
      escapeCsv(selectedMachine.name),
      escapeCsv(selectedMachine.type),
      escapeCsv(selectedMachine.brand),
      escapeCsv(selectedMachine.model),
      escapeCsv(selectedMachine.year),
      escapeCsv(selectedMachine.serial_number || 'N/A'),
      escapeCsv(machineFarm?.name || 'N/A'),
      escapeCsv(selectedMachine.status),
      escapeCsv(selectedMachine.driver_name || 'Não vinculado'),
      escapeCsv(formatDisplayDate(selectedMachine.acquisition_date)),
      escapeCsv(formatNumberBr(selectedMachine.initial_hour_km, 1)),
      escapeCsv(formatNumberBr(machineData.currentEffectiveHour, 1)),
      escapeCsv(formatNumberBr(machineData.hoursWorked, 1))
    ].join(';'));
    rows.push('');

    // SEÇÃO 2: INDICADORES CONSOLIDADOS E CUSTOS
    rows.push(`"--- 2. INDICADORES CONSOLIDADOS E RESUMO FINANCEIRO ---"`);
    rows.push(`"Indicador";"Valor"`);
    rows.push(`"Total Abastecido (Litros)";"${formatNumberBr(machineData.totalLiters, 1)} L"`);
    rows.push(`"Total Gasto em Combustível (R$)";"R$ ${formatNumberBr(machineData.totalFuelCost, 2)}"`);
    rows.push(`"Média de Consumo (L/h ou L/km)";"${formatNumberBr(machineData.avgConsumption, 2)}"`);
    rows.push(`"Total Gasto em Peças (R$)";"R$ ${formatNumberBr(machineData.totalPartsCost, 2)}"`);
    rows.push(`"Total Gasto em Mão de Obra (R$)";"R$ ${formatNumberBr(machineData.totalLaborCost, 2)}"`);
    rows.push(`"Total Gasto em Manutenções (R$)";"R$ ${formatNumberBr(machineData.totalMaintenanceCost, 2)}"`);
    rows.push(`"Custo Operacional Total Acumulado (R$)";"R$ ${formatNumberBr(machineData.totalOperationalCost, 2)}"`);
    rows.push(`"Custo por Hora Trabalhada (R$/h)";"R$ ${formatNumberBr(machineData.costPerHourWorked, 2)}"`);
    rows.push(`"Total de Abastecimentos Registrados";"${machineData.fLogs.length}"`);
    rows.push(`"Total de Manutenções Registradas";"${machineData.mLogs.length}"`);
    rows.push(`"Total de Vistorias Checklist Registradas";"${machineData.chkLogs.length}"`);
    rows.push(`"Total de Ordens de Serviço (O.S.)";"${machineData.wOrders.length}"`);
    rows.push('');

    // SEÇÃO 3: CRONOGRAMA DO PLANO PREVENTIVO
    rows.push(`"--- 3. PLANO PREVENTIVO E PRÓXIMAS REVISÕES ---"`);
    rows.push(`"Item de Manutenção";"Intervalo Horas/KM";"Intervalo Dias";"Última Realização (Data)";"Última Realização (Horímetro)";"Horímetro Atual";"Horímetro Próxima Revisão";"Saldo Horas Restantes";"Data Próxima Revisão";"Saldo Dias Restantes";"Status da Revisão"`);
    if (machineData.prevItems.length > 0) {
      machineData.prevItems.forEach(item => {
        const nextHour = (item.last_performed_hour_km || 0) + (item.interval_hour_km || 0);
        rows.push([
          escapeCsv(item.maintenance_item),
          escapeCsv(item.interval_hour_km ? `${item.interval_hour_km} h/km` : '-'),
          escapeCsv(item.interval_days ? `${item.interval_days} dias` : '-'),
          escapeCsv(formatDisplayDate(item.last_performed_date)),
          escapeCsv(item.last_performed_hour_km ? formatNumberBr(item.last_performed_hour_km, 1) : '-'),
          escapeCsv(formatNumberBr(machineData.currentEffectiveHour, 1)),
          escapeCsv(item.interval_hour_km ? formatNumberBr(nextHour, 1) : '-'),
          escapeCsv(item.hour_km_remaining !== undefined ? formatNumberBr(item.hour_km_remaining, 1) : '-'),
          escapeCsv(formatDisplayDate(item.next_due_date)),
          escapeCsv(item.days_remaining !== undefined ? `${item.days_remaining} dias` : '-'),
          escapeCsv(item.status)
        ].join(';'));
      });
    } else {
      rows.push(`"Nenhum item do plano preventivo configurado para esta máquina"`);
    }
    rows.push('');

    // SEÇÃO 4: ORDENS DE SERVIÇO
    rows.push(`"--- 4. ORDENS DE SERVIÇO (O.S.) ---"`);
    rows.push(`"Número O.S.";"Data Abertura";"Motivo / Descrição";"Prioridade";"Status";"Data Fechamento";"Responsável"`);
    if (machineData.wOrders.length > 0) {
      machineData.wOrders.forEach(wo => {
        rows.push([
          escapeCsv(wo.os_number ? `OS-${wo.os_number}` : wo.id.substring(0, 8)),
          escapeCsv(formatDisplayDate(wo.open_date)),
          escapeCsv(wo.reason || wo.description || '-'),
          escapeCsv(wo.priority),
          escapeCsv(wo.status),
          escapeCsv(formatDisplayDate(wo.close_date)),
          escapeCsv(wo.assigned_to || wo.responsible || '-')
        ].join(';'));
      });
    } else {
      rows.push(`"Nenhuma ordem de serviço registrada para este equipamento"`);
    }
    rows.push('');

    // SEÇÃO 5: HISTÓRICO DE MANUTENÇÕES
    rows.push(`"--- 5. HISTÓRICO DE MANUTENÇÕES E OFICINAS ---"`);
    rows.push(`"Data";"Horímetro/KM";"Tipo";"Descrição do Serviço";"Peças Substituídas";"Custo Peças (R$)";"Custo Mão de Obra (R$)";"Custo Total (R$)";"Mecânico / Oficina"`);
    if (machineData.mLogs.length > 0) {
      machineData.mLogs.forEach(m => {
        rows.push([
          escapeCsv(formatDisplayDate(m.date)),
          escapeCsv(formatNumberBr(m.hour_km_at_service, 1)),
          escapeCsv(m.type),
          escapeCsv(m.service_description),
          escapeCsv(m.parts_replaced || '-'),
          escapeCsv(formatNumberBr(m.parts_cost, 2)),
          escapeCsv(formatNumberBr(m.labor_cost, 2)),
          escapeCsv(formatNumberBr(m.total_cost, 2)),
          escapeCsv(m.responsible || m.location_shop || '-')
        ].join(';'));
      });
    } else {
      rows.push(`"Nenhuma manutenção registrada para este equipamento"`);
    }
    rows.push('');

    // SEÇÃO 6: HISTÓRICO DE ABASTECIMENTOS
    rows.push(`"--- 6. HISTÓRICO DE ABASTECIMENTOS DE COMBUSTÍVEL ---"`);
    rows.push(`"Data";"Horímetro/KM";"Tipo Combustível";"Litros Fornecidos";"Preço por Litro (R$)";"Valor Total (R$)";"Consumo Calculado";"Posto / Fornecedor";"Responsável"`);
    if (machineData.fLogs.length > 0) {
      machineData.fLogs.forEach(f => {
        rows.push([
          escapeCsv(formatDisplayDateTime(f.date)),
          escapeCsv(formatNumberBr(f.hour_km_at_fueling, 1)),
          escapeCsv(f.fuel_type || 'Diesel'),
          escapeCsv(formatNumberBr(f.liters_supplied, 1)),
          escapeCsv(formatNumberBr(f.price_per_liter, 2)),
          escapeCsv(formatNumberBr(f.total_value, 2)),
          escapeCsv(f.consumption_rate ? formatNumberBr(f.consumption_rate, 2) : '-'),
          escapeCsv(f.supplier || '-'),
          escapeCsv(f.responsible || '-')
        ].join(';'));
      });
    } else {
      rows.push(`"Nenhum abastecimento registrado para este equipamento"`);
    }
    rows.push('');

    // SEÇÃO 7: HISTÓRICO DE CHECKLISTS
    rows.push(`"--- 7. HISTÓRICO DE CHECKLISTS E VISTORIAS 7 DIAS ---"`);
    rows.push(`"Data da Vistoria";"Horímetro/KM";"Operador / Inspetor";"Status Geral";"Observações / Itens Reprovados"`);
    if (machineData.chkLogs.length > 0) {
      machineData.chkLogs.forEach(c => {
        rows.push([
          escapeCsv(formatDisplayDateTime(c.date)),
          escapeCsv(formatNumberBr(c.hour_km, 1)),
          escapeCsv(c.operator_name),
          escapeCsv(c.overall_status),
          escapeCsv(c.failed_items_notes || '-')
        ].join(';'));
      });
    } else {
      rows.push(`"Nenhuma vistoria checklist registrada para este equipamento"`);
    }

    // Gerar e baixar arquivo CSV com BOM para garantir caracteres acentuados no Excel
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanCode = (selectedMachine.code || 'MAQ').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `relatorio_maquina_${cleanCode}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#1B3022] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">

      {/* PAINEL DE FILTROS E SELEÇÃO DE MÁQUINA (ESCONDER AO IMPRIMIR) */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl print:hidden shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[#1B3022]" />
              Relatório Individual Completo de Máquinas e Equipamentos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Filtre por fazenda, tipo e encontre a máquina desejada para gerar o dossiê técnico em PDF ou planilha CSV (Excel).
            </p>
          </div>

          {/* Botões de Ação de Alto Nível */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCsv}
              disabled={!selectedMachine}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              title="Baixar planilha completa compatível com Microsoft Excel"
            >
              <Download size={15} />
              <span>Exportar CSV (Excel)</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={!selectedMachine}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B3022] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              title="Imprimir ou Salvar em formato PDF"
            >
              <Printer size={15} />
              <span>Salvar em PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* 1. Filtro por Fazenda */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Filtrar por Fazenda
            </label>
            <select
              value={localFarmId}
              onChange={(e) => setLocalFarmId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-hidden focus:border-[#1B3022] cursor-pointer"
            >
              <option value="ALL">Todas as Fazendas</option>
              {farms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Tipo */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Tipo de Ativo
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-hidden focus:border-[#1B3022] cursor-pointer"
            >
              <option value="ALL">Todos os Tipos</option>
              {equipmentTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Status */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Status Operacional
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-hidden focus:border-[#1B3022] cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="Ativa">Ativa</option>
              <option value="Em manutenção">Em manutenção</option>
              <option value="Parada">Parada</option>
              <option value="Vendida/Baixada">Vendida/Baixada</option>
            </select>
          </div>

          {/* 4. Busca por Texto */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Busca Específica
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Código, chassi, modelo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-hidden focus:border-[#1B3022]"
              />
            </div>
          </div>
        </div>

        {/* Seletor Destacado da Máquina Específica */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/60">
          <div className="flex items-center gap-2">
            <Tractor size={18} className="text-[#1B3022] shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Selecione o Equipamento para Visualizar o Dossiê:
              </span>
              <span className="text-[10px] text-slate-500">
                {availableMachines.length} equipamento(s) disponível(is) para os filtros aplicados
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full bg-white border-2 border-[#1B3022] rounded-xl px-3 py-2 text-xs text-[#1B3022] font-bold outline-hidden cursor-pointer shadow-xs"
            >
              {availableMachines.length === 0 ? (
                <option value="">Nenhuma máquina encontrada com esses filtros</option>
              ) : (
                availableMachines.map(m => {
                  const fName = farms.find(f => f.id === m.farm_id)?.name || 'Sem Fazenda';
                  return (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} ({fName} • {m.status})
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>
      </div>

      {/* CASO NENHUMA MÁQUINA ENCONTRADA */}
      {!selectedMachine && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
          <AlertTriangle size={36} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Nenhuma máquina selecionada
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Ajuste os filtros acima por fazenda ou busque pelo código da máquina para visualizar e emitir o relatório completo.
          </p>
        </div>
      )}

      {/* ÁREA DO RELATÓRIO / DOSSIÊ TÉCNICO COMPLETO */}
      {selectedMachine && machineData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs relative text-slate-800 print:p-2 print:border-none print:shadow-none print:text-black space-y-6">

          {/* CABEÇALHO OFICIAL DO LAUDO (PRINT / TELA) */}
          <div className="border-b-2 border-[#1B3022] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border-black print:pb-2">
            <div className="flex items-center gap-3">
              <AppLogo 
                className="w-12 h-12 rounded-full border border-amber-400/50 object-cover shadow-sm shrink-0" 
                alt="Logo Agropecuária Boa Sorte" 
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-amber-800 uppercase bg-amber-100/80 px-2 py-0.5 rounded print:border print:border-black">
                    GRUPO AGROPECUÁRIA BOA SORTE
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono print:text-black">
                    • DOSSIÊ TÉCNICO DO ATIVO
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1 print:text-black uppercase">
                  {selectedMachine.code} • {selectedMachine.name}
                </h1>
                <p className="text-xs text-slate-600 print:text-black">
                  Fazenda: <strong>{machineFarm?.name || 'Não informada'}</strong> {machineFarm?.location ? `(${machineFarm.location})` : ''} • Operador Titular: <strong>{selectedMachine.driver_name || 'Não vinculado'}</strong>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-[10px] text-slate-500 font-mono print:text-black shrink-0">
              <p className="font-bold">EMISSÃO: {formatDisplayDateTime(new Date().toISOString())}</p>
              <p className="text-slate-400 print:text-slate-600">Sistema Digital de Frotas • Fuso Cuiabá/MT</p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 print:border-black">
                <span>STATUS:</span>
                <span className="uppercase">{selectedMachine.status}</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: DADOS CADASTRAIS E TÉCNICOS (GRID COMPACTA) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 print:bg-white print:border-slate-300">
            <h3 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 print:text-black print:border-slate-300">
              <Info size={12} className="text-[#1B3022]" />
              1. Ficha Cadastral e Especificações do Fabricante
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Código</span>
                <span className="font-mono font-bold text-[#1B3022] print:text-black">{selectedMachine.code}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Tipo de Ativo</span>
                <span className="font-semibold text-slate-800 print:text-black capitalize">{selectedMachine.type}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Marca / Fabricante</span>
                <span className="font-semibold text-slate-800 print:text-black">{selectedMachine.brand || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Modelo</span>
                <span className="font-semibold text-slate-800 print:text-black">{selectedMachine.model || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Ano Fabricação</span>
                <span className="font-semibold text-slate-800 print:text-black">{selectedMachine.year || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Chassi / N° de Série</span>
                <span className="font-mono font-semibold text-slate-800 print:text-black text-[11px] truncate block" title={selectedMachine.serial_number}>
                  {selectedMachine.serial_number || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Data de Aquisição</span>
                <span className="font-semibold text-slate-800 print:text-black">{formatDisplayDate(selectedMachine.acquisition_date)}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Horímetro / KM Inicial</span>
                <span className="font-mono font-bold text-slate-700 print:text-black">{Number(selectedMachine.initial_hour_km || 0).toLocaleString('pt-BR')} h/km</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Horímetro / KM Atual</span>
                <span className="font-mono font-bold text-[#1B3022] print:text-black">{machineData.currentEffectiveHour.toLocaleString('pt-BR')} h/km</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Horas Trabalhadas</span>
                <span className="font-mono font-bold text-emerald-800 print:text-black">+{machineData.hoursWorked.toLocaleString('pt-BR')} h/km</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Fazenda Atual</span>
                <span className="font-semibold text-slate-800 print:text-black">{machineFarm?.name || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-slate-600">Motorista / Responsável</span>
                <span className="font-semibold text-slate-800 print:text-black">{selectedMachine.driver_name || 'Não vinculado'}</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: INDICADORES EXECUTIVOS DE CUSTO E OPERAÇÃO (CARDS COMPACTOS) */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-2.5 flex items-center gap-1.5 print:text-black">
              <Sparkles size={12} className="text-amber-600" />
              2. Resumo Consolidado de Custos e Desempenho Operacional
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl print:bg-white print:border-slate-300">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Combustível Total</span>
                <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block print:text-black">
                  {machineData.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  {machineData.fLogs.length} abastecimento(s)
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl print:bg-white print:border-slate-300">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Custo Combustível</span>
                <span className="text-sm font-bold font-mono text-[#1B3022] mt-0.5 block print:text-black">
                  R$ {machineData.totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  Média: {machineData.avgConsumption ? machineData.avgConsumption.toFixed(2) : '0.00'} L/h
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl print:bg-white print:border-slate-300">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Peças em Oficina</span>
                <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block print:text-black">
                  R$ {machineData.totalPartsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  Reposições e peças
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl print:bg-white print:border-slate-300">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Mão de Obra Oficina</span>
                <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block print:text-black">
                  R$ {machineData.totalLaborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  Serviços mecânicos
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl print:bg-white print:border-slate-300">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Custo Total Oficina</span>
                <span className="text-sm font-bold font-mono text-amber-800 mt-0.5 block print:text-black">
                  R$ {machineData.totalMaintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  {machineData.mLogs.length} serviço(s)
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl print:bg-white print:border-slate-300">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Custo Consolidado</span>
                <span className="text-sm font-bold font-mono text-red-700 mt-0.5 block print:text-black">
                  R$ {machineData.totalOperationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  R$ {machineData.costPerHourWorked.toFixed(2)} / hora
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: PLANO PREVENTIVO E REVISÕES (ITEM MAIS DESTACADO PELO USUÁRIO) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:bg-white print:border-slate-300">
              <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                <Calendar size={13} className="text-[#1B3022]" />
                3. Cronograma do Plano Preventivo e Vencimento de Revisões
              </h3>
              <span className="text-[10px] text-slate-500 font-mono print:text-black">
                Horímetro Base de Referência: <strong>{machineData.currentEffectiveHour.toLocaleString('pt-BR')} h/km</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 print:bg-white print:border-slate-300 print:text-black">
                    <th className="py-2 px-3">Item de Manutenção</th>
                    <th className="py-2 px-2 text-center">Intervalo</th>
                    <th className="py-2 px-2 text-right">Última Realização</th>
                    <th className="py-2 px-2 text-right">Próxima Revisão</th>
                    <th className="py-2 px-2 text-right">Saldo Restante</th>
                    <th className="py-2 px-3 text-center">Status / Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-[11px]">
                  {machineData.prevItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 px-3 text-center italic text-slate-400 print:text-slate-600">
                        Nenhum item do plano preventivo configurado para este equipamento no sistema.
                      </td>
                    </tr>
                  ) : (
                    machineData.prevItems.map((item, idx) => {
                      const nextHourKm = (item.last_performed_hour_km || 0) + (item.interval_hour_km || 0);

                      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                      let statusText = item.status;
                      if (item.status === 'OK') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      } else if (item.status === 'PRÓXIMA') {
                        badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                      } else if (item.status === 'VENCIDA') {
                        badgeClass = 'bg-red-100 text-red-800 border-red-200';
                      }

                      return (
                        <tr key={item.plan_item_id || idx} className="hover:bg-slate-50 print:bg-white">
                          <td className="py-2 px-3 font-semibold text-slate-800 print:text-black">
                            {item.maintenance_item}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[10.5px] text-slate-600 print:text-black">
                            {item.interval_hour_km ? `${item.interval_hour_km} h` : ''} 
                            {item.interval_hour_km && item.interval_days ? ' / ' : ''}
                            {item.interval_days ? `${item.interval_days} d` : ''}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-700 print:text-black">
                            {item.last_performed_hour_km ? `${item.last_performed_hour_km.toLocaleString('pt-BR')} h` : '-'}
                            <span className="text-[9px] text-slate-400 block">
                              {formatDisplayDate(item.last_performed_date)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[10.5px] font-bold text-slate-800 print:text-black">
                            {item.interval_hour_km ? `${nextHourKm.toLocaleString('pt-BR')} h` : '-'}
                            <span className="text-[9px] text-slate-400 block font-normal">
                              {formatDisplayDate(item.next_due_date)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[10.5px] font-bold">
                            <span className={item.hour_km_remaining < 0 ? 'text-red-600' : item.hour_km_remaining <= 50 ? 'text-amber-600' : 'text-emerald-700 print:text-black'}>
                              {item.hour_km_remaining !== undefined ? `${item.hour_km_remaining > 0 ? '+' : ''}${item.hour_km_remaining.toLocaleString('pt-BR')} h` : '-'}
                            </span>
                            <span className={`text-[9px] block font-normal ${item.days_remaining < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              {item.days_remaining !== undefined ? `${item.days_remaining > 0 ? '+' : ''}${item.days_remaining} d` : ''}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeClass} print:border-black`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEÇÃO 4: ORDENS DE SERVIÇO (O.S.) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:bg-white print:border-slate-300">
              <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                <ClipboardList size={13} className="text-[#1B3022]" />
                4. Histórico de Ordens de Serviço (O.S.) ({machineData.wOrders.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 print:bg-white print:border-slate-300 print:text-black">
                    <th className="py-2 px-3">O.S. N°</th>
                    <th className="py-2 px-2">Abertura</th>
                    <th className="py-2 px-3">Motivo / Descrição do Problema</th>
                    <th className="py-2 px-2 text-center">Prioridade</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2">Conclusão</th>
                    <th className="py-2 px-3">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-[11px]">
                  {machineData.wOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-3 px-3 text-center italic text-slate-400 print:text-slate-600">
                        Nenhuma ordem de serviço registrada para este equipamento.
                      </td>
                    </tr>
                  ) : (
                    machineData.wOrders.map((wo) => {
                      const statusColor = wo.status === 'Concluída'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : wo.status === 'Em Andamento'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200';

                      return (
                        <tr key={wo.id} className="hover:bg-slate-50 print:bg-white">
                          <td className="py-2 px-3 font-mono font-bold text-[#1B3022] print:text-black">
                            {wo.os_number ? `OS-${wo.os_number}` : wo.id.substring(0, 8)}
                          </td>
                          <td className="py-2 px-2 text-slate-700 print:text-black font-mono text-[10.5px]">
                            {formatDisplayDate(wo.open_date)}
                          </td>
                          <td className="py-2 px-3 text-slate-800 print:text-black">
                            {wo.reason || wo.description || '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[9.5px] font-bold text-slate-600 print:text-black uppercase">
                              {wo.priority}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${statusColor} print:border-black`}>
                              {wo.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-600 print:text-black font-mono text-[10.5px]">
                            {wo.close_date ? formatDisplayDate(wo.close_date) : '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 print:text-black text-[10.5px]">
                            {wo.assigned_to || wo.responsible || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEÇÃO 5: HISTÓRICO DE MANUTENÇÕES (OFICINAS) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:bg-white print:border-slate-300">
              <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                <Wrench size={13} className="text-[#1B3022]" />
                5. Histórico de Serviços de Oficina e Manutenções ({machineData.mLogs.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-mono print:text-black">
                Total Oficina: <strong>R$ {machineData.totalMaintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 print:bg-white print:border-slate-300 print:text-black">
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-2 text-right">Horímetro</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-3">Serviço Executado</th>
                    <th className="py-2 px-3">Peças Substituídas</th>
                    <th className="py-2 px-2 text-right">Custo Peças</th>
                    <th className="py-2 px-2 text-right">Mão de Obra</th>
                    <th className="py-2 px-2 text-right">Total (R$)</th>
                    <th className="py-2 px-3">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-[11px]">
                  {machineData.mLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-3 px-3 text-center italic text-slate-400 print:text-slate-600">
                        Nenhum registro de manutenção encontrado para esta máquina.
                      </td>
                    </tr>
                  ) : (
                    machineData.mLogs.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 print:bg-white">
                        <td className="py-2 px-3 font-mono text-[10.5px] text-slate-700 print:text-black whitespace-nowrap">
                          {formatDisplayDate(m.date)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-800 print:text-black whitespace-nowrap">
                          {m.hour_km_at_service ? `${m.hour_km_at_service.toLocaleString('pt-BR')} h` : '-'}
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-[9.5px] font-bold uppercase text-slate-600 print:text-black">
                            {m.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-800 print:text-black">
                          {m.service_description}
                        </td>
                        <td className="py-2 px-3 text-slate-600 print:text-black text-[10.5px]">
                          {m.parts_replaced || '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-600 print:text-black whitespace-nowrap">
                          R$ {Number(m.parts_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-600 print:text-black whitespace-nowrap">
                          R$ {Number(m.labor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] font-bold text-slate-900 print:text-black whitespace-nowrap">
                          R$ {Number(m.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-slate-600 print:text-black text-[10.5px]">
                          {m.responsible || m.location_shop || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEÇÃO 6: HISTÓRICO DE ABASTECIMENTOS */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:bg-white print:border-slate-300">
              <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                <Fuel size={13} className="text-[#1B3022]" />
                6. Histórico de Abastecimentos de Combustível ({machineData.fLogs.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-mono print:text-black">
                Total Diesel: <strong>{machineData.totalLiters.toLocaleString('pt-BR')} L</strong> (R$ {machineData.totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 print:bg-white print:border-slate-300 print:text-black">
                    <th className="py-2 px-3">Data / Hora</th>
                    <th className="py-2 px-2 text-right">Horímetro/KM</th>
                    <th className="py-2 px-2">Combustível</th>
                    <th className="py-2 px-2 text-right">Litros</th>
                    <th className="py-2 px-2 text-right">Preço/L</th>
                    <th className="py-2 px-2 text-right">Valor Total (R$)</th>
                    <th className="py-2 px-2 text-center">Consumo Médio</th>
                    <th className="py-2 px-3">Fornecedor / Posto</th>
                    <th className="py-2 px-3">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-[11px]">
                  {machineData.fLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-3 px-3 text-center italic text-slate-400 print:text-slate-600">
                        Nenhum abastecimento registrado para este equipamento.
                      </td>
                    </tr>
                  ) : (
                    machineData.fLogs.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 print:bg-white">
                        <td className="py-2 px-3 font-mono text-[10.5px] text-slate-700 print:text-black whitespace-nowrap">
                          {formatDisplayDateTime(f.date)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-800 print:text-black whitespace-nowrap">
                          {f.hour_km_at_fueling ? `${f.hour_km_at_fueling.toLocaleString('pt-BR')} h` : '-'}
                        </td>
                        <td className="py-2 px-2 text-slate-700 print:text-black text-[10.5px]">
                          {f.fuel_type || 'Diesel'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] font-bold text-slate-800 print:text-black whitespace-nowrap">
                          {Number(f.liters_supplied || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-600 print:text-black whitespace-nowrap">
                          R$ {Number(f.price_per_liter || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[10.5px] font-bold text-[#1B3022] print:text-black whitespace-nowrap">
                          R$ {Number(f.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[10.5px] text-slate-600 print:text-black">
                          {f.consumption_rate ? `${Number(f.consumption_rate).toFixed(2)} L/h` : '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 print:text-black text-[10.5px]">
                          {f.supplier || '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 print:text-black text-[10.5px]">
                          {f.responsible || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEÇÃO 7: HISTÓRICO DE CHECKLISTS (VISTORIAS 7 DIAS) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:bg-white print:border-slate-300">
              <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                <CheckSquare size={13} className="text-[#1B3022]" />
                7. Histórico de Vistorias e Checklists Operacionais ({machineData.chkLogs.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 print:bg-white print:border-slate-300 print:text-black">
                    <th className="py-2 px-3">Data / Hora</th>
                    <th className="py-2 px-2 text-right">Horímetro</th>
                    <th className="py-2 px-3">Operador / Inspetor</th>
                    <th className="py-2 px-2 text-center">Status Geral</th>
                    <th className="py-2 px-4">Observações e Itens Reprovados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-[11px]">
                  {machineData.chkLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-center italic text-slate-400 print:text-slate-600">
                        Nenhuma vistoria ou checklist registrado para este equipamento.
                      </td>
                    </tr>
                  ) : (
                    machineData.chkLogs.map((c) => {
                      let chkColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (c.overall_status === 'OK') {
                        chkColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      } else if (c.overall_status === 'Necessita Atenção' || c.overall_status === 'Prioridade Média' || c.overall_status === 'Prioridade Baixa') {
                        chkColor = 'bg-amber-50 text-amber-800 border-amber-200';
                      } else {
                        chkColor = 'bg-red-50 text-red-800 border-red-200';
                      }

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 print:bg-white">
                          <td className="py-2 px-3 font-mono text-[10.5px] text-slate-700 print:text-black whitespace-nowrap">
                            {formatDisplayDateTime(c.date)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-[10.5px] text-slate-800 print:text-black whitespace-nowrap">
                            {c.hour_km ? `${c.hour_km.toLocaleString('pt-BR')} h` : '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-800 print:text-black font-medium">
                            {c.operator_name || '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${chkColor} print:border-black`}>
                              {c.overall_status}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-slate-700 print:text-black text-[10.5px]">
                            {c.failed_items_notes || <span className="text-slate-400 italic font-normal">Nenhuma não conformidade apontada</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CAMPO DE ASSINATURA E TERMO TÉCNICO (VISÍVEL NO PRINT) */}
          <div className="hidden print:block border-t border-slate-400 mt-10 pt-6 text-black">
            <div className="grid grid-cols-2 gap-10">
              <div className="text-center">
                <div className="border-t border-black w-52 mx-auto mt-6" />
                <p className="text-[10px] font-bold uppercase mt-1">Encarregado de Manutenção / Oficina</p>
                <p className="text-[9px] text-slate-600 mt-0.5">Responsável pela inspeção técnica do ativo</p>
              </div>
              <div className="text-center">
                <div className="border-t border-black w-52 mx-auto mt-6" />
                <p className="text-[10px] font-bold uppercase mt-1">Gerente de Operações / Frota</p>
                <p className="text-[9px] text-slate-600 mt-0.5">Homologação e conferência de registros</p>
              </div>
            </div>
            <div className="text-center text-[8px] text-slate-500 font-mono mt-6">
              Dossiê emitido via Plataforma Agropecuária Boa Sorte • Página Oficial de Conferência Operacional
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
