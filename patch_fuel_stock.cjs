const fs = require('fs');
let code = fs.readFileSync('src/lib/fleetService.ts', 'utf8');

// Update deleteFuelStock
const newDeleteFuelStock = `
  async deleteFuelStock(id: string, justification: string): Promise<void> {
    try {
      const { data: stockToDel } = await supabase!.from('fuel_stock').select('*').eq('id', id).maybeSingle();
      
      const { data: deletedStock, error } = await supabase!.from('fuel_stock').delete().eq('id', id).select();
      if (error) throw error;
      
      if (!deletedStock || deletedStock.length === 0) {
        throw new Error('Nenhum registro foi excluído. Verifique se o registro existe ou se você tem permissão.');
      }
      
      if (stockToDel) {
        try {
          if (typeof localStorage !== 'undefined') {
            const deletedStr = localStorage.getItem('deleted_fuel_stock');
            const deletedArr = deletedStr ? JSON.parse(deletedStr) : [];
            deletedArr.push({
              ...stockToDel,
              is_deleted: true,
              deletion_reason: justification,
              updated_at: new Date().toISOString()
            });
            localStorage.setItem('deleted_fuel_stock', JSON.stringify(deletedArr));
          }
        } catch(e) {}
      }
    } catch (e: any) {
      console.error('Erro ao excluir fuel_stock:', e);
      throw e;
    }
  }
`;

code = code.replace(
  /async deleteFuelStock\(id: string, justification: string\): Promise<void> \{[\s\S]*?console\.error\('Erro ao excluir fuel_stock:', e\);\n      throw e;\n    \}\n  \}/,
  newDeleteFuelStock.trim()
);

// Update updateFuelStock
const newUpdateFuelStock = `
  async updateFuelStock(id: string, stock: Partial<FuelStock>): Promise<FuelStock> {
    const cleanStock: any = {};
    if (stock.farm_id !== undefined) cleanStock.farm_id = stock.farm_id;
    if (stock.entry_date !== undefined) cleanStock.entry_date = stock.entry_date;
    if (stock.liters_received !== undefined) cleanStock.liters_received = Number(stock.liters_received);
    if (stock.price_per_liter !== undefined) cleanStock.price_per_liter = Number(stock.price_per_liter);
    if (stock.supplier !== undefined) cleanStock.supplier = stock.supplier;
    if (stock.minimum_stock_alert !== undefined) cleanStock.minimum_stock_alert = Number(stock.minimum_stock_alert);

    let finalNotes = stock.notes !== undefined ? stock.notes : '';
    if (stock.edit_justification) {
      finalNotes = finalNotes
        ? \`\${finalNotes}\n[Justificativa da alteração: \${stock.edit_justification}]\`
        : \`[Justificativa da alteração: \${stock.edit_justification}]\`;
    }
    if (finalNotes) {
      cleanStock.notes = finalNotes;
    } else if (stock.notes !== undefined) {
      cleanStock.notes = stock.notes;
    }

    try {
      const { data, error } = await supabase!.from('fuel_stock').update(cleanStock).eq('id', id).select().maybeSingle();
      
      if (error) {
        if (error.message?.includes('price_per_liter')) {
          delete cleanStock.price_per_liter;
          const res = await supabase!.from('fuel_stock').update(cleanStock).eq('id', id).select().maybeSingle();
          if (res.error) throw res.error;
          if (!res.data) throw new Error('Nenhum dado retornado. Verifique permissões.');
          return res.data;
        }
        throw error;
      }
      if (!data) {
        throw new Error('Nenhum dado retornado. Verifique se o registro existe ou se há bloqueio de permissão.');
      }
      return data;
    } catch (e: any) {
      console.error('Update erro fuel_stock:', e);
      throw e;
    }
  }
`;

code = code.replace(
  /async updateFuelStock\(id: string, stock: Partial<FuelStock>\): Promise<FuelStock> \{[\s\S]*?throw e;\n    \}\n  \}/,
  newUpdateFuelStock.trim()
);

fs.writeFileSync('src/lib/fleetService.ts', code);
