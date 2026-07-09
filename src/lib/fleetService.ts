import { supabase, isDemoMode as importedDemoMode, setSchemaMissing } from './supabaseClient';
import { 
  Farm, Machine, FuelStock, FuelLog, PreventivePlanItem, 
  MaintenanceLog, Checklist30d, WorkOrder, LookupItem,
  FuelStockBalance, ChecklistSummary, PreventivePlanStatus, CostRankingItem, DashboardSummary 
} from '../types';

let isDemoMode = importedDemoMode || !supabase;

// Função auxiliar para tratar erros do banco e detectar tabelas ausentes
function handleDbError(e: any, message: string) {
  console.error(message, e);
  if (
    e?.code === 'PGRST205' || 
    e?.code === '42P01' || // PostgreSQL undefined_table error code
    (e?.message && (
      e.message.includes('Could not find the table') || 
      e.message.includes('relation "') || 
      e.message.includes('does not exist')
    ))
  ) {
    setSchemaMissing(true);
  }
}


// =========================================================================
// VALORES PADRÃO (SEED) PARA O MODO DEMO
// =========================================================================

const SEED_FARMS: Farm[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Boa Vista' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Rio Ferro' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Modelo' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'União' }
];

const SEED_EQUIPMENT_TYPES: LookupItem[] = [
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

const SEED_FUEL_TYPES: LookupItem[] = [
  { id: 'diesel_s10', label: 'Diesel S10' },
  { id: 'diesel_s500', label: 'Diesel S500' },
  { id: 'arla_32', label: 'Arla 32' },
  { id: 'gasolina', label: 'Gasolina' }
];

const SEED_MAINTENANCE_TYPES: LookupItem[] = [
  { id: 'preventiva', label: 'Preventiva' },
  { id: 'corretiva', label: 'Corretiva' },
  { id: 'preditiva', label: 'Preditiva' }
];

const SEED_PRIORITIES: LookupItem[] = [
  { id: 'baixa', label: 'Baixa', color_hex: '#3b82f6' },
  { id: 'media', label: 'Média', color_hex: '#eab308' },
  { id: 'alta', label: 'Alta', color_hex: '#f97316' },
  { id: 'urgente', label: 'Urgente', color_hex: '#ef4444' }
];

const SEED_SERVICE_LOCATIONS: LookupItem[] = [
  { id: 'oficina_interna', label: 'Oficina Interna Fazenda' },
  { id: 'oficina_autorizada', label: 'Oficina Autorizada Marca' },
  { id: 'oficina_externa', label: 'Oficina Externa Credenciada' },
  { id: 'campo', label: 'Manutenção em Campo' }
];

const SEED_MACHINES: Machine[] = [
  {
    id: 'a0000000-a000-a000-a000-a00000000001',
    code: 'MAQ-001',
    name: 'Trator John Deere 6125J',
    type: 'trator',
    brand: 'John Deere',
    model: '6125J',
    year: 2021,
    serial_number: 'JD6125J-00984',
    initial_hour_km: 1200,
    current_hour_km: 1420,
    acquisition_date: '2021-03-15',
    status: 'Ativa',
    farm_id: '11111111-1111-1111-1111-111111111111',
    driver_name: 'João da Silva'
  },
  {
    id: 'a0000000-a000-a000-a000-a00000000002',
    code: 'MAQ-002',
    name: 'Colheitadeira Case IH 8250',
    type: 'colheitadeira',
    brand: 'Case IH',
    model: 'Axial-Flow 8250',
    year: 2022,
    serial_number: 'CASE8250-99432',
    initial_hour_km: 450,
    current_hour_km: 680,
    acquisition_date: '2022-08-10',
    status: 'Ativa',
    farm_id: '11111111-1111-1111-1111-111111111111',
    driver_name: 'Pedro Henrique'
  },
  {
    id: 'a0000000-a000-a000-a000-a00000000003',
    code: 'MAQ-003',
    name: 'Caminhão Caçamba Volvo FMX 460',
    type: 'caminhao',
    brand: 'Volvo',
    model: 'FMX 460 6x4',
    year: 2020,
    serial_number: 'VLOFMX-33421',
    initial_hour_km: 45000,
    current_hour_km: 48210,
    acquisition_date: '2020-05-18',
    status: 'Ativa',
    farm_id: '22222222-2222-2222-2222-222222222222',
    driver_name: 'Manoel Alves'
  },
  {
    id: 'a0000000-a000-a000-a000-a00000000004',
    code: 'MAQ-004',
    name: 'Pá Carregadeira Caterpillar 938K',
    type: 'pa_carregadeira',
    brand: 'Caterpillar',
    model: '938K',
    year: 2019,
    serial_number: 'CAT938K-11234',
    initial_hour_km: 3500,
    current_hour_km: 3950,
    acquisition_date: '2019-11-01',
    status: 'Em manutenção',
    farm_id: '33333333-3333-3333-3333-333333333333',
    driver_name: 'Carlos Souza'
  },
  {
    id: 'a0000000-a000-a000-a000-a00000000005',
    code: 'MAQ-005',
    name: 'Gerador Stemac 150 kVA',
    type: 'gerador',
    brand: 'Stemac',
    model: '150kVA Perkins',
    year: 2018,
    serial_number: 'STEM-150-84321',
    initial_hour_km: 800,
    current_hour_km: 950,
    acquisition_date: '2018-02-12',
    status: 'Ativa',
    farm_id: '44444444-4444-4444-4444-444444444444',
    driver_name: 'José Silveira'
  },
  {
    id: 'a0000000-a000-a000-a000-a00000000006',
    code: 'MAQ-006',
    name: 'Trator New Holland T7.260',
    type: 'trator',
    brand: 'New Holland',
    model: 'T7.260',
    year: 2023,
    serial_number: 'NH-T7260-12344',
    initial_hour_km: 150,
    current_hour_km: 150,
    acquisition_date: '2023-10-05',
    status: 'Ativa',
    farm_id: '22222222-2222-2222-2222-222222222222',
    driver_name: 'Adauto Ferreira'
  },
  {
    id: 'a0000000-a000-a000-a000-a00000000007',
    code: 'MAQ-007',
    name: 'Escavadeira Sany SY215C',
    type: 'escavadeira',
    brand: 'Sany',
    model: 'SY215C',
    year: 2021,
    serial_number: 'SANY215-44211',
    initial_hour_km: 2100,
    current_hour_km: 2400,
    acquisition_date: '2021-06-20',
    status: 'Parada',
    farm_id: '33333333-3333-3333-3333-333333333333',
    driver_name: 'Daniel Neves'
  }
];

const SEED_FUEL_STOCK: FuelStock[] = [
  { id: 'fs1', farm_id: '11111111-1111-1111-1111-111111111111', entry_date: '2026-06-01', liters_received: 5000, price_per_liter: 5.85, supplier: 'Distribuidora Ipiranga', minimum_stock_alert: 1500, notes: 'Carga cheia tanque central' },
  { id: 'fs2', farm_id: '11111111-1111-1111-1111-111111111111', entry_date: '2026-06-25', liters_received: 5000, price_per_liter: 5.90, supplier: 'Distribuidora Ipiranga', minimum_stock_alert: 1500, notes: 'Reforço para colheita' },
  { id: 'fs3', farm_id: '22222222-2222-2222-2222-222222222222', entry_date: '2026-06-05', liters_received: 8000, price_per_liter: 5.65, supplier: 'Combustíveis Raízen', minimum_stock_alert: 2000, notes: 'Tanque principal Rio Ferro' },
  { id: 'fs4', farm_id: '33333333-3333-3333-3333-333333333333', entry_date: '2026-06-10', liters_received: 4000, price_per_liter: 5.75, supplier: 'Distribuidora Vibra', minimum_stock_alert: 1000, notes: 'Carga Tanque Modelo' },
  { id: 'fs5', farm_id: '44444444-4444-4444-4444-444444444444', entry_date: '2026-06-12', liters_received: 3000, price_per_liter: 5.80, supplier: 'Combustíveis Alesat', minimum_stock_alert: 800, notes: 'Tanque União de emergência' }
];

const SEED_FUEL_LOGS: FuelLog[] = [
  {
    id: 'fl1',
    farm_id: '11111111-1111-1111-1111-111111111111',
    machine_id: 'a0000000-a000-a000-a000-a00000000001',
    date: '2026-06-15T07:30:00Z',
    fuel_type: 'diesel_s10',
    pump_reading_start: 1000,
    pump_reading_end: 1150,
    liters_supplied: 150,
    hour_km_at_fueling: 1280,
    hours_km_since_last: 80, // 1280 - 1200 initial
    consumption_rate: 1.875, // 150 / 80
    price_per_liter: 5.85,
    total_value: 877.5,
    supplier: 'Bomba Própria Boa Vista',
    responsible: 'Gerente Carlos',
    notes: 'Abastecimento diário para plantio'
  },
  {
    id: 'fl2',
    farm_id: '11111111-1111-1111-1111-111111111111',
    machine_id: 'a0000000-a000-a000-a000-a00000000001',
    date: '2026-06-28T17:00:00Z',
    fuel_type: 'diesel_s10',
    pump_reading_start: 1150,
    pump_reading_end: 1310,
    liters_supplied: 160,
    hour_km_at_fueling: 1370,
    hours_km_since_last: 90, // 1370 - 1280
    consumption_rate: 1.77,
    price_per_liter: 5.85,
    total_value: 936,
    supplier: 'Bomba Própria Boa Vista',
    responsible: 'Gerente Carlos',
    notes: 'Abastecimento fim de semana'
  },
  {
    id: 'fl3',
    farm_id: '11111111-1111-1111-1111-111111111111',
    machine_id: 'a0000000-a000-a000-a000-a00000000001',
    date: '2026-07-05T08:00:00Z',
    fuel_type: 'diesel_s10',
    pump_reading_start: 1310,
    pump_reading_end: 1445,
    liters_supplied: 135,
    hour_km_at_fueling: 1420,
    hours_km_since_last: 50, // 1420 - 1370
    consumption_rate: 2.7,
    price_per_liter: 5.90,
    total_value: 796.5,
    supplier: 'Bomba Própria Boa Vista',
    responsible: 'Gerente Carlos',
    notes: 'Leitura horímetro atingiu 1420h'
  },
  {
    id: 'fl4',
    farm_id: '11111111-1111-1111-1111-111111111111',
    machine_id: 'a0000000-a000-a000-a000-a00000000002',
    date: '2026-06-20T09:00:00Z',
    fuel_type: 'diesel_s10',
    pump_reading_start: 2000,
    pump_reading_end: 2350,
    liters_supplied: 350,
    hour_km_at_fueling: 560,
    hours_km_since_last: 110, // 560 - 450
    consumption_rate: 3.18,
    price_per_liter: 5.85,
    total_value: 2047.5,
    supplier: 'Bomba Própria Boa Vista',
    responsible: 'Almeida P.',
    notes: 'Abastecimento colheita'
  },
  {
    id: 'fl5',
    farm_id: '11111111-1111-1111-1111-111111111111',
    machine_id: 'a0000000-a000-a000-a000-a00000000002',
    date: '2026-07-02T18:30:00Z',
    fuel_type: 'diesel_s10',
    pump_reading_start: 2350,
    pump_reading_end: 2710,
    liters_supplied: 360,
    hour_km_at_fueling: 680,
    hours_km_since_last: 120, // 680 - 560
    consumption_rate: 3.0,
    price_per_liter: 5.90,
    total_value: 2124,
    supplier: 'Bomba Própria Boa Vista',
    responsible: 'Almeida P.',
    notes: 'Abastecimento turno noite'
  },
  {
    id: 'fl6',
    farm_id: '22222222-2222-2222-2222-222222222222',
    machine_id: 'a0000000-a000-a000-a000-a00000000003',
    date: '2026-06-12T06:00:00Z',
    fuel_type: 'diesel_s500',
    pump_reading_start: 5000,
    pump_reading_end: 5320,
    liters_supplied: 320,
    hour_km_at_fueling: 46100,
    hours_km_since_last: 1100, // 46100 - 45000
    consumption_rate: 0.29,
    price_per_liter: 5.65,
    total_value: 1808,
    supplier: 'Bomba Própria Rio Ferro',
    responsible: 'Operador Marcos',
    notes: 'Viagem de frete grãos'
  },
  {
    id: 'fl7',
    farm_id: '22222222-2222-2222-2222-222222222222',
    machine_id: 'a0000000-a000-a000-a000-a00000000003',
    date: '2026-06-30T06:15:00Z',
    fuel_type: 'diesel_s500',
    pump_reading_start: 5320,
    pump_reading_end: 5650,
    liters_supplied: 330,
    hour_km_at_fueling: 48210,
    hours_km_since_last: 2110, // 48210 - 46100
    consumption_rate: 0.156,
    price_per_liter: 5.65,
    total_value: 1864.5,
    supplier: 'Bomba Própria Rio Ferro',
    responsible: 'Operador Marcos',
    notes: 'Fim do ciclo mensal de frete'
  }
];

const SEED_PREVENTIVE_PLAN: PreventivePlanItem[] = [
  { id: 'pp1', machine_id: 'a0000000-a000-a000-a000-a00000000001', maintenance_item: 'Troca Óleo Motor e Filtros', interval_days: 180, interval_hour_km: 250 },
  { id: 'pp2', machine_id: 'a0000000-a000-a000-a000-a00000000001', maintenance_item: 'Filtro de Ar e Cabine', interval_days: 360, interval_hour_km: 500 },
  { id: 'pp3', machine_id: 'a0000000-a000-a000-a000-a00000000001', maintenance_item: 'Lubrificação Geral Graxeiras', interval_days: 30, interval_hour_km: 50 },
  { id: 'pp4', machine_id: 'a0000000-a000-a000-a000-a00000000002', maintenance_item: 'Troca de Óleo Hidráulico', interval_days: 360, interval_hour_km: 500 },
  { id: 'pp5', machine_id: 'a0000000-a000-a000-a000-a00000000002', maintenance_item: 'Troca Óleo Motor', interval_days: 180, interval_hour_km: 250 },
  { id: 'pp6', machine_id: 'a0000000-a000-a000-a000-a00000000002', maintenance_item: 'Inspeção Correias e Polias', interval_days: 60, interval_hour_km: 100 },
  { id: 'pp7', machine_id: 'a0000000-a000-a000-a000-a00000000003', maintenance_item: 'Revisão Geral e Alinhamento', interval_days: 180, interval_hour_km: 10000 },
  { id: 'pp8', machine_id: 'a0000000-a000-a000-a000-a00000000003', maintenance_item: 'Troca de Óleo de Diferenciais', interval_days: 360, interval_hour_km: 20000 }
];

const SEED_MAINTENANCE_LOGS: MaintenanceLog[] = [
  {
    id: 'ml1',
    machine_id: 'a0000000-a000-a000-a000-a00000000001',
    date: '2026-06-05T08:00:00Z',
    type: 'preventiva',
    priority: 'media',
    hour_km_at_service: 1250,
    service_description: 'Troca de óleo do motor 15W40 e filtro de óleo original JD',
    main_item: 'Troca Óleo Motor e Filtros',
    parts_replaced: 'Óleo Motor 15W40, Filtro Lubrificante',
    quantity: 1,
    parts_cost: 450,
    labor_cost: 150,
    total_cost: 600,
    location_shop: 'oficina_interna',
    responsible: 'Mecânico Júlio',
    next_maintenance_date: '2026-12-02',
    next_hour_km: 1500
  },
  {
    id: 'ml2',
    machine_id: 'a0000000-a000-a000-a000-a00000000001',
    date: '2026-06-10T10:00:00Z',
    type: 'preventiva',
    priority: 'baixa',
    hour_km_at_service: 1260,
    service_description: 'Engraxamento completo do chassi e articulação da grade',
    main_item: 'Lubrificação Geral Graxeiras',
    parts_replaced: 'Graxa Grafitada',
    quantity: 1,
    parts_cost: 40,
    labor_cost: 50,
    total_cost: 90,
    location_shop: 'oficina_interna',
    responsible: 'Auxiliar Tonho',
    next_maintenance_date: '2026-07-10',
    next_hour_km: 1310
  },
  {
    id: 'ml3',
    machine_id: 'a0000000-a000-a000-a000-a00000000002',
    date: '2026-05-12T09:00:00Z',
    type: 'preventiva',
    priority: 'media',
    hour_km_at_service: 450,
    service_description: 'Troca óleo motor e filtros de combustível secundários',
    main_item: 'Troca Óleo Motor',
    parts_replaced: 'Filtro combustível, Óleo Mobil Delvac',
    quantity: 1,
    parts_cost: 890,
    labor_cost: 300,
    total_cost: 1190,
    location_shop: 'oficina_autorizada',
    responsible: 'Autorizada Case Tec',
    next_maintenance_date: '2026-11-08',
    next_hour_km: 700
  },
  {
    id: 'ml4',
    machine_id: 'a0000000-a000-a000-a000-a00000000004',
    date: '2026-07-06T14:00:00Z',
    type: 'corretiva',
    priority: 'alta',
    hour_km_at_service: 3950,
    service_description: 'Vazamento pistão hidráulico da caçamba dianteira, trocando retentores',
    main_item: 'Reparo Hidráulico',
    parts_replaced: 'Kit Retentores CAT',
    quantity: 2,
    parts_cost: 750,
    labor_cost: 450,
    total_cost: 1200,
    location_shop: 'oficina_externa',
    responsible: 'Mecânico Wagner',
    next_maintenance_date: '2026-08-06',
    next_hour_km: 4200
  }
];

const SEED_CHECKLISTS: Checklist30d[] = [
  { id: 'ch1', machine_id: 'a0000000-a000-a000-a000-a00000000001', date: '2026-06-20', operator_name: 'João da Silva', hour_km: 1350, work_type: 'Preparo de solo', overall_status: 'OK', failed_items_notes: 'Tudo operacional. Níveis corretos.' },
  { id: 'ch2', machine_id: 'a0000000-a000-a000-a000-a00000000002', date: '2026-06-10', operator_name: 'Pedro Henrique', hour_km: 580, work_type: 'Colheita soja', overall_status: 'Necessita Atenção', failed_items_notes: 'Apresenta desgaste leve na correia do picador.' },
  { id: 'ch3', machine_id: 'a0000000-a000-a000-a000-a00000000003', date: '2026-05-01', operator_name: 'Manoel Alves', hour_km: 45500, work_type: 'Transporte grãos', overall_status: 'OK', failed_items_notes: 'Checklist de início da safra.' }
];

const SEED_WORK_ORDERS: WorkOrder[] = [
  { id: 'wo1', os_number: 1, machine_id: 'a0000000-a000-a000-a000-a00000000004', open_date: '2026-07-05', reason: 'Reparo do vazamento de óleo no pistão da caçamba dianteira detectado na vistoria de campo.', priority: 'alta', status: 'Em Andamento', responsible: 'Mecânico Wagner', notes: 'Pistão desmontado e enviado para retífica de camisas.' },
  { id: 'wo2', os_number: 2, machine_id: 'a0000000-a000-a000-a000-a00000000002', open_date: '2026-07-02', reason: 'Trocar correia de transmissão do picador de palha que apresentou desgaste.', priority: 'media', status: 'Aberta', responsible: 'Mecânico Júlio', notes: 'Aguardando chegada da peça comprada em estoque.' },
  { id: 'wo3', os_number: 3, machine_id: 'a0000000-a000-a000-a000-a00000000003', open_date: '2026-06-15', reason: 'Substituição das pastilhas de freio traseiras e troca de lâmpadas queimadas na sinaleira.', priority: 'baixa', status: 'Concluída', responsible: 'Eletricista Tonho', close_date: '2026-06-16', notes: 'Lâmpadas e pastilhas substituídas com sucesso. Testes ok.' }
];

const SEED_PROFILE = { id: 'usr-1', email: 'user@agro.com', role: 'admin' };

// =========================================================================
// MOTOR LOCAL STORAGE DATABASE (LOCAL)
// =========================================================================

class LocalStorageDb {
  static get<T>(key: string, defaultValue: T[]): T[] {
    const data = localStorage.getItem(`agro_fleet_${key}`);
    if (!data) {
      localStorage.setItem(`agro_fleet_${key}`, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(data);
  }

  static set<T>(key: string, data: T[]): void {
    localStorage.setItem(`agro_fleet_${key}`, JSON.stringify(data));
  }

  static initAll() {
    this.get('farms', SEED_FARMS);
    this.get('equipment_types', SEED_EQUIPMENT_TYPES);
    this.get('fuel_types', SEED_FUEL_TYPES);
    this.get('maintenance_types', SEED_MAINTENANCE_TYPES);
    this.get('priorities', SEED_PRIORITIES);
    this.get('service_locations', SEED_SERVICE_LOCATIONS);
    this.get('machines', SEED_MACHINES);
    this.get('fuel_stock', SEED_FUEL_STOCK);
    this.get('fuel_logs', SEED_FUEL_LOGS);
    this.get('preventive_plan', SEED_PREVENTIVE_PLAN);
    this.get('maintenance_logs', SEED_MAINTENANCE_LOGS);
    this.get('checklists', SEED_CHECKLISTS);
    this.get('work_orders', SEED_WORK_ORDERS);
    
    if (!localStorage.getItem('agro_fleet_profile')) {
      localStorage.setItem('agro_fleet_profile', JSON.stringify(SEED_PROFILE));
    }
  }
}

// Inicializa o banco local ao carregar este arquivo para garantir que esteja pronto para fallback
LocalStorageDb.initAll();

// =========================================================================
// EXPORTAÇÃO DOS SERVIÇOS (COM TRATAMENTO DUAL-MODE)
// =========================================================================

export const fleetService = {
  // =======================================================================
  // AUTH E USUÁRIOS
  // =======================================================================
  async getProfile(): Promise<any> {
    if (isDemoMode) {
      const p = localStorage.getItem('agro_fleet_profile');
      return p ? JSON.parse(p) : SEED_PROFILE;
    }
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;
      const { data } = await supabase!.from('profiles').select('*').eq('id', user.id).single();
      return data;
    } catch (e) {
      console.error('Erro ao buscar perfil do Supabase, usando local:', e);
      isDemoMode = true;
      const p = localStorage.getItem('agro_fleet_profile');
      return p ? JSON.parse(p) : SEED_PROFILE;
    }
  },

  async updateProfileRole(id: string, role: string): Promise<any> {
    if (isDemoMode) {
      const p = { id, email: 'user@agro.com', role };
      localStorage.setItem('agro_fleet_profile', JSON.stringify(p));
      return p;
    }
    try {
      const { data, error } = await supabase!.from('profiles').update({ role }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao atualizar perfil no Supabase, usando local:', e);
      isDemoMode = true;
      const p = { id, email: 'user@agro.com', role };
      localStorage.setItem('agro_fleet_profile', JSON.stringify(p));
      return p;
    }
  },

  // =======================================================================
  // LOOKUP TABLES
  // =======================================================================
  async getLookups(): Promise<{
    equipmentTypes: LookupItem[];
    fuelTypes: LookupItem[];
    maintenanceTypes: LookupItem[];
    priorities: LookupItem[];
    serviceLocations: LookupItem[];
    maintenanceCategories: string[];
  }> {
    const categories = [
      'Motor e Filtros',
      'Sistema Hidráulico',
      'Transmissão e Caixa',
      'Freios e Direção',
      'Elétrica e Bateria',
      'Arrefecimento',
      'Cabine e Ar Condicionado',
      'Pneus / Rodas',
      'Esteiras / Suspensão',
      'Implementos / Facas',
      'Funilaria e Pintura',
      'Outros'
    ];

    if (isDemoMode) {
      return {
        equipmentTypes: LocalStorageDb.get('equipment_types', SEED_EQUIPMENT_TYPES),
        fuelTypes: LocalStorageDb.get('fuel_types', SEED_FUEL_TYPES),
        maintenanceTypes: LocalStorageDb.get('maintenance_types', SEED_MAINTENANCE_TYPES),
        priorities: LocalStorageDb.get('priorities', SEED_PRIORITIES),
        serviceLocations: LocalStorageDb.get('service_locations', SEED_SERVICE_LOCATIONS),
        maintenanceCategories: categories,
      };
    }

    try {
      const [eq, fl, mt, pr, sl] = await Promise.all([
        supabase!.from('equipment_types').select('*'),
        supabase!.from('fuel_types').select('*'),
        supabase!.from('maintenance_types').select('*'),
        supabase!.from('priorities').select('*'),
        supabase!.from('service_locations').select('*'),
      ]);

      if (eq.error) throw eq.error;
      if (fl.error) throw fl.error;
      if (mt.error) throw mt.error;
      if (pr.error) throw pr.error;
      if (sl.error) throw sl.error;

      return {
        equipmentTypes: eq.data || [],
        fuelTypes: fl.data || [],
        maintenanceTypes: mt.data || [],
        priorities: pr.data || [],
        serviceLocations: sl.data || [],
        maintenanceCategories: categories,
      };
    } catch (e) {
      console.error('Erro ao carregar lookups do Supabase, usando local:', e);
      isDemoMode = true;
      return {
        equipmentTypes: LocalStorageDb.get('equipment_types', SEED_EQUIPMENT_TYPES),
        fuelTypes: LocalStorageDb.get('fuel_types', SEED_FUEL_TYPES),
        maintenanceTypes: LocalStorageDb.get('maintenance_types', SEED_MAINTENANCE_TYPES),
        priorities: LocalStorageDb.get('priorities', SEED_PRIORITIES),
        serviceLocations: LocalStorageDb.get('service_locations', SEED_SERVICE_LOCATIONS),
        maintenanceCategories: categories,
      };
    }
  },

  // =======================================================================
  // FAZENDAS (FARMS)
  // =======================================================================
  async getFarms(): Promise<Farm[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('farms', SEED_FARMS);
    }
    try {
      const { data, error } = await supabase!.from('farms').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      handleDbError(e, 'Erro ao buscar fazendas no Supabase, usando local:');
      return LocalStorageDb.get('farms', SEED_FARMS);
    }
  },

  async addFarm(farm: Partial<Farm>): Promise<Farm> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      const newFarm: Farm = {
        id: crypto.randomUUID(),
        name: farm.name || 'Nova Fazenda',
        location: farm.location,
        created_at: new Date().toISOString()
      };
      list.push(newFarm);
      LocalStorageDb.set('farms', list);
      return newFarm;
    }
    try {
      const { data, error } = await supabase!.from('farms').insert([farm]).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao adicionar fazenda no Supabase, usando local:', e);
      isDemoMode = true;
      const list = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      const newFarm: Farm = {
        id: crypto.randomUUID(),
        name: farm.name || 'Nova Fazenda',
        location: farm.location,
        created_at: new Date().toISOString()
      };
      list.push(newFarm);
      LocalStorageDb.set('farms', list);
      return newFarm;
    }
  },

  async updateFarm(id: string, farm: Partial<Farm>): Promise<Farm> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      const index = list.findIndex(f => f.id === id);
      if (index === -1) throw new Error('Farm not found');
      list[index] = { ...list[index], ...farm };
      LocalStorageDb.set('farms', list);
      return list[index];
    }
    try {
      const { data, error } = await supabase!.from('farms').update(farm).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao atualizar fazenda no Supabase, usando local:', e);
      isDemoMode = true;
      const list = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      const index = list.findIndex(f => f.id === id);
      if (index === -1) throw new Error('Farm not found');
      list[index] = { ...list[index], ...farm };
      LocalStorageDb.set('farms', list);
      return list[index];
    }
  },

  async deleteFarm(id: string): Promise<void> {
    if (isDemoMode) {
      let list = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      list = list.filter(f => f.id !== id);
      LocalStorageDb.set('farms', list);
      return;
    }
    try {
      const { error } = await supabase!.from('farms').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao excluir fazenda no Supabase, usando local:', e);
      isDemoMode = true;
      let list = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      list = list.filter(f => f.id !== id);
      LocalStorageDb.set('farms', list);
    }
  },

  // =======================================================================
  // MÁQUINAS (MACHINES)
  // =======================================================================
  async getMachines(): Promise<Machine[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('machines', SEED_MACHINES);
    }
    try {
      const { data, error } = await supabase!.from('machines').select('*').order('code', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar máquinas no Supabase, usando local:', e);
      isDemoMode = true;
      return LocalStorageDb.get('machines', SEED_MACHINES);
    }
  },

  async addMachine(machine: Partial<Machine>): Promise<Machine> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const newMachine: Machine = {
        id: crypto.randomUUID(),
        code: machine.code || 'MAQ-NEW',
        name: machine.name || 'Máquina Nova',
        type: machine.type || 'trator',
        brand: machine.brand || 'Marca',
        model: machine.model || 'Modelo',
        year: machine.year || new Date().getFullYear(),
        serial_number: machine.serial_number || '',
        initial_hour_km: Number(machine.initial_hour_km) || 0,
        current_hour_km: Number(machine.initial_hour_km) || 0,
        acquisition_date: machine.acquisition_date || new Date().toISOString().split('T')[0],
        status: machine.status || 'Ativa',
        farm_id: machine.farm_id || '11111111-1111-1111-1111-111111111111',
        driver_name: machine.driver_name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newMachine);
      LocalStorageDb.set('machines', list);
      return newMachine;
    }
    const { data, error } = await supabase!.from('machines').insert([machine]).select().single();
    if (error) throw error;
    return data;
  },

  async updateMachine(id: string, machine: Partial<Machine>): Promise<Machine> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const index = list.findIndex(m => m.id === id);
      if (index === -1) throw new Error('Machine not found');
      list[index] = { ...list[index], ...machine, updated_at: new Date().toISOString() };
      LocalStorageDb.set('machines', list);
      return list[index];
    }
    const { data, error } = await supabase!.from('machines').update(machine).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteMachine(id: string): Promise<void> {
    if (isDemoMode) {
      let list = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      list = list.filter(m => m.id !== id);
      LocalStorageDb.set('machines', list);
      return;
    }
    const { error } = await supabase!.from('machines').delete().eq('id', id);
    if (error) throw error;
  },

  // =======================================================================
  // ABASTECIMENTOS (FUEL LOGS)
  // =======================================================================
  async getFuelLogs(): Promise<FuelLog[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('fuel_logs', SEED_FUEL_LOGS);
    }
    try {
      const { data, error } = await supabase!.from('fuel_logs').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar abastecimentos no Supabase, usando local:', e);
      isDemoMode = true;
      return LocalStorageDb.get('fuel_logs', SEED_FUEL_LOGS);
    }
  },

  async getLatestDieselPrice(farmId: string): Promise<number> {
    if (isDemoMode) {
      const stockList = LocalStorageDb.get<FuelStock>('fuel_stock', SEED_FUEL_STOCK);
      const farmStocks = stockList
        .filter(s => s.farm_id === farmId && s.price_per_liter !== undefined && s.price_per_liter > 0 && !s.is_deleted)
        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
      
      if (farmStocks.length > 0) {
        return farmStocks[0].price_per_liter;
      }
      return 5.85; // Fallback
    }

    try {
      const { data, error } = await supabase!
        .from('fuel_stock')
        .select('price_per_liter')
        .eq('farm_id', farmId)
        .neq('is_deleted', true)
        .order('entry_date', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) {
        return 5.85;
      }
      return Number(data[0].price_per_liter) || 5.85;
    } catch (e) {
      console.error('Erro ao buscar preço de diesel:', e);
      return 5.85;
    }
  },

  async addFuelLog(log: Partial<FuelLog>): Promise<FuelLog> {
    const farmId = log.farm_id || '11111111-1111-1111-1111-111111111111';
    const price = await this.getLatestDieselPrice(farmId);

    if (isDemoMode) {
      const list = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      
      const pStart = Number(log.pump_reading_start) || 0;
      const pEnd = Number(log.pump_reading_end) || 0;
      const liters = pEnd - pStart;
      const val = liters * price;

      // Calcular horas desde o último abastecimento (gatilho simulado)
      const sameMachineLogs = list
        .filter(l => l.machine_id === log.machine_id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let lastHourKm = 0;
      if (sameMachineLogs.length > 0) {
        lastHourKm = sameMachineLogs[0].hour_km_at_fueling;
      } else {
        const mList = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
        const m = mList.find(x => x.id === log.machine_id);
        lastHourKm = m ? m.initial_hour_km : 0;
      }

      const fuelingHourKm = Number(log.hour_km_at_fueling) || 0;
      const deltaHourKm = fuelingHourKm >= lastHourKm ? fuelingHourKm - lastHourKm : 0;
      const consumption = (deltaHourKm > 0 && liters > 0) ? (liters / deltaHourKm) : 0;

      const newLog: FuelLog = {
        id: crypto.randomUUID(),
        farm_id: farmId,
        machine_id: log.machine_id || '',
        date: log.date || new Date().toISOString(),
        fuel_type: log.fuel_type || 'diesel_s10',
        pump_reading_start: pStart,
        pump_reading_end: pEnd,
        liters_supplied: liters,
        hour_km_at_fueling: fuelingHourKm,
        hours_km_since_last: deltaHourKm,
        consumption_rate: Number(consumption.toFixed(3)),
        price_per_liter: price,
        total_value: Number(val.toFixed(2)),
        supplier: log.supplier || '',
        responsible: log.responsible || '',
        notes: log.notes || '',
        created_at: new Date().toISOString()
      };

      list.push(newLog);
      LocalStorageDb.set('fuel_logs', list);

      // Trigger de atualização do current_hour_km da máquina
      const mList = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const mIndex = mList.findIndex(m => m.id === log.machine_id);
      if (mIndex !== -1 && fuelingHourKm > mList[mIndex].current_hour_km) {
        mList[mIndex].current_hour_km = fuelingHourKm;
        mList[mIndex].updated_at = new Date().toISOString();
        LocalStorageDb.set('machines', mList);
      }

      return newLog;
    }

    const pStart = Number(log.pump_reading_start) || 0;
    const pEnd = Number(log.pump_reading_end) || 0;
    const liters = pEnd - pStart;
    const val = liters * price;

    const logToInsert = {
      ...log,
      price_per_liter: price,
      liters_supplied: liters,
      total_value: Number(val.toFixed(2))
    };

    const { data, error } = await supabase!.from('fuel_logs').insert([logToInsert]).select().single();
    if (error) throw error;
    return data;
  },

  async updateFuelLog(id: string, log: Partial<FuelLog>): Promise<FuelLog> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      const index = list.findIndex(l => l.id === id);
      if (index === -1) throw new Error('Abastecimento não encontrado');

      const merged = { ...list[index], ...log };

      const farmId = merged.farm_id || '11111111-1111-1111-1111-111111111111';
      const price = await this.getLatestDieselPrice(farmId);

      const pStart = Number(merged.pump_reading_start) || 0;
      const pEnd = Number(merged.pump_reading_end) || 0;
      const liters = pEnd - pStart;
      const val = liters * price;

      merged.price_per_liter = price;
      merged.liters_supplied = liters;
      merged.total_value = Number(val.toFixed(2));

      // Recalcular hours_km_since_last e consumo
      const sameMachineLogs = list
        .filter(l => l.machine_id === merged.machine_id && l.id !== id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let lastHourKm = 0;
      const priorLog = sameMachineLogs.find(l => new Date(l.date).getTime() < new Date(merged.date).getTime());
      if (priorLog) {
        lastHourKm = priorLog.hour_km_at_fueling;
      } else {
        const mList = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
        const m = mList.find(x => x.id === merged.machine_id);
        lastHourKm = m ? m.initial_hour_km : 0;
      }

      const fuelingHourKm = Number(merged.hour_km_at_fueling) || 0;
      const deltaHourKm = fuelingHourKm >= lastHourKm ? fuelingHourKm - lastHourKm : 0;
      const consumption = (deltaHourKm > 0 && liters > 0) ? (liters / deltaHourKm) : 0;

      merged.hours_km_since_last = deltaHourKm;
      merged.consumption_rate = Number(consumption.toFixed(3));

      list[index] = merged;
      LocalStorageDb.set('fuel_logs', list);

      // Atualizar o current_hour_km da máquina se necessário
      const mList = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const mIndex = mList.findIndex(m => m.id === merged.machine_id);
      if (mIndex !== -1) {
        const remainingMachineLogs = list.filter(l => l.machine_id === merged.machine_id);
        const maxHourKm = Math.max(mList[mIndex].initial_hour_km, ...remainingMachineLogs.map(l => l.hour_km_at_fueling));
        if (mList[mIndex].current_hour_km !== maxHourKm) {
          mList[mIndex].current_hour_km = maxHourKm;
          mList[mIndex].updated_at = new Date().toISOString();
          LocalStorageDb.set('machines', mList);
        }
      }

      return merged;
    }

    const farmId = log.farm_id || '11111111-1111-1111-1111-111111111111';
    const price = await this.getLatestDieselPrice(farmId);

    const pStart = Number(log.pump_reading_start) || 0;
    const pEnd = Number(log.pump_reading_end) || 0;
    const liters = pEnd - pStart;
    const val = liters * price;

    const updatedFields = {
      ...log,
      price_per_liter: price,
      liters_supplied: liters,
      total_value: Number(val.toFixed(2))
    };

    const { data, error } = await supabase!.from('fuel_logs').update(updatedFields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFuelLog(id: string): Promise<void> {
    if (isDemoMode) {
      let list = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      const logToDelete = list.find(l => l.id === id);
      if (!logToDelete) return;

      list = list.filter(l => l.id !== id);
      LocalStorageDb.set('fuel_logs', list);

      // Reverter o current_hour_km da máquina se necessário
      const mList = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const mIndex = mList.findIndex(m => m.id === logToDelete.machine_id);
      if (mIndex !== -1) {
        const remainingMachineLogs = list.filter(l => l.machine_id === logToDelete.machine_id);
        const maxHourKm = Math.max(mList[mIndex].initial_hour_km, ...remainingMachineLogs.map(l => l.hour_km_at_fueling));
        if (mList[mIndex].current_hour_km !== maxHourKm) {
          mList[mIndex].current_hour_km = maxHourKm;
          mList[mIndex].updated_at = new Date().toISOString();
          LocalStorageDb.set('machines', mList);
        }
      }
      return;
    }
    const { error } = await supabase!.from('fuel_logs').delete().eq('id', id);
    if (error) throw error;
  },

  // Busca se há discrepâncias nas leituras anteriores de bombas daquela fazenda
  async getPumpDiscrepancy(farmId: string, currentStart: number): Promise<{ lastEnd: number; hasDiscrepancy: boolean }> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      const farmLogs = list
        .filter(l => l.farm_id === farmId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (farmLogs.length === 0) {
        return { lastEnd: currentStart, hasDiscrepancy: false };
      }
      
      const lastEnd = farmLogs[0].pump_reading_end;
      return {
        lastEnd,
        hasDiscrepancy: lastEnd !== currentStart
      };
    }

    // No Supabase usamos a view ou fazemos query direta
    const { data, error } = await supabase!
      .from('fuel_logs')
      .select('pump_reading_end')
      .eq('farm_id', farmId)
      .order('date', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { lastEnd: currentStart, hasDiscrepancy: false };
    }

    const lastEnd = Number(data[0].pump_reading_end);
    return {
      lastEnd,
      hasDiscrepancy: lastEnd !== currentStart
    };
  },

  // =======================================================================
  // ESTOQUE DE DIESEL (FUEL STOCK)
  // =======================================================================
  async getFuelStock(): Promise<FuelStock[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('fuel_stock', SEED_FUEL_STOCK);
    }
    const { data, error } = await supabase!.from('fuel_stock').select('*').order('entry_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addFuelStock(stock: Partial<FuelStock>): Promise<FuelStock> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<FuelStock>('fuel_stock', SEED_FUEL_STOCK);
      const newEntry: FuelStock = {
        id: crypto.randomUUID(),
        farm_id: stock.farm_id || '',
        entry_date: stock.entry_date || new Date().toISOString().split('T')[0],
        liters_received: Number(stock.liters_received) || 0,
        price_per_liter: Number(stock.price_per_liter) || 5.85,
        supplier: stock.supplier || '',
        minimum_stock_alert: Number(stock.minimum_stock_alert) || 1000,
        notes: stock.notes || '',
        created_at: new Date().toISOString()
      };
      list.push(newEntry);
      LocalStorageDb.set('fuel_stock', list);
      return newEntry;
    }
    const { data, error } = await supabase!.from('fuel_stock').insert([stock]).select().single();
    if (error) throw error;
    return data;
  },

  // VIEW fuel_stock_balance
  async getFuelStockBalance(): Promise<FuelStockBalance[]> {
    if (isDemoMode) {
      const farms = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      const fuelStock = LocalStorageDb.get<FuelStock>('fuel_stock', SEED_FUEL_STOCK);
      const fuelLogs = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);

      return farms.map(farm => {
        // soma entradas daquela fazenda (excluindo excluídas)
        const totalReceived = fuelStock
          .filter(s => s.farm_id === farm.id && !s.is_deleted)
          .reduce((sum, current) => sum + current.liters_received, 0);

        // soma consumos abastecidos naquela fazenda
        const totalConsumed = fuelLogs
          .filter(l => l.farm_id === farm.id)
          .reduce((sum, current) => sum + current.liters_supplied, 0);

        // pegar limiar de alerta
        const lastStockEntry = fuelStock
          .filter(s => s.farm_id === farm.id && !s.is_deleted)
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        
        const minAlert = lastStockEntry.length > 0 ? lastStockEntry[0].minimum_stock_alert : 1000;

        return {
          farm_id: farm.id,
          farm_name: farm.name,
          total_received: totalReceived,
          total_consumed: totalConsumed,
          current_balance: totalReceived - totalConsumed,
          min_alert: minAlert
        };
      });
    }

    try {
      const { data, error } = await supabase!.from('fuel_stock_balance').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar balanço de combustível:', e);
      return [];
    }
  },

  async updateFuelStock(id: string, stock: Partial<FuelStock>): Promise<FuelStock> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<FuelStock>('fuel_stock', SEED_FUEL_STOCK);
      const idx = list.findIndex(item => item.id === id);
      if (idx === -1) throw new Error('Registro não encontrado');
      
      const updatedEntry = {
        ...list[idx],
        ...stock,
        liters_received: stock.liters_received !== undefined ? Number(stock.liters_received) : list[idx].liters_received,
        price_per_liter: stock.price_per_liter !== undefined ? Number(stock.price_per_liter) : list[idx].price_per_liter,
        minimum_stock_alert: stock.minimum_stock_alert !== undefined ? Number(stock.minimum_stock_alert) : list[idx].minimum_stock_alert,
      };
      list[idx] = updatedEntry;
      LocalStorageDb.set('fuel_stock', list);
      return updatedEntry;
    }
    const { data, error } = await supabase!.from('fuel_stock').update(stock).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFuelStock(id: string, justification: string): Promise<FuelStock> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<FuelStock>('fuel_stock', SEED_FUEL_STOCK);
      const idx = list.findIndex(item => item.id === id);
      if (idx === -1) throw new Error('Registro não encontrado');
      
      const updatedEntry = {
        ...list[idx],
        is_deleted: true,
        deletion_reason: justification,
      };
      list[idx] = updatedEntry;
      LocalStorageDb.set('fuel_stock', list);
      return updatedEntry;
    }
    const { data, error } = await supabase!.from('fuel_stock').update({
      is_deleted: true,
      deletion_reason: justification
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // =======================================================================
  // MANUTENÇÃO (MAINTENANCE LOGS)
  // =======================================================================
  async getMaintenanceLogs(): Promise<MaintenanceLog[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('maintenance_logs', SEED_MAINTENANCE_LOGS);
    }
    try {
      const { data, error } = await supabase!.from('maintenance_logs').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar manutenções no Supabase, usando local:', e);
      isDemoMode = true;
      return LocalStorageDb.get('maintenance_logs', SEED_MAINTENANCE_LOGS);
    }
  },

  async addMaintenanceLog(log: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<MaintenanceLog>('maintenance_logs', SEED_MAINTENANCE_LOGS);
      
      const pCost = Number(log.parts_cost) || 0;
      const lCost = Number(log.labor_cost) || 0;
      const tCost = pCost + lCost;
      const serviceHours = Number(log.hour_km_at_service) || 0;

      const newLog: MaintenanceLog = {
        id: crypto.randomUUID(),
        machine_id: log.machine_id || '',
        date: log.date || new Date().toISOString(),
        type: log.type || 'preventiva',
        priority: log.priority || 'media',
        hour_km_at_service: serviceHours,
        service_description: log.service_description || 'Serviço executado',
        main_item: log.main_item || 'Geral',
        parts_replaced: log.parts_replaced || '',
        quantity: Number(log.quantity) || 1,
        parts_cost: pCost,
        labor_cost: lCost,
        total_cost: tCost,
        location_shop: log.location_shop || 'oficina_interna',
        responsible: log.responsible || '',
        next_maintenance_date: log.next_maintenance_date || '',
        next_hour_km: Number(log.next_hour_km) || undefined,
        created_at: new Date().toISOString()
      };

      list.push(newLog);
      LocalStorageDb.set('maintenance_logs', list);

      // Trigger de atualização do current_hour_km da máquina
      const mList = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const mIndex = mList.findIndex(m => m.id === log.machine_id);
      if (mIndex !== -1 && serviceHours > mList[mIndex].current_hour_km) {
        mList[mIndex].current_hour_km = serviceHours;
        mList[mIndex].updated_at = new Date().toISOString();
        LocalStorageDb.set('machines', mList);
      }

      return newLog;
    }
    const { data, error } = await supabase!.from('maintenance_logs').insert([log]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteMaintenanceLog(id: string): Promise<void> {
    if (isDemoMode) {
      let list = LocalStorageDb.get<MaintenanceLog>('maintenance_logs', SEED_MAINTENANCE_LOGS);
      list = list.filter(l => l.id !== id);
      LocalStorageDb.set('maintenance_logs', list);
      return;
    }
    const { error } = await supabase!.from('maintenance_logs').delete().eq('id', id);
    if (error) throw error;
  },

  // =======================================================================
  // PLANO PREVENTIVO (PREVENTIVE PLAN)
  // =======================================================================
  async getPreventivePlan(): Promise<PreventivePlanItem[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('preventive_plan', SEED_PREVENTIVE_PLAN);
    }
    try {
      const { data, error } = await supabase!.from('preventive_plan').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar plano preventivo no Supabase, usando local:', e);
      isDemoMode = true;
      return LocalStorageDb.get('preventive_plan', SEED_PREVENTIVE_PLAN);
    }
  },

  async addPreventivePlan(item: Partial<PreventivePlanItem>): Promise<PreventivePlanItem> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<PreventivePlanItem>('preventive_plan', SEED_PREVENTIVE_PLAN);
      const newItem: PreventivePlanItem = {
        id: crypto.randomUUID(),
        machine_id: item.machine_id || '',
        maintenance_item: item.maintenance_item || 'Item Novo',
        interval_days: Number(item.interval_days) || 0,
        interval_hour_km: Number(item.interval_hour_km) || 0,
        created_at: new Date().toISOString()
      };
      list.push(newItem);
      LocalStorageDb.set('preventive_plan', list);
      return newItem;
    }
    const { data, error } = await supabase!.from('preventive_plan').insert([item]).select().single();
    if (error) throw error;
    return data;
  },

  async updatePreventivePlan(id: string, item: Partial<PreventivePlanItem>): Promise<PreventivePlanItem> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<PreventivePlanItem>('preventive_plan', SEED_PREVENTIVE_PLAN);
      const index = list.findIndex(pp => pp.id === id);
      if (index === -1) throw new Error('Plan item not found');
      list[index] = { ...list[index], ...item };
      LocalStorageDb.set('preventive_plan', list);
      return list[index];
    }
    const { data, error } = await supabase!.from('preventive_plan').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deletePreventivePlan(id: string): Promise<void> {
    if (isDemoMode) {
      let list = LocalStorageDb.get<PreventivePlanItem>('preventive_plan', SEED_PREVENTIVE_PLAN);
      list = list.filter(pp => pp.id !== id);
      LocalStorageDb.set('preventive_plan', list);
      return;
    }
    const { error } = await supabase!.from('preventive_plan').delete().eq('id', id);
    if (error) throw error;
  },

  async performPreventiveMaintenance(planItemId: string, date: string, hourKm: number): Promise<void> {
    // O status é calculado dinamicamente com base nas manutenções gravadas em tempo real.
    return Promise.resolve();
  },

  // VIEW preventive_plan_status
  async getPreventivePlanStatus(): Promise<PreventivePlanStatus[]> {
    if (isDemoMode) {
      const plan = LocalStorageDb.get<PreventivePlanItem>('preventive_plan', SEED_PREVENTIVE_PLAN);
      const machines = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const maintenanceLogs = LocalStorageDb.get<MaintenanceLog>('maintenance_logs', SEED_MAINTENANCE_LOGS);

      const today = new Date();

      return plan.map(item => {
        const m = machines.find(x => x.id === item.machine_id);
        if (!m) return null;

        // Busca histórico de manutenções deste item para esta máquina
        const itemHistory = maintenanceLogs
          .filter(l => l.machine_id === item.machine_id && l.main_item === item.maintenance_item)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastPerformed = itemHistory.length > 0 ? itemHistory[0] : null;

        const lastPerformedDate = lastPerformed ? lastPerformed.date : '';
        const lastPerformedHourKm = lastPerformed ? lastPerformed.hour_km_at_service : m.initial_hour_km;
        const currentHourKm = m.current_hour_km;
        const hoursKmSinceLast = currentHourKm - lastPerformedHourKm;

        let nextDueDate: string | null = null;
        let daysRemaining = 99999;
        
        if (item.interval_days > 0 && lastPerformedDate) {
          const lpDate = new Date(lastPerformedDate);
          const nextDate = new Date(lpDate);
          nextDate.setDate(nextDate.getDate() + item.interval_days);
          nextDueDate = nextDate.toISOString().split('T')[0];
          daysRemaining = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        const hourKmRemaining = item.interval_hour_km > 0
          ? item.interval_hour_km - hoursKmSinceLast
          : 99999;

        // Determinar o status
        let status: 'NUNCA REALIZADA' | 'VENCIDA' | 'PRÓXIMA' | 'OK' = 'OK';
        if (!lastPerformed) {
          status = 'NUNCA REALIZADA';
        } else if (
          (item.interval_days > 0 && daysRemaining < 0) ||
          (item.interval_hour_km > 0 && hourKmRemaining < 0)
        ) {
          status = 'VENCIDA';
        } else if (
          (item.interval_days > 0 && daysRemaining <= 7) ||
          (item.interval_hour_km > 0 && hourKmRemaining <= 20)
        ) {
          status = 'PRÓXIMA';
        }

        return {
          plan_item_id: item.id,
          machine_id: item.machine_id,
          machine_code: m.code,
          machine_name: m.name,
          farm_id: m.farm_id,
          maintenance_item: item.maintenance_item,
          interval_days: item.interval_days,
          interval_hour_km: item.interval_hour_km,
          last_performed_date: lastPerformedDate,
          last_performed_hour_km: lastPerformedHourKm,
          current_hour_km: currentHourKm,
          hours_km_since_last: hoursKmSinceLast,
          next_due_date: nextDueDate,
          days_remaining: daysRemaining === 99999 ? 0 : daysRemaining,
          hour_km_remaining: hourKmRemaining === 99999 ? 0 : hourKmRemaining,
          status
        } as PreventivePlanStatus;
      }).filter(Boolean) as PreventivePlanStatus[];
    }

    try {
      const { data, error } = await supabase!.from('preventive_plan_status').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar status do plano preventivo no Supabase, usando local:', e);
      isDemoMode = true;
      // Fallback to local computed behavior (re-executing local calculation)
      const items = LocalStorageDb.get<PreventivePlanItem>('preventive_plan', SEED_PREVENTIVE_PLAN);
      const machines = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const logs = LocalStorageDb.get<MaintenanceLog>('maintenance_logs', SEED_MAINTENANCE_LOGS);
      const today = new Date();

      return items.map(item => {
        const m = machines.find(mac => mac.id === item.machine_id);
        if (!m) return null;

        const mLogs = logs
          .filter(l => l.machine_id === m.id && l.main_item === item.maintenance_item)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastPerformed = mLogs.length > 0 ? mLogs[0] : null;
        const lastPerformedDate = lastPerformed ? lastPerformed.date : item.last_performed_date;
        const lastPerformedHourKm = lastPerformed ? lastPerformed.hour_km_at_service : item.last_performed_hour_km;

        const currentHourKm = m.current_hour_km || m.initial_hour_km;
        const hoursKmSinceLast = currentHourKm - lastPerformedHourKm;

        let nextDueDate = '';
        let daysRemaining = 99999;
        if (item.interval_days > 0) {
          const baseDate = new Date(lastPerformedDate);
          baseDate.setDate(baseDate.getDate() + item.interval_days);
          nextDueDate = baseDate.toISOString().split('T')[0];
          daysRemaining = Math.ceil((baseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        let hourKmRemaining = 99999;
        if (item.interval_hour_km > 0) {
          hourKmRemaining = (lastPerformedHourKm + item.interval_hour_km) - currentHourKm;
        }

        let status: 'NUNCA REALIZADA' | 'VENCIDA' | 'PRÓXIMA' | 'OK' = 'OK';
        if (!lastPerformed) {
          status = 'NUNCA REALIZADA';
        } else if (
          (item.interval_days > 0 && daysRemaining < 0) ||
          (item.interval_hour_km > 0 && hourKmRemaining < 0)
        ) {
          status = 'VENCIDA';
        } else if (
          (item.interval_days > 0 && daysRemaining <= 7) ||
          (item.interval_hour_km > 0 && hourKmRemaining <= 20)
        ) {
          status = 'PRÓXIMA';
        }

        return {
          plan_item_id: item.id,
          machine_id: item.machine_id,
          machine_code: m.code,
          machine_name: m.name,
          farm_id: m.farm_id,
          maintenance_item: item.maintenance_item,
          interval_days: item.interval_days,
          interval_hour_km: item.interval_hour_km,
          last_performed_date: lastPerformedDate,
          last_performed_hour_km: lastPerformedHourKm,
          current_hour_km: currentHourKm,
          hours_km_since_last: hoursKmSinceLast,
          next_due_date: nextDueDate,
          days_remaining: daysRemaining === 99999 ? 0 : daysRemaining,
          hour_km_remaining: hourKmRemaining === 99999 ? 0 : hourKmRemaining,
          status
        } as PreventivePlanStatus;
      }).filter(Boolean) as PreventivePlanStatus[];
    }
  },

  // =======================================================================
  // CHECKLIST 30 DIAS (CHECKLISTS_30D)
  // =======================================================================
  async getChecklists(): Promise<Checklist30d[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('checklists', SEED_CHECKLISTS);
    }
    try {
      const { data, error } = await supabase!.from('checklists_30d').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar checklists no Supabase, usando local:', e);
      isDemoMode = true;
      return LocalStorageDb.get('checklists', SEED_CHECKLISTS);
    }
  },

  async addChecklist(checklist: Partial<Checklist30d>): Promise<Checklist30d> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<Checklist30d>('checklists', SEED_CHECKLISTS);
      const newChecklist: Checklist30d = {
        id: crypto.randomUUID(),
        machine_id: checklist.machine_id || '',
        date: checklist.date || new Date().toISOString().split('T')[0],
        operator_name: checklist.operator_name || 'Operador',
        hour_km: Number(checklist.hour_km) || 0,
        work_type: checklist.work_type || '',
        overall_status: checklist.overall_status || 'OK',
        failed_items_notes: checklist.failed_items_notes || '',
        created_at: new Date().toISOString()
      };
      list.push(newChecklist);
      LocalStorageDb.set('checklists', list);

      // Se o status do checklist for grave (Máquina Parada ou Atenção), alertar ou opcionalmente gerar OS
      return newChecklist;
    }
    const { data, error } = await supabase!.from('checklists_30d').insert([checklist]).select().single();
    if (error) throw error;
    return data;
  },

  // VIEW checklist_summary
  async getChecklistSummary(): Promise<ChecklistSummary[]> {
    if (isDemoMode) {
      const machines = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const checklists = LocalStorageDb.get<Checklist30d>('checklists', SEED_CHECKLISTS);
      const today = new Date();

      return machines.map(m => {
        const mChecklists = checklists
          .filter(c => c.machine_id === m.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastDateStr = mChecklists.length > 0 ? mChecklists[0].date : null;
        let daysSinceLast: number | null = null;
        let status: 'NUNCA' | 'VENCIDO' | 'PRÓXIMO' | 'OK' = 'NUNCA';

        if (lastDateStr) {
          const lastDate = new Date(lastDateStr);
          daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLast > 30) {
            status = 'VENCIDO';
          } else if (daysSinceLast >= 23) {
            status = 'PRÓXIMO';
          } else {
            status = 'OK';
          }
        }

        return {
          machine_id: m.id,
          machine_code: m.code,
          machine_name: m.name,
          farm_id: m.farm_id,
          last_checklist_date: lastDateStr,
          days_since_last: daysSinceLast,
          status
        };
      });
    }

    try {
      const { data, error } = await supabase!.from('checklist_summary').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar resumo de checklists no Supabase, usando local:', e);
      isDemoMode = true;
      const machines = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const checklists = LocalStorageDb.get<Checklist30d>('checklists', SEED_CHECKLISTS);
      const today = new Date();

      return machines.map(m => {
        const mChecklists = checklists
          .filter(c => c.machine_id === m.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastDateStr = mChecklists.length > 0 ? mChecklists[0].date : null;
        let daysSinceLast: number | null = null;
        let status: 'NUNCA' | 'VENCIDO' | 'PRÓXIMO' | 'OK' = 'NUNCA';

        if (lastDateStr) {
          const lastDate = new Date(lastDateStr);
          daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLast > 30) {
            status = 'VENCIDO';
          } else if (daysSinceLast >= 23) {
            status = 'PRÓXIMO';
          } else {
            status = 'OK';
          }
        }

        return {
          machine_id: m.id,
          machine_code: m.code,
          machine_name: m.name,
          farm_id: m.farm_id,
          last_checklist_date: lastDateStr,
          days_since_last: daysSinceLast,
          status
        };
      });
    }
  },

  // =======================================================================
  // ORDENS DE SERVIÇO (WORK ORDERS)
  // =======================================================================
  async getWorkOrders(): Promise<WorkOrder[]> {
    if (isDemoMode) {
      return LocalStorageDb.get('work_orders', SEED_WORK_ORDERS);
    }
    try {
      const { data, error } = await supabase!.from('work_orders').select('*').order('os_number', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar ordens de serviço no Supabase, usando local:', e);
      isDemoMode = true;
      return LocalStorageDb.get('work_orders', SEED_WORK_ORDERS);
    }
  },

  async addWorkOrder(wo: Partial<WorkOrder>): Promise<WorkOrder> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<WorkOrder>('work_orders', SEED_WORK_ORDERS);
      const nextNum = list.length > 0 ? Math.max(...list.map(w => Number(w.os_number) || 0)) + 1 : 1;
      
      const newWO: WorkOrder = {
        id: crypto.randomUUID(),
        os_number: nextNum,
        machine_id: wo.machine_id || '',
        open_date: wo.open_date || new Date().toISOString().split('T')[0],
        reason: wo.reason || wo.description || 'Revisão',
        description: wo.description,
        priority: wo.priority || 'media',
        status: wo.status || 'Aberta',
        responsible: wo.responsible || wo.assigned_to || '',
        assigned_to: wo.assigned_to,
        close_date: wo.close_date || undefined,
        notes: wo.notes || '',
        created_at: new Date().toISOString()
      };
      
      list.push(newWO);
      LocalStorageDb.set('work_orders', list);
      return newWO;
    }
    const { data, error } = await supabase!.from('work_orders').insert([wo]).select().single();
    if (error) throw error;
    return data;
  },

  async updateWorkOrder(id: string, wo: Partial<WorkOrder>): Promise<WorkOrder> {
    if (isDemoMode) {
      const list = LocalStorageDb.get<WorkOrder>('work_orders', SEED_WORK_ORDERS);
      const index = list.findIndex(w => w.id === id);
      if (index === -1) throw new Error('Work order not found');
      
      list[index] = { 
        ...list[index], 
        ...wo,
        close_date: wo.status === 'Concluída' ? (wo.close_date || new Date().toISOString().split('T')[0]) : wo.close_date 
      };
      LocalStorageDb.set('work_orders', list);
      return list[index];
    }
    const { data, error } = await supabase!.from('work_orders').update(wo).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteWorkOrder(id: string): Promise<void> {
    if (isDemoMode) {
      let list = LocalStorageDb.get<WorkOrder>('work_orders', SEED_WORK_ORDERS);
      list = list.filter(w => w.id !== id);
      LocalStorageDb.set('work_orders', list);
      return;
    }
    const { error } = await supabase!.from('work_orders').delete().eq('id', id);
    if (error) throw error;
  },

  // =======================================================================
  // VIEWS DO DASHBOARD (DASHBOARD VIEWS)
  // =======================================================================
  async getDashboardSummary(): Promise<DashboardSummary> {
    if (isDemoMode) {
      const fuelLogs = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      const maintenanceLogs = LocalStorageDb.get<MaintenanceLog>('maintenance_logs', SEED_MAINTENANCE_LOGS);
      const machines = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);

      const fuelCost = fuelLogs.reduce((sum, current) => sum + current.total_value, 0);
      const maintCost = maintenanceLogs.reduce((sum, current) => sum + current.total_cost, 0);
      const liters = fuelLogs.reduce((sum, current) => sum + current.liters_supplied, 0);

      return {
        total_fuel_cost: fuelCost,
        total_maintenance_cost: maintCost,
        total_liters_supplied: liters,
        total_machines: machines.length
      };
    }

    const { data, error } = await supabase!.from('dashboard_summary').select('*').single();
    if (error) throw error;
    return data;
  },

  async getCostRanking(): Promise<CostRankingItem[]> {
    if (isDemoMode) {
      const machines = LocalStorageDb.get<Machine>('machines', SEED_MACHINES);
      const farms = LocalStorageDb.get<Farm>('farms', SEED_FARMS);
      const fuelLogs = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      const maintenanceLogs = LocalStorageDb.get<MaintenanceLog>('maintenance_logs', SEED_MAINTENANCE_LOGS);

      const ranking = machines.map(m => {
        const farm = farms.find(f => f.id === m.farm_id);
        
        const machineFuelLogs = fuelLogs.filter(l => l.machine_id === m.id);
        const fuelCost = machineFuelLogs.reduce((sum, current) => sum + current.total_value, 0);

        const machineMaintLogs = maintenanceLogs.filter(l => l.machine_id === m.id);
        const maintCost = machineMaintLogs.reduce((sum, current) => sum + current.total_cost, 0);

        return {
          machine_id: m.id,
          machine_code: m.code,
          machine_name: m.name,
          brand: m.brand,
          model: m.model,
          farm_name: farm ? farm.name : 'Fazenda Desconhecida',
          total_fuel_cost: fuelCost,
          total_maintenance_cost: maintCost,
          total_accumulated_cost: fuelCost + maintCost
        };
      });

      return ranking.sort((a, b) => b.total_accumulated_cost - a.total_accumulated_cost).slice(0, 15);
    }

    const { data, error } = await supabase!.from('cost_ranking').select('*');
    if (error) throw error;
    return data || [];
  },

  async getFuelLast12Months(): Promise<any[]> {
    if (isDemoMode) {
      const fuelLogs = LocalStorageDb.get<FuelLog>('fuel_logs', SEED_FUEL_LOGS);
      
      // Agrupar por ano-mês
      const monthlyData: { [key: string]: { liters: number, cost: number } } = {};
      
      fuelLogs.forEach(log => {
        const d = new Date(log.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { liters: 0, cost: 0 };
        }
        monthlyData[monthKey].liters += log.liters_supplied;
        monthlyData[monthKey].cost += log.total_value;
      });

      const sortedKeys = Object.keys(monthlyData).sort();
      return sortedKeys.map(key => ({
        month_str: key,
        total_liters: Number(monthlyData[key].liters.toFixed(2)),
        total_cost: Number(monthlyData[key].cost.toFixed(2))
      }));
    }

    const { data, error } = await supabase!.from('dashboard_fuel_last_12_months').select('*');
    if (error) throw error;
    return data || [];
  }
};
