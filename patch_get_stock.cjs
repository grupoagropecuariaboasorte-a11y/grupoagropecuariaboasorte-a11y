const fs = require('fs');
let code = fs.readFileSync('src/lib/fleetService.ts', 'utf8');

const newGetFuelStock = `
  async getFuelStock(farmId?: string): Promise<FuelStock[]> {
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
  /async getFuelStock\(.*?\): Promise<FuelStock\[\]> \{[\s\S]*?return data \|\| \[\];[\s\S]*?\},/,
  newGetFuelStock.trim() + '\n'
);

// We also need to fix deleteFuelStock since the regex in the previous script might have worked?
// Let's check deleteFuelStock.
fs.writeFileSync('src/lib/fleetService.ts', code);
