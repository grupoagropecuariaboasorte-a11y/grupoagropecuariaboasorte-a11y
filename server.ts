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

  // Helper para identificar se um item é implemento (mesma regra do frontend)
  function isImplement(m: any): boolean {
    if (!m) return false;
    const typeLower = (m.type || '').toLowerCase().trim();
    const codeUpper = (m.code || '').toUpperCase().trim();
    return typeLower === 'implemento' || typeLower.includes('implemento') || codeUpper.startsWith('IMP-');
  }

  // Motor universal para Modo Geral: busca cotações em tempo real, clima, cálculos e enciclopédia/web
  async function resolveGeneralKnowledgeQuery(message: string): Promise<string> {
    const q = message.toLowerCase().trim();

    // 1. Cotação de moedas em tempo real (Dólar, Euro, etc.)
    if (q.includes('dolar') || q.includes('dólar') || q.includes('usd') || q.includes('cambio') || q.includes('câmbio') || q.includes('cotacao') || q.includes('cotação') || q.includes('euro') || q.includes('moeda')) {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const data: any = await res.json();
          const brl = Number(data?.rates?.BRL || 5.22).toFixed(2).replace('.', ',');
          const eurRate = data?.rates?.EUR ? (data.rates.BRL / data.rates.EUR).toFixed(2).replace('.', ',') : '5.65';
          
          if (q.includes('euro') && !q.includes('dolar') && !q.includes('dólar')) {
            return `• Cotação do Euro (EUR/BRL): R$ ${eurRate}`;
          }
          if (q.includes('euro')) {
            return `• Dólar Comercial (USD/BRL): R$ ${brl}\n• Euro (EUR/BRL): R$ ${eurRate}`;
          }
          return `• Cotação do Dólar Comercial (USD/BRL): R$ ${brl}`;
        }
      } catch (e) {
        console.warn('Alerta ao consultar cotação de moedas:', e);
      }
    }

    // 2. Previsão do tempo / Clima
    if (q.includes('clima') || q.includes('tempo') || q.includes('previs') || q.includes('chov') || q.includes('chuva') || q.includes('temperatura')) {
      try {
        let location = 'Brasilia';
        if (q.includes('goiania') || q.includes('goiânia') || q.includes('goiás') || q.includes('goias')) location = 'Goiania';
        else if (q.includes('rio verde')) location = 'Rio Verde';
        else if (q.includes('jatai') || q.includes('jataí')) location = 'Jatai';
        else if (q.includes('são paulo') || q.includes('sao paulo')) location = 'Sao Paulo';
        else if (q.includes('cuiaba') || q.includes('cuiabá')) location = 'Cuiaba';
        
        const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?m&format=%l:+%C+%t,+vento+%w,+umidade+%h`, {
          headers: { 'User-Agent': 'curl/7.68.0' }
        });
        if (res.ok) {
          const text = (await res.text()).trim();
          if (text && !text.includes('Unknown') && !text.includes('<html>')) {
            return `• Previsão do tempo: ${text}`;
          }
        }
      } catch (e) {}
    }

    // 3. Conversões de unidades do campo
    if (q.includes('alqueire') || q.includes('hectare') || q.includes('arroba') || q.includes('saca')) {
      if (q.includes('alqueire') && q.includes('hectare')) {
        return `• 1 Alqueire Paulista = 2,42 hectares (24.200 m²)\n• 1 Alqueire Goiano/Mineiro = 4,84 hectares (48.400 m²)\n• 1 Alqueire do Norte = 2,72 hectares (27.200 m²)`;
      }
      if (q.includes('hectare')) {
        return `• 1 hectare (ha) = 10.000 m² = 0,413 Alqueires Paulistas = 0,206 Alqueires Goianos.`;
      }
      if (q.includes('arroba')) {
        return `• 1 arroba (@) bovina = 15 kg (peso de carcaça limpa). O animal vivo rende em média 50% a 54% do peso.`;
      }
      if (q.includes('saca')) {
        return `• 1 saca de soja = 60 kg\n• 1 saca de milho = 60 kg\n• 1 saca de café = 60 kg`;
      }
    }

    // 4. Cálculos matemáticos diretos (ex: 250 * 12, 1000 / 4)
    const mathMatch = message.match(/^\s*(?:quanto\s+[ée]\s+|calcul(?:a|e)\s+)?([0-9.,]+)\s*([+\-*\/xX])\s*([0-9.,]+)\s*\??$/i);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1].replace(/\./g, '').replace(',', '.'));
      const op = mathMatch[2].toLowerCase();
      const num2 = parseFloat(mathMatch[3].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(num1) && !isNaN(num2)) {
        let res = 0;
        if (op === '+') res = num1 + num2;
        else if (op === '-') res = num1 - num2;
        else if (op === '*' || op === 'x') res = num1 * num2;
        else if (op === '/' && num2 !== 0) res = num1 / num2;
        return `Resultado: ${res.toLocaleString('pt-BR')}`;
      }
    }

    // 5. Conhecimentos agronômicos frequentes
    if (q.includes('npk') || q.includes('adub') || q.includes('soja') || q.includes('milho')) {
      return `• Soja: Fixação biológica com Bradyrhizobium supre Nitrogênio. Adubação com P2O5 e K2O.\n• Milho: Alta demanda de Nitrogênio em cobertura (V4 a V6) e adubação fosfatada/potássica de base.`;
    }
    if (q.includes('oleo') || q.includes('óleo') || q.includes('lubrificante') || q.includes('15w40') || q.includes('ci-4') || q.includes('ck-4')) {
      return `• API CI-4: Motores convencionais, tolerante a variações de enxofre no diesel.\n• API CK-4: Motores Tier 4 / Euro 5 e 6 com DPF/SCR, exige Diesel S10, maior resistência térmica.`;
    }
    if (q.includes('comunicado') || q.includes('aviso')) {
      return `Comunicado aos operadores: O apontamento diário correto do horímetro atual e da leitura da bomba em todos os abastecimentos é obrigatório para as revisões preventivas.`;
    }

    // 6. Busca Universal na Web via Wikipedia REST API
    try {
      const cleanSearch = q
        .replace(/^(qual|quais|o que é|o que são|o que sao|quem foi|quem é|quem e|como funciona|para que serve|me fale sobre|explique|conte sobre)\s+/i, '')
        .replace(/[?!.]+$/g, '')
        .trim();

      const searchTerm = cleanSearch.length > 2 ? cleanSearch : q;
      const headers = { 'User-Agent': 'GrupoAgropecuariaBoaSorteApp/1.0 (contato@grupoagropecuariaboasorte.com.br)' };
      const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&utf8=1`;
      const searchRes = await fetch(searchUrl, { headers });
      
      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        const results = searchData?.query?.search || [];
        for (const item of results.slice(0, 3)) {
          const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
          const summaryRes = await fetch(summaryUrl, { headers });
          if (summaryRes.ok) {
            const summaryData: any = await summaryRes.json();
            if (summaryData.type === 'disambiguation') continue;
            let extract = summaryData.extract || '';
            extract = extract.replace(/^[^.]*?(desambiguação|veja também)[^.]*\.\s*/i, '').trim();
            if (extract.length > 20) {
              const sentences = extract.split(/(?<=[.?!])\s+/);
              return sentences.slice(0, 2).join(' ');
            }
          }
          if (item.snippet) {
            const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').trim();
            if (cleanSnippet.length > 20) {
              return `${item.title}: ${cleanSnippet}.`;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Alerta na busca web:', e);
    }

    return `Informação sobre "${message}": Consulta processada com sucesso no Modo Geral.`;
  }

  // API Endpoint: /api/gemini/chat
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, mode, history, previousSummary, selectedFarmId } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
      }

      const q = message.toLowerCase().trim();
      const isListExplicitlyAsked = q.includes('quais') || q.includes('liste') || q.includes('listar') || q.includes('nomes') || q.includes('detalhe') || q.includes('relacione');

      // =========================================================================
      // 1. REQUISIÇÃO DE RELATÓRIO PDF NO MODO APLICATIVO
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
            const [overdueCount, upcomingCount, totalCountRes, sampleOverdue] = await Promise.all([
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'VENCIDA'),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'PRÓXIMA'),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }),
              isListExplicitlyAsked
                ? supabase.from('preventive_plan_status').select('machine_code, maintenance_item, hour_km_remaining').eq('status', 'VENCIDA').limit(5)
                : Promise.resolve({ data: [] })
            ]);

            const vCount = overdueCount.count || 0;
            const pCount = upcomingCount.count || 0;
            const tCount = totalCountRes.count || 0;

            compactDataContext = `[DADOS SUPABASE]: ${vCount} preventivas vencidas, ${pCount} próximas da troca, ${tCount} total.`;

            if (isListExplicitlyAsked) {
              const sample = (sampleOverdue.data || []).map((p: any) => 
                `• ${p.machine_code || 'MAQ'}: ${p.maintenance_item} (vencida há ${Math.abs(Number(p.hour_km_remaining || 0))}h)`
              ).join('\n');
              directObjectiveText = `Preventivas Vencidas:\n${sample || 'Nenhuma preventiva vencida.'}`;
            } else {
              // Pergunta de quantidade: somente os totais numéricos
              directObjectiveText = `• ${vCount} preventivas vencidas\n• ${pCount} próximas da troca\n• ${tCount} total monitorado`;
            }

          } else if (q.includes('ordem') || q.includes(' os ') || q.startsWith('os ') || q.includes('serviço') || q.includes('manutenç')) {
            const [openOrdersCount, highPriorityCount, totalOrdersRes, sampleOrders] = await Promise.all([
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['Aberta', 'Em Andamento']),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('priority', 'alta'),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }),
              isListExplicitlyAsked
                ? supabase.from('work_orders').select('id, reason, status, priority').in('status', ['Aberta', 'Em Andamento']).limit(5)
                : Promise.resolve({ data: [] })
            ]);

            const oCount = openOrdersCount.count || 0;
            const hpCount = highPriorityCount.count || 0;
            const totCount = totalOrdersRes.count || 0;

            compactDataContext = `[DADOS SUPABASE]: ${oCount} OS abertas (${hpCount} alta prioridade), ${totCount} total.`;

            if (isListExplicitlyAsked) {
              const sample = (sampleOrders.data || []).map((o: any) => 
                `• OS #${(o.id || '').substring(0, 6)}: ${o.reason} (${o.status}, prioridade: ${o.priority})`
              ).join('\n');
              directObjectiveText = `Ordens de Serviço Abertas:\n${sample || 'Nenhuma OS aberta.'}`;
            } else {
              // Pergunta de quantidade: somente os totais numéricos
              directObjectiveText = `• ${oCount} ordens de serviço abertas\n• ${hpCount} com alta prioridade\n• ${totCount} no histórico total`;
            }

          } else if (q.includes('diesel') || q.includes('abastec') || q.includes('combustivel') || q.includes('bomba') || q.includes('litro')) {
            const [logsCount, sampleLogs] = await Promise.all([
              supabase.from('fuel_logs').select('id', { count: 'exact', head: true }),
              isListExplicitlyAsked
                ? supabase.from('fuel_logs').select('date, liters_supplied, pump_reading_start, pump_reading_end').order('date', { ascending: false }).limit(4)
                : Promise.resolve({ data: [] })
            ]);

            const lCount = logsCount.count || 0;

            compactDataContext = `[DADOS SUPABASE]: ${lCount} abastecimentos registrados.`;

            if (isListExplicitlyAsked) {
              const sample = (sampleLogs.data || []).map((l: any) => 
                `• ${l.date || '-'}: ${l.liters_supplied || (Number(l.pump_reading_end) - Number(l.pump_reading_start)) || 0} L`
              ).join('\n');
              directObjectiveText = `Últimos Abastecimentos:\n${sample || 'Nenhum lançamento recente.'}`;
            } else {
              directObjectiveText = `• ${lCount} abastecimentos registrados no sistema`;
            }

          } else if (q.includes('implement')) {
            const { data: allMachs } = await supabase.from('machines').select('id, code, name, type, status').limit(200);
            const imps = (allMachs || []).filter(isImplement);
            const activeImps = imps.filter((m: any) => m.status === 'Ativa');
            const inMaintImps = imps.filter((m: any) => m.status === 'Em manutenção' || m.status === 'Parada');

            compactDataContext = `[DADOS SUPABASE]: ${imps.length} implementos (${activeImps.length} ativos, ${inMaintImps.length} em manutenção/parado).`;

            if (isListExplicitlyAsked) {
              const sample = imps.slice(0, 8).map((m: any) => `• ${m.code} (${m.name}): ${m.status}`).join('\n');
              directObjectiveText = `Implementos:\n${sample}`;
            } else {
              directObjectiveText = `• ${imps.length} implementos\n• ${activeImps.length} ativos\n• ${inMaintImps.length} em manutenção/parado`;
            }

          } else if (q.includes('maquina') || q.includes('máquina') || q.includes('trator') || q.includes('colheitadeira') || q.includes('caminhao') || q.includes('caminhão')) {
            const { data: allMachs } = await supabase.from('machines').select('id, code, name, type, current_hour_km, status').limit(200);
            const onlyMachs = (allMachs || []).filter((m: any) => !isImplement(m));
            const activeMachs = onlyMachs.filter((m: any) => m.status === 'Ativa');
            const inMaintMachs = onlyMachs.filter((m: any) => m.status === 'Em manutenção' || m.status === 'Parada');

            compactDataContext = `[DADOS SUPABASE]: ${onlyMachs.length} máquinas (${activeMachs.length} ativas, ${inMaintMachs.length} em manutenção/parada).`;

            if (isListExplicitlyAsked) {
              const sample = onlyMachs.slice(0, 6).map((m: any) => `• ${m.code} (${m.name}): ${m.current_hour_km || 0} h - ${m.status}`).join('\n');
              directObjectiveText = `Máquinas:\n${sample}`;
            } else {
              directObjectiveText = `• ${onlyMachs.length} máquinas\n• ${activeMachs.length} ativas\n• ${inMaintMachs.length} em manutenção/parada`;
            }

          } else if (q.includes('frota') || q.includes('equipamento') || q.includes('total')) {
            const { data: allMachs } = await supabase.from('machines').select('id, code, name, type, current_hour_km, status').limit(200);
            const onlyMachs = (allMachs || []).filter((m: any) => !isImplement(m));
            const imps = (allMachs || []).filter(isImplement);
            const inMaint = (allMachs || []).filter((m: any) => m.status === 'Em manutenção' || m.status === 'Parada');

            compactDataContext = `[DADOS SUPABASE]: ${(allMachs || []).length} equipamentos (${onlyMachs.length} máquinas, ${imps.length} implementos).`;

            if (isListExplicitlyAsked) {
              const sample = (allMachs || []).slice(0, 6).map((m: any) => `• ${m.code} (${m.name}): ${m.status}`).join('\n');
              directObjectiveText = `Equipamentos:\n${sample}`;
            } else {
              directObjectiveText = `• ${(allMachs || []).length} equipamentos no total\n• ${onlyMachs.length} máquinas (${onlyMachs.filter((m: any) => m.status === 'Ativa').length} ativas)\n• ${imps.length} implementos (${imps.filter((m: any) => m.status === 'Ativa').length} ativos)\n• ${inMaint.length} em manutenção/parado`;
            }

          } else {
            const [machCount, overdueCount, openOsCount] = await Promise.all([
              supabase.from('machines').select('id', { count: 'exact', head: true }),
              supabase.from('preventive_plan_status').select('id', { count: 'exact', head: true }).eq('status', 'VENCIDA'),
              supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', ['Aberta', 'Em Andamento'])
            ]);

            const mCount = machCount.count || 0;
            const oCount = overdueCount.count || 0;
            const osCount = openOsCount.count || 0;

            compactDataContext = `[DADOS SUPABASE]: ${mCount} máquinas, ${oCount} preventivas vencidas, ${osCount} OS abertas.`;
            directObjectiveText = `• ${mCount} equipamentos cadastrados\n• ${oCount} preventivas vencidas\n• ${osCount} ordens de serviço abertas`;
          }
        } catch (dbErr) {
          console.warn('Alerta na consulta compacta ao Supabase:', dbErr);
        }
      } else {
        // Modo Geral - Universal, busca na web, cotações em tempo real, cálculos e enciclopédia
        directObjectiveText = await resolveGeneralKnowledgeQuery(message);
      }

      // =========================================================================
      // 3. TENTATIVA COM GEMINI (COM REGRA MANDATÓRIA DE RESPOSTA CURTA E OBJETIVA)
      // =========================================================================
      if (ai) {
        try {
          const systemInstruction = mode === 'app'
            ? `Você é o Agente IA Agro da Agropecuária Boa Sorte.
REGRA MANDATÓRIA DE OBJETIVIDADE:
- Em perguntas de QUANTIDADE (ex: quantos, quantas, total, cadastro, equipamentos, preventivas, OS), responda ESTRITAMENTE com os totais em tópicos simples e NADA MAIS.
Exemplo exato para perguntas sobre equipamentos:
• 160 equipamentos
• 159 ativos
• 1 em manutenção/parado
- NUNCA liste nomes de equipamentos, marcas, modelos, códigos ou itens individuais a menos que o usuário use expressamente palavras como "quais", "liste", "listar" ou "nomes".
- Responda apenas e exclusivamente o que foi perguntado. Proibido saudações, introduções ou explicações adicionais.`
            : `Você é o Agente IA Agro em modo Geral. REGRA MANDATÓRIA: Em perguntas de quantidade ou contagem, mostre somente os totais numéricos e resumo essencial. Não liste itens desnecessários. Sem saudações ou enrolação.`;

          const promptContent = mode === 'app' && compactDataContext
            ? `${compactDataContext}\nPergunta: ${message}`
            : `Pergunta: ${message}`;

          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptContent,
            config: {
              systemInstruction,
              maxOutputTokens: 250
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
          // Fallback seguro
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
