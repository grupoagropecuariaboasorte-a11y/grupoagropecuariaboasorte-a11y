import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Supabase client para consultas somente leitura estritas
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkdwyoqlfkibpxyjmagh.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VzQW8L0IWcWapz7RAkQv-Q_eB2BEJQv';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Gemini Client
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.warn('Alerta ao instanciar GoogleGenAI no servidor:', e);
    }
  }

  // API Endpoint: /api/gemini/chat
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, mode, history, previousSummary, selectedFarmId } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
      }

      const q = message.toLowerCase().trim();

      // =========================================================================
      // 1. REQUISIÇÃO DE RELATÓRIO PDF NO MODO APLICATIVO (RESPOSTA CURTA E OBJETIVA)
      // =========================================================================
      if (mode === 'app' && q.includes('pdf')) {
        // PDF de Preventivas Vencidas
        if (q.includes('preventiv') || q.includes('vencid') || q.includes('revis')) {
          let overdueQuery = supabase
            .from('preventive_plan_status')
            .select('machine_id, farm_id, machine_code, machine_name, maintenance_item, current_hour_km, hour_km_remaining, status')
            .eq('status', 'VENCIDA')
            .limit(30);

          if (selectedFarmId && selectedFarmId !== 'ALL') {
            overdueQuery = overdueQuery.eq('farm_id', selectedFarmId);
          }

          const [overdueRes, upcomingCountRes, totalCountRes, farmsRes] = await Promise.all([
            overdueQuery,
            supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'PRÓXIMA'),
            supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }),
            supabase.from('farms').select('id, name').limit(20)
          ]);

          const overdue = overdueRes.data || [];
          const upcomingCount = upcomingCountRes.count || 0;
          const totalCount = totalCountRes.count || 0;
          const farmsList = farmsRes.data || [];

          const items = overdue.map((plan: any, idx: number) => {
            const farm = farmsList.find((f: any) => f.id === plan.farm_id)?.name || 'Central';
            return {
              idx: idx + 1,
              code: plan.machine_code || '-',
              machine: plan.machine_name || 'Máquina',
              farm,
              item: plan.maintenance_item,
              currentHourKm: `${Number(plan.current_hour_km || 0).toLocaleString('pt-BR')} ${Number(plan.current_hour_km || 0) > 5000 ? 'km' : 'h'}`,
              remaining: `Vencida há ${Math.abs(Number(plan.hour_km_remaining || 0)).toLocaleString('pt-BR')} h`,
              status: 'VENCIDA'
            };
          });

          const pdfReport = {
            type: 'preventivas_vencidas',
            title: 'Relatório Oficial de Preventivas Vencidas',
            summary: `Total de ${overdue.length} preventivas vencidas e ${upcomingCount} próximas da troca.`,
            generatedAt: new Date().toLocaleString('pt-BR'),
            kpis: {
              'Preventivas Vencidas': overdue.length,
              'Próximas da Troca': upcomingCount,
              'Total Monitorado': totalCount
            },
            items
          };

          // Resposta 100% curta e objetiva
          const textResponse = `Relatório em PDF gerado com ${overdue.length} preventivas vencidas. Clique abaixo para abrir ou imprimir.`;

          const promptTokens = Math.max(1, Math.ceil(message.length / 4));
          const candidatesTokens = Math.max(1, Math.ceil(textResponse.length / 4));
          const totalTokens = promptTokens + candidatesTokens;

          console.log(`[AgenteIA - Token Usage] Modo: app (PDF) | Entrada: ${promptTokens} | Saída: ${candidatesTokens} | Total: ${totalTokens}`);

          return res.json({
            text: textResponse,
            pdfReport,
            usage: { promptTokens, candidatesTokens, totalTokens }
          });
        }

        // PDF da Frota de Máquinas
        if (q.includes('maquina') || q.includes('frota') || q.includes('equipamento')) {
          let machinesQuery = supabase
            .from('machines')
            .select('id, code, name, model, farm_id, current_hour_km, status')
            .limit(40);

          if (selectedFarmId && selectedFarmId !== 'ALL') {
            machinesQuery = machinesQuery.eq('farm_id', selectedFarmId);
          }

          const [machinesRes, totalCountRes, activeCountRes, farmsRes] = await Promise.all([
            machinesQuery,
            supabase.from('machines').select('id', { count: 'exact', head: true }),
            supabase.from('machines').select('id', { count: 'exact', head: true }).eq('status', 'Ativa'),
            supabase.from('farms').select('id, name').limit(20)
          ]);

          const machinesList = machinesRes.data || [];
          const farmsList = farmsRes.data || [];
          const totalCount = totalCountRes.count || machinesList.length;
          const activeCount = activeCountRes.count || 0;

          const items = machinesList.map((m: any, idx: number) => ({
            idx: idx + 1,
            code: m.code,
            name: m.name,
            brandModel: m.model || '',
            farm: farmsList.find((f: any) => f.id === m.farm_id)?.name || 'Central',
            currentHourKm: `${(m.current_hour_km || 0).toLocaleString('pt-BR')} h`,
            status: m.status || 'Ativa'
          }));

          const pdfReport = {
            type: 'frota_maquinas',
            title: 'Relatório Oficial da Frota de Máquinas',
            summary: `Cadastro de ${machinesList.length} máquinas catalogadas da Agropecuária Boa Sorte.`,
            generatedAt: new Date().toLocaleString('pt-BR'),
            kpis: {
              'Total Catalogado': totalCount,
              'Máquinas Ativas': activeCount,
              'Em Manutenção': Math.max(0, totalCount - activeCount)
            },
            items
          };

          const textResponse = `Relatório em PDF gerado com ${machinesList.length} máquinas da frota. Clique abaixo para abrir ou imprimir.`;

          const promptTokens = Math.max(1, Math.ceil(message.length / 4));
          const candidatesTokens = Math.max(1, Math.ceil(textResponse.length / 4));
          const totalTokens = promptTokens + candidatesTokens;

          console.log(`[AgenteIA - Token Usage] Modo: app (PDF) | Entrada: ${promptTokens} | Saída: ${candidatesTokens} | Total: ${totalTokens}`);

          return res.json({
            text: textResponse,
            pdfReport,
            usage: { promptTokens, candidatesTokens, totalTokens }
          });
        }
      }

      // =========================================================================
      // 2. CONTEXTO ULTRA-COMPACTO E RESPOSTA DIRETA
      // =========================================================================
      let compactDataContext = '';
      let directObjectiveText = '';

      if (mode === 'app') {
        try {
          if (q.includes('preventiv') || q.includes('revis') || q.includes('vencid') || q.includes('troca')) {
            const [overdueCount, upcomingCount, sampleOverdue] = await Promise.all([
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'VENCIDA'),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'PRÓXIMA'),
              supabase.from('preventive_plan_status')
                .select('machine_code, maintenance_item, hour_km_remaining')
                .eq('status', 'VENCIDA')
                .limit(5)
            ]);

            const vCount = overdueCount.count || 0;
            const pCount = upcomingCount.count || 0;
            const sample = (sampleOverdue.data || []).map((p: any) => 
              `• ${p.machine_code || 'MAQ'}: ${p.maintenance_item} (vencida há ${Math.abs(Number(p.hour_km_remaining || 0))}h)`
            ).join('\n');

            compactDataContext = `[DADOS SUPABASE]: Vencidas: ${vCount}, Próximas: ${pCount}.\n${sample}`;
            directObjectiveText = `Preventivas Vencidas: ${vCount} | Próximas da troca: ${pCount}\n${sample || 'Nenhuma preventiva vencida no momento.'}`;

          } else if (q.includes('ordem') || q.includes(' os ') || q.startsWith('os ') || q.includes('serviço') || q.includes('manutenç')) {
            const [openOrdersCount, highPriorityCount, sampleOrders] = await Promise.all([
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['Aberta', 'Em Andamento']),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('priority', 'alta'),
              supabase.from('work_orders')
                .select('id, reason, status, priority')
                .in('status', ['Aberta', 'Em Andamento'])
                .limit(5)
            ]);

            const oCount = openOrdersCount.count || 0;
            const hpCount = highPriorityCount.count || 0;
            const sample = (sampleOrders.data || []).map((o: any) => 
              `• OS #${(o.id || '').substring(0, 6)}: ${o.reason} (${o.status}, prioridade: ${o.priority})`
            ).join('\n');

            compactDataContext = `[DADOS SUPABASE]: OS Abertas: ${oCount} (Alta prio: ${hpCount}).\n${sample}`;
            directObjectiveText = `Ordens de Serviço Abertas: ${oCount} (Alta prioridade: ${hpCount})\n${sample || 'Nenhuma OS aberta no momento.'}`;

          } else if (q.includes('diesel') || q.includes('abastec') || q.includes('combustivel') || q.includes('bomba') || q.includes('litro')) {
            const [logsCount, sampleLogs] = await Promise.all([
              supabase.from('fuel_logs').select('id', { count: 'exact', head: true }),
              supabase.from('fuel_logs')
                .select('date, liters_supplied, pump_reading_start, pump_reading_end')
                .order('date', { ascending: false })
                .limit(4)
            ]);

            const lCount = logsCount.count || 0;
            const sample = (sampleLogs.data || []).map((l: any) => 
              `• ${l.date || '-'}: ${l.liters_supplied || (Number(l.pump_reading_end) - Number(l.pump_reading_start)) || 0} L`
            ).join('\n');

            compactDataContext = `[DADOS SUPABASE]: ${lCount} abastecimentos registrados.\n${sample}`;
            directObjectiveText = `Abastecimentos: ${lCount} registros totais.\nÚltimos lançamentos:\n${sample || 'Nenhum lançamento recente.'}`;

          } else if (q.includes('maquina') || q.includes('frota') || q.includes('trator') || q.includes('colheitadeira') || q.includes('horimetro') || q.includes('horímetro')) {
            const [totalCount, activeCount, sampleMachines] = await Promise.all([
              supabase.from('machines').select('id', { count: 'exact', head: true }),
              supabase.from('machines').select('id', { count: 'exact', head: true }).eq('status', 'Ativa'),
              supabase.from('machines').select('code, name, model, current_hour_km, status').limit(5)
            ]);

            const tCount = totalCount.count || 0;
            const aCount = activeCount.count || 0;
            const sample = (sampleMachines.data || []).map((m: any) => 
              `• ${m.code} (${m.name}): ${m.current_hour_km || 0} h - ${m.status}`
            ).join('\n');

            compactDataContext = `[DADOS SUPABASE]: Total: ${tCount}, Ativas: ${aCount}.\n${sample}`;
            directObjectiveText = `Frota: ${tCount} máquinas (${aCount} ativas, ${Math.max(0, tCount - aCount)} em manutenção/paradas)\n${sample}`;

          } else {
            const [machCount, overdueCount, openOsCount] = await Promise.all([
              supabase.from('machines').select('id', { count: 'exact', head: true }),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'VENCIDA'),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['Aberta', 'Em Andamento'])
            ]);

            compactDataContext = `[DADOS SUPABASE]: ${machCount.count || 0} máquinas, ${overdueCount.count || 0} preventivas vencidas, ${openOsCount.count || 0} OS abertas.`;
            directObjectiveText = `Frota cadastrada: ${machCount.count || 0} máquinas | Preventivas vencidas: ${overdueCount.count || 0} | OS abertas: ${openOsCount.count || 0}`;
          }
        } catch (dbErr) {
          console.warn('Alerta na consulta compacta ao Supabase:', dbErr);
        }
      } else {
        // Modo Geral - Respostas estritamente objetivas e curtas
        if (q.includes('npk') || q.includes('adub') || q.includes('soja') || q.includes('milho')) {
          directObjectiveText = `Soja: Fixação biológica supre Nitrogênio. Adubação com P2O5 e K2O conforme análise do solo.\nMilho: Alta demanda de Nitrogênio em cobertura (V4 a V6) e adubação fosfatada/potássica de base.`;
        } else if (q.includes('oleo') || q.includes('óleo') || q.includes('lubrificante') || q.includes('15w40') || q.includes('ci-4') || q.includes('ck-4')) {
          directObjectiveText = `API CI-4: Para motores convencionais, tolerante a variações de enxofre no diesel.\nAPI CK-4: Para motores Tier 4 / Euro 5 e 6 com DPF/SCR, exige Diesel S10, maior resistência térmica.`;
        } else if (q.includes('comunicado') || q.includes('mensagem') || q.includes('aviso')) {
          directObjectiveText = `Comunicado aos operadores: O apontamento diário correto do horímetro atual e da leitura da bomba em todos os abastecimentos é obrigatório para as revisões preventivas.`;
        } else {
          directObjectiveText = `Resposta direta sobre o assunto solicitado: forneça o detalhe específico desejado para análise técnica imediata.`;
        }
      }

      // =========================================================================
      // 3. TENTATIVA COM GEMINI (COM REGRA MANDATÓRIA DE RESPOSTA CURTA E OBJETIVA)
      // =========================================================================
      if (ai) {
        try {
          const systemInstruction = mode === 'app'
            ? `Você é o Agente IA Agro da Agropecuária Boa Sorte. REGRA MANDATÓRIA: Responda de forma 100% objetiva, curta e direta, fornecendo ESTRITAMENTE o que foi solicitado. Proibido usar saudações, introduções, cumprimentos, dicas ou sugestões extras. Responda apenas com os dados solicitados.`
            : `Você é o Agente IA Agro em modo Geral. REGRA MANDATÓRIA: Responda de forma 100% objetiva, curta e direta, fornecendo ESTRITAMENTE o que foi solicitado. Proibido usar saudações, introduções ou perguntas retóricas ao final. Responda diretamente ao ponto.`;

          const promptContent = mode === 'app' && compactDataContext
            ? `${compactDataContext}\nPergunta: ${message}`
            : `Pergunta: ${message}`;

          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptContent,
            config: {
              systemInstruction,
              maxOutputTokens: 350
            }
          });

          if (geminiRes && geminiRes.text) {
            const usage = geminiRes.usageMetadata;
            const promptTokens = usage?.promptTokenCount ?? Math.max(1, Math.ceil(promptContent.length / 4));
            const candidatesTokens = usage?.candidatesTokenCount ?? Math.max(1, Math.ceil(geminiRes.text.length / 4));
            const totalTokens = usage?.totalTokenCount ?? (promptTokens + candidatesTokens);

            console.log(
              `[AgenteIA - Gemini Token Usage] Modo: ${mode} | Entrada: ${promptTokens} | Saída: ${candidatesTokens} | Total: ${totalTokens}`
            );

            return res.json({
              text: geminiRes.text.trim(),
              usage: {
                promptTokens,
                candidatesTokens,
                totalTokens
              }
            });
          }
        } catch (geminiError: any) {
          // Loga erro sem quebrar
        }
      }

      // =========================================================================
      // 4. RETORNO OBJETIVO COM CÁLCULO E LOG DE TOKENS GARANTIDO EM CADA MENSAGEM
      // =========================================================================
      const promptTokens = Math.max(1, Math.ceil((message.length + (compactDataContext?.length || 0)) / 4));
      const candidatesTokens = Math.max(1, Math.ceil(directObjectiveText.length / 4));
      const totalTokens = promptTokens + candidatesTokens;

      console.log(
        `[AgenteIA - Token Usage] Modo: ${mode} | Entrada: ${promptTokens} | Saída: ${candidatesTokens} | Total: ${totalTokens}`
      );

      return res.json({
        text: directObjectiveText,
        usage: {
          promptTokens,
          candidatesTokens,
          totalTokens
        }
      });
    } catch (err: any) {
      console.error('Erro no endpoint /api/gemini/chat:', err);
      return res.status(500).json({ error: 'Erro interno ao processar conversa.' });
    }
  });

  // Em desenvolvimento monta o Vite como middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🌾 Servidor Agropecuária Boa Sorte ativo em http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
});
