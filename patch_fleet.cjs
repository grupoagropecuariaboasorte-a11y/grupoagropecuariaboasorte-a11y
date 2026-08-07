const fs = require('fs');
let code = fs.readFileSync('src/lib/fleetService.ts', 'utf8');

const helpers = `
function packNotes(notes: string | undefined, price: number | undefined, edit: string | undefined) {
  let cleanNotes = (notes || '').replace(/\\n?\\[META:[^\\]]+\\]/g, '').replace(/\\n?\\[Justificativa da alteração:[^\\]]+\\]/g, '').trim();
  if (price !== undefined) cleanNotes += \`\\n[META:price=\${price}]\`;
  if (edit) cleanNotes += \`\\n[META:edit=\${edit}]\`;
  return cleanNotes.trim();
}

function unpackFuelStock(stock: any) {
  if (!stock) return stock;
  let notes = stock.notes || '';
  
  const priceMatch = notes.match(/\\[META:price=([^\\]]+)\\]/);
  if (priceMatch) stock.price_per_liter = Number(priceMatch[1]);
  
  const editMatch = notes.match(/\\[META:edit=([^\\]]+)\\]/);
  if (editMatch) {
    stock.edit_justification = editMatch[1];
  } else {
    const oldEditMatch = notes.match(/\\[Justificativa da alteração:\\s*(.*?)\\]/);
    if (oldEditMatch) stock.edit_justification = oldEditMatch[1];
  }

  stock.notes = notes.replace(/\\n?\\[META:[^\\]]+\\]/g, '').replace(/\\n?\\[Justificativa da alteração:[^\\]]+\\]/g, '').trim();
  return stock;
}
`;

// Insert helpers before class
code = code.replace(
  /export const fleetService = \{/,
  helpers + '\nexport const fleetService = {'
);

// getFuelStock
code = code.replace(
  /let allData = data \|\| \[\];/,
  `let allData = (data || []).map(unpackFuelStock);`
);

// addFuelStock
const addFuelStockReplacement = `
  async addFuelStock(stock: Partial<FuelStock>): Promise<FuelStock> {
    const cleanStock: any = {
      farm_id: stock.farm_id,
      entry_date: stock.entry_date || new Date().toISOString().split('T')[0],
      liters_received: Number(stock.liters_received) || 0,
      supplier: stock.supplier || '',
      minimum_stock_alert: Number(stock.minimum_stock_alert) || 1000,
    };
    
    cleanStock.notes = packNotes(stock.notes, stock.price_per_liter, undefined);

    try {
      const { data, error } = await safeInsert('fuel_stock', cleanStock);
      if (error) throw error;
      return unpackFuelStock(data);
    } catch (e) {
      console.error('Erro addFuelStock:', e);
      throw e;
    }
  }
`;

code = code.replace(
  /async addFuelStock\(stock: Partial<FuelStock>\): Promise<FuelStock> \{[\s\S]*?throw e;\n    \}\n  \}/,
  addFuelStockReplacement.trim()
);

// updateFuelStock
const updateFuelStockReplacement = `
  async updateFuelStock(id: string, stock: Partial<FuelStock>): Promise<FuelStock> {
    const cleanStock: any = {};
    if (stock.farm_id !== undefined) cleanStock.farm_id = stock.farm_id;
    if (stock.entry_date !== undefined) cleanStock.entry_date = stock.entry_date;
    if (stock.liters_received !== undefined) cleanStock.liters_received = Number(stock.liters_received);
    if (stock.supplier !== undefined) cleanStock.supplier = stock.supplier;
    if (stock.minimum_stock_alert !== undefined) cleanStock.minimum_stock_alert = Number(stock.minimum_stock_alert);

    cleanStock.notes = packNotes(stock.notes, stock.price_per_liter, stock.edit_justification);

    try {
      const { data, error } = await supabase!.from('fuel_stock').update(cleanStock).eq('id', id).select().maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Nenhum dado retornado. Verifique se o registro existe ou se há bloqueio de permissão.');
      return unpackFuelStock(data);
    } catch (e: any) {
      console.error('Update erro fuel_stock:', e);
      throw e;
    }
  }
`;

code = code.replace(
  /async updateFuelStock\(id: string, stock: Partial<FuelStock>\): Promise<FuelStock> \{[\s\S]*?throw e;\n    \}\n  \}/,
  updateFuelStockReplacement.trim()
);

fs.writeFileSync('src/lib/fleetService.ts', code);
