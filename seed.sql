-- SEED DATA PARA CONTROLE DE FROTA AGRÍCOLA (SUPABASE / POSTGRES)
-- Cole este script no SQL Editor do Supabase após rodar o schema.sql.

-- 1. TABELAS DE APOIO (LOOKUPS)
INSERT INTO equipment_types (id, label) VALUES
('trator', 'Trator'),
('colheitadeira', 'Colheitadeira'),
('caminhao', 'Caminhão'),
('pa_carregadeira', 'Pá Carregadeira'),
('gerador', 'Gerador'),
('escavadeira', 'Escavadeira'),
('retroescavadeira', 'Retroescavadeira'),
('esteira', 'Trator de Esteira'),
('rolo', 'Rolo Compactador'),
('outro', 'Outro')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO fuel_types (id, label) VALUES
('diesel_s10', 'Diesel S10'),
('diesel_s500', 'Diesel S500'),
('arla_32', 'Arla 32'),
('gasolina', 'Gasolina')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO maintenance_types (id, label) VALUES
('preventiva', 'Preventiva'),
('corretiva', 'Corretiva'),
('preditiva', 'Preditiva')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO priorities (id, label, color_hex) VALUES
('baixa', 'Baixa', '#3b82f6'),
('media', 'Média', '#eab308'),
('alta', 'Alta', '#f97316'),
('urgente', 'Urgente', '#ef4444')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, color_hex = EXCLUDED.color_hex;

INSERT INTO service_locations (id, label) VALUES
('oficina_interna', 'Oficina Interna Fazenda'),
('oficina_autorizada', 'Oficina Autorizada Marca'),
('oficina_externa', 'Oficina Externa Credenciada'),
('campo', 'Manutenção em Campo')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;


-- 2. FAZENDAS (FARMS)
-- Guardamos as IDs para usar como FKs em seguida
INSERT INTO farms (id, name) VALUES
('11111111-1111-1111-1111-111111111111', 'Boa Vista'),
('22222222-2222-2222-2222-222222222222', 'Rio Ferro'),
('33333333-3333-3333-3333-333333333333', 'Modelo'),
('44444444-4444-4444-4444-444444444444', 'União')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;


-- 3. MÁQUINAS (MACHINES)
INSERT INTO machines (id, code, name, type, brand, model, year, serial_number, initial_hour_km, current_hour_km, acquisition_date, status, farm_id, driver_name) VALUES
('a0000000-a000-a000-a000-a00000000001', 'MAQ-001', 'Trator John Deere 6125J', 'trator', 'John Deere', '6125J', 2021, 'JD6125J-00984', 1200, 1420, '2021-03-15', 'Ativa', '11111111-1111-1111-1111-111111111111', 'João da Silva'),
('a0000000-a000-a000-a000-a00000000002', 'MAQ-002', 'Colheitadeira Case IH 8250', 'colheitadeira', 'Case IH', 'Axial-Flow 8250', 2022, 'CASE8250-99432', 450, 680, '2022-08-10', 'Ativa', '11111111-1111-1111-1111-111111111111', 'Pedro Henrique'),
('a0000000-a000-a000-a000-a00000000003', 'MAQ-003', 'Caminhão Caçamba Volvo FMX 460', 'caminhao', 'Volvo', 'FMX 460 6x4', 2020, 'VLOFMX-33421', 45000, 48210, '2020-05-18', 'Ativa', '22222222-2222-2222-2222-222222222222', 'Manoel Alves'),
('a0000000-a000-a000-a000-a00000000004', 'MAQ-004', 'Pá Carregadeira Caterpillar 938K', 'pa_carregadeira', 'Caterpillar', '938K', 2019, 'CAT938K-11234', 3500, 3950, '2019-11-01', 'Em manutenção', '33333333-3333-3333-3333-333333333333', 'Carlos Souza'),
('a0000000-a000-a000-a000-a00000000005', 'MAQ-005', 'Gerador Stemac 150 kVA', 'gerador', 'Stemac', '150kVA Perkins', 2018, 'STEM-150-84321', 800, 950, '2018-02-12', 'Ativa', '44444444-4444-4444-4444-444444444444', 'José Silveira'),
('a0000000-a000-a000-a000-a00000000006', 'MAQ-006', 'Trator New Holland T7.260', 'trator', 'New Holland', 'T7.260', 2023, 'NH-T7260-12344', 150, 150, '2023-10-05', 'Ativa', '22222222-2222-2222-2222-222222222222', 'Adauto Ferreira'),
('a0000000-a000-a000-a000-a00000000007', 'MAQ-007', 'Escavadeira Sany SY215C', 'escavadeira', 'Sany', 'SY215C', 2021, 'SANY215-44211', 2100, 2400, '2021-06-20', 'Parada', '33333333-3333-3333-3333-333333333333', 'Daniel Neves')
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code, name = EXCLUDED.name, brand = EXCLUDED.brand, 
    model = EXCLUDED.model, status = EXCLUDED.status, farm_id = EXCLUDED.farm_id;


