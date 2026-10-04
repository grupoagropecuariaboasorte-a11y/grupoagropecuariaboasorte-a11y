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
      const { message, mode } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
      }

      // Se for modo aplicativo, busca dados relevantes no Supabase para enriquecer a resposta
      if (mode === 'app') {
        const q = message.toLowerCase();

        // 1. Verificação se pediu geração de PDF
        if (q.includes('pdf') && (q.includes('preventiv') || q.includes('vencid') || q.includes('revis'))) {
          const [{ data: plans }, { data: machines }, { data: farms }] = await Promise.all([
            supabase.from('preventive_plan_status').select('*'),
            supabase.from('machines').select('*'),
            supabase.from('farms').select('*')
          ]);

          const pList = plans || [];
          const mList = machines || [];
          const fList = farms || [];

          const overdue = pList.filter(p => p.status === 'VENCIDA');
          const upcoming = pList.filter(p => p.status === 'PRÓXIMA');

          const items = overdue.map((plan, idx) => {
            const m = mList.find(mach => mach.id === plan.machine_id);
            const farm = fList.find(f => f.id === plan.farm_id)?.name || 'Central';
            const code = plan.machine_code || m?.code || '-';
            const machine = plan.machine_name || m?.name || 'Máquina';
            return {
              idx: idx + 1,
              code,
              machine,
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
            summary: `Identificadas ${overdue.length} preventivas vencidas e ${upcoming.length} próximas da troca na frota da Agropecuária Boa Sorte.`,
            generatedAt: new Date().toLocaleString('pt-BR'),
            kpis: {
              'Preventivas Vencidas': overdue.length,
              'Próximas da Troca': upcoming.length,
              'Total Monitorado': pList.length
            },
            items
          };

          const textResponse = `📄 **Relatório em PDF Gerado com Sucesso!**\n\nIdentifiquei **${overdue.length} manutenções preventivas vencidas** no sistema que necessitam de intervenção:\n\n${overdue.slice(0, 5).map(p => {
            const m = mList.find(mach => mach.id === p.machine_id);
            const code = p.machine_code || m?.code || 'MAQ';
            const name = p.machine_name || m?.name || 'Equipamento';
            return `• **${code}** (${name}): *${p.maintenance_item}* - Vencida há ${Math.abs(Number(p.hour_km_remaining || 0))}h`;
          }).join('\n')}${overdue.length > 5 ? `\n• *... e mais ${overdue.length - 5} itens no relatório completo.*` : ''}\n\nClique no botão abaixo para **visualizar e imprimir o documento oficial em formato A4**.`;

          return res.json({ text: textResponse, pdfReport });
        }

        // 2. Consulta regular sobre a frota / preventivas / ordens
        if (ai) {
          try {
            const systemPrompt = `Você é o Agente IA Agro da Agropecuária Boa Sorte. Responda em português com clareza, objetividade e tom profissional. O usuário está no "Modo Conversa sobre o Aplicativo".`;
            const geminiRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: message,
              config: {
                systemInstruction: systemPrompt
              }
            });

            if (geminiRes && geminiRes.text) {
              return res.json({ text: geminiRes.text });
            }
          } catch (e) {
            // Em caso de erro na API do Gemini, o cliente executa o fallback com dados locais
            console.warn('Fallback ativado no servidor após erro do Gemini:', e);
          }
        }
      } else {
        // Modo Geral
        if (ai) {
          try {
            const systemPrompt = `Você é um assistente de inteligência artificial de uso geral especializado em agronegócio, agronomia, engenharia mecânica, gestão de frotas e conhecimentos amplos. Responda em português com clareza, formatação rica (listas, negritos e tópicos).`;
            const geminiRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: message,
              config: {
                systemInstruction: systemPrompt
              }
            });

            if (geminiRes && geminiRes.text) {
              return res.json({ text: geminiRes.text });
            }
          } catch (e) {
            console.warn('Erro na chamada do Gemini em modo geral:', e);
          }
        }
      }

      // Retorna vazio para o frontend aplicar o processador nativo com Supabase
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
