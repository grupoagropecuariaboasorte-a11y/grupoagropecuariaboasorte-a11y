const fs = require('fs');
let code = fs.readFileSync('src/lib/fleetService.ts', 'utf8');

// 1. Update getFuelStockHistory
const newGetFuelStockHistory = `
  async getFuelStockHistory(farmId?: string): Promise<FuelStock[]> {
    let query = supabase!.from('fuel_stock').select('*').order('created_at', { ascending: false });
    if (farmId && farmId !== 'ALL') {
      query = query.eq('farm_id', farmId);
    }
    const { data, error } = await query;
    if (error) throw error;
    
    let allData = data || [];
    try {
      if (typeof localStorage !== 'undefined') {
        const deletedStr = localStorage.getItem('deleted_fuel_stock');
        if (deletedStr) {
          const deletedArr = JSON.parse(deletedStr);
          if (farmId && farmId !== 'ALL') {
             allData = allData.concat(deletedArr.filter((d: any) => d.farm_id === farmId));
          } else {
             allData = allData.concat(deletedArr);
          }
        }
      }
    } catch(e) {}
    
    allData.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    return allData;
  },
`;

code = code.replace(
  /async getFuelStockHistory.*?Promise<FuelStock\[\]> \{[\s\S]*?return data \|\| \[\];[\s\S]*?\},/,
  newGetFuelStockHistory.trim()
);

// 2. Update deleteFuelStock
const newDeleteFuelStock = `
  async deleteFuelStock(id: string, justification: string): Promise<void> {
    try {
      // Buscar antes de deletar
      const { data: stock } = await supabase!.from('fuel_stock').select('*').eq('id', id).maybeSingle();
      
      const { error } = await supabase!.from('fuel_stock').delete().eq('id', id);
      if (error) throw error;
      
      if (stock) {
        try {
          if (typeof localStorage !== 'undefined') {
            const deletedStr = localStorage.getItem('deleted_fuel_stock');
            const deletedArr = deletedStr ? JSON.parse(deletedStr) : [];
            deletedArr.push({
              ...stock,
              is_deleted: true,
              deletion_reason: justification,
              updated_at: new Date().toISOString()
            });
            localStorage.setItem('deleted_fuel_stock', JSON.stringify(deletedArr));
          }
        } catch(e) {
          console.warn('Failed to save deleted item to local storage', e);
        }
      }
    } catch (e: any) {
      if (e?.code === '42P01' || e?.message?.includes('relation "') || e?.message?.includes('does not exist')) {
        console.error('Tabela fuel_stock inexistente no Supabase:', e);
      }
      throw e;
    }
  },
`;

code = code.replace(
  /async deleteFuelStock\(id: string, justification: string\): Promise<void> \{[\s\S]*?throw e;\n    \}\n  \},/,
  newDeleteFuelStock.trim()
);

fs.writeFileSync('src/lib/fleetService.ts', code);
