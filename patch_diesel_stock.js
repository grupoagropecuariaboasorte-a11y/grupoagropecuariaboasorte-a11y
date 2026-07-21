const fs = require('fs');
let code = fs.readFileSync('src/pages/DieselStock.tsx', 'utf8');

// Restore the activeHistory line
code = code.replace(
  /const activeHistory = filteredHistory;/g,
  `const activeHistory = filteredHistory.filter(h => !h.is_deleted);
  const deletedHistory = filteredHistory.filter(h => h.is_deleted);`
);

code = code.replace(
  /const farmActiveStocks = stockHistory.filter\(s => s.farm_id === item.farm_id\);/g,
  `const farmActiveStocks = stockHistory.filter(s => s.farm_id === item.farm_id && !s.is_deleted);`
);

// We'll inject the HTML for the deleted history before the Add Modal
const historyHtml = `
      {/* HISTÓRICO DE LANÇAMENTOS REMOVIDOS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Histórico de Lançamentos Removidos / Cancelados (Sem impacto no saldo)
            </h4>
          </div>
          <span className="text-[11px] text-rose-700 font-bold font-mono">
            Removidos: {deletedHistory.length}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {deletedHistory.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-rose-50/20 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data Original</th>
                  <th className="py-4 px-6">Fazenda</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 font-mono text-right">Lts Recebidos</th>
                  <th className="py-4 px-6 font-mono text-right">Preço/L</th>
                  <th className="py-4 px-6">Fornecedor</th>
                  <th className="py-4 px-6 text-rose-800">Justificativa da Remoção</th>
                  <th className="py-4 px-6">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedHistory.map((h) => {
                  const farmName = farms.find(f => f.id === h.farm_id)?.name || 'N/A';
                  return (
                    <tr key={h.id} className="bg-slate-50/40 text-slate-500 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono line-through decoration-rose-300">
                        {new Date(h.entry_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 font-bold line-through decoration-rose-300">{farmName}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wide">
                          Removido
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-rose-600/70 line-through decoration-rose-300">
                        {(h.liters_received ?? 0).toLocaleString('pt-BR')} L
                      </td>
                      <td className="py-4 px-6 text-right font-mono line-through decoration-rose-300">
                        R$ {Number(h.price_per_liter || 5.85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 line-through decoration-rose-300">{h.supplier || 'Não informado'}</td>
                      <td className="py-4 px-6 text-rose-800 font-semibold bg-rose-50/30 select-all">
                        {h.deletion_reason || 'Nenhuma justificativa informada'}
                      </td>
                      <td className="py-4 px-6 italic max-w-xs truncate" title={h.notes}>{h.notes || 'Nenhuma nota registrada'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-28 flex flex-col items-center justify-center text-slate-400">
              <CheckCircle size={24} className="mb-1 text-slate-300" />
              <p className="text-[11px]">Nenhum lançamento removido até o momento.</p>
            </div>
          )}
        </div>
      </div>
`;

code = code.replace(
  /{[\s\S]*?\/\* MODAL ADICIONAR ENTRADA \*\//,
  historyHtml + '\n\n      {/* MODAL ADICIONAR ENTRADA */'
);

fs.writeFileSync('src/pages/DieselStock.tsx', code);
