/**
 * Utilitários para tratamento preciso de Data e Hora com fuso local do dispositivo.
 * Evita desvios de fuso horário causados pelo uso direto de .toISOString() em inputs HTML.
 */

/**
 * Retorna a data e hora local do dispositivo no formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 */
export function formatDateTimeForInput(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Retorna a data local do dispositivo no formato aceito por <input type="date"> (YYYY-MM-DD).
 */
export function formatDateForInput(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte a string de um <input type="datetime-local"> (YYYY-MM-DDTHH:mm) para uma string ISO válida,
 * preservando a hora e minuto informados no fuso horário local do dispositivo.
 */
export function parseInputDateTimeToISO(inputStr: string): string {
  if (!inputStr) return new Date().toISOString();
  if (!inputStr.includes('T')) {
    const d = new Date(inputStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  const [datePart, timePart] = inputStr.split('T');
  if (!datePart) return new Date().toISOString();
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date().toISOString();
  }

  const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
  return localDate.toISOString();
}

/**
 * Converte a string de um <input type="date"> (YYYY-MM-DD) para ISO preservando a data local com meio-dia.
 */
export function parseInputDateToISO(inputStr: string): string {
  if (!inputStr) return new Date().toISOString();
  const [year, month, day] = inputStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date().toISOString();
  }
  const localDate = new Date(year, month - 1, day, 12, 0, 0);
  return localDate.toISOString();
}

/**
 * Formata data e hora para exibição amigável no padrão brasileiro (DD/MM/AAAA HH:mm).
 */
export function formatDisplayDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
