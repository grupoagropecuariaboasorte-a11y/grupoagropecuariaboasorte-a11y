import { fleetService } from './src/lib/fleetService.js';
import { supabase } from './src/lib/supabaseClient.js';

async function run() {
  const { data: farms } = await supabase.from('farms').select('*');
  let farmId = farms && farms.length > 0 ? farms[0].id : 'b6f4c3a2-1e9a-4c8d-b3f4-d5e6c7b8a9f0';
  
  const stock = await fleetService.addFuelStock({
    farm_id: farmId,
    liters_received: 1000,
    price_per_liter: 5.50,
    notes: 'Teste inicial'
  });
  console.log('Added:', stock);
  
  const updated = await fleetService.updateFuelStock(stock.id, {
    price_per_liter: 6.20,
    notes: 'Teste inicial',
    edit_justification: 'Preço incorreto'
  });
  console.log('Updated:', updated);
  
  const stocks = await fleetService.getFuelStock();
  console.log('Fetched:', stocks.find(s => s.id === stock.id));
}
run();
