-- =========================================================================
-- SCRIPT DE CORREÇÃO: PERMISSÕES RLS PARA ATUALIZAÇÃO DE HORÍMETRO/KM DE MÁQUINAS
-- =========================================================================
-- Este script permite que usuários com perfil de Abastecimento ('fuel'), Mecânico ('mechanic'),
-- Editor ('editor'), Controle ('control') e Administrador ('admin') atualizem o horímetro/km 
-- e a fazenda das máquinas ao registrar abastecimentos ou manutenções.

-- 1. Recria a política de escrita de máquinas incluindo todos os perfis operacionais
DROP POLICY IF EXISTS write_machines_admin ON machines;
DROP POLICY IF EXISTS write_machines_all ON machines;

CREATE POLICY write_machines_admin ON machines FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor', 'fuel', 'mechanic')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'control', 'editor', 'fuel', 'mechanic')));

-- 2. Trigger de segurança no banco para sempre garantir atualização do horímetro da máquina
CREATE OR REPLACE FUNCTION fn_update_machine_hour_km()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for de fuel_logs
    IF TG_TABLE_NAME = 'fuel_logs' THEN
        IF NEW.hour_km_at_fueling > 0 THEN
            UPDATE machines 
            SET current_hour_km = GREATEST(current_hour_km, NEW.hour_km_at_fueling),
                farm_id = COALESCE(NEW.farm_id, farm_id),
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
    -- Se for de checklists_30d
    ELSIF TG_TABLE_NAME = 'checklists_30d' THEN
        IF NEW.hour_km > 0 THEN
            UPDATE machines 
            SET current_hour_km = GREATEST(current_hour_km, NEW.hour_km),
                updated_at = now()
            WHERE id = NEW.machine_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fuel_update_hour_km ON fuel_logs;
CREATE TRIGGER tr_fuel_update_hour_km
AFTER INSERT OR UPDATE ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION fn_update_machine_hour_km();

DROP TRIGGER IF EXISTS tr_maintenance_update_hour_km ON maintenance_logs;
CREATE TRIGGER tr_maintenance_update_hour_km
AFTER INSERT OR UPDATE ON maintenance_logs
FOR EACH ROW EXECUTE FUNCTION fn_update_machine_hour_km();

DROP TRIGGER IF EXISTS tr_checklist_update_hour_km ON checklists_30d;
CREATE TRIGGER tr_checklist_update_hour_km
AFTER INSERT OR UPDATE ON checklists_30d
FOR EACH ROW EXECUTE FUNCTION fn_update_machine_hour_km();
