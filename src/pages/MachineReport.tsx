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
  Info, Sparkles, Filter, ChevronRight, Check, ChevronDown, 
  Eye, ShieldCheck, ShieldX, X
} from 'lucide-react';
import { formatDisplayDate, formatDisplayDateTime } from '../lib/dateUtils';
import AppLogo from '../components/AppLogo';
import Modal from '../components/Modal';
import { 
  COMPONENT_ITEMS, FLUID_LEVEL_ITEMS, REVISION_ITEMS, 
  COMPLEMENTARY_ITEMS, getValidityStatus 
} from './Checklist';

export interface ParsedInspectionInfo {
  isJson: boolean;
  rawText?: string;
  evalStatus?: string;
  operatorNotes?: string;
  complementaryNotes?: string;
  revisionNotes?: string;
  horimetroRevisao?: string;
  horimetroProximo?: string;
  failedItems: { name: string; val: string }[];
  conformItems: { name: string; val: string }[];
  naItems: { name: string; val: string }[];
  allItems: { name: string; val: string }[];
  totalAudited: number;
}

export function parseInspectionDetails(notesStr?: string, details?: any): ParsedInspectionInfo {
  let parsed: any = null;
  if (notesStr) {
    try {
      parsed = JSON.parse(notesStr);
    } catch {
      // String regular
    }
  }

  const itemData: Record<string, string> = (parsed && typeof parsed === 'object' && parsed.pdfItems)
    ? parsed.pdfItems
    : (details && typeof details === 'object' ? details : {});

  const hasItems = Object.keys(itemData).length > 0;
  const isJson = !!parsed || hasItems;

  const allItems: { name: string; val: string }[] = [];
  const failedItems: { name: string; val: string }[] = [];
  const conformItems: { name: string; val: string }[] = [];
  const naItems: { name: string; val: string }[] = [];

  if (hasItems) {
    // Manter a ordem canônica dos itens caso existam nas listas padrão do sistema (sem duplicatas)
    const canonicalOrder = Array.from(new Set([
      ...COMPONENT_ITEMS,
      ...FLUID_LEVEL_ITEMS,
      ...REVISION_ITEMS,
      ...COMPLEMENTARY_ITEMS
    ]));

    const addedKeys = new Set<string>();

    canonicalOrder.forEach(item => {
      if (!addedKeys.has(item) && itemData[item] !== undefined) {
        const rawVal = itemData[item];
        const val = String(rawVal).trim().toUpperCase();
        const entry = { name: item, val: rawVal };
        allItems.push(entry);
        addedKeys.add(item);
        if (val === 'NÃO' || val === 'NAO' || val === 'REPROVADO' || val === 'FALSE') {
          failedItems.push(entry);
        } else if (val === 'SIM' || val === 'OK' || val === 'TRUE' || val === 'CONFORME') {
          conformItems.push(entry);
        } else {
          naItems.push(entry);
        }
      }
    });

    // Itens que não constavam na lista canônica padrão
    Object.entries(itemData).forEach(([name, rawVal]) => {
      if (!addedKeys.has(name)) {
        const val = String(rawVal).trim().toUpperCase();
        const entry = { name, val: rawVal as string };
        allItems.push(entry);
        addedKeys.add(name);
        if (val === 'NÃO' || val === 'NAO' || val === 'REPROVADO' || val === 'FALSE') {
          failedItems.push(entry);
        } else if (val === 'SIM' || val === 'OK' || val === 'TRUE' || val === 'CONFORME') {
          conformItems.push(entry);
        } else {
          naItems.push(entry);
        }
      }
    });
  } else {
    // Caso o checklist não tenha o objeto individual de itens salvo, preenche com os itens canônicos padrão do sistema sem duplicatas
    const canonicalOrder = Array.from(new Set([
      ...COMPONENT_ITEMS,
      ...FLUID_LEVEL_ITEMS,
      ...REVISION_ITEMS,
      ...COMPLEMENTARY_ITEMS
    ]));
    canonicalOrder.forEach(item => {
      const entry = { name: item, val: 'SIM' };
      allItems.push(entry);
      conformItems.push(entry);
    });
  }

  const operatorNotes = parsed?.notes || (!isJson && notesStr ? notesStr : '');
  const complementaryNotes = parsed?.informacoesComplementares || '';
  const revisionNotes = parsed?.obsProximaRevisao || '';
  const horimetroRevisao = parsed?.horimetroRevisao || '';
  const horimetroProximo = parsed?.horimetroProximo || '';
  const evalStatus = parsed?.evalStatus || '';

  return {
    isJson,
    rawText: !isJson ? notesStr : undefined,
    evalStatus,
    operatorNotes,
    complementaryNotes,
    revisionNotes,
    horimetroRevisao,
    horimetroProximo,
    failedItems,
    conformItems,
    naItems,
    allItems,
    totalAudited: allItems.length
  };
}

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

  // Estados para itens de Checklist e Vistorias (Item 7)
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});
  const [expandAllChecklists, setExpandAllChecklists] = useState(false);
  const [selectedChecklistForModal, setSelectedChecklistForModal] = useState<Checklist30d | null>(null);
  const [modalViewTab, setModalViewTab] = useState<'componentes' | 'niveis' | 'revisoes' | 'complementares'>('componentes');

  const toggleChecklistExpand = (id: string) => {
    setExpandedChecklists(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Seleção de seções ativas para o Relatório/PDF (1 a 7)
  const [selectedSections, setSelectedSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true
  });

  const toggleSection = (sectionNum: number) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionNum]: !prev[sectionNum]
    }));
  };

  const selectAllSections = () => {
    setSelectedSections({
      1: true,
      2: true,
      3: true,
      4: true,
      5: true,
      6: true,
      7: true
    });
  };

  const deselectAllSections = () => {
    setSelectedSections({
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false
    });
  };

  const selectedSectionsCount = useMemo(() => {
    return Object.values(selectedSections).filter(Boolean).length;
  }, [selectedSections]);

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
    if (!selectedMachine || selectedSectionsCount === 0) return;
    window.print();
  };

  // Ação de Exportar CSV (Excel formatado para padrão brasileiro com delimitador ';' e BOM UTF-8)
  const handleExportCsv = () => {
    if (!selectedMachine || !machineData || selectedSectionsCount === 0) return;

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
    rows.push(`"Seções Selecionadas";"${selectedSectionsCount} de 7"`);
    rows.push('');

    // SEÇÃO 1: FICHA CADASTRAL
    if (selectedSections[1]) {
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
    }

    // SEÇÃO 2: INDICADORES CONSOLIDADOS E CUSTOS
    if (selectedSections[2]) {
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
    }

    // SEÇÃO 3: CRONOGRAMA DO PLANO PREVENTIVO
    if (selectedSections[3]) {
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
    }

    // SEÇÃO 4: ORDENS DE SERVIÇO
    if (selectedSections[4]) {
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
    }

    // SEÇÃO 5: HISTÓRICO DE MANUTENÇÕES
    if (selectedSections[5]) {
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
    }

    // SEÇÃO 6: HISTÓRICO DE ABASTECIMENTOS
    if (selectedSections[6]) {
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
    }

    // SEÇÃO 7: HISTÓRICO DE CHECKLISTS
    if (selectedSections[7]) {
      rows.push(`"--- 7. HISTÓRICO DE CHECKLISTS E VISTORIAS 7 DIAS ---"`);
      rows.push(`"Data da Vistoria";"Horímetro/KM";"Operador / Inspetor";"Status Geral";"Observações / Resumo";"Relação Completa de Itens Inspecionados"`);
      if (machineData.chkLogs.length > 0) {
        machineData.chkLogs.forEach(c => {
          const info = parseInspectionDetails(c.failed_items_notes, c.details);
          const notesParts: string[] = [];
          if (info.failedItems.length > 0) {
            notesParts.push(`ITENS REPROVADOS (${info.failedItems.length}): ` + info.failedItems.map(i => `${i.name} [NÃO]`).join(', '));
          } else if (info.totalAudited > 0) {
            notesParts.push(`Todos os ${info.totalAudited} itens auditados conformes (OK)`);
          }
          if (info.operatorNotes) {
            notesParts.push(`Obs: ${info.operatorNotes}`);
          }
          if (info.complementaryNotes) {
            notesParts.push(`Complementar: ${info.complementaryNotes}`);
          }
          if (info.revisionNotes) {
            notesParts.push(`Próxima Revisão: ${info.revisionNotes}`);
          }
          if (info.rawText && notesParts.length === 0) {
            notesParts.push(info.rawText);
          }
          const formattedNotes = notesParts.join(' | ') || '-';
          const fullItemsStr = info.allItems.length > 0
            ? info.allItems.map(i => `${i.name}: ${i.val}`).join(' | ')
            : '-';

          rows.push([
            escapeCsv(formatDisplayDateTime(c.date)),
            escapeCsv(formatNumberBr(c.hour_km, 1)),
            escapeCsv(c.operator_name),
            escapeCsv(c.overall_status),
            escapeCsv(formattedNotes),
            escapeCsv(fullItemsStr)
          ].join(';'));
        });
      } else {
        rows.push(`"Nenhuma vistoria checklist registrada para este equipamento"`);
      }
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
              disabled={!selectedMachine || selectedSectionsCount === 0}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              title={selectedSectionsCount === 0 ? 'Selecione ao menos uma seção abaixo para exportar' : 'Baixar planilha completa compatível com Microsoft Excel'}
            >
              <Download size={15} />
              <span>Exportar CSV ({selectedSectionsCount}/7)</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={!selectedMachine || selectedSectionsCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B3022] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              title={selectedSectionsCount === 0 ? 'Selecione ao menos uma seção abaixo para gerar o PDF' : 'Imprimir ou Salvar em formato PDF'}
            >
              <Printer size={15} />
              <span>Salvar em PDF / Imprimir ({selectedSectionsCount}/7)</span>
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs relative text-slate-800 print:p-0 print:border-none print:shadow-none print:text-black space-y-6 print:space-y-2">

          {/* CABEÇALHO OFICIAL DO LAUDO (PRINT / TELA) */}
          <div className="border-b-2 border-[#1B3022] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border-black print:pb-1.5 print:mb-1">
            <div className="flex items-center gap-3">
              <AppLogo 
                className="w-12 h-12 rounded-full border border-amber-400/50 object-cover shadow-sm shrink-0 print:w-10 print:h-10" 
                alt="Logo Agropecuária Boa Sorte" 
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-amber-800 uppercase bg-amber-100/80 px-2 py-0.5 rounded print:border print:border-black print:text-[9px] print:py-0 print:px-1.5">
                    GRUPO AGROPECUÁRIA BOA SORTE
                  </span>
                  <span className="text-[10px] print:text-[9px] text-slate-500 font-mono print:text-black">
                    • DOSSIÊ TÉCNICO DO ATIVO
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1 print:text-black uppercase print:text-base print:mt-0.5">
                  {selectedMachine.code} • {selectedMachine.name}
                </h1>
                <p className="text-xs text-slate-600 print:text-black print:text-[10px]">
                  Fazenda: <strong>{machineFarm?.name || 'Não informada'}</strong> {machineFarm?.location ? `(${machineFarm.location})` : ''} • Operador Titular: <strong>{selectedMachine.driver_name || 'Não vinculado'}</strong>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-[10px] print:text-[9px] text-slate-500 font-mono print:text-black shrink-0">
              <p className="font-bold">EMISSÃO: {formatDisplayDateTime(new Date().toISOString())}</p>
              <p className="text-slate-400 print:text-slate-600">Sistema Digital de Frotas • Fuso Cuiabá/MT</p>
              <div className="mt-1.5 print:mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 print:py-0 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 print:border-black">
                <span>STATUS:</span>
                <span className="uppercase">{selectedMachine.status}</span>
              </div>
            </div>
          </div>

          {/* BARRA DE CONTROLE RÁPIDO DAS SEÇÕES PARA O LAUDO (PRINT:HIDDEN) */}
          <div className="print:hidden bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-[#1B3022] shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Caixas de seleção de parágrafos do relatório (1 a 7):
                </span>
                <span className="text-[11px] text-slate-500">
                  Marque ou desmarque para incluir ou retirar do PDF/impressão
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200 ml-1 shrink-0">
                {selectedSectionsCount} de 7 ativas
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={selectAllSections}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-emerald-50 cursor-pointer transition-colors"
              >
                Marcar Todas
              </button>
              <button
                type="button"
                onClick={deselectAllSections}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Desmarcar Todas
              </button>
            </div>
          </div>

          {/* AVISO SE NENHUMA SEÇÃO SELECIONADA */}
          {selectedSectionsCount === 0 && (
            <div className="p-8 text-center bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-xl">
              <AlertTriangle size={32} className="mx-auto text-amber-600 mb-2" />
              <p className="text-sm font-bold text-slate-800">Nenhum parágrafo/seção selecionado para o relatório</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Marque uma ou mais caixinhas de diálogo (1 a 7) abaixo para autorizar o conteúdo a ser exibido e impresso no PDF.
              </p>
              <button
                type="button"
                onClick={selectAllSections}
                className="mt-3 px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Marcar Todas as 7 Seções
              </button>
            </div>
          )}

          {/* SEÇÃO 1: DADOS CADASTRAIS E TÉCNICOS (GRID COMPACTA) */}
          {selectedSections[1] ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 print:bg-white print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 print:border-slate-300">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[1]}
                      onChange={() => toggleSection(1)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5 print:text-black">
                    <Info size={12} className="text-[#1B3022]" />
                    1. Ficha Cadastral e Especificações do Fabricante
                  </h3>
                </div>
                <span className="text-[9.5px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 print:hidden font-bold">
                  Ativo no Laudo
                </span>
              </div>

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
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(1)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    1. Ficha Cadastral e Especificações do Fabricante
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(1)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* SEÇÃO 2: INDICADORES EXECUTIVOS DE CUSTO E OPERAÇÃO (CARDS COMPACTOS) */}
          {selectedSections[2] ? (
            <div className="bg-slate-50/60 border border-slate-200 p-4 rounded-xl print:bg-white print:border-none print:p-0">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5 print:border-slate-300">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[2]}
                      onChange={() => toggleSection(2)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5 print:text-black">
                    <Sparkles size={12} className="text-amber-600" />
                    2. Resumo Consolidado de Custos e Desempenho Operacional
                  </h3>
                </div>
                <span className="text-[9.5px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 print:hidden font-bold">
                  Ativo no Laudo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl print:border-slate-300">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Combustível Total</span>
                  <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block print:text-black">
                    {machineData.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    {machineData.fLogs.length} abastecimento(s)
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-xl print:border-slate-300">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Custo Combustível</span>
                  <span className="text-sm font-bold font-mono text-[#1B3022] mt-0.5 block print:text-black">
                    R$ {machineData.totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Média: {machineData.avgConsumption ? machineData.avgConsumption.toFixed(2) : '0.00'} L/h
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-xl print:border-slate-300">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Peças em Oficina</span>
                  <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block print:text-black">
                    R$ {machineData.totalPartsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Reposições e peças
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-xl print:border-slate-300">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Mão de Obra Oficina</span>
                  <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block print:text-black">
                    R$ {machineData.totalLaborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Serviços mecânicos
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-xl print:border-slate-300">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block print:text-slate-600">Custo Total Oficina</span>
                  <span className="text-sm font-bold font-mono text-amber-800 mt-0.5 block print:text-black">
                    R$ {machineData.totalMaintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    {machineData.mLogs.length} serviço(s)
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-xl print:border-slate-300">
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
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(2)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    2. Resumo Consolidado de Custos e Desempenho Operacional
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(2)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* SEÇÃO 3: PLANO PREVENTIVO E REVISÕES (ITEM MAIS DESTACADO PELO USUÁRIO) */}
          {selectedSections[3] ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[3]}
                      onChange={() => toggleSection(3)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                    <Calendar size={13} className="text-[#1B3022]" />
                    3. Cronograma do Plano Preventivo e Vencimento de Revisões
                  </h3>
                </div>
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
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(3)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    3. Cronograma do Plano Preventivo e Vencimento de Revisões
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(3)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* SEÇÃO 4: ORDENS DE SERVIÇO (O.S.) */}
          {selectedSections[4] ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:bg-white print:border-slate-300">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[4]}
                      onChange={() => toggleSection(4)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                    <ClipboardList size={13} className="text-[#1B3022]" />
                    4. Histórico de Ordens de Serviço (O.S.) ({machineData.wOrders.length})
                  </h3>
                </div>
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
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(4)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    4. Histórico de Ordens de Serviço (O.S.)
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(4)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* SEÇÃO 5: HISTÓRICO DE MANUTENÇÕES (OFICINAS) */}
          {selectedSections[5] ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[5]}
                      onChange={() => toggleSection(5)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                    <Wrench size={13} className="text-[#1B3022]" />
                    5. Histórico de Serviços de Oficina e Manutenções ({machineData.mLogs.length})
                  </h3>
                </div>
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
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(5)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    5. Histórico de Serviços de Oficina e Manutenções
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(5)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* SEÇÃO 6: HISTÓRICO DE ABASTECIMENTOS */}
          {selectedSections[6] ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[6]}
                      onChange={() => toggleSection(6)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                    <Fuel size={13} className="text-[#1B3022]" />
                    6. Histórico de Abastecimentos de Combustível ({machineData.fLogs.length})
                  </h3>
                </div>
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
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(6)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    6. Histórico de Abastecimentos de Combustível
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(6)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* SEÇÃO 7: HISTÓRICO DE CHECKLISTS (VISTORIAS 7 DIAS) */}
          {selectedSections[7] ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
              <div className="p-3 print:py-1.5 print:px-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-white print:border-slate-300 print:break-inside-avoid">
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none print:hidden bg-white border border-slate-300 hover:border-emerald-600 px-2 py-0.5 rounded-md shadow-2xs transition-colors" title="Desmarque para não incluir esta seção no PDF">
                    <input
                      type="checkbox"
                      checked={selectedSections[7]}
                      onChange={() => toggleSection(7)}
                      className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Incluir no PDF</span>
                  </label>
                  <h3 className="text-[10px] print:text-[9.5px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5 print:text-black">
                    <CheckSquare size={13} className="text-[#1B3022]" />
                    7. Histórico de Vistorias e Checklists Operacionais ({machineData.chkLogs.length})
                  </h3>
                </div>

                {machineData.chkLogs.length > 0 && (
                  <div className="flex items-center gap-2 print:hidden">
                    <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={expandAllChecklists}
                        onChange={(e) => setExpandAllChecklists(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                      />
                      <span>Expandir todos os itens na tela</span>
                    </label>
                    <span className="hidden md:inline-block text-[9.5px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Relação completa de itens gerada automaticamente no PDF
                    </span>
                  </div>
                )}
              </div>

              {/* CORPO DA SEÇÃO 7: LISTAGEM DE VISTORIAS E RELAÇÃO COMPLETA CENTRALIZADA */}
              <div className="p-3 space-y-4 print:p-0 print:space-y-2">
                {machineData.chkLogs.length === 0 ? (
                  <div className="py-6 text-center italic text-slate-400 print:text-slate-600 text-xs">
                    Nenhuma vistoria ou checklist registrado para este equipamento.
                  </div>
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

                    const info = parseInspectionDetails(c.failed_items_notes, c.details);
                    const isExpanded = expandAllChecklists || !!expandedChecklists[c.id];

                    return (
                      <div 
                        key={c.id} 
                        className="border border-slate-200 print:border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs print:shadow-none print:rounded-none"
                      >
                        {/* 1. LINHA SUPERIOR ÚNICA: DATA/HORA, HORÍMETRO, OPERADOR E STATUS GERAL (100% DA LARGURA) */}
                        <div className="bg-slate-50 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 px-3 py-2 print:py-1 print:px-2 flex flex-wrap items-center justify-between gap-y-1 gap-x-3 print:break-inside-avoid">
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-slate-500 print:text-slate-700 tracking-wider">Data / Hora:</span>
                              <span className="font-mono font-bold text-slate-900 print:text-black text-[11px] print:text-[10px]">
                                {formatDisplayDateTime(c.date)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-slate-500 print:text-slate-700 tracking-wider">Horímetro:</span>
                              <span className="font-mono font-bold text-slate-900 print:text-black text-[11px] print:text-[10px]">
                                {c.hour_km ? `${c.hour_km.toLocaleString('pt-BR')} h` : '-'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-slate-500 print:text-slate-700 tracking-wider">Operador / Inspetor:</span>
                              <span className="font-bold text-slate-900 print:text-black uppercase text-[11px] print:text-[10px]">
                                {c.operator_name || '-'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-slate-500 print:text-slate-700 tracking-wider">Status Geral:</span>
                              <span className={`inline-flex px-2 py-0.5 print:py-0 print:px-1.5 rounded text-[9.5px] print:text-[8.5px] font-extrabold border uppercase ${chkColor} print:border-black`}>
                                {c.overall_status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9.5px] print:text-[8.5px] font-bold text-emerald-800 bg-emerald-50 print:bg-white px-2 py-0.5 print:py-0 rounded border border-emerald-200 print:border-emerald-700">
                              {info.conformItems.length} OK ({Math.round((info.conformItems.length / (info.allItems.length || 1)) * 100)}% Conformidade)
                            </span>

                            {/* Botões de Ação na Tela (Ocultos na Impressão) */}
                            <div className="flex items-center gap-1 print:hidden">
                              <button
                                type="button"
                                onClick={() => toggleChecklistExpand(c.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded cursor-pointer transition-all"
                              >
                                <ChevronRight size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                <span>{isExpanded ? 'Recolher na tela' : 'Expandir na tela'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedChecklistForModal(c)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded cursor-pointer transition-colors"
                                title="Abrir laudo técnico completo"
                              >
                                <Eye size={12} />
                                <span>Laudo Oficial</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 2. CORPO DA VISTORIA: ITENS REPROVADOS, OBSERVAÇÕES E RELAÇÃO COMPLETA CENTRALIZADA (100% DA LARGURA) */}
                        <div className="p-3 space-y-2.5 print:p-1.5 print:space-y-1.5">
                          {/* 2.1. ALERTAS DE ITENS REPROVADOS (SE HOUVER) */}
                          {info.failedItems.length > 0 && (
                            <div className="border border-rose-200 bg-rose-50/90 rounded-lg p-2.5 print:p-1.5 print:bg-rose-50 print:border-rose-400 print:break-inside-avoid">
                              <div className="flex items-center justify-between text-[10px] font-extrabold text-rose-900 uppercase tracking-wider mb-1.5 print:mb-1">
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle size={13} className="text-rose-600 shrink-0 print:w-3 print:h-3" />
                                  Itens Reprovados / Não Conformes ({info.failedItems.length}):
                                </span>
                                <span className="font-mono text-[9px] print:text-[8px] bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded border border-rose-300">
                                  Ação Requerida
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-1.5 print:gap-1">
                                {info.failedItems.map((item, idx) => (
                                  <div
                                    key={`${item.name}-${idx}`}
                                    className="flex items-center justify-between py-1 px-2 print:py-0.5 print:px-1.5 bg-white border border-rose-200 rounded text-[10.5px] print:text-[8px]"
                                  >
                                    <span className="font-bold text-rose-950 pr-1.5 leading-tight truncate">{item.name}</span>
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8.5px] print:text-[7px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                      <Check size={10} className="stroke-[3] rotate-180 print:w-2.5 print:h-2.5" />
                                      NÃO
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2.2. RELATO DO OPERADOR / OBSERVAÇÕES */}
                          {info.operatorNotes && (
                            <div className="bg-slate-50 print:bg-white border border-slate-200 print:border-slate-300 rounded-lg p-2.5 print:p-1.5 text-[11px] print:text-[9px] print:break-inside-avoid">
                              <span className="font-bold text-slate-700 print:text-black text-[9.5px] print:text-[8px] block uppercase tracking-wider mb-0.5">
                                Relato do Operador / Observação:
                              </span>
                              <p className="italic text-slate-800 print:text-black font-serif leading-relaxed">
                                &ldquo;{info.operatorNotes}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* 2.3. REVISÃO E COMPLEMENTARES */}
                          {(info.revisionNotes || info.horimetroRevisao || info.horimetroProximo || info.complementaryNotes) && (
                            <div className="bg-emerald-50/60 print:bg-white border border-emerald-200 print:border-slate-300 rounded-lg p-2 print:p-1.5 text-[10.5px] print:text-[8.5px] print:break-inside-avoid">
                              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9.5px] print:text-[8px] text-emerald-900 font-semibold mb-0.5">
                                {info.horimetroRevisao && <span>Revisão Realizada: {info.horimetroRevisao}h</span>}
                                {info.horimetroProximo && <span>Próxima Revisão: {info.horimetroProximo}h</span>}
                              </div>
                              {info.revisionNotes && <p className="text-emerald-950 font-medium">{info.revisionNotes}</p>}
                              {info.complementaryNotes && <p className="text-slate-600 mt-1">{info.complementaryNotes}</p>}
                            </div>
                          )}

                          {/* 2.4. RELAÇÃO COMPLETA DOS ITENS INSPECIONADOS - CENTRALIZADA E OCUPANDO TODA A PÁGINA */}
                          {info.allItems.length > 0 && (
                            <div className={`border border-slate-200 print:border-slate-300 rounded-lg overflow-hidden bg-white ${
                              isExpanded ? 'block' : 'hidden print:block'
                            }`}>
                              {/* Cabeçalho da Relação */}
                              <div className="px-3 py-1.5 print:py-1 print:px-2 bg-slate-100 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 flex items-center justify-between text-[9.5px] print:text-[8px] font-bold text-slate-700 uppercase tracking-wider print:text-black print:break-inside-avoid">
                                <span className="flex items-center gap-2">
                                  <span>Relação Completa dos Itens Inspecionados ({info.allItems.length})</span>
                                  <span className="font-mono text-[8.5px] print:text-[7.5px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded print:border-emerald-600 print:text-emerald-900">
                                    {info.conformItems.length} CONFORME (SIM)
                                  </span>
                                  {info.failedItems.length > 0 && (
                                    <span className="font-mono text-[8.5px] print:text-[7.5px] text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded print:border-rose-600 print:text-rose-900">
                                      {info.failedItems.length} NÃO CONFORME (NÃO)
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono text-[9px] print:text-[8px] text-slate-600 print:text-black font-semibold">
                                  Conformidade: {Math.round((info.conformItems.length / info.allItems.length) * 100)}%
                                </span>
                              </div>

                              {/* Grade Centralizada em 3 Colunas na Folha Inteira de Ponta a Ponta */}
                              <div className="p-2 print:p-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-1.5 print:gap-1">
                                {info.allItems.map((item, idx) => {
                                  const isOk = item.val === 'SIM' || item.val === 'OK' || item.val === 'TRUE';
                                  const isFailed = item.val === 'NÃO' || item.val === 'NAO' || item.val === 'REPROVADO';
                                  return (
                                    <div
                                      key={`${item.name}-${idx}`}
                                      className={`flex items-center justify-between py-1 px-2 print:py-0.5 print:px-1.5 rounded text-[10px] print:text-[8px] border print:break-inside-avoid ${
                                        isFailed
                                          ? 'bg-rose-50 border-rose-200 text-rose-950 font-semibold print:border-rose-400 print:bg-rose-50'
                                          : isOk
                                          ? 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200 text-slate-800 print:bg-white print:border-slate-200'
                                          : 'bg-slate-50 border-slate-200 text-slate-700 print:bg-white'
                                      }`}
                                    >
                                      <span className={`pr-1.5 leading-tight truncate ${isFailed ? 'text-rose-950 font-bold print:text-rose-900' : 'text-slate-800 print:text-black'}`}>
                                        {item.name}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8.5px] print:text-[7px] font-black shrink-0 flex items-center gap-0.5 ${
                                          isOk
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 print:border-emerald-600 print:text-emerald-900'
                                            : isFailed
                                            ? 'bg-rose-100 text-rose-800 border border-rose-300 print:border-rose-600 print:text-rose-900'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {isOk ? (
                                          <>
                                            <Check size={10} className="stroke-[3] print:w-2.5 print:h-2.5" />
                                            <span>SIM</span>
                                          </>
                                        ) : isFailed ? (
                                          <>
                                            <Check size={10} className="stroke-[3] rotate-180 print:w-2.5 print:h-2.5" />
                                            <span>NÃO</span>
                                          </>
                                        ) : (
                                          <span>{item.val || 'N/A'}</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="print:hidden border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSection(7)}
                    className="w-4 h-4 rounded text-[#1B3022] accent-[#1B3022] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    7. Histórico de Vistorias e Checklists Operacionais
                  </span>
                </label>
                <span className="text-[9.5px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Desmarcado (Não sairá no PDF)
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection(7)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
              >
                + Marcar para o PDF
              </button>
            </div>
          )}

          {/* CAMPO DE ASSINATURA E TERMO TÉCNICO (VISÍVEL NO PRINT) */}
          <div className="hidden print:block border-t border-slate-400 mt-10 pt-6 text-black print:mt-3 print:pt-2 print:break-inside-avoid">
            <div className="grid grid-cols-2 gap-10 print:gap-4">
              <div className="text-center">
                <div className="border-t border-black w-48 mx-auto mt-4 print:mt-2" />
                <p className="text-[10px] print:text-[8px] font-bold uppercase mt-1">Encarregado de Manutenção / Oficina</p>
                <p className="text-[9px] print:text-[7px] text-slate-600 mt-0.5">Responsável pela inspeção técnica do ativo</p>
              </div>
              <div className="text-center">
                <div className="border-t border-black w-48 mx-auto mt-4 print:mt-2" />
                <p className="text-[10px] print:text-[8px] font-bold uppercase mt-1">Gerente de Operações / Frota</p>
                <p className="text-[9px] print:text-[7px] text-slate-600 mt-0.5">Homologação e conferência de registros</p>
              </div>
            </div>
            <div className="text-center text-[8px] print:text-[7px] text-slate-500 font-mono mt-4 print:mt-1.5">
              Dossiê emitido via Plataforma Agropecuária Boa Sorte • Página Oficial de Conferência Operacional
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE LAUDO TÉCNICO OFICIAL DO CHECKLIST */}
      {selectedChecklistForModal && (() => {
        const parsed = parseInspectionDetails(selectedChecklistForModal.failed_items_notes, selectedChecklistForModal.details);
        const itemData: Record<string, string> = (selectedChecklistForModal.details) || (parsed.allItems.reduce((acc, cur) => {
          acc[cur.name] = cur.val;
          return acc;
        }, {} as Record<string, string>));

        const val = getValidityStatus(selectedChecklistForModal.date);
        const st = selectedChecklistForModal.overall_status || 'OK';

        const renderModalViewGrid = (itemsList: string[]) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {itemsList.map((item, idx) => {
              const valItem = itemData[item] || 'SIM';
              const isOk = valItem === 'SIM' || valItem === 'OK' || valItem === 'TRUE';
              const isFailed = valItem === 'NÃO' || valItem === 'NAO' || valItem === 'REPROVADO';
              return (
                <div key={`${item}-${idx}`} className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded-lg">
                  <span className="text-slate-700 font-medium pr-2">{item}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 flex items-center justify-center ${
                    isOk
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : isFailed
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isOk ? (
                      <Check size={14} className="stroke-[3]" />
                    ) : isFailed ? (
                      <Check size={14} className="stroke-[3] rotate-180" />
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        );

        return (
          <Modal
            isOpen={!!selectedChecklistForModal}
            onClose={() => setSelectedChecklistForModal(null)}
            title="Laudo Técnico Oficial de Vistoria"
          >
            <div className="space-y-4">
              {/* CABEÇALHO DO LAUDO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Equipamento</span>
                  <strong className="text-slate-800 text-sm">{selectedMachine?.name || 'Equipamento'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Data da Inspeção</span>
                  <strong className="text-slate-800">{formatDisplayDateTime(selectedChecklistForModal.date)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Horímetro / KM</span>
                  <strong className="text-slate-800 font-mono">
                    {selectedChecklistForModal.hour_km ? `${selectedChecklistForModal.hour_km.toLocaleString('pt-BR')} h` : '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Operador / Inspetor</span>
                  <strong className="text-slate-800">{selectedChecklistForModal.operator_name || '-'}</strong>
                </div>
              </div>

              {/* STATUS E VALIDADE */}
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

                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  {st === 'OK' ? (
                    <>
                      <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-700 uppercase text-xs">OK - Equipamento Liberado</p>
                        <p className="text-[10px] text-slate-500">Componentes de segurança e operacionais sem risco grave de pane.</p>
                      </div>
                    </>
                  ) : st === 'Prioridade Alta (Máquina Parada)' || st.toLowerCase().includes('alta') ? (
                    <>
                      <ShieldX size={24} className="text-rose-600 shrink-0" />
                      <div>
                        <p className="font-bold text-rose-700 uppercase text-xs">Prioridade Alta (Máquina Parada)</p>
                        <p className="text-[10px] text-slate-500">Avaria crítica detectada. Equipamento bloqueado para operação.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={24} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="font-bold text-amber-700 uppercase text-xs">{st} - Atenção Requerida</p>
                        <p className="text-[10px] text-slate-500">Inconformidades operacionais que exigem agendamento de reparo.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SEÇÕES DE EXIBIÇÃO DE ITENS AUDITADOS */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setModalViewTab('componentes')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${modalViewTab === 'componentes' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Componentes ({COMPONENT_ITEMS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewTab('niveis')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${modalViewTab === 'niveis' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Níveis ({FLUID_LEVEL_ITEMS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewTab('revisoes')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${modalViewTab === 'revisoes' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Revisões ({REVISION_ITEMS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewTab('complementares')}
                    className={`py-2 px-3 border-b-2 cursor-pointer transition-all ${modalViewTab === 'complementares' ? 'border-[#1B3022] text-[#1B3022] bg-white' : 'border-transparent text-slate-500'}`}
                  >
                    Obs. Complementares ({COMPLEMENTARY_ITEMS.length})
                  </button>
                </div>

                <div className="p-3 bg-white max-h-[300px] overflow-y-auto">
                  {modalViewTab === 'componentes' && renderModalViewGrid(COMPONENT_ITEMS)}
                  {modalViewTab === 'niveis' && renderModalViewGrid(FLUID_LEVEL_ITEMS)}
                  {modalViewTab === 'revisoes' && (
                    <div className="space-y-3">
                      {(parsed.horimetroRevisao || parsed.horimetroProximo) && (
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
                      {renderModalViewGrid(REVISION_ITEMS)}
                      {parsed.revisionNotes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <strong>Obs. Próxima Revisão:</strong> {parsed.revisionNotes}
                        </p>
                      )}
                    </div>
                  )}
                  {modalViewTab === 'complementares' && (
                    <div className="space-y-3">
                      {renderModalViewGrid(COMPLEMENTARY_ITEMS)}
                      {parsed.complementaryNotes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <strong>Informações Complementares:</strong> {parsed.complementaryNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* OBSERVAÇÕES FINAIS */}
              {parsed.operatorNotes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <strong className="text-slate-700">Relatos do Operador / Observações:</strong>
                  <p className="mt-1 text-slate-600 italic">
                    &ldquo;{parsed.operatorNotes}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedChecklistForModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
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
