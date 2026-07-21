import { supabase, isDemoMode as importedDemoMode, setDemoMode, setSchemaMissing } from './supabaseClient';
import { 
  Farm, Machine, FuelStock, FuelLog, PreventivePlanItem, 
  MaintenanceLog, Checklist30d, WorkOrder, LookupItem,
  FuelStockBalance, ChecklistSummary, PreventivePlanStatus, CostRankingItem, DashboardSummary 
} from '../types';

const isDemoMode = false;
function syncDemoMode(val: boolean) {
  if (val) {
    throw new Error("Erro de conexão ao banco de dados Supabase.");
  }
}

// Função auxiliar para tratar erros do banco e detectar tabelas ausentes
function handleDbError(e: any, message: string) {
  console.error(message, e);
  throw e;
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
    
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;
      const { data } = await supabase!.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return data;
    } catch (e) {
      console.error('Erro ao buscar perfil do Supabase, usando local:', e);
      throw e;
    }
  },

  async updateProfileRole(id: string, role: string): Promise<any> {
    
    try {
      const { data, error } = await supabase!.from('profiles').update({ role }).eq('id', id).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao atualizar perfil no Supabase, usando local:', e);
      throw e;
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
      throw e;
    }
  },

  // =======================================================================
  // FAZENDAS (FARMS)
  // =======================================================================
  async getFarms(): Promise<Farm[]> {
    
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
    
    const cleanFarm = {
      name: farm.name || 'Nova Fazenda'
    };
    try {
      const { data, error } = await supabase!.from('farms').insert([cleanFarm]).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao adicionar fazenda no Supabase, usando local:', e);
      throw e;
    }
  },

  async updateFarm(id: string, farm: Partial<Farm>): Promise<Farm> {
    
    try {
      const { data, error } = await supabase!.from('farms').update(farm).eq('id', id).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao atualizar fazenda no Supabase, usando local:', e);
      throw e;
    }
  },

  async deleteFarm(id: string): Promise<void> {
    
    try {
      const { error } = await supabase!.from('farms').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao excluir fazenda no Supabase, usando local:', e);
      throw e;
    }
  },

  // =======================================================================
  // MÁQUINAS (MACHINES)
  // =======================================================================
  async getMachines(): Promise<Machine[]> {
    
    try {
      const { data, error } = await supabase!.from('machines').select('*').order('code', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar máquinas no Supabase, usando local:', e);
      throw e;
    }
  },

  async addMachine(machine: Partial<Machine>): Promise<Machine> {
    
    const cleanMachine = {
      code: machine.code || 'MAQ-NEW',
      name: machine.name || 'Máquina Nova',
      type: machine.type || 'trator',
      brand: machine.brand || 'Marca',
      model: machine.model || 'Modelo',
      year: Number(machine.year) || new Date().getFullYear(),
      serial_number: machine.serial_number || '',
      initial_hour_km: Number(machine.initial_hour_km) || 0,
      current_hour_km: Number(machine.current_hour_km) || Number(machine.initial_hour_km) || 0,
      acquisition_date: machine.acquisition_date || new Date().toISOString().split('T')[0],
      status: machine.status || 'Ativa',
      farm_id: machine.farm_id || '11111111-1111-1111-1111-111111111111',
      driver_name: machine.driver_name || ''
    };
    const { data, error } = await supabase!.from('machines').insert([cleanMachine]).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateMachine(id: string, machine: Partial<Machine>): Promise<Machine> {
    
    const cleanMachine: any = {};
    if (machine.code !== undefined) cleanMachine.code = machine.code;
    if (machine.name !== undefined) cleanMachine.name = machine.name;
    if (machine.type !== undefined) cleanMachine.type = machine.type;
    if (machine.brand !== undefined) cleanMachine.brand = machine.brand;
    if (machine.model !== undefined) cleanMachine.model = machine.model;
    if (machine.year !== undefined) cleanMachine.year = Number(machine.year);
    if (machine.serial_number !== undefined) cleanMachine.serial_number = machine.serial_number;
    if (machine.initial_hour_km !== undefined) cleanMachine.initial_hour_km = Number(machine.initial_hour_km);
    if (machine.current_hour_km !== undefined) cleanMachine.current_hour_km = Number(machine.current_hour_km);
    if (machine.acquisition_date !== undefined) cleanMachine.acquisition_date = machine.acquisition_date;
    if (machine.status !== undefined) cleanMachine.status = machine.status;
    if (machine.farm_id !== undefined) cleanMachine.farm_id = machine.farm_id;
    if (machine.driver_name !== undefined) cleanMachine.driver_name = machine.driver_name;
    cleanMachine.updated_at = new Date().toISOString();

    const { data, error } = await supabase!.from('machines').update(cleanMachine).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteMachine(id: string): Promise<void> {
    
    const { error } = await supabase!.from('machines').delete().eq('id', id);
    if (error) throw error;
  },

  // =======================================================================
  // ABASTECIMENTOS (FUEL LOGS)
  // =======================================================================
  async getFuelLogs(): Promise<FuelLog[]> {
    
    try {
      const { data, error } = await supabase!.from('fuel_logs').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar abastecimentos no Supabase, usando local:', e);
      throw e;
    }
  },

  async getLatestDieselPrice(farmId: string): Promise<number> {
    

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

    

    const pStart = Number(log.pump_reading_start) || 0;
    const pEnd = Number(log.pump_reading_end) || 0;

    const logToInsert = {
      farm_id: log.farm_id,
      machine_id: log.machine_id,
      date: log.date || new Date().toISOString(),
      fuel_type: log.fuel_type || 'diesel_s10',
      pump_reading_start: pStart,
      pump_reading_end: pEnd,
      hour_km_at_fueling: Number(log.hour_km_at_fueling) || 0,
      hours_km_since_last: Number(log.hours_km_since_last) || 0,
      consumption_rate: Number(log.consumption_rate) || 0,
      price_per_liter: price,
      supplier: log.supplier || '',
      responsible: log.responsible || '',
      notes: log.notes || ''
    };

    const { data, error } = await supabase!.from('fuel_logs').insert([logToInsert]).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateFuelLog(id: string, log: Partial<FuelLog>): Promise<FuelLog> {
    

    const farmId = log.farm_id || '11111111-1111-1111-1111-111111111111';
    const price = await this.getLatestDieselPrice(farmId);

    const updatedFields: any = {};
    if (log.farm_id !== undefined) updatedFields.farm_id = log.farm_id;
    if (log.machine_id !== undefined) updatedFields.machine_id = log.machine_id;
    if (log.date !== undefined) updatedFields.date = log.date;
    if (log.fuel_type !== undefined) updatedFields.fuel_type = log.fuel_type;
    if (log.pump_reading_start !== undefined) updatedFields.pump_reading_start = Number(log.pump_reading_start);
    if (log.pump_reading_end !== undefined) updatedFields.pump_reading_end = Number(log.pump_reading_end);
    if (log.hour_km_at_fueling !== undefined) updatedFields.hour_km_at_fueling = Number(log.hour_km_at_fueling);
    if (log.hours_km_since_last !== undefined) updatedFields.hours_km_since_last = Number(log.hours_km_since_last);
    if (log.consumption_rate !== undefined) updatedFields.consumption_rate = Number(log.consumption_rate);
    updatedFields.price_per_liter = price;
    if (log.supplier !== undefined) updatedFields.supplier = log.supplier;
    if (log.responsible !== undefined) updatedFields.responsible = log.responsible;
    if (log.notes !== undefined) updatedFields.notes = log.notes;

    const { data, error } = await supabase!.from('fuel_logs').update(updatedFields).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteFuelLog(id: string): Promise<void> {
    
    const { error } = await supabase!.from('fuel_logs').delete().eq('id', id);
    if (error) throw error;
  },

  // Busca se há discrepâncias nas leituras anteriores de bombas daquela fazenda
  async getPumpDiscrepancy(farmId: string, currentStart: number): Promise<{ lastEnd: number; hasDiscrepancy: boolean }> {
    

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
    
    try {
      const { data, error } = await supabase!.from('fuel_stock').select('*').order('entry_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar fuel_stock no Supabase, usando local:', e);
      throw e;
    }
  },

  async addFuelStock(stock: Partial<FuelStock>): Promise<FuelStock> {
    
    const cleanStock = {
      farm_id: stock.farm_id,
      entry_date: stock.entry_date || new Date().toISOString().split('T')[0],
      liters_received: Number(stock.liters_received) || 0,
      price_per_liter: Number(stock.price_per_liter) || 5.85,
      supplier: stock.supplier || '',
      minimum_stock_alert: Number(stock.minimum_stock_alert) || 1000,
      notes: stock.notes || ''
    };
    try {
      const { data, error } = await supabase!.from('fuel_stock').insert([cleanStock]).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao adicionar fuel_stock no Supabase, usando local:', e);
      throw e;
    }
  },

  // VIEW fuel_stock_balance
  async getFuelStockBalance(): Promise<FuelStockBalance[]> {
    

    try {
      const { data, error } = await supabase!.from('fuel_stock_balance').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar balanço de combustível no Supabase, usando local:', e);
      throw e;
    }
  },

  async updateFuelStock(id: string, stock: Partial<FuelStock>): Promise<FuelStock> {
    

    // Proactively construct a clean payload for Supabase to avoid column-not-found errors
    const cleanStock: any = {};
    if (stock.farm_id !== undefined) cleanStock.farm_id = stock.farm_id;
    if (stock.entry_date !== undefined) cleanStock.entry_date = stock.entry_date;
    if (stock.liters_received !== undefined) cleanStock.liters_received = Number(stock.liters_received);
    if (stock.price_per_liter !== undefined) cleanStock.price_per_liter = Number(stock.price_per_liter);
    if (stock.supplier !== undefined) cleanStock.supplier = stock.supplier;
    if (stock.minimum_stock_alert !== undefined) cleanStock.minimum_stock_alert = Number(stock.minimum_stock_alert);

    let finalNotes = stock.notes !== undefined ? stock.notes : '';
    if (stock.edit_justification) {
      finalNotes = finalNotes
        ? `${finalNotes}\n[Justificativa da alteração: ${stock.edit_justification}]`
        : `[Justificativa da alteração: ${stock.edit_justification}]`;
    }
    if (finalNotes) {
      cleanStock.notes = finalNotes;
    } else if (stock.notes !== undefined) {
      cleanStock.notes = stock.notes;
    }

    try {
      const { data, error } = await supabase!.from('fuel_stock').update(cleanStock).eq('id', id).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (e: any) {
      if (e?.code === '42P01' || e?.message?.includes('relation "') || e?.message?.includes('does not exist')) {
        console.error('Tabela fuel_stock inexistente no Supabase, ativando fallback local:', e);
      }
      throw e;
    }
  },

  async deleteFuelStock(id: string, justification: string): Promise<FuelStock> {
    try {
      const { data, error } = await supabase!.from('fuel_stock').update({
        is_deleted: true,
        deletion_reason: justification
      }).eq('id', id).select().maybeSingle();

      if (error) {
        // Se der erro de coluna não existente para is_deleted ou deletion_reason (código 42703 ou mensagem)
        if (
          error.code === '42703' ||
          error.message?.includes('is_deleted') || 
          error.message?.includes('deletion_reason') || 
          error.code === '42P21' || 
          error.code === '42P22'
        ) {
          const deleteResult = await supabase!.from('fuel_stock').delete().eq('id', id).select().maybeSingle();
          if (deleteResult.error) throw deleteResult.error;
          return deleteResult.data;
        }
        throw error;
      }
      return data;
    } catch (e: any) {
      if (e?.code === '42P01' || e?.message?.includes('relation "') || e?.message?.includes('does not exist')) {
        console.error('Tabela fuel_stock inexistente no Supabase, ativando fallback local:', e);
      }
      throw e;
    }
  },

  // =======================================================================
  // MANUTENÇÃO (MAINTENANCE LOGS)
  // =======================================================================
  async getMaintenanceLogs(): Promise<MaintenanceLog[]> {
    
    try {
      const { data, error } = await supabase!.from('maintenance_logs').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar manutenções no Supabase, usando local:', e);
      throw e;
    }
  },

  async addMaintenanceLog(log: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    
    const cleanLog = {
      machine_id: log.machine_id,
      date: log.date || new Date().toISOString(),
      type: log.type || 'preventiva',
      priority: log.priority || 'media',
      hour_km_at_service: Number(log.hour_km_at_service) || 0,
      service_description: log.service_description || 'Serviço executado',
      main_item: log.main_item || 'Geral',
      parts_replaced: log.parts_replaced || '',
      quantity: Number(log.quantity) || 1,
      parts_cost: Number(log.parts_cost) || 0,
      labor_cost: Number(log.labor_cost) || 0,
      location_shop: log.location_shop || 'oficina_interna',
      responsible: log.responsible || '',
      operator_name: log.operator_name || '',
      next_maintenance_date: log.next_maintenance_date || null,
      next_hour_km: log.next_hour_km ? Number(log.next_hour_km) : null
    };
    const { data, error } = await supabase!.from('maintenance_logs').insert([cleanLog]).select().maybeSingle();
    if (error) {
      // Tentar sem operator_name caso a coluna não exista no Supabase ainda
      if (error.message?.includes('operator_name')) {
        const fallbackLog = { ...cleanLog };
        delete (fallbackLog as any).operator_name;
        const res = await supabase!.from('maintenance_logs').insert([fallbackLog]).select().maybeSingle();
        if (res.error) throw res.error;
        return res.data;
      }
      throw error;
    }
    return data;
  },

  async updateMaintenanceLog(id: string, log: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    const cleanLog: any = {};
    if (log.machine_id) cleanLog.machine_id = log.machine_id;
    if (log.date) cleanLog.date = log.date;
    if (log.type) cleanLog.type = log.type;
    if (log.priority) cleanLog.priority = log.priority;
    if (log.hour_km_at_service !== undefined) cleanLog.hour_km_at_service = Number(log.hour_km_at_service);
    if (log.service_description) cleanLog.service_description = log.service_description;
    if (log.main_item) cleanLog.main_item = log.main_item;
    if (log.parts_replaced !== undefined) cleanLog.parts_replaced = log.parts_replaced;
    if (log.quantity !== undefined) cleanLog.quantity = Number(log.quantity);
    if (log.parts_cost !== undefined) cleanLog.parts_cost = Number(log.parts_cost);
    if (log.labor_cost !== undefined) cleanLog.labor_cost = Number(log.labor_cost);
    if (log.location_shop) cleanLog.location_shop = log.location_shop;
    if (log.responsible !== undefined) cleanLog.responsible = log.responsible;
    if (log.operator_name !== undefined) cleanLog.operator_name = log.operator_name;
    if (log.next_maintenance_date !== undefined) cleanLog.next_maintenance_date = log.next_maintenance_date;
    if (log.next_hour_km !== undefined) cleanLog.next_hour_km = log.next_hour_km ? Number(log.next_hour_km) : null;

    const { data, error } = await supabase!.from('maintenance_logs').update(cleanLog).eq('id', id).select().maybeSingle();
    if (error) {
      if (error.message?.includes('operator_name')) {
        delete cleanLog.operator_name;
        const res = await supabase!.from('maintenance_logs').update(cleanLog).eq('id', id).select().maybeSingle();
        if (res.error) throw res.error;
        return res.data;
      }
      throw error;
    }
    return data;
  },

  async deleteMaintenanceLog(id: string): Promise<void> {
    
    const { error } = await supabase!.from('maintenance_logs').delete().eq('id', id);
    if (error) throw error;
  },

  // =======================================================================
  // PLANO PREVENTIVO (PREVENTIVE PLAN)
  // =======================================================================
  async getPreventivePlan(): Promise<PreventivePlanItem[]> {
    
    try {
      const { data, error } = await supabase!.from('preventive_plan').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar plano preventivo no Supabase, usando local:', e);
      throw e;
    }
  },

  async addPreventivePlan(item: Partial<PreventivePlanItem>): Promise<PreventivePlanItem> {
    
    const cleanItem = {
      machine_id: item.machine_id,
      maintenance_item: item.maintenance_item || 'Item Novo',
      interval_days: Number(item.interval_days) || 0,
      interval_hour_km: Number(item.interval_hour_km) || 0
    };
    const { data, error } = await supabase!.from('preventive_plan').insert([cleanItem]).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async updatePreventivePlan(id: string, item: Partial<PreventivePlanItem>): Promise<PreventivePlanItem> {
    
    const cleanItem: any = {};
    if (item.machine_id !== undefined) cleanItem.machine_id = item.machine_id;
    if (item.maintenance_item !== undefined) cleanItem.maintenance_item = item.maintenance_item;
    if (item.interval_days !== undefined) cleanItem.interval_days = Number(item.interval_days);
    if (item.interval_hour_km !== undefined) cleanItem.interval_hour_km = Number(item.interval_hour_km);

    const { data, error } = await supabase!.from('preventive_plan').update(cleanItem).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async deletePreventivePlan(id: string): Promise<void> {
    
    const { error } = await supabase!.from('preventive_plan').delete().eq('id', id);
    if (error) throw error;
  },

  async performPreventiveMaintenance(planItemId: string, date: string, hourKm: number): Promise<void> {
    // O status é calculado dinamicamente com base nas manutenções gravadas em tempo real.
    return Promise.resolve();
  },

  // VIEW preventive_plan_status
  async getPreventivePlanStatus(): Promise<PreventivePlanStatus[]> {
    

    try {
      const { data, error } = await supabase!.from('preventive_plan_status').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar status do plano preventivo no Supabase, usando local:', e);
      throw e;
    }
  },

  // =======================================================================
  // CHECKLIST 30 DIAS (CHECKLISTS_30D)
  // =======================================================================
  async getChecklists(): Promise<Checklist30d[]> {
    
    try {
      const { data, error } = await supabase!.from('checklists_30d').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar checklists no Supabase, usando local:', e);
      throw e;
    }
  },

  async addChecklist(checklist: Partial<Checklist30d>): Promise<Checklist30d> {
    
    const cleanChecklist = {
      machine_id: checklist.machine_id,
      date: checklist.date || new Date().toISOString().split('T')[0],
      operator_name: checklist.operator_name || 'Operador',
      hour_km: Number(checklist.hour_km) || 0,
      work_type: checklist.work_type || '',
      overall_status: checklist.overall_status || 'OK',
      failed_items_notes: checklist.failed_items_notes || ''
    };
    const { data, error } = await supabase!.from('checklists_30d').insert([cleanChecklist]).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  // VIEW checklist_summary
  async getChecklistSummary(): Promise<ChecklistSummary[]> {
    

    try {
      const { data, error } = await supabase!.from('checklist_summary').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar resumo de checklists no Supabase, usando local:', e);
      throw e;
    }
  },

  // =======================================================================
  // ORDENS DE SERVIÇO (WORK ORDERS)
  // =======================================================================
  async getWorkOrders(): Promise<WorkOrder[]> {
    
    try {
      const { data, error } = await supabase!.from('work_orders').select('*').order('os_number', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar ordens de serviço no Supabase, usando local:', e);
      throw e;
    }
  },

  async addWorkOrder(wo: Partial<WorkOrder>): Promise<WorkOrder> {
    
    const cleanWO = {
      machine_id: wo.machine_id,
      open_date: wo.open_date || new Date().toISOString().split('T')[0],
      reason: wo.reason || wo.description || 'Revisão',
      priority: wo.priority || 'media',
      status: wo.status || 'Aberta',
      responsible: wo.responsible || wo.assigned_to || '',
      notes: wo.notes || ''
    };
    const { data, error } = await supabase!.from('work_orders').insert([cleanWO]).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateWorkOrder(id: string, wo: Partial<WorkOrder>): Promise<WorkOrder> {
    
    const cleanWO: any = {};
    if (wo.machine_id !== undefined) cleanWO.machine_id = wo.machine_id;
    if (wo.open_date !== undefined) cleanWO.open_date = wo.open_date;
    if (wo.reason !== undefined) cleanWO.reason = wo.reason;
    else if (wo.description !== undefined) cleanWO.reason = wo.description;
    if (wo.priority !== undefined) cleanWO.priority = wo.priority;
    if (wo.status !== undefined) {
      cleanWO.status = wo.status;
      if (wo.status === 'Concluída') {
        cleanWO.close_date = wo.close_date || new Date().toISOString().split('T')[0];
      }
    }
    if (wo.responsible !== undefined) cleanWO.responsible = wo.responsible;
    else if (wo.assigned_to !== undefined) cleanWO.responsible = wo.assigned_to;
    if (wo.close_date !== undefined) cleanWO.close_date = wo.close_date;
    if (wo.notes !== undefined) cleanWO.notes = wo.notes;

    const { data, error } = await supabase!.from('work_orders').update(cleanWO).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteWorkOrder(id: string): Promise<void> {
    
    const { error } = await supabase!.from('work_orders').delete().eq('id', id);
    if (error) throw error;
  },

  // =======================================================================
  // VIEWS DO DASHBOARD (DASHBOARD VIEWS)
  // =======================================================================
  async getDashboardSummary(): Promise<DashboardSummary> {
    

    const { data, error } = await supabase!.from('dashboard_summary').select('*').maybeSingle();
    if (error) throw error;
    return data;
  },

  async getCostRanking(): Promise<CostRankingItem[]> {
    

    const { data, error } = await supabase!.from('cost_ranking').select('*');
    if (error) throw error;
    return data || [];
  },

  async getFuelLast12Months(): Promise<any[]> {
    

    const { data, error } = await supabase!.from('dashboard_fuel_last_12_months').select('*');
    if (error) throw error;
    return data || [];
  }
};
