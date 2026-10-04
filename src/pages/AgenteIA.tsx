import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, Trash2, Printer, FileText, CheckCircle2, 
  AlertTriangle, Wrench, Tractor, Fuel, Database, Sparkles, 
  Globe, Info, RefreshCw, X, Zap
} from 'lucide-react';
import { fleetService } from '../lib/fleetService';
import { UserRole, Machine, PreventivePlanStatus, WorkOrder, FuelLog, FuelStock, Checklist30d, isImplement } from '../types';

export interface PDFReportData {
  type: 'preventivas_vencidas' | 'frota_maquinas' | 'ordens_servico' | 'abastecimentos' | 'estoque_diesel' | 'geral';
  title: string;
  summary: string;
  generatedAt: string;
  items: any[];
  kpis?: Record<string, string | number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'app' | 'general';
  timestamp: string;
  pdfReport?: PDFReportData;
  usage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

interface AgenteIAProps {
  selectedFarmId?: string;
  userRole: UserRole;
  userEmail: string;
}

const CHAT_STORAGE_KEY = 'agro_agente_ia_messages_history_v2';
const CHAT_MODE_KEY = 'agro_agente_ia_current_mode';

const INITIAL_WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Agente IA Agro operacional. Respostas objetivas e curtas ativadas.\n• Modo Aplicativo: Consulta dados da frota e relatórios em PDF.\n• Modo Geral: Respostas técnicas diretas sobre agronegócio e maquinário.',
  mode: 'app',
  timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  usage: {
    promptTokens: 0,
    candidatesTokens: 38,
    totalTokens: 38
  }
};

