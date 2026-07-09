-- SCHEMA SQL PARA CONTROLE DE FROTA AGRÍCOLA (SUPABASE / POSTGRES)
-- Cole este script no SQL Editor do Supabase para criar a estrutura completa.

-- =========================================================================
-- 1. TABELAS DE APOIO (LOOKUPS)
-- =========================================================================

CREATE TABLE IF NOT EXISTS equipment_types (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS fuel_types (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_types (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS priorities (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    color_hex VARCHAR(7) -- Opcional para estilização no frontend
);

CREATE TABLE IF NOT EXISTS service_locations (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

-- =========================================================================
-- 2. TABELA DE PERFIS DE USUÁRIOS (INTEGRAÇÃO COM SUPABASE AUTH)
-- =========================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 3. TABELAS DE NEGÓCIO PRINCIPAIS
-- =========================================================================

-- Fazendas
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Máquinas
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- Ex: MAQ-001
    name VARCHAR(100) NOT NULL,       -- Ex: Trator John Deere 6125J
    type VARCHAR(50) REFERENCES equipment_types(id) ON DELETE SET NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    serial_number VARCHAR(100),
    initial_hour_km NUMERIC NOT NULL DEFAULT 0,
    current_hour_km NUMERIC NOT NULL DEFAULT 0,
    acquisition_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Em manutenção', 'Parada', 'Vendida/Baixada')),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
    driver_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Estoque de Combustível por Fazenda (Entradas)
CREATE TABLE IF NOT EXISTS fuel_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    liters_received NUMERIC NOT NULL CHECK (liters_received > 0),
    price_per_liter NUMERIC NOT NULL DEFAULT 5.85, -- Preço por litro de diesel na entrega
    supplier VARCHAR(150),
    minimum_stock_alert NUMERIC NOT NULL DEFAULT 1000, -- Limiar de alerta de estoque mínimo
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Abastecimentos (Combustível)
CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fuel_type VARCHAR(50) REFERENCES fuel_types(id) ON DELETE RESTRICT,
    pump_reading_start NUMERIC NOT NULL,
    pump_reading_end NUMERIC NOT NULL CHECK (pump_reading_end >= pump_reading_start),
    liters_supplied NUMERIC GENERATED ALWAYS AS (pump_reading_end - pump_reading_start) STORED,
    hour_km_at_fueling NUMERIC NOT NULL,
    hours_km_since_last NUMERIC DEFAULT 0, -- Calculado via trigger ou antes do insert
    consumption_rate NUMERIC DEFAULT 0,    -- Litros por Hora ou Litros por Km
    price_per_liter NUMERIC NOT NULL CHECK (price_per_liter > 0),
    total_value NUMERIC GENERATED ALWAYS AS ((pump_reading_end - pump_reading_start) * price_per_liter) STORED,
    supplier VARCHAR(150),
    responsible VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Plano Preventivo (Parâmetros)
CREATE TABLE IF NOT EXISTS preventive_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    maintenance_item VARCHAR(150) NOT NULL, -- Ex: Troca de Óleo Motor
    interval_days INTEGER NOT NULL DEFAULT 0, -- Intervalo em dias (0 se não aplicar)
    interval_hour_km NUMERIC NOT NULL DEFAULT 0, -- Intervalo em horas/km (0 se não aplicar)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (machine_id, maintenance_item)
);

-- Manutenções Realizadas
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    type VARCHAR(50) REFERENCES maintenance_types(id) ON DELETE RESTRICT,
    priority VARCHAR(50) REFERENCES priorities(id) ON DELETE RESTRICT,
    hour_km_at_service NUMERIC NOT NULL,
    service_description TEXT NOT NULL,
    main_item VARCHAR(150) NOT NULL, -- Vínculo com preventive_plan.maintenance_item (texto)
    parts_replaced TEXT,
    quantity NUMERIC DEFAULT 1,
    parts_cost NUMERIC NOT NULL DEFAULT 0,
    labor_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC GENERATED ALWAYS AS (parts_cost + labor_cost) STORED,
    location_shop VARCHAR(100) REFERENCES service_locations(id) ON DELETE SET NULL,
    responsible VARCHAR(100) NOT NULL,
    next_maintenance_date DATE,
    next_hour_km NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Checklists de 30 dias
CREATE TABLE IF NOT EXISTS checklists_30d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    operator_name VARCHAR(100) NOT NULL,
    hour_km NUMERIC NOT NULL,
    work_type VARCHAR(100), -- Tipo de trabalho que está realizando
    overall_status VARCHAR(50) NOT NULL CHECK (overall_status IN ('OK', 'Necessita Atenção', 'Máquina Parada')),
    failed_items_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number SERIAL, -- Gerador automático sequencial do Postgres
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    open_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL REFERENCES priorities(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Em Andamento', 'Concluída', 'Cancelada')),
    responsible VARCHAR(100),
    close_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =========================================================================
-- 4. TRIGGERS E FUNÇÕES DE COMPORTAMENTO AUTOMÁTICO
-- =========================================================================

-- Trigger para atualizar automaticamente o current_hour_km da máquina baseado no abastecimento ou manutenção
CREATE OR REPLACE FUNCTION fn_update_machine_hour_km()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for de fuel_logs
    IF TG_TABLE_NAME = 'fuel_logs' THEN
        IF NEW.hour_km_at_fueling > 0 THEN
            UPDATE machines 
            SET current_hour_km = GREATEST(current_hour_km, NEW.hour_km_at_fueling),
                updated_at = now()
            WHERE id = NEW.machine_id;
        END IF;
    -- Se for de maintenance_logs
    ELSIF TG_TABLE_NAME = 'maintenance_logs' THEN
        IF NEW.hour_km_at_service > 0 THEN
            UPDATE machines 
            SET current_hour_km = GREATEST(current_hour_km, NEW.hour_km_at_service),
                updated_at = now()
            WHERE id = NEW.machine_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_fuel_update_hour_km
AFTER INSERT OR UPDATE ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION fn_update_machine_hour_km();

CREATE TRIGGER tr_maintenance_update_hour_km
AFTER INSERT OR UPDATE ON maintenance_logs
FOR EACH ROW EXECUTE FUNCTION fn_update_machine_hour_km();


-- Trigger para calcular hours_km_since_last em fuel_logs antes do insert
CREATE OR REPLACE FUNCTION fn_calculate_fuel_hours_since_last()
RETURNS TRIGGER AS $$
DECLARE
    last_reading NUMERIC;
BEGIN
    -- Encontra o horímetro/km do último abastecimento desta máquina
    SELECT hour_km_at_fueling INTO last_reading
    FROM fuel_logs
    WHERE machine_id = NEW.machine_id AND date < NEW.date
    ORDER BY date DESC
    LIMIT 1;

    IF last_reading IS NULL THEN
        -- Se não houver abastecimento anterior, calcula a partir do horímetro inicial da máquina
        SELECT initial_hour_km INTO last_reading
        FROM machines
        WHERE id = NEW.machine_id;
    END IF;

    IF last_reading IS NOT NULL AND NEW.hour_km_at_fueling >= last_reading THEN
        NEW.hours_km_since_last := NEW.hour_km_at_fueling - last_reading;
        IF NEW.hours_km_since_last > 0 AND NEW.liters_supplied > 0 THEN
            -- consumo = litros / delta (horas ou km)
            NEW.consumption_rate := NEW.liters_supplied / NEW.hours_km_since_last;
        ELSE
            NEW.consumption_rate := 0;
        END IF;
    ELSE
        NEW.hours_km_since_last := 0;
        NEW.consumption_rate := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_fuel_metrics
BEFORE INSERT OR UPDATE ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION fn_calculate_fuel_hours_since_last();


-- Trigger para atualizar profiles com data de modificação
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_profile_time
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Trigger para criar perfil de usuário ao registrar no Supabase Auth
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'editor'); -- Todo usuário novo é 'editor' por padrão. Mude via banco para 'admin' se necessário.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Removido CREATE TRIGGER para auth.users por razões de sandbox, mas deixado comentado para produção:
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();


-- =========================================================================
-- 5. VIEWS DA REQUISITADOS PELO MODELO DE NEGÓCIOS
-- =========================================================================

-- A. Saldo de estoque de combustível por fazenda
CREATE OR REPLACE VIEW fuel_stock_balance AS
WITH total_received AS (
    SELECT farm_id, SUM(liters_received) as liters_in
    FROM fuel_stock
    GROUP BY farm_id
),
total_consumed AS (
    -- Abastecimentos feitos na bomba daquela fazenda (bomba pertence à fazenda)
    SELECT farm_id, SUM(pump_reading_end - pump_reading_start) as liters_out
    FROM fuel_logs
    GROUP BY farm_id
)
SELECT 
    f.id as farm_id,
    f.name as farm_name,
    COALESCE(tr.liters_in, 0) as total_received,
    COALESCE(tc.liters_out, 0) as total_consumed,
    (COALESCE(tr.liters_in, 0) - COALESCE(tc.liters_out, 0)) as current_balance,
    -- Alerta se abaixo do mínimo configurado (pega o último alerta cadastrado na fazenda ou default 1000)
    COALESCE((SELECT minimum_stock_alert FROM fuel_stock WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1), 1000) as min_alert
FROM farms f
LEFT JOIN total_received tr ON f.id = tr.farm_id
LEFT JOIN total_consumed tc ON f.id = tc.farm_id;


-- B. Inconsistência na leitura de bomba de combustível
CREATE OR REPLACE VIEW fuel_pump_discrepancies AS
WITH ranked_logs AS (
    SELECT 
        id,
        farm_id,
        date,
        pump_reading_start,
        pump_reading_end,
        LAG(pump_reading_end) OVER (PARTITION BY farm_id ORDER BY date ASC, created_at ASC) as prev_reading_end,
        LAG(id) OVER (PARTITION BY farm_id ORDER BY date ASC, created_at ASC) as prev_log_id
    FROM fuel_logs
)
SELECT 
    id as current_log_id,
    farm_id,
    date,
    pump_reading_start,
    prev_reading_end,
    (pump_reading_start != prev_reading_end) as discrepancy_detected
FROM ranked_logs
WHERE prev_reading_end IS NOT NULL;


-- C. Resumo do checklist de 30 dias por máquina
CREATE OR REPLACE VIEW checklist_summary AS
WITH last_checklists AS (
    SELECT 
        machine_id,
        MAX(date) as last_date
    FROM checklists_30d
    GROUP BY machine_id
)
SELECT 
    m.id as machine_id,
    m.code as machine_code,
    m.name as machine_name,
    m.farm_id,
    lc.last_date as last_checklist_date,
    CASE 
        WHEN lc.last_date IS NULL THEN NULL 
        ELSE (CURRENT_DATE - lc.last_date)
    END as days_since_last,
    CASE
        WHEN lc.last_date IS NULL THEN 'NUNCA'
        WHEN (CURRENT_DATE - lc.last_date) > 30 THEN 'VENCIDO'
        WHEN (CURRENT_DATE - lc.last_date) >= 23 THEN 'PRÓXIMO' -- entre 23 e 30 dias
        ELSE 'OK'
    END as status
FROM machines m
LEFT JOIN last_checklists lc ON m.id = lc.machine_id;


-- D. Status do Plano Preventivo
CREATE OR REPLACE VIEW preventive_plan_status AS
WITH last_maintenances AS (
    -- Busca a manutenção mais recente de cada máquina para cada item do plano
    SELECT 
        ml.machine_id,
        ml.main_item,
        MAX(ml.date) as last_date,
        MAX(ml.hour_km_at_service) as last_hour_km
    FROM maintenance_logs ml
    GROUP BY ml.machine_id, ml.main_item
)
SELECT 
    pp.id as plan_item_id,
    pp.machine_id,
    m.code as machine_code,
    m.name as machine_name,
    m.farm_id,
    pp.maintenance_item,
    pp.interval_days,
    pp.interval_hour_km,
    COALESCE(lm.last_date, TO_TIMESTAMP('1970-01-01', 'YYYY-MM-DD')) as last_performed_date,
    COALESCE(lm.last_hour_km, m.initial_hour_km) as last_performed_hour_km,
    m.current_hour_km,
    (m.current_hour_km - COALESCE(lm.last_hour_km, m.initial_hour_km)) as hours_km_since_last,
    
    -- Cálculos de limites
    CASE 
        WHEN pp.interval_days > 0 AND lm.last_date IS NOT NULL THEN (lm.last_date::DATE + pp.interval_days)
        ELSE NULL
    END as next_due_date,
    
    CASE 
        WHEN pp.interval_days > 0 AND lm.last_date IS NOT NULL THEN ( (lm.last_date::DATE + pp.interval_days) - CURRENT_DATE )
        ELSE 99999
    END as days_remaining,
    
    CASE 
        WHEN pp.interval_hour_km > 0 THEN (pp.interval_hour_km - (m.current_hour_km - COALESCE(lm.last_hour_km, m.initial_hour_km)))
        ELSE 99999
    END as hour_km_remaining,
    
    -- Status Final
    CASE
        WHEN lm.last_date IS NULL THEN 'NUNCA REALIZADA'
        WHEN (pp.interval_days > 0 AND ( (lm.last_date::DATE + pp.interval_days) - CURRENT_DATE ) < 0) 
             OR (pp.interval_hour_km > 0 AND (pp.interval_hour_km - (m.current_hour_km - COALESCE(lm.last_hour_km, m.initial_hour_km))) < 0) THEN 'VENCIDA'
        WHEN (pp.interval_days > 0 AND ( (lm.last_date::DATE + pp.interval_days) - CURRENT_DATE ) <= 7) 
             OR (pp.interval_hour_km > 0 AND (pp.interval_hour_km - (m.current_hour_km - COALESCE(lm.last_hour_km, m.initial_hour_km))) <= 20) THEN 'PRÓXIMA'
        ELSE 'OK'
    END as status
FROM preventive_plan pp
JOIN machines m ON pp.machine_id = m.id
LEFT JOIN last_maintenances lm ON pp.machine_id = lm.machine_id AND pp.maintenance_item = lm.main_item;


-- E. Ranking de Custos (Manutenção + Combustível acumulados por máquina)
CREATE OR REPLACE VIEW cost_ranking AS
WITH fuel_costs AS (
    SELECT machine_id, SUM(pump_reading_end - pump_reading_start * price_per_liter) as fuel_cost
    FROM fuel_logs
    GROUP BY machine_id
),
maint_costs AS (
    SELECT machine_id, SUM(parts_cost + labor_cost) as maint_cost
    FROM maintenance_logs
    GROUP BY machine_id
)
SELECT 
    m.id as machine_id,
    m.code as machine_code,
    m.name as machine_name,
    m.brand,
    m.model,
    f.name as farm_name,
    COALESCE(fc.fuel_cost, 0) as total_fuel_cost,
    COALESCE(mc.maint_cost, 0) as total_maintenance_cost,
    (COALESCE(fc.fuel_cost, 0) + COALESCE(mc.maint_cost, 0)) as total_accumulated_cost
FROM machines m
JOIN farms f ON m.farm_id = f.id
LEFT JOIN fuel_costs fc ON m.id = fc.machine_id
LEFT JOIN maint_costs mc ON m.id = mc.machine_id
ORDER BY total_accumulated_cost DESC;


-- =========================================================================
-- 6. VIEWS AGREGADAS PARA O DASHBOARD (DASHBOARD VIEWS)
-- =========================================================================

-- Resumo Geral (Total de Custos, Litros e Máquinas)
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
    COALESCE((SELECT SUM(pump_reading_end - pump_reading_start * price_per_liter) FROM fuel_logs), 0) as total_fuel_cost,
    COALESCE((SELECT SUM(parts_cost + labor_cost) FROM maintenance_logs), 0) as total_maintenance_cost,
    COALESCE((SELECT SUM(pump_reading_end - pump_reading_start) FROM fuel_logs), 0) as total_liters_supplied,
    (SELECT COUNT(*) FROM machines) as total_machines;


-- Status das Manutenções Preventivas
CREATE OR REPLACE VIEW dashboard_maintenance_status AS
SELECT
    COUNT(*) FILTER (WHERE status = 'VENCIDA') as count_vencida,
    COUNT(*) FILTER (WHERE status = 'PRÓXIMA') as count_proxima,
    COUNT(*) FILTER (WHERE status = 'OK') as count_ok,
    COUNT(*) FILTER (WHERE status = 'NUNCA REALIZADA') as count_nunca
FROM preventive_plan_status;


-- Status dos Checklists 30 Dias
CREATE OR REPLACE VIEW dashboard_checklist_status AS
SELECT
    COUNT(*) FILTER (WHERE status = 'VENCIDO') as count_vencido,
    COUNT(*) FILTER (WHERE status = 'PRÓXIMO') as count_proximo,
    COUNT(*) FILTER (WHERE status = 'OK') as count_ok,
    COUNT(*) FILTER (WHERE status = 'NUNCA') as count_nunca
FROM checklist_summary;


-- Consumo e Estoque por Fazenda
CREATE OR REPLACE VIEW dashboard_fuel_by_farm AS
SELECT
    f.id as farm_id,
    f.name as farm_name,
    COALESCE(SUM(fl.pump_reading_end - fl.pump_reading_start), 0) as total_liters,
    COALESCE(SUM((fl.pump_reading_end - fl.pump_reading_start) * fl.price_per_liter), 0) as total_cost,
    COALESCE(sb.current_balance, 0) as current_balance,
    COALESCE(sb.min_alert, 1000) as min_alert
FROM farms f
LEFT JOIN fuel_logs fl ON f.id = fl.farm_id
LEFT JOIN fuel_stock_balance sb ON f.id = sb.farm_id
GROUP BY f.id, f.name, sb.current_balance, sb.min_alert;


-- Consumo mensal de combustível dos últimos 12 meses
CREATE OR REPLACE VIEW dashboard_fuel_last_12_months AS
SELECT 
    TO_CHAR(date, 'YYYY-MM') as month_str,
    SUM(pump_reading_end - pump_reading_start) as total_liters,
    SUM((pump_reading_end - pump_reading_start) * price_per_liter) as total_cost
FROM fuel_logs
WHERE date >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month_str ASC;


-- =========================================================================
-- 7. FUNÇÃO DE RELATÓRIO MENSAL PARAMETRIZADA
-- =========================================================================

CREATE OR REPLACE FUNCTION get_monthly_report(target_year INTEGER, target_month INTEGER)
RETURNS TABLE (
    total_liters NUMERIC,
    total_fuel_cost NUMERIC,
    total_maint_cost NUMERIC,
    count_maintenances BIGINT,
    count_checklists BIGINT,
    count_work_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT SUM(pump_reading_end - pump_reading_start) FROM fuel_logs WHERE EXTRACT(YEAR FROM date) = target_year AND EXTRACT(MONTH FROM date) = target_month), 0)::NUMERIC as total_liters,
        COALESCE((SELECT SUM((pump_reading_end - pump_reading_start) * price_per_liter) FROM fuel_logs WHERE EXTRACT(YEAR FROM date) = target_year AND EXTRACT(MONTH FROM date) = target_month), 0)::NUMERIC as total_fuel_cost,
        COALESCE((SELECT SUM(parts_cost + labor_cost) FROM maintenance_logs WHERE EXTRACT(YEAR FROM date) = date AND EXTRACT(MONTH FROM date) = date), 0)::NUMERIC as total_maint_cost,
        (SELECT COUNT(*) FROM maintenance_logs WHERE EXTRACT(YEAR FROM date) = target_year AND EXTRACT(MONTH FROM date) = target_month) as count_maintenances,
        (SELECT COUNT(*) FROM checklists_30d WHERE EXTRACT(YEAR FROM date) = target_year AND EXTRACT(MONTH FROM date) = target_month) as count_checklists,
        (SELECT COUNT(*) FROM work_orders WHERE EXTRACT(YEAR FROM open_date) = target_year AND EXTRACT(MONTH FROM open_date) = target_month) as count_work_orders;
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 8. POLÍTICAS DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- =========================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventive_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists_30d ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE LEITURA (Qualquer usuário autenticado pode ler tudo)
CREATE POLICY select_all_equipment_types ON equipment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_fuel_types ON fuel_types FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_maintenance_types ON maintenance_types FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_priorities ON priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_service_locations ON service_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_profiles ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_farms ON farms FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_machines ON machines FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_fuel_stock ON fuel_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_fuel_logs ON fuel_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_preventive_plan ON preventive_plan FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_maintenance_logs ON maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_checklists ON checklists_30d FOR SELECT TO authenticated USING (true);
CREATE POLICY select_all_work_orders ON work_orders FOR SELECT TO authenticated USING (true);

-- POLÍTICAS DE ESCRITA DE CONFIGURAÇÕES (Somente ADMIN pode gerenciar tabelas de cadastro/apoio)
-- profiles
CREATE POLICY insert_profiles_own_or_anon ON profiles FOR INSERT TO authenticated, anon
WITH CHECK (auth.uid() = id OR id IS NOT NULL);

CREATE POLICY update_profiles_own_or_admin ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY delete_profiles_admin ON profiles FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- farms
CREATE POLICY write_farms_admin ON farms FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- machines
CREATE POLICY write_machines_admin ON machines FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- lookup tables
CREATE POLICY write_eq_types ON equipment_types FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY write_f_types ON fuel_types FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY write_m_types ON maintenance_types FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY write_prio ON priorities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY write_locations ON service_locations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- POLÍTICAS DE ESCRITA OPERACIONAL (EDITORES e ADMINS podem inserir/atualizar/excluir dados operacionais)
-- fuel_stock
CREATE POLICY write_fuel_stock_editor ON fuel_stock FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')));

-- fuel_logs
CREATE POLICY write_fuel_logs_editor ON fuel_logs FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')));

-- preventive_plan
CREATE POLICY write_prev_plan_editor ON preventive_plan FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')));

-- maintenance_logs
CREATE POLICY write_maintenance_logs_editor ON maintenance_logs FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')));

-- checklists_30d
CREATE POLICY write_checklists_editor ON checklists_30d FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')));

-- work_orders
CREATE POLICY write_work_orders_editor ON work_orders FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin')));
