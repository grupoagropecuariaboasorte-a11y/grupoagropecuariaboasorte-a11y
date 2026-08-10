-- MIGRATION: LIBERAR ACESSO DE EDIÇÃO COMPLETA PARA O PERFIL 'control' EM TODAS AS TABELAS
-- Execute este script no SQL Editor do Supabase se necessário para aplicar as atualizações de RLS.

-- 1. TABELA DE FAZENDAS (farms)
DROP POLICY IF EXISTS write_farms_admin ON farms;
CREATE POLICY write_farms_admin ON farms FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

-- 2. TABELA DE MÁQUINAS E IMPLEMENTOS (machines)
DROP POLICY IF EXISTS write_machines_admin ON machines;
CREATE POLICY write_machines_admin ON machines FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

-- 3. TABELAS DE APOIO / LOOKUPS (equipment_types, fuel_types, maintenance_types, priorities, service_locations)
DROP POLICY IF EXISTS write_eq_types ON equipment_types;
CREATE POLICY write_eq_types ON equipment_types FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

DROP POLICY IF EXISTS write_f_types ON fuel_types;
CREATE POLICY write_f_types ON fuel_types FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

DROP POLICY IF EXISTS write_m_types ON maintenance_types;
CREATE POLICY write_m_types ON maintenance_types FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

DROP POLICY IF EXISTS write_prio ON priorities;
CREATE POLICY write_prio ON priorities FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

DROP POLICY IF EXISTS write_locations ON service_locations;
CREATE POLICY write_locations ON service_locations FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor')));

-- 4. TABELAS OPERACIONAIS (fuel_stock, fuel_logs, preventive_plan, maintenance_logs, checklists_30d, work_orders)
DROP POLICY IF EXISTS write_fuel_stock_editor ON fuel_stock;
CREATE POLICY write_fuel_stock_editor ON fuel_stock FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'fuel')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'fuel')));

DROP POLICY IF EXISTS write_fuel_logs_editor ON fuel_logs;
CREATE POLICY write_fuel_logs_editor ON fuel_logs FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'fuel')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'fuel')));

DROP POLICY IF EXISTS write_prev_plan_editor ON preventive_plan;
CREATE POLICY write_prev_plan_editor ON preventive_plan FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')));

DROP POLICY IF EXISTS write_maintenance_logs_editor ON maintenance_logs;
CREATE POLICY write_maintenance_logs_editor ON maintenance_logs FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')));

DROP POLICY IF EXISTS write_checklists_editor ON checklists_30d;
CREATE POLICY write_checklists_editor ON checklists_30d FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')));

DROP POLICY IF EXISTS write_work_orders_editor ON work_orders;
CREATE POLICY write_work_orders_editor ON work_orders FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'admin', 'control', 'mechanic')));
