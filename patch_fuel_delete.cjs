const fs = require('fs');
let code = fs.readFileSync('src/lib/fleetService.ts', 'utf8');

// 1. Update getFuelLogs
const newGetFuelLogs = `
  async getFuelLogs(farmId?: string): Promise<FuelLog[]> {
    let query = supabase!.from('fuel_logs').select('*').order('date', { ascending: false });
    if (farmId && farmId !== 'ALL') {
      query = query.eq('farm_id', farmId);
    }
    const { data, error } = await query;
    if (error) throw error;
    
    let allData = data || [];
    try {
      if (typeof localStorage !== 'undefined') {
        const deletedStr = localStorage.getItem('deleted_fuel_logs');
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
    
    allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allData;
  },
`;

code = code.replace(
  /async getFuelLogs\(.*?\): Promise<FuelLog\[\]> \{[\s\S]*?return data \|\| \[\];[\s\S]*?\},/,
  newGetFuelLogs.trim() + '\n'
);

// 2. Update deleteFuelLog
const newDeleteFuelLog = `
  async deleteFuelLog(id: string, justification: string): Promise<void> {
    try {
      const { data: logToDel } = await supabase!.from('fuel_logs').select('*').eq('id', id).maybeSingle();
      
      const { error } = await supabase!.from('fuel_logs').delete().eq('id', id);
      if (error) throw error;
      
      if (logToDel) {
        try {
          if (typeof localStorage !== 'undefined') {
            const deletedStr = localStorage.getItem('deleted_fuel_logs');
            const deletedArr = deletedStr ? JSON.parse(deletedStr) : [];
            deletedArr.push({
              ...logToDel,
              is_deleted: true,
              deletion_reason: justification,
              updated_at: new Date().toISOString()
            });
            localStorage.setItem('deleted_fuel_logs', JSON.stringify(deletedArr));
          }
        } catch(e) {}
      }
    } catch (e: any) {
      console.error('Erro ao excluir fuel_log:', e);
      throw e;
    }
  },
`;

code = code.replace(
  /async deleteFuelLog\(id: string\): Promise<void> \{[\s\S]*?if \(error\) throw error;\n  \},/,
  newDeleteFuelLog.trim() + '\n'
);

// Fix updateFuelLog to ensure it updates or throws
const newUpdateFuelLog = `
  async updateFuelLog(id: string, log: Partial<FuelLog>): Promise<FuelLog> {
    const farmId = log.farm_id || '11111111-1111-1111-1111-111111111111';
    const price = await this.getLatestDieselPrice(farmId);

    const updatedFields: any = {};
    if (log.farm_id !== undefined) updatedFields.farm_id = log.farm_id;
    if (log.machine_id !== undefined) updatedFields.machine_id = log.machine_id;
    if (log.date !== undefined) updatedFields.date = log.date;
    if (log.fuel_type !== undefined) updatedFields.fuel_type = log.fuel_type;
    if (log.pump_reading_start !== undefined) updatedFields.pump_reading_start = Number(log.pump_reading_start);
    if (log.pump_reading_end !== undefined) updatedFields.pump_reading_end = Number(log.pump_reading_end);
    if (log.hour_km_at_fueling !== undefined) updatedFields.hour_km_at_fueling = Number(log.hour_km_at_fueling);
    if (log.hours_km_since_last !== undefined) updatedFields.hours_km_since_last = Number(log.hours_km_since_last);
    if (log.consumption_rate !== undefined) updatedFields.consumption_rate = Number(log.consumption_rate);
    updatedFields.price_per_liter = price;
    if (log.supplier !== undefined) updatedFields.supplier = log.supplier;
    if (log.responsible !== undefined) updatedFields.responsible = log.responsible;
    if (log.notes !== undefined) updatedFields.notes = log.notes;

    // Direct update to prevent safeUpdate from stripping user edits silently
    const { data, error } = await supabase!.from('fuel_logs').update(updatedFields).eq('id', id).select().maybeSingle();
    
    if (error) {
      console.error('Update error on fuel_logs:', error);
      // Fallback for missing columns if we really need to, but let's throw to show the user what's wrong!
      throw error;
    }
    
    if (!data) {
       throw new Error('Nenhum dado retornado. Verifique se o registro existe ou se há bloqueio de permissão.');
    }
    
    return data;
  },
`;

code = code.replace(
  /async updateFuelLog\(id: string, log: Partial<FuelLog>\): Promise<FuelLog> \{[\s\S]*?return data;\n  \},/,
  newUpdateFuelLog.trim() + '\n'
);


fs.writeFileSync('src/lib/fleetService.ts', code);