export default function AgenteIA({ selectedFarmId, userRole, userEmail }: AgenteIAProps) {
  // 1. Preservação do Modo Escolhido no LocalStorage
  const [mode, setMode] = useState<'app' | 'general'>(() => {
    try {
      const savedMode = localStorage.getItem(CHAT_MODE_KEY);
      if (savedMode === 'app' || savedMode === 'general') return savedMode;
    } catch (e) {}
    return 'app';
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2. Preservação do Histórico de Conversas no LocalStorage (não apaga ao mudar de aba)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Alerta ao ler histórico do Agente IA:', e);
    }
    return [INITIAL_WELCOME_MSG];
  });

  const [activePdfReport, setActivePdfReport] = useState<PDFReportData | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Salva no localStorage sempre que as mensagens forem alteradas
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Alerta ao persistir mensagens do chat:', e);
    }
  }, [messages]);

  // Salva o modo no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MODE_KEY, mode);
    } catch (e) {}
  }, [mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickPromptsApp = [
    'Quantos implementos temos cadastrados?',
    'Quantas máquinas temos cadastradas?',
    'Quantos equipamentos temos no total?',
    'Quantas preventivas estão vencidas?',
    'Quantas Ordens de Serviço estão abertas?',
    'Gere um relatório em PDF das preventivas vencidas'
  ];

  const quickPromptsGeneral = [
    'Adubação NPK para soja e milho',
    'Diferença técnica entre óleos CI-4 e CK-4',
    'Comunicado sobre preenchimento de horímetro',
    'Causas de superaquecimento em motores diesel agrícolas',
    'Como calcular taxa de consumo de diesel por hora trabalhada'
  ];

  // Helper local 100% objetivo para consultas ao Supabase (somente dados solicitados)
  const processAppQuery = async (queryText: string): Promise<{ text: string; report?: PDFReportData }> => {
    const q = queryText.toLowerCase();
    const isListRequested = q.includes('quais') || q.includes('liste') || q.includes('listar') || q.includes('nomes') || q.includes('detalhe') || q.includes('relacione');

    // 1. Relatório em PDF de Preventivas Vencidas
    if (q.includes('pdf') && (q.includes('preventiv') || q.includes('vencid') || q.includes('revis'))) {
      const [plans, machines, farms] = await Promise.all([
        fleetService.getPreventivePlanStatus(),
        fleetService.getMachines(),
        fleetService.getFarms()
      ]);

      const overdue = plans.filter(p => p.status === 'VENCIDA');
      const upcoming = plans.filter(p => p.status === 'PRÓXIMA');

      const items = overdue.slice(0, 30).map((plan, idx) => {
        const m = machines.find(mach => mach.id === plan.machine_id);
        const farm = farms.find(f => f.id === plan.farm_id)?.name || 'Central';
        return {
          idx: idx + 1,
          code: m?.code || plan.machine_code || '-',
          machine: m?.name || plan.machine_name || 'Máquina',
          farm,
          item: plan.maintenance_item,
          currentHourKm: `${Number(plan.current_hour_km || 0).toLocaleString('pt-BR')} ${Number(plan.current_hour_km || 0) > 5000 ? 'km' : 'h'}`,
          remaining: `Vencida há ${Math.abs(Number(plan.hour_km_remaining || 0)).toLocaleString('pt-BR')} ${Number(plan.current_hour_km || 0) > 5000 ? 'km' : 'h'}`,
          status: 'VENCIDA'
        };
      });

      const reportData: PDFReportData = {
        type: 'preventivas_vencidas',
        title: 'Relatório Oficial de Preventivas Vencidas',
        summary: `Total de ${overdue.length} preventivas vencidas e ${upcoming.length} próximas da troca.`,
        generatedAt: new Date().toLocaleString('pt-BR'),
        kpis: {
          'Preventivas Vencidas': overdue.length,
          'Próximas da Troca': upcoming.length,
          'Total Monitorado': plans.length
        },
        items
      };

      return {
        text: `Relatório em PDF gerado com ${overdue.length} preventivas vencidas. Clique abaixo para abrir ou imprimir.`,
        report: reportData
      };
    }

    // 2. Consulta Geral de Preventivas (100% objetiva)
    if (q.includes('preventiv') || q.includes('revis') || q.includes('troca')) {
      const [plans, machines] = await Promise.all([
        fleetService.getPreventivePlanStatus(),
        fleetService.getMachines()
      ]);

      const overdue = plans.filter(p => p.status === 'VENCIDA');
      const upcoming = plans.filter(p => p.status === 'PRÓXIMA');

      if (!isListRequested) {
        return {
          text: `• ${overdue.length} preventivas vencidas\n• ${upcoming.length} próximas da troca\n• ${plans.length} total monitorado`
        };
      }

      let responseText = `Preventivas Vencidas (${overdue.length}):\n` +
        overdue.slice(0, 5).map(plan => {
          const m = machines.find(mach => mach.id === plan.machine_id);
          return `• ${m?.code || plan.machine_code || 'MAQ'}: ${plan.maintenance_item} (vencida há ${Math.abs(Number(plan.hour_km_remaining || 0))}h)`;
        }).join('\n');

      return { text: responseText };
    }

    // 3. Ordens de Serviço (100% objetiva)
    if (q.includes('ordem') || q.includes('ordens') || q.includes(' os ') || q.startsWith('os ') || q.includes('serviço')) {
      const [orders, machines] = await Promise.all([
        fleetService.getWorkOrders(),
        fleetService.getMachines()
      ]);

      const openOrders = orders.filter(o => o.status === 'Aberta' || o.status === 'Em Andamento');
      const highPriority = openOrders.filter(o => o.priority === 'alta');

      if (!isListRequested) {
        return {
          text: `• ${openOrders.length} ordens de serviço abertas\n• ${highPriority.length} com prioridade alta\n• ${orders.length} total no histórico`
        };
      }

      let responseText = `Ordens de Serviço Abertas (${openOrders.length}):\n` +
        openOrders.slice(0, 5).map(os => {
          const m = machines.find(mach => mach.id === os.machine_id);
          return `• OS #${os.id.substring(0, 6)} (${m?.code || 'Máquina'}): ${os.reason} [${os.status} | prio: ${os.priority?.toUpperCase()}]`;
        }).join('\n');

      return { text: responseText };
    }

    // 4. Estoque de Diesel (100% objetiva)
    if (q.includes('diesel') || q.includes('estoque') || (q.includes('combustivel') && q.includes('saldo'))) {
      const [farms, logs, stockEntries] = await Promise.all([
        fleetService.getFarms(),
        fleetService.getFuelLogs(),
        fleetService.getFuelStock()
      ]);

      let responseText = `Saldo de Diesel por Fazenda:\n` + farms.slice(0, 5).map(farm => {
        const received = stockEntries.filter(s => s.farm_id === farm.id).reduce((acc, s) => acc + (Number(s.liters_received) || 0), 0);
        const consumed = logs.filter(l => l.farm_id === farm.id).reduce((acc, l) => acc + (Number(l.liters_supplied) || ((Number(l.pump_reading_end) - Number(l.pump_reading_start)) || 0)), 0);
        const balance = Math.max(0, received - consumed);
        return `• ${farm.name}: ${balance.toLocaleString('pt-BR')} L`;
      }).join('\n');

      return { text: responseText };
    }

    // 5. Abastecimentos e Consumo (100% objetiva)
    if (q.includes('abastec') || q.includes('bomba') || q.includes('consumo')) {
      const [logs, machines, farms] = await Promise.all([
        fleetService.getFuelLogs(),
        fleetService.getMachines(),
        fleetService.getFarms()
      ]);

      const totalLiters = logs.reduce((acc, l) => acc + (Number(l.liters_supplied) || 0), 0);

      if (!isListRequested) {
        return {
          text: `• ${logs.length} abastecimentos registrados\n• ${totalLiters.toLocaleString('pt-BR')} L abastecidos no total`
        };
      }

      const recentLogs = logs.slice(0, 4);
      let responseText = `Abastecimentos: ${logs.length} registros (${totalLiters.toLocaleString('pt-BR')} L totais).\nÚltimos lançamentos:\n` +
        recentLogs.map(l => {
          const m = machines.find(mach => mach.id === l.machine_id);
          const liters = l.liters_supplied || ((l.pump_reading_end - l.pump_reading_start) || 0);
          return `• ${l.date || '-'}: ${m?.code || 'MAQ'} - ${liters.toLocaleString('pt-BR')} L`;
        }).join('\n');

      return { text: responseText };
    }

    // 6. IMPLEMENTOS (Consulta exclusiva da aba Implementos)
    if (q.includes('implement')) {
      const machines = await fleetService.getMachines();
      const implementsList = machines.filter(m => isImplement(m));
      const active = implementsList.filter(m => m.status === 'Ativa');
      const inMaint = implementsList.filter(m => m.status === 'Em manutenção' || m.status === 'Parada');

      if (!isListRequested) {
        return {
          text: `• ${implementsList.length} implementos\n• ${active.length} ativos\n• ${inMaint.length} em manutenção/parado`
        };
      }

      let responseText = `Implementos (${implementsList.length}):\n` +
        implementsList.slice(0, 8).map(m => `• ${m.code} (${m.name}): ${m.status}`).join('\n');

      return { text: responseText };
    }

    // 7. MÁQUINAS (Consulta exclusiva de Máquinas/Veículos, excluindo implementos)
    if (q.includes('maquina') || q.includes('máquina') || q.includes('trator') || q.includes('colheitadeira') || q.includes('caminhao') || q.includes('caminhão')) {
      const machines = await fleetService.getMachines();
      const onlyMachines = machines.filter(m => !isImplement(m));
      const active = onlyMachines.filter(m => m.status === 'Ativa');
      const inMaint = onlyMachines.filter(m => m.status === 'Em manutenção' || m.status === 'Parada');

      if (!isListRequested) {
        return {
          text: `• ${onlyMachines.length} máquinas\n• ${active.length} ativas\n• ${inMaint.length} em manutenção/parada`
        };
      }

      let responseText = `Máquinas (${onlyMachines.length}):\n` +
        onlyMachines.slice(0, 6).map(m => `• ${m.code} (${m.name}): ${(m.current_hour_km || 0).toLocaleString('pt-BR')} h - ${m.status}`).join('\n');

      return { text: responseText };
    }

    // 8. EQUIPAMENTOS / FROTA GERAL (Totais consolidados de máquinas + implementos)
    if (q.includes('frota') || q.includes('equipamento') || q.includes('total')) {
      const [machines, farms] = await Promise.all([
        fleetService.getMachines(),
        fleetService.getFarms()
      ]);

      if (q.includes('pdf')) {
        const items = machines.slice(0, 35).map((m, idx) => ({
          idx: idx + 1,
          code: m.code,
          name: m.name,
          brandModel: `${m.brand || ''} ${m.model || ''}`,
          farm: farms.find(f => f.id === m.farm_id)?.name || 'Central',
          currentHourKm: `${(m.current_hour_km || 0).toLocaleString('pt-BR')} h`,
          status: m.status || 'Ativa'
        }));

        const reportData: PDFReportData = {
          type: 'frota_maquinas',
          title: 'Relatório Oficial da Frota de Máquinas e Implementos',
          summary: `Cadastro de ${machines.length} equipamentos da Agropecuária Boa Sorte.`,
          generatedAt: new Date().toLocaleString('pt-BR'),
          kpis: {
            'Total de Equipamentos': machines.length,
            'Ativas': machines.filter(m => m.status === 'Ativa').length,
            'Em Manutenção / Paradas': machines.filter(m => m.status !== 'Ativa').length
          },
          items
        };

        return {
          text: `Relatório em PDF da frota gerado com ${machines.length} equipamentos. Clique abaixo para abrir ou imprimir.`,
          report: reportData
        };
      }

      const onlyMachines = machines.filter(m => !isImplement(m));
      const implementsList = machines.filter(m => isImplement(m));
      const inMaint = machines.filter(m => m.status === 'Em manutenção' || m.status === 'Parada');

      if (!isListRequested) {
        return {
          text: `• ${machines.length} equipamentos no total\n• ${onlyMachines.length} máquinas (${onlyMachines.filter(m => m.status === 'Ativa').length} ativas)\n• ${implementsList.length} implementos (${implementsList.filter(m => m.status === 'Ativa').length} ativos)\n• ${inMaint.length} em manutenção/parado`
        };
      }

      let responseText = `Equipamentos (${machines.length}):\n` +
        machines.slice(0, 6).map(m => `• ${m.code} (${m.name}): ${m.status}`).join('\n');

      return { text: responseText };
    }

    // Consulta padrão objetiva
    const [machines, plans, orders] = await Promise.all([
      fleetService.getMachines(),
      fleetService.getPreventivePlanStatus(),
      fleetService.getWorkOrders()
    ]);

    const onlyMachines = machines.filter(m => !isImplement(m));
    const implementsList = machines.filter(m => isImplement(m));
    const overduePlans = plans.filter(p => p.status === 'VENCIDA').length;
    const openOrders = orders.filter(o => o.status === 'Aberta' || o.status === 'Em Andamento').length;

    return {
      text: `• ${onlyMachines.length} máquinas (${onlyMachines.filter(m => m.status === 'Ativa').length} ativas)\n• ${implementsList.length} implementos (${implementsList.filter(m => m.status === 'Ativa').length} ativos)\n• ${overduePlans} preventivas vencidas\n• ${openOrders} ordens de serviço abertas`
    };
  };

  // Resolução universal de consultas do Modo Geral (cotações em tempo real, clima, conversões e web)
  const resolveGeneralKnowledgeClient = async (message: string): Promise<string> => {
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
        console.warn('Erro na consulta de cotação:', e);
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
        
        const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?m&format=%l:+%C+%t,+vento+%w,+umidade+%h`);
        if (res.ok) {
          const text = (await res.text()).trim();
          if (text && !text.includes('Unknown') && !text.includes('<html>')) {
            return `• Previsão do tempo: ${text}`;
          }
        }
      } catch (e) {}
    }

    // 3. Medidas agrárias e conversões
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

    // 4. Cálculos matemáticos diretos
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

    // 5. Conhecimentos agronômicos
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
      const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&utf8=1`;
      const searchRes = await fetch(searchUrl);
      
      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        const results = searchData?.query?.search || [];
        for (const item of results.slice(0, 3)) {
          const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
          const summaryRes = await fetch(summaryUrl);
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
      console.warn('Erro na busca web do cliente:', e);
    }

    return `Informação sobre "${message}": Consulta processada no Modo Geral.`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userPromptTokens = Math.max(1, Math.ceil(textToSend.trim().length / 4));

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      mode,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      usage: {
        promptTokens: userPromptTokens,
        candidatesTokens: 0,
        totalTokens: userPromptTokens
      }
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let assistantResponse = '';
      let generatedReport: PDFReportData | undefined = undefined;
      let tokenUsage: { promptTokens: number; candidatesTokens: number; totalTokens: number } | undefined = undefined;

      // Se estiver no Modo Aplicativo, processa com dados autenticados do Supabase
      if (mode === 'app') {
        const appResult = await processAppQuery(userMsg.content);
        assistantResponse = appResult.text;
        generatedReport = appResult.report;

        const pTokens = Math.max(1, Math.ceil(userMsg.content.length / 4));
        const cTokens = Math.max(1, Math.ceil(assistantResponse.length / 4));
        tokenUsage = {
          promptTokens: pTokens,
          candidatesTokens: cTokens,
          totalTokens: pTokens + cTokens
        };
      } else {
        // Modo Geral - tenta backend e aplica fallback técnico direto
        try {
          const recentWindow = messages.slice(-2).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content.substring(0, 180) }]
          }));

          const response = await fetch('/api/gemini/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMsg.content,
              mode: 'general',
              history: recentWindow
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.text) {
              assistantResponse = data.text;
              if (data.usage) {
                tokenUsage = data.usage;
              }
            }
          }
        } catch (e) {}

        if (!assistantResponse) {
          assistantResponse = await resolveGeneralKnowledgeClient(userMsg.content);

          const pTokens = Math.max(1, Math.ceil(userMsg.content.length / 4));
          const cTokens = Math.max(1, Math.ceil(assistantResponse.length / 4));
          tokenUsage = {
            promptTokens: pTokens,
            candidatesTokens: cTokens,
            totalTokens: pTokens + cTokens
          };
        }
      }

      if (!tokenUsage) {
        const pTokens = Math.max(1, Math.ceil(userMsg.content.length / 4));
        const cTokens = Math.max(1, Math.ceil(assistantResponse.length / 4));
        tokenUsage = {
          promptTokens: pTokens,
          candidatesTokens: cTokens,
          totalTokens: pTokens + cTokens
        };
      }

      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: assistantResponse,
        mode,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        pdfReport: generatedReport,
        usage: tokenUsage
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Erro momentâneo ao processar consulta.',
          mode,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          usage: { promptTokens: 5, candidatesTokens: 8, totalTokens: 13 }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPdf = (report: PDFReportData) => {
    setActivePdfReport(report);
    setIsPdfModalOpen(true);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const clearChat = () => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e) {}
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        content: 'Conversa reiniciada. Respostas objetivas ativas.',
        mode,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        usage: { promptTokens: 0, candidatesTokens: 10, totalTokens: 10 }
      }
    ]);
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* CABEÇALHO COM SELETOR DE MODOS NÍTIDO E VISÍVEL */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1B3022] text-white flex items-center justify-center shadow-md">
              <Bot size={26} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-800 tracking-tight">Agente IA Agro</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300">
                  Respostas Objetivas & Curtas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultas estritas e diretas aos dados do Supabase ou assistente técnico de uso geral.
              </p>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Limpar histórico de conversa"
          >
            <Trash2 size={13} />
            <span>Limpar Conversa</span>
          </button>
        </div>

        {/* SELETOR DE MODOS COM BOTÕES EM DESTAQUE VERDE */}
        <div className="pt-4">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Selecione o Modo de Conversa do Agente:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* BOTÃO 1: MODO APLICATIVO */}
            <button
              type="button"
              onClick={() => setMode('app')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                mode === 'app'
                  ? 'bg-[#1B3022] text-white border-[#1B3022] shadow-md ring-2 ring-emerald-500/30 font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${mode === 'app' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-[#1B3022]'}`}>
                  <Tractor size={18} />
                </div>
                <div>
                  <div className="text-xs font-black">Conversa sobre o Aplicativo</div>
                  <div className={`text-[10px] ${mode === 'app' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Preventiva, Máquinas, OS, Diesel e Relatórios PDF
                  </div>
                </div>
              </div>
              {mode === 'app' && (
                <div className="bg-emerald-400 w-2.5 h-2.5 rounded-full animate-pulse shrink-0" />
              )}
            </button>

            {/* BOTÃO 2: MODO GERAL */}
            <button
              type="button"
              onClick={() => setMode('general')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                mode === 'general'
                  ? 'bg-[#1B3022] text-white border-[#1B3022] shadow-md ring-2 ring-emerald-500/30 font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${mode === 'general' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-[#1B3022]'}`}>
                  <Globe size={18} />
                </div>
                <div>
                  <div className="text-xs font-black">Conversa Geral</div>
                  <div className={`text-[10px] ${mode === 'general' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Conhecimento Amplo, Agronomia, Mecânica e Cálculos
                  </div>
                </div>
              </div>
              {mode === 'general' && (
                <div className="bg-emerald-400 w-2.5 h-2.5 rounded-full animate-pulse shrink-0" />
              )}
            </button>
          </div>

          <div className="mt-2.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
            <Info size={13} className="text-emerald-800 shrink-0" />
            <span>
              {mode === 'app' 
                ? 'Modo Ativo: Respostas curtas e dados estritos da Agropecuária Boa Sorte no Supabase.'
                : 'Modo Ativo: Respostas técnicas curtas de conhecimento aberto.'}
            </span>
          </div>
        </div>
      </div>

      {/* ÁREA DE CONVERSA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[560px] sm:h-[620px] print:hidden">
        {/* MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-[#1B3022] text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot size={16} className="text-emerald-400" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                msg.role === 'user'
                  ? 'bg-[#1B3022] text-white rounded-tr-xs shadow-md'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
              }`}>
                {/* CABEÇALHO DO CARD */}
                <div className={`flex items-center justify-between gap-3 text-[10px] pb-1.5 border-b ${
                  msg.role === 'user' ? 'border-white/20 text-emerald-200' : 'border-black/10 text-slate-500'
                }`}>
                  <span className="font-bold flex items-center gap-1">
                    {msg.role === 'user' ? 'Você' : 'Agente IA Agro'}
                  </span>
                  <span className="opacity-85 font-mono">{msg.timestamp}</span>
                </div>

                {/* TEXTO DA PERGUNTA OU RESPOSTA */}
                <div className={`whitespace-pre-wrap leading-relaxed font-sans ${
                  msg.role === 'user'
                    ? 'text-white font-semibold text-[13px] tracking-wide drop-shadow-xs'
                    : 'text-slate-800 font-medium text-xs'
                }`}>
                  {msg.content}
                </div>

                {/* CARD DE AÇÃO PARA RELATÓRIO EM PDF SE GERADO */}
                {msg.pdfReport && (
                  <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                      <FileText size={15} className="text-emerald-700" />
                      <span>{msg.pdfReport.title}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-normal">
                      {msg.pdfReport.summary}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenPdf(msg.pdfReport!)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1B3022] hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer size={14} className="text-emerald-400" />
                      <span>Visualizar / Baixar Relatório em PDF</span>
                    </button>
                  </div>
                )}

                {/* PAINEL EXPLÍCITO DE CONSUMO DE TOKENS EM TODAS AS MENSAGENS */}
                {msg.role === 'assistant' ? (
                  <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded-md font-bold shadow-2xs">
                      <Zap size={11} className="text-emerald-700 shrink-0" />
                      <span className="text-[9px] uppercase tracking-wider text-emerald-800">Tokens:</span>
                      <span className="text-slate-600 font-medium">Entrada: <strong className="text-emerald-900">{msg.usage?.promptTokens ?? 0}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600 font-medium">Saída: <strong className="text-emerald-900">{msg.usage?.candidatesTokens ?? 0}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-800">Total: <strong className="text-emerald-950 text-[11px]">{msg.usage?.totalTokens ?? 0}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-end text-[9px] font-mono text-emerald-200">
                    <span className="flex items-center gap-1">
                      <Zap size={10} className="text-emerald-400" />
                      Tokens de Entrada: <strong>{msg.usage?.promptTokens ?? Math.max(1, Math.ceil(msg.content.length / 4))}</strong>
                    </span>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1B3022] text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                <Bot size={16} className="text-emerald-400" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                <RefreshCw size={14} className="animate-spin text-emerald-700" />
                <span>Processando resposta objetiva...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* SUGESTÕES DE PERGUNTAS RÁPIDAS (PROMPTS) */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-emerald-700" /> Sugestões:
          </span>
          {(mode === 'app' ? quickPromptsApp : quickPromptsGeneral).map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] whitespace-nowrap bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* CAMPO DE ENTRADA DO CHAT */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                mode === 'app'
                  ? 'Pergunte sobre preventivas, máquinas, diesel, OS ou peça "Gere um PDF de..."'
                  : 'Pergunte sobre agronomia, mecânica, cálculos, clima ou outros assuntos...'
              }
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] focus:bg-white shadow-2xs transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2.5 bg-[#1B3022] hover:bg-emerald-950 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Send size={14} />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </div>
      </div>

      {/* MODAL E VISUALIZAÇÃO DE RELATÓRIO OFICIAL EM PDF */}
      {isPdfModalOpen && activePdfReport && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
            {/* BARRA SUPERIOR DO MODAL (OCULTA NA IMPRESSÃO) */}
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-400" />
                <span className="font-bold text-sm">Visualização do Relatório Oficial para PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>Imprimir / Salvar em PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CONTEÚDO DO RELATÓRIO OFICIAL (FORMATO A4 REAPROVEITADO) */}
            <div className="flex-1 overflow-y-auto p-8 font-sans print:p-0 print:overflow-visible">
              {/* CABEÇALHO OFICIAL */}
              <div className="flex items-center justify-between border-b-2 border-[#1B3022] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1B3022] text-white flex items-center justify-center font-bold text-lg">
                    BS
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#1B3022] tracking-tight uppercase">
                      Grupo Agropecuária Boa Sorte
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Gestão Integrada de Frotas, Máquinas & Operações Agrícolas
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  <p><strong>Emissão:</strong> {activePdfReport.generatedAt}</p>
                  <p><strong>Operador:</strong> {userEmail}</p>
                  <p><strong>Módulo:</strong> Agente IA Agro</p>
                </div>
              </div>

              {/* TÍTULO E RESUMO DO RELATÓRIO */}
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {activePdfReport.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {activePdfReport.summary}
                </p>
              </div>

              {/* KPIS SE HOUVER */}
              {activePdfReport.kpis && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {Object.entries(activePdfReport.kpis).map(([label, val], idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">{label}</span>
                      <span className="text-sm font-black text-[#1B3022] font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TABELA DE DADOS DO RELATÓRIO */}
              <table className="w-full border-collapse border border-slate-400 text-[10px] mb-6">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 uppercase font-bold text-left">
                    <th className="border border-slate-400 p-1.5 text-center w-8">#</th>
                    <th className="border border-slate-400 p-1.5">Código / Equipamento</th>
                    <th className="border border-slate-400 p-1.5">Fazenda</th>
                    <th className="border border-slate-400 p-1.5">Componente / Item</th>
                    <th className="border border-slate-400 p-1.5 text-right font-mono">Horímetro Atual</th>
                    <th className="border border-slate-400 p-1.5 text-right font-mono">Situação / Prazo</th>
                    <th className="border border-slate-400 p-1.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activePdfReport.items && activePdfReport.items.length > 0 ? (
                    activePdfReport.items.map((it, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-slate-600">{it.idx || idx + 1}</td>
                        <td className="border border-slate-300 p-1.5">
                          <strong className="text-[#1B3022] font-mono">{it.code || '-'}</strong> - {it.machine || it.name || ''}
                        </td>
                        <td className="border border-slate-300 p-1.5">{it.farm || '-'}</td>
                        <td className="border border-slate-300 p-1.5 font-bold text-slate-800">{it.item || it.brandModel || '-'}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-[#1B3022]">{it.currentHourKm || '-'}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-rose-700">{it.remaining || it.status || '-'}</td>
                        <td className="border border-slate-300 p-1.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            it.status === 'VENCIDA'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {it.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 p-4 text-center text-slate-500">
                        Nenhum item pendente encontrado para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* CAMPOS DE ASSINATURA */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-[10px] text-slate-600">
                <div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                  <p className="font-bold uppercase text-slate-800">Responsável Técnico / Mecânico</p>
                  <p className="text-[9px] text-slate-500">Agropecuária Boa Sorte</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                  <p className="font-bold uppercase text-slate-800">Gerência de Operações & Frota</p>
                  <p className="text-[9px] text-slate-500">Aprovação e Visto Geral</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
