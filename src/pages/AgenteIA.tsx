import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, Trash2, Printer, FileText, CheckCircle2, 
  AlertTriangle, Wrench, Tractor, Fuel, Database, Sparkles, 
  Globe, Info, RefreshCw, X
} from 'lucide-react';
import { fleetService } from '../lib/fleetService';
import { UserRole, Machine, PreventivePlanStatus, WorkOrder, FuelLog, FuelStock, Checklist30d } from '../types';

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
}

interface AgenteIAProps {
  selectedFarmId?: string;
  userRole: UserRole;
  userEmail: string;
}

export default function AgenteIA({ selectedFarmId, userRole, userEmail }: AgenteIAProps) {
  const [mode, setMode] = useState<'app' | 'general'>('app');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou o **Agente IA Agro** da Agropecuária Boa Sorte. Estou aqui para ajudar você na gestão diária da frota, equipamentos e conhecimentos gerais do agronegócio.\n\nEscolha um dos modos acima para conversar:\n- **Conversa sobre o Aplicativo**: Pergunte sobre preventivas, máquinas, ordens de serviço, diesel e gere relatórios em PDF.\n- **Conversa Geral**: Tire dúvidas gerais de agronomia, mecânica, cálculos e consultas livres.',
        mode: 'app',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [activePdfReport, setActivePdfReport] = useState<PDFReportData | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickPromptsApp = [
    'Quais preventivas estão vencidas ou próximas de vencer?',
    'Gere um relatório em PDF das máquinas com preventivas vencidas',
    'Quantas Ordens de Serviço estão abertas no momento?',
    'Qual o saldo atual de estoque de diesel nas fazendas?',
    'Resumo dos últimos abastecimentos e consumo da frota',
    'Gere um relatório em PDF geral de todas as máquinas'
  ];

  const quickPromptsGeneral = [
    'Qual a dosagem e época recomendada de adubação NPK para soja?',
    'Como funciona o sistema de injeção eletrônica Common Rail em motores diesel?',
    'Escreva um comunicado formal para os operadores sobre uso correto do horímetro',
    'Quais as principais causas de superaquecimento em tratores agrícolas?',
    'Qual a diferença técnica entre óleos lubrificantes 15W40 CI-4 e CK-4?'
  ];

  // Helper para consultar dados do Supabase e gerar relatórios
  const processAppQuery = async (queryText: string): Promise<{ text: string; report?: PDFReportData }> => {
    const q = queryText.toLowerCase();

    // 1. Relatório em PDF de Preventivas Vencidas
    if (q.includes('pdf') && (q.includes('preventiv') || q.includes('vencid') || q.includes('revis'))) {
      const [plans, machines, farms] = await Promise.all([
        fleetService.getPreventivePlanStatus(),
        fleetService.getMachines(),
        fleetService.getFarms()
      ]);

      const overdue = plans.filter(p => p.status === 'VENCIDA');
      const upcoming = plans.filter(p => p.status === 'PRÓXIMA');

      const items = overdue.map((plan, idx) => {
        const m = machines.find(mach => mach.id === plan.machine_id);
        const farm = farms.find(f => f.id === plan.farm_id)?.name || 'Central';
        return {
          idx: idx + 1,
          code: m?.code || '-',
          machine: m?.name || 'Máquina',
          farm,
          item: plan.maintenance_item,
          currentHourKm: `${plan.current_hour_km.toLocaleString('pt-BR')} ${plan.current_hour_km > 5000 ? 'km' : 'h'}`,
          remaining: `Vencida há ${Math.abs(plan.hour_km_remaining).toLocaleString('pt-BR')} ${plan.current_hour_km > 5000 ? 'km' : 'h'}`,
          status: 'VENCIDA'
        };
      });

      const reportData: PDFReportData = {
        type: 'preventivas_vencidas',
        title: 'Relatório de Revisões Preventivas Vencidas',
        summary: `Identificadas ${overdue.length} preventivas vencidas e ${upcoming.length} próximas do vencimento na frota da Agropecuária Boa Sorte.`,
        generatedAt: new Date().toLocaleString('pt-BR'),
        kpis: {
          'Preventivas Vencidas': overdue.length,
          'Próximas da Troca': upcoming.length,
          'Total de Itens Monitorados': plans.length
        },
        items
      };

      const responseText = `📄 **Relatório em PDF Gerado com Sucesso!**\n\nIdentifiquei **${overdue.length} preventivas vencidas** que necessitam de intervenção imediata da equipe de manutenção:\n\n${overdue.slice(0, 5).map(p => {
        const m = machines.find(mach => mach.id === p.machine_id);
        return `• **${m?.code || 'MAQ'}** (${m?.name}): *${p.maintenance_item}* - Vencida há ${Math.abs(p.hour_km_remaining)}h`;
      }).join('\n')}${overdue.length > 5 ? `\n• *... e mais ${overdue.length - 5} itens no relatório completo.*` : ''}\n\nClique no botão abaixo para **visualizar e imprimir o relatório oficial em PDF**.`;

      return { text: responseText, report: reportData };
    }

    // 2. Consulta Geral de Preventivas
    if (q.includes('preventiv') || q.includes('revis') || q.includes('troca')) {
      const [plans, machines] = await Promise.all([
        fleetService.getPreventivePlanStatus(),
        fleetService.getMachines()
      ]);

      const overdue = plans.filter(p => p.status === 'VENCIDA');
      const upcoming = plans.filter(p => p.status === 'PRÓXIMA');

      let responseText = `🛠️ **Status Atual do Plano Preventivo:**\n\n`;
      responseText += `• **Vencidas:** ${overdue.length} revisões\n`;
      responseText += `• **Próximas da Troca:** ${upcoming.length} revisões\n`;
      responseText += `• **Total Monitorado:** ${plans.length} itens cadastrados\n\n`;

      if (overdue.length > 0) {
        responseText += `⚠️ **Atenção Imediata nas Seguintes Máquinas:**\n`;
        overdue.slice(0, 5).forEach(plan => {
          const m = machines.find(mach => mach.id === plan.machine_id);
          responseText += `- **${m?.code}** (${m?.name}): *${plan.maintenance_item}* (Horímetro: ${plan.current_hour_km}h | Vencida há ${Math.abs(plan.hour_km_remaining)}h)\n`;
        });
        if (overdue.length > 5) {
          responseText += `*(e mais ${overdue.length - 5} revisões vencidas)*\n`;
        }
      } else {
        responseText += `✅ Todas as manutenções preventivas estão em dia!\n`;
      }

      responseText += `\n*Dica: Você pode me pedir "Gere um relatório em PDF das preventivas vencidas" a qualquer momento.*`;
      return { text: responseText };
    }

    // 3. Ordens de Serviço
    if (q.includes('ordem') || q.includes('ordens') || q.includes(' os ') || q.startsWith('os ') || q.includes('serviço')) {
      const [orders, machines] = await Promise.all([
        fleetService.getWorkOrders(),
        fleetService.getMachines()
      ]);

      const openOrders = orders.filter(o => o.status === 'Aberta' || o.status === 'Em Andamento');
      const highPriority = openOrders.filter(o => o.priority === 'alta');

      let responseText = `📋 **Quadro de Ordens de Serviço (OS):**\n\n`;
      responseText += `• **OS Abertas / Em Andamento:** ${openOrders.length}\n`;
      responseText += `• **Prioridade Alta:** ${highPriority.length}\n`;
      responseText += `• **Total Registrado no Histórico:** ${orders.length} OS\n\n`;

      if (openOrders.length > 0) {
        responseText += `🔧 **Principais Ordens em Aberto:**\n`;
        openOrders.slice(0, 5).forEach(os => {
          const m = machines.find(mach => mach.id === os.machine_id);
          responseText += `- **OS #${os.id.substring(0, 6)}** | **${m?.code || 'Máquina'}**: ${os.reason} (Status: *${os.status}* | Prioridade: *${os.priority?.toUpperCase()}* | Resp: *${os.responsible || 'Oficina'}*)\n`;
        });
      } else {
        responseText += `✅ Nenhuma Ordem de Serviço pendente no momento.\n`;
      }

      return { text: responseText };
    }

    // 4. Estoque de Diesel
    if (q.includes('diesel') || q.includes('estoque') || q.includes('combustivel') && q.includes('saldo')) {
      const [farms, logs, stockEntries] = await Promise.all([
        fleetService.getFarms(),
        fleetService.getFuelLogs(),
        fleetService.getFuelStock()
      ]);

      let responseText = `🛢️ **Posição Atual do Estoque de Diesel:**\n\n`;

      farms.forEach(farm => {
        const received = stockEntries.filter(s => s.farm_id === farm.id).reduce((acc, s) => acc + (Number(s.liters_received) || 0), 0);
        const consumed = logs.filter(l => l.farm_id === farm.id).reduce((acc, l) => acc + (Number(l.liters_supplied) || ((Number(l.pump_reading_end) - Number(l.pump_reading_start)) || 0)), 0);
        const balance = Math.max(0, received - consumed);

        responseText += `• **${farm.name}**: **${balance.toLocaleString('pt-BR')} L** em estoque *(Entradas: ${received.toLocaleString('pt-BR')} L | Consumo: ${consumed.toLocaleString('pt-BR')} L)*\n`;
      });

      return { text: responseText };
    }

    // 5. Abastecimentos e Consumo
    if (q.includes('abastec') || q.includes('bomba') || q.includes('consumo')) {
      const [logs, machines, farms] = await Promise.all([
        fleetService.getFuelLogs(),
        fleetService.getMachines(),
        fleetService.getFarms()
      ]);

      const recentLogs = logs.slice(0, 5);
      const totalLiters = logs.reduce((acc, l) => acc + (Number(l.liters_supplied) || 0), 0);

      let responseText = `⛽ **Resumo de Abastecimentos:**\n\n`;
      responseText += `• **Total de Registros:** ${logs.length} abastecimentos realizados\n`;
      responseText += `• **Volume Total Consumido:** ${totalLiters.toLocaleString('pt-BR')} Litros\n\n`;
      responseText += `🔍 **Últimos Lançamentos Registrados:**\n`;

      recentLogs.forEach(l => {
        const m = machines.find(mach => mach.id === l.machine_id);
        const f = farms.find(farm => farm.id === l.farm_id);
        const liters = l.liters_supplied || ((l.pump_reading_end - l.pump_reading_start) || 0);
        const dateStr = l.date ? new Date(l.date).toLocaleDateString('pt-BR') : '-';
        responseText += `- **${dateStr}** | **${m?.code || 'MAQ'}**: ${liters.toLocaleString('pt-BR')} L (Bomba: ${l.pump_reading_start}L ➔ ${l.pump_reading_end}L | ${f?.name || 'Fazenda'})\n`;
      });

      return { text: responseText };
    }

    // 6. Máquinas e Frota
    if (q.includes('maquina') || q.includes('máquina') || q.includes('frota') || q.includes('trator') || q.includes('colheitadeira') || q.includes('horímetro') || q.includes('horimetro')) {
      const [machines, farms] = await Promise.all([
        fleetService.getMachines(),
        fleetService.getFarms()
      ]);

      // Se pediu PDF da frota
      if (q.includes('pdf')) {
        const items = machines.map((m, idx) => ({
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
          title: 'Relatório Geral da Frota de Máquinas e Equipamentos',
          summary: `Cadastro completo contendo ${machines.length} máquinas ativas e operacionais da Agropecuária Boa Sorte.`,
          generatedAt: new Date().toLocaleString('pt-BR'),
          kpis: {
            'Total de Equipamentos': machines.length,
            'Ativas': machines.filter(m => m.status === 'Ativa').length,
            'Em Manutenção / Paradas': machines.filter(m => m.status !== 'Ativa').length
          },
          items
        };

        return {
          text: `📄 **Relatório em PDF da Frota Gerado!**\n\nCompilei todos os dados de ${machines.length} máquinas com seus horímetros atualizados e fazendas alocadas.\n\nClique no botão abaixo para **visualizar ou imprimir o documento em formato A4**.`,
          report: reportData
        };
      }

      let responseText = `🚜 **Resumo Geral da Frota (${machines.length} equipamentos):**\n\n`;
      const active = machines.filter(m => m.status === 'Ativa');
      const inMaint = machines.filter(m => m.status === 'Em Manutenção' || m.status === 'Parada');

      responseText += `• **Máquinas Ativas:** ${active.length}\n`;
      responseText += `• **Em Manutenção ou Paradas:** ${inMaint.length}\n\n`;
      responseText += `📌 **Principais Equipamentos:**\n`;

      machines.slice(0, 6).forEach(m => {
        const farm = farms.find(f => f.id === m.farm_id)?.name || 'Central';
        responseText += `- **${m.code}** (${m.name} ${m.model}): **${(m.current_hour_km || 0).toLocaleString('pt-BR')} h** - *${farm}* (Status: ${m.status})\n`;
      });

      return { text: responseText };
    }

    // 7. Checklists
    if (q.includes('checklist') || q.includes('inspeç') || q.includes('avaria')) {
      const [checklists, machines] = await Promise.all([
        fleetService.getChecklists(),
        fleetService.getMachines()
      ]);

      const attentionNeeded = checklists.filter(c => c.overall_status === 'Necessita Atenção');

      let responseText = `📝 **Histórico de Checklists Recentes:**\n\n`;
      responseText += `• **Total de Inspeções:** ${checklists.length}\n`;
      responseText += `• **Atenção Necessária:** ${attentionNeeded.length}\n\n`;

      if (attentionNeeded.length > 0) {
        responseText += `⚠️ **Itens com Observações de Atenção:**\n`;
        attentionNeeded.slice(0, 5).forEach(c => {
          const m = machines.find(mach => mach.id === c.machine_id);
          responseText += `- **${m?.code || 'MAQ'}** em ${c.date}: ${c.failed_items_notes || 'Itens pendentes apontados pelo operador'} (Op: ${c.operator_name})\n`;
        });
      } else {
        responseText += `✅ Todas as últimas inspeções de checklist estão em conformidade.\n`;
      }

      return { text: responseText };
    }

    // Resposta padrão no modo aplicativo
    const [machines, plans, orders] = await Promise.all([
      fleetService.getMachines(),
      fleetService.getPreventivePlanStatus(),
      fleetService.getWorkOrders()
    ]);

    const overduePlans = plans.filter(p => p.status === 'VENCIDA').length;
    const openOrders = orders.filter(o => o.status === 'Aberta' || o.status === 'Em Andamento').length;

    return {
      text: `Olá! Estou conectado aos dados da **Agropecuária Boa Sorte**.\n\nNo momento temos:\n• **${machines.length} máquinas** cadastradas na frota\n• **${overduePlans} preventivas vencidas**\n• **${openOrders} Ordens de Serviço** pendentes\n\nComo posso ajudar? Você pode me perguntar sobre peças, horímetros, diesel, preventivas ou pedir a **geração de um relatório em PDF**!`
    };
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      mode,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Tenta chamar o backend da API Gemini primeiro
      let assistantResponse = '';
      let generatedReport: PDFReportData | undefined = undefined;

      try {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg.content,
            mode,
            history: messages.slice(-6).map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })),
            selectedFarmId
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.text) {
            assistantResponse = data.text;
            if (data.pdfReport) {
              generatedReport = data.pdfReport;
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend Gemini não disponível, aplicando processamento seguro:', backendErr);
      }

      // Se o backend não respondeu ou estamos no modo App, roda o processador local conectado ao Supabase
      if (!assistantResponse) {
        if (mode === 'app') {
          const appResult = await processAppQuery(userMsg.content);
          assistantResponse = appResult.text;
          generatedReport = appResult.report;
        } else {
          // Modo Geral - Respostas inteligentes sobre agronomia e agropecuária
          const q = userMsg.content.toLowerCase();
          if (q.includes('npk') || q.includes('adub') || q.includes('soja') || q.includes('milho')) {
            assistantResponse = `🌱 **Recomendações Agronômicas Gerais de Nutrição e Adubação:**\n\n• **Análise de Solo:** A dosagem ideal de NPK depende sempre do teor de argila, fósforo (P-resina ou Mehlich) e potássio trocável da análise de solo recente (0-20 cm e 20-40 cm).\n• **Soja:** Como leguminosa, a soja fixa nitrogênio biologicamente através da inoculação com *Bradyrhizobium*. O foco da adubação de base concentra-se em Fósforo ($P_2O_5$) e Potássio ($K_2O$), tipicamente em formulações como 04-30-16, 02-20-20 ou adubação potássica parcelada a lanço.\n• **Milho:** Exige alta demanda de Nitrogênio em cobertura (estádios V4 a V6), além de zinco e boro na dessecação ou no sulco.\n\n*Deseja orientações específicas sobre alguma cultura ou estágio fenológico?*`;
          } else if (q.includes('oleo') || q.includes('óleo') || q.includes('lubrificante') || q.includes('15w40')) {
            assistantResponse = `🛢️ **Diferença Técnica entre Especificações de Óleo (CI-4 vs CK-4):**\n\n• **API CI-4 (2002):** Desenvolvido para motores diesel pesados com sistema EGR sem filtro de partículas (DPF). É excelente para combustíveis com teores variados de enxofre.\n• **API CK-4 (2016):** Formulação moderna de baixo teor de cinzas sulfatadas, fósforo e enxofre (Low SAPS). Projetado para motores Tier 4 / Euro 5 e Euro 6 equipados com DPF, catalisadores SCR e que utilizam **Diesel S10** obrigatoriamente.\n• **Vantagens do CK-4:** Maior resistência à oxidação térmica e maior proteção contra desgaste de anéis e camisas em regimes severos de colheita e plantio.`;
          } else if (q.includes('comunicado') || q.includes('mensagem') || q.includes('texto') || q.includes('aviso')) {
            assistantResponse = `📄 **Modelo de Comunicado Interno para Operadores de Máquinas:**\n\n---\n**COMUNICADO INTERNO – GESTÃO DE FROTA E OPERAÇÕES**\n\n**Aos Operadores e Mecânicos da Agropecuária Boa Sorte,**\n\nReforçamos a importância vital do preenchimento e conferência diária do **horímetro atual e das leituras de bomba** em todos os abastecimentos e checklists.\n\n1. O horímetro da máquina é o coração do nosso Plano Preventivo de revisões (trocas de óleo e filtros).\n2. Na bomba de combustível, confira sempre a leitura inicial e final no relógio mecânico para garantir a continuidade correta da litragem.\n3. Qualquer anomalia, ruído anormal ou vazamento deve ser imediatamente reportado para abertura de Ordem de Serviço.\n\nContamos com a colaboração e compromisso de todos para mantermos nossa frota sempre produtiva e segura!\n\n*Atenciosamente,*\n*Gerência de Operações e Frota*\n---`;
          } else {
            assistantResponse = `🤖 **Assistente Geral:** Recebi sua pergunta no modo geral.\n\nComo assistente amplo, posso orientar sobre:\n• Boas práticas agrícolas, dessecação e manejo de defensivos\n• Manutenção mecânica preventiva de motores agrícolas pesados\n• Cálculo de consumo de combustível e taxa de aplicação por hectare\n• Redação de avisos, procedimentos operacionais e relatórios executivos\n\nComo posso detalhar mais esse assunto para você?`;
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: assistantResponse,
        mode,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        pdfReport: generatedReport
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro momentâneo ao processar a consulta. Por favor, tente novamente.',
          mode,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
    setMessages([
      {
        id: 'reset',
        role: 'assistant',
        content: 'Conversa reiniciada. Escolha o modo de atendimento acima e envie sua dúvida ou solicitação.',
        mode,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
                  Inteligência Artificial
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assistente operacional conectado ao banco de dados Supabase e assistente de uso geral.
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
                    Preventiva, Máquinas, OS, Diesel, Checklists e Relatórios PDF
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
                    Conhecimento Amplo, Agronomia, Mecânica, Cálculos e Textos
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
                ? 'Modo Ativo: Consulta estrita aos dados da Agropecuária Boa Sorte no Supabase e emissão de PDFs oficiais.'
                : 'Modo Ativo: Assistente de conhecimento aberto, sem cruzar com os dados privados da sua fazenda.'}
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
                  ? 'bg-[#1B3022] text-white rounded-tr-xs shadow-xs'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
              }`}>
                <div className="flex items-center justify-between gap-3 text-[10px] pb-1 border-b border-black/10">
                  <span className="font-bold flex items-center gap-1">
                    {msg.role === 'user' ? 'Você' : 'Agente IA Agro'}
                  </span>
                  <span className="opacity-70 font-mono">{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed font-sans">
                  {msg.content}
                </div>

                {/* CARD DE AÇÃO PARA RELATÓRIO EM PDF SE GERADO */}
                {msg.pdfReport && (
                  <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                      <FileText size={16} className="text-emerald-700" />
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
                <span>{mode === 'app' ? 'Consultando dados do Supabase e analisando...' : 'Pensando e consultando conhecimentos gerais...'}</span>
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
