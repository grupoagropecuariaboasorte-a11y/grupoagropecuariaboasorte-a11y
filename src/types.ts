// TIPOS DE DADOS PARA O CONTROLE DE FROTA AGRÍCOLA

export interface UserProfile {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  name: string;
  location?: string;
  created_at?: string;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  type: string; // FK equipment_types
  brand: string;
  model: string;
  year: number;
  serial_number?: string;
  initial_hour_km: number;
  current_hour_km: number;
  acquisition_date?: string;
  status: 'Ativa' | 'Em manutenção' | 'Parada' | 'Vendida/Baixada';
  farm_id: string; // FK farms
  driver_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FuelStock {
  id: string;
  farm_id: string;
  entry_date: string;
  liters_received: number;
  price_per_liter: number; // Preço de aquisição por litro
  supplier?: string;
  minimum_stock_alert: number;
  notes?: string;
  created_at?: string;
  is_deleted?: boolean;
  deletion_reason?: string;
  edit_justification?: string;
}

export interface FuelLog {
  id: string;
  farm_id: string;
  machine_id: string;
  date: string;
  fuel_type: string; // FK fuel_types
  pump_reading_start: number;
  pump_reading_end: number;
  liters_supplied: number; // calculated end - start
  hour_km_at_fueling: number;
  hours_km_since_last: number; // calculated from trigger
  consumption_rate: number;    // calculated liters/hour or km
  price_per_liter: number;
  total_value: number; // liters_supplied * price_per_liter
  supplier?: string;
  responsible?: string;
  notes?: string;
  created_at?: string;
}

export interface PreventivePlanItem {
  id: string;
  machine_id: string;
  maintenance_item: string;
  interval_days: number;
  interval_hour_km: number;
  last_performed_date?: string;
  last_performed_hour_km?: number;
  created_at?: string;
}

export interface MaintenanceLog {
  id: string;
  machine_id: string;
  date: string;
  type: string; // FK maintenance_types
  priority: string; // FK priorities
  hour_km_at_service: number;
  service_description: string;
  main_item: string; // text matching preventive plan item name
  parts_replaced?: string;
  quantity: number;
  parts_cost: number;
  labor_cost: number;
  total_cost: number; // parts_cost + labor_cost
  location_shop?: string; // FK service_locations
  responsible: string;
  operator_name?: string;
  next_maintenance_date?: string;
  next_hour_km?: number;
  created_at?: string;
}

export interface Checklist30d {
  id: string;
  machine_id: string;
  date: string;
  operator_name: string;
  hour_km: number;
  work_type?: string;
  overall_status: 'OK' | 'Necessita Atenção' | 'Máquina Parada';
  failed_items_notes?: string;
  details?: any;
  created_at?: string;
}

export interface WorkOrder {
  id: string;
  os_number?: string | number;
  machine_id: string;
  open_date: string;
  reason: string;
  description?: string;
  priority: string; // FK priorities
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Cancelada';
  responsible?: string;
  assigned_to?: string;
  close_date?: string;
  notes?: string;
  created_at?: string;
}

// LOOKUPS / AUXILIARES
export interface LookupItem {
  id: string;
  label: string;
  color_hex?: string;
}

// VIEWS E AGREGADOS
export interface FuelStockBalance {
  farm_id: string;
  farm_name: string;
  total_received: number;
  total_consumed: number;
  current_balance: number;
  min_alert: number;
}

export interface ChecklistSummary {
  machine_id: string;
  machine_code: string;
  machine_name: string;
  farm_id: string;
  last_checklist_date: string | null;
  days_since_last: number | null;
  status: 'NUNCA' | 'VENCIDO' | 'PRÓXIMO' | 'OK';
}

export interface PreventivePlanStatus {
  plan_item_id: string;
  machine_id: string;
  machine_code: string;
  machine_name: string;
  farm_id: string;
  maintenance_item: string;
  interval_days: number;
  interval_hour_km: number;
  last_performed_date: string;
  last_performed_hour_km: number;
  current_hour_km: number;
  hours_km_since_last: number;
  next_due_date: string | null;
  days_remaining: number;
  hour_km_remaining: number;
  status: 'NUNCA REALIZADA' | 'VENCIDA' | 'PRÓXIMA' | 'OK';
}

export interface CostRankingItem {
  machine_id: string;
  machine_code: string;
  machine_name: string;
  brand: string;
  model: string;
  farm_name: string;
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_accumulated_cost: number;
}

export interface DashboardSummary {
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_liters_supplied: number;
  total_machines: number;
}