-- 4. ESTOQUE DE DIESEL - ENTRADAS (FUEL STOCK)
INSERT INTO fuel_stock (id, farm_id, entry_date, liters_received, supplier, minimum_stock_alert, notes) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-06-01', 5000, 'Distribuidora Ipiranga', 1500, 'Carga cheia tanque central'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-06-25', 5000, 'Distribuidora Ipiranga', 1500, 'Reforço para colheita'),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2026-06-05', 8000, 'Combustíveis Raízen', 2000, 'Tanque principal Rio Ferro'),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '2026-06-10', 4000, 'Distribuidora Vibra', 1000, 'Carga Tanque Modelo'),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '2026-06-12', 3000, 'Combustíveis Alesat', 800, 'Tanque União de emergência');


-- 5. ABASTECIMENTOS (FUEL LOGS)
-- Nota: liters_supplied e total_value serão calculados automaticamente pelas colunas geradas
INSERT INTO fuel_logs (id, farm_id, machine_id, date, fuel_type, pump_reading_start, pump_reading_end, hour_km_at_fueling, price_per_liter, supplier, responsible, notes) VALUES
-- MAQ-001 (Boa Vista)
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'a0000000-a000-a000-a000-a00000000001', '2026-06-15 07:30:00+00', 'diesel_s10', 1000, 1150, 1280, 5.85, 'Bomba Própria Boa Vista', 'Gerente Carlos', 'Abastecimento diário para plantio'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'a0000000-a000-a000-a000-a00000000001', '2026-06-28 17:00:00+00', 'diesel_s10', 1150, 1310, 1370, 5.85, 'Bomba Própria Boa Vista', 'Gerente Carlos', 'Abastecimento fim de semana'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'a0000000-a000-a000-a000-a00000000001', '2026-07-05 08:00:00+00', 'diesel_s10', 1310, 1445, 1420, 5.90, 'Bomba Própria Boa Vista', 'Gerente Carlos', 'Leitura horímetro atingiu 1420h'),

-- MAQ-002 (Boa Vista)
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'a0000000-a000-a000-a000-a00000000002', '2026-06-20 09:00:00+00', 'diesel_s10', 2000, 2350, 560, 5.85, 'Bomba Própria Boa Vista', 'Almeida P.', 'Abastecimento colheita'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'a0000000-a000-a000-a000-a00000000002', '2026-07-02 18:30:00+00', 'diesel_s10', 2350, 2710, 680, 5.90, 'Bomba Própria Boa Vista', 'Almeida P.', 'Abastecimento turno noite'),

-- MAQ-003 (Rio Ferro)
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'a0000000-a000-a000-a000-a00000000003', '2026-06-12 06:00:00+00', 'diesel_s500', 5000, 5320, 46100, 5.65, 'Bomba Própria Rio Ferro', 'Operador Marcos', 'Viagem de frete grãos'),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'a0000000-a000-a000-a000-a00000000003', '2026-06-30 06:15:00+00', 'diesel_s500', 5320, 5650, 48210, 5.65, 'Bomba Própria Rio Ferro', 'Operador Marcos', 'Fim do ciclo mensal de frete');


-- 6. PLANO PREVENTIVO (PREVENTIVE PLAN PARAMETERS)
INSERT INTO preventive_plan (id, machine_id, maintenance_item, interval_days, interval_hour_km) VALUES
-- MAQ-001 (Trator)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000001', 'Troca Óleo Motor e Filtros', 180, 250),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000001', 'Filtro de Ar e Cabine', 360, 500),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000001', 'Lubrificação Geral Graxeiras', 30, 50),

