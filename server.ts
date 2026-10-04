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

  // Supabase client for safe server-side read-only queries
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
      // 1. REQUISIÇÃO DE RELATÓRIO PDF NO MODO APLICATIVO (FILTROS E PAGINAÇÃO)
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
            summary: `Identificadas ${overdue.length} preventivas vencidas e ${upcomingCount} próximas da troca na frota da Agropecuária Boa Sorte.`,
            generatedAt: new Date().toLocaleString('pt-BR'),
            kpis: {
              'Preventivas Vencidas': overdue.length,
              'Próximas da Troca': upcomingCount,
              'Total Monitorado': totalCount
            },
            items
          };

          const textResponse = `📄 **Relatório em PDF Gerado com Sucesso!**\n\nIdentifiquei **${overdue.length} preventivas vencidas** que necessitam de intervenção imediata:\n\n${overdue.slice(0, 4).map((p: any) => 
            `• **${p.machine_code || 'MAQ'}** (${p.machine_name || 'Equipamento'}): *${p.maintenance_item}* - Vencida há ${Math.abs(Number(p.hour_km_remaining || 0))}h`
          ).join('\n')}${overdue.length > 4 ? `\n• *... e mais ${overdue.length - 4} itens no relatório completo.*` : ''}\n\nClique no botão abaixo para **visualizar e imprimir o documento oficial em formato A4**.`;

          return res.json({ text: textResponse, pdfReport });
        }

        // PDF Geral da Frota de Máquinas
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
            summary: `Cadastro operacional contendo ${machinesList.length} máquinas catalogadas da Agropecuária Boa Sorte.`,
            generatedAt: new Date().toLocaleString('pt-BR'),
            kpis: {
              'Total Catalogado': totalCount,
              'Máquinas Ativas': activeCount,
              'Em Manutenção': Math.max(0, totalCount - activeCount)
            },
            items
          };

          return res.json({
            text: `📄 **Relatório em PDF da Frota Gerado!**\n\nCompilei os dados da frota com ${machinesList.length} máquinas e horímetros atualizados.\n\nClique no botão abaixo para **visualizar ou imprimir o documento em formato A4**.`,
            pdfReport
          });
        }
      }

      // =========================================================================
      // 2. CONSTRUÇÃO DE CONTEXTO ULTRA-COMPACTO DO SUPABASE (SOMENTE O NECESSÁRIO)
      // =========================================================================
      let compactDataContext = '';

      if (mode === 'app') {
        try {
          if (q.includes('preventiv') || q.includes('revis') || q.includes('vencid') || q.includes('troca')) {
            const [overdueCount, upcomingCount, sampleOverdue] = await Promise.all([
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'VENCIDA'),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'PRÓXIMA'),
              supabase.from('preventive_plan_status')
                .select('machine_code, machine_name, maintenance_item, hour_km_remaining')
                .eq('status', 'VENCIDA')
                .limit(4)
            ]);

            const sample = (sampleOverdue.data || []).map((p: any) => 
              `${p.machine_code || 'MAQ'}: ${p.maintenance_item} (vencida há ${Math.abs(Number(p.hour_km_remaining || 0))}h)`
            ).join('; ');

            compactDataContext = `[DADOS SUPABASE - PREVENTIVAS]: Vencidas: ${overdueCount.count || 0}, Próximas: ${upcomingCount.count || 0}. Amostra vencidas: ${sample || 'nenhuma'}.`;
          } else if (q.includes('ordem') || q.includes(' os ') || q.startsWith('os ') || q.includes('serviço') || q.includes('manutenç')) {
            const [openOrdersCount, highPriorityCount, sampleOrders] = await Promise.all([
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['Aberta', 'Em Andamento']),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('priority', 'alta'),
              supabase.from('work_orders')
                .select('id, reason, status, priority')
                .in('status', ['Aberta', 'Em Andamento'])
                .limit(4)
            ]);

            const sample = (sampleOrders.data || []).map((o: any) => 
              `OS #${(o.id || '').substring(0, 6)} (${o.reason}, ${o.status}, prio: ${o.priority})`
            ).join('; ');

            compactDataContext = `[DADOS SUPABASE - ORDENS DE SERVIÇO]: Abertas/Em Andamento: ${openOrdersCount.count || 0}, Alta Prioridade: ${highPriorityCount.count || 0}. Amostra: ${sample || 'nenhuma pendente'}.`;
          } else if (q.includes('diesel') || q.includes('abastec') || q.includes('combustivel') || q.includes('bomba') || q.includes('litro')) {
            const [logsCount, sampleLogs] = await Promise.all([
              supabase.from('fuel_logs').select('id', { count: 'exact', head: true }),
              supabase.from('fuel_logs')
                .select('date, liters_supplied, pump_reading_start, pump_reading_end')
                .order('date', { ascending: false })
                .limit(3)
            ]);

            const sample = (sampleLogs.data || []).map((l: any) => 
              `${l.date}: ${l.liters_supplied || (Number(l.pump_reading_end) - Number(l.pump_reading_start)) || 0}L`
            ).join('; ');

            compactDataContext = `[DADOS SUPABASE - COMBUSTÍVEL]: Total abastecimentos registrados: ${logsCount.count || 0}. Últimos registros: ${sample || 'nenhum'}.`;
          } else if (q.includes('maquina') || q.includes('frota') || q.includes('trator') || q.includes('colheitadeira') || q.includes('horimetro') || q.includes('horímetro')) {
            const [totalCount, activeCount, sampleMachines] = await Promise.all([
              supabase.from('machines').select('id', { count: 'exact', head: true }),
              supabase.from('machines').select('id', { count: 'exact', head: true }).eq('status', 'Ativa'),
              supabase.from('machines').select('code, name, model, current_hour_km').limit(4)
            ]);

            const sample = (sampleMachines.data || []).map((m: any) => 
              `${m.code} (${m.name}, ${m.current_hour_km || 0}h)`
            ).join('; ');

            compactDataContext = `[DADOS SUPABASE - FROTA]: Total: ${totalCount.count || 0}, Ativas: ${activeCount.count || 0}. Amostra: ${sample || 'nenhuma'}.`;
          } else {
            // Consulta geral sobre o app: pega apenas números-chave para contexto resumido
            const [machCount, overdueCount, openOsCount] = await Promise.all([
              supabase.from('machines').select('id', { count: 'exact', head: true }),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'VENCIDA'),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['Aberta', 'Em Andamento'])
            ]);

            compactDataContext = `[DADOS SUPABASE - RESUMO RÁPIDO]: ${machCount.count || 0} máquinas cadastradas, ${overdueCount.count || 0} preventivas vencidas, ${openOsCount.count || 0} OS abertas.`;
          }
        } catch (dbErr) {
          console.warn('Alerta na consulta compacta ao Supabase:', dbErr);
        }
      }

      // =========================================================================
      // 3. JANELA CURTA DE MENSAGENS E REDUÇÃO DRÁSTICA DE TOKENS
      // =========================================================================
      // Envia apenas as 2 últimas mensagens recentes (1 usuário, 1 assistente) para economizar tokens
      const recentHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history) && history.length > 0) {
        const shortSlice = history.slice(-2);
        for (const item of shortSlice) {
          const rawText = item.parts?.[0]?.text || '';
          // Limita o tamanho de cada mensagem anterior para no máximo 200 caracteres
          const trimmedText = rawText.length > 200 ? rawText.substring(0, 197) + '...' : rawText;
          if (trimmedText) {
            recentHistory.push({
              role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: trimmedText }]
            });
          }
        }
      }

      // Se houver resumo do histórico anterior, sintetiza em 1 linha
      let historySummaryLine = '';
      if (previousSummary && typeof previousSummary === 'string') {
        historySummaryLine = `Resumo de turnos anteriores: ${previousSummary.substring(0, 120)}. `;
      }

      // =========================================================================
      // 4. CHAMADA CONTROLADA AO GEMINI COM maxOutputTokens LIMITADO
      // =========================================================================
      if (ai) {
        try {
          const systemInstruction = mode === 'app'
            ? `Você é o Agente IA Agro da Agropecuária Boa Sorte. Responda em português com clareza, concisão e objetividade (máximo 2 a 3 parágrafos curtos ou lista pontual). Baseie-se estritamente nos dados agregados fornecidos do Supabase. Não invente números. Você pode sugerir a geração de relatório em PDF caso relevante.`
            : `Você é um assistente de IA agropecuária de uso geral (agronomia, maquinário, cálculos e gestão rural). Responda com clareza, concisão e objetividade (máximo 2 a 3 parágrafos curtos ou tópicos).`;

          const promptContent = mode === 'app' && compactDataContext
            ? `${historySummaryLine}${compactDataContext}\n\nPergunta do Usuário: ${message}`
            : `${historySummaryLine}Pergunta do Usuário: ${message}`;

          // Chamada ao modelo gemini-3.8-flash com limite estrito de saída para poupar tokens
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptContent,
            config: {
              systemInstruction,
              maxOutputTokens: 500
            }
          });

          if (geminiRes && geminiRes.text) {
            // REGISTRO DE TOKENS NO BACKEND (SEM EXPOR CHAVES DE API)
            const usage = geminiRes.usageMetadata;
            const promptTokens = usage?.promptTokenCount ?? 0;
            const candidatesTokens = usage?.candidatesTokenCount ?? 0;
            const totalTokens = usage?.totalTokenCount ?? 0;

            console.log(
              `[AgenteIA - Gemini Token Usage] Modo: ${mode} | Entrada: ${promptTokens} tokens | Saída: ${candidatesTokens} tokens | Total: ${totalTokens} tokens`
            );

            return res.json({
              text: geminiRes.text,
              usage: {
                promptTokens,
                candidatesTokens,
                totalTokens
              }
            });
          }
        } catch (geminiError: any) {
          console.warn('[AgenteIA] Aviso na chamada do Gemini API, ativando fallback local seguro:', geminiError?.message || geminiError);
        }
      }

      // Fallback: se a API Gemini estiver indisponível ou sem chave, retorna nulo para o cliente processar
      return res.json({ text: null });
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
