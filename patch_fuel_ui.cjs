const fs = require('fs');
let code = fs.readFileSync('src/pages/Fuel.tsx', 'utf8');

// 1. Add deleteJustification state
code = code.replace(
  /const \[deleteConfirmId, setDeleteConfirmId\] = useState<string \| null>\(null\);/,
  `const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteJustification, setDeleteJustification] = useState('');`
);

// 2. Update handleDeleteConfirm
const newHandleDeleteConfirm = `
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    if (!deleteJustification.trim()) {
      alert('Por favor, informe uma justificativa para a exclusão.');
      return;
    }
    try {
      await fleetService.deleteFuelLog(deleteConfirmId, deleteJustification);
      setDeleteConfirmId(null);
      setDeleteJustification('');
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir abastecimento: ' + err.message);
    }
  };
`;

code = code.replace(
  /const handleDeleteConfirm = async \(\) => \{[\s\S]*?catch \(err: any\) \{[\s\S]*?\}\n  \};/,
  newHandleDeleteConfirm.trim()
);

// 3. Update Delete Modal
const deleteModalReplacement = `
      {/* DELETE CONFIRMATION MODAL */}
      <Modal isOpen={deleteConfirmId !== null} onClose={() => { setDeleteConfirmId(null); setDeleteJustification(''); }} title="Excluir Lançamento">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertTriangle size={24} />
            <h3 className="text-sm font-bold">Atenção!</h3>
          </div>
          <p className="text-xs text-slate-600 mb-6">
            Tem certeza que deseja excluir este lançamento de abastecimento? 
            Esta ação não pode ser desfeita, mas ficará registrada no histórico.
          </p>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Justificativa da Exclusão <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={deleteJustification}
              onChange={(e) => setDeleteJustification(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-red-500 min-h-[80px]"
              placeholder="Ex: Erro de digitação na leitura da bomba..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => { setDeleteConfirmId(null); setDeleteJustification(''); }}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={!deleteJustification.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>
`;

code = code.replace(
  /\{\/\* DELETE CONFIRMATION MODAL \*\/\}[\s\S]*?<\/Modal>/,
  deleteModalReplacement.trim()
);

// 4. Split logs into active and deleted
code = code.replace(
  /const filteredLogs = fuelLogs\.filter\(\(log\) => \{/,
  `const activeLogs = fuelLogs.filter((log: any) => !log.is_deleted);
  const deletedLogs = fuelLogs.filter((log: any) => log.is_deleted);
  
  const filteredLogs = activeLogs.filter((log) => {`
);

// 5. Inject Deleted History Table
const historyHtml = `
      {/* HISTÓRICO DE ABASTECIMENTOS REMOVIDOS */}
      {deletedLogs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mt-8">
          <div className="p-6 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Histórico de Abastecimentos Removidos / Cancelados
              </h4>
            </div>
            <span className="text-[11px] text-rose-700 font-bold font-mono">
              Removidos: {deletedLogs.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-rose-50/20 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Máquina / Fazenda</th>
                  <th className="py-4 px-6 font-mono text-right">Litros</th>
                  <th className="py-4 px-6 text-rose-800">Justificativa da Remoção</th>
                  <th className="py-4 px-6">Responsável / Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedLogs.map((log: any) => {
                  const machine = machines.find(m => m.id === log.machine_id);
                  const farm = farms.find(f => f.id === log.farm_id);
                  const lts = Number(log.pump_reading_end) - Number(log.pump_reading_start);
                  return (
                    <tr key={log.id} className="bg-slate-50/40 text-slate-500 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono line-through decoration-rose-300">
                        {new Date(log.date).toLocaleDateString('pt-BR')} {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold line-through decoration-rose-300">{machine?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{farm?.name || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-rose-600/70 line-through decoration-rose-300">
                        {lts > 0 ? lts.toLocaleString('pt-BR') : 0} L
                      </td>
                      <td className="py-4 px-6 text-rose-800 font-semibold bg-rose-50/30">
                        {log.deletion_reason || 'N/A'}
                      </td>
                      <td className="py-4 px-6 italic max-w-xs truncate" title={log.notes}>
                        <div className="font-semibold text-slate-600">{log.responsible || '-'}</div>
                        {log.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
`;

code = code.replace(
  /\{\/\* MODAL ADICIONAR \*\/\}/,
  historyHtml + '\n\n      {/* MODAL ADICIONAR */}'
);

fs.writeFileSync('src/pages/Fuel.tsx', code);