-- MAQ-002 (Colheitadeira)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000002', 'Troca de Óleo Hidráulico', 360, 500),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000002', 'Troca Óleo Motor', 180, 250),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000002', 'Inspeção Correias e Polias', 60, 100),

-- MAQ-003 (Caminhão)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000003', 'Revisão Geral e Alinhamento', 180, 10000),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000003', 'Troca de Óleo de Diferenciais', 360, 20000);


-- 7. MANUTENÇÕES REALIZADAS (MAINTENANCE LOGS)
INSERT INTO maintenance_logs (id, machine_id, date, type, priority, hour_km_at_service, service_description, main_item, parts_replaced, quantity, parts_cost, labor_cost, location_shop, responsible, next_maintenance_date, next_hour_km) VALUES
-- MAQ-001 (Realizada em 2026-06-05)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000001', '2026-06-05 08:00:00+00', 'preventiva', 'media', 1250, 'Troca de óleo do motor 15W40 e filtro de óleo original JD', 'Troca Óleo Motor e Filtros', 'Óleo Motor 15W40, Filtro Lubrificante', 1, 450, 150, 'oficina_interna', 'Mecânico Júlio', '2026-12-02', 1500),
-- MAQ-001 (Graxeiras feita em 2026-06-10 - Próxima está vencendo!)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000001', '2026-06-10 10:00:00+00', 'preventiva', 'baixa', 1260, 'Engraxamento completo do chassi e articulação da grade', 'Lubrificação Geral Graxeiras', 'Graxa Grafitada', 1, 40, 50, 'oficina_interna', 'Auxiliar Tonho', '2026-07-10', 1310),

-- MAQ-002 (Colheitadeira)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000002', '2026-05-12 09:00:00+00', 'preventiva', 'media', 450, 'Troca óleo motor e filtros de combustível secundários', 'Troca Óleo Motor', 'Filtro combustível, Óleo Mobil Delvac', 1, 890, 300, 'oficina_autorizada', 'Autorizada Case Tec', '2026-11-08', 700),

-- MAQ-004 (Caterpillar - Corretiva em andamento)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000004', '2026-07-06 14:00:00+00', 'corretiva', 'alta', 3950, 'Vazamento pistão hidráulico da caçamba dianteira, trocando retentores', 'Reparo Hidráulico', 'Kit Retentores CAT', 2, 750, 450, 'oficina_externa', 'Mecânico Wagner', '2026-08-06', 4200);


-- 8. CHECKLISTS DE 30 DIAS (CHECKLISTS_30D)
INSERT INTO checklists_30d (id, machine_id, date, operator_name, hour_km, work_type, overall_status, failed_items_notes) VALUES
-- MAQ-001 (Em dia)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000001', '2026-06-20', 'João da Silva', 1350, 'Preparo de solo', 'OK', 'Tudo operacional. Níveis corretos.'),
-- MAQ-002 (Vencendo / Perto de 30 dias)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000002', '2026-06-10', 'Pedro Henrique', 580, 'Colheita soja', 'Necessita Atenção', 'Apresenta desgaste leve na correia do picador.'),
-- MAQ-003 (Vencido!)
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000003', '2026-05-01', 'Manoel Alves', 45500, 'Transporte grãos', 'OK', 'Checklist de início da safra.');


-- 9. ORDENS DE SERVIÇO (WORK_ORDERS)
INSERT INTO work_orders (id, machine_id, open_date, reason, priority, status, responsible, close_date, notes) VALUES
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000004', '2026-07-05', 'Reparo do vazamento de óleo no pistão da caçamba dianteira detectado na vistoria de campo.', 'alta', 'Em Andamento', 'Mecânico Wagner', NULL, 'Pistão desmontado e enviado para retífica de camisas.'),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000002', '2026-07-02', 'Trocar correia de transmissão do picador de palha que apresentou desgaste.', 'media', 'Aberta', 'Mecânico Júlio', NULL, 'Aguardando chegada da peça comprada em estoque.'),
(gen_random_uuid(), 'a0000000-a000-a000-a000-a00000000003', '2026-06-15', 'Substituição das pastilhas de freio traseiras e troca de lâmpadas queimadas na sinaleira.', 'baixa', 'Concluída', 'Eletricista Tonho', '2026-06-16', 'Lâmpadas e pastilhas substituídas com sucesso. Testes ok.');
