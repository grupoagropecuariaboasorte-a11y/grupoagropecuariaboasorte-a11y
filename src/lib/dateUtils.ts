/**
 * Utilitários para tratamento rigoroso de Data e Hora no Fuso Horário de Cuiabá / Mato Grosso (America/Cuiaba, UTC-4).
 * Garante sincronia exata e sem desvios entre interface, registros e banco de dados.
 */

export const APP_TIMEZONE = 'America/Cuiaba';

/**
 * Obtém os componentes de data e hora de qualquer entrada (Date, string ISO, timestamp)
 * convertidos expressamente para o fuso horário de Cuiabá / MT.
 */
export function getCuiabaDateParts(dateInput?: Date | string | number | null) {
  const d = dateInput ? (typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput) : new Date();
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const findPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = findPart('year');
  const month = findPart('month');
  const day = findPart('day');
  let hours = findPart('hour');
  if (hours === '24') hours = '00';
  const minutes = findPart('minute');
  const seconds = findPart('second');

  return { year, month, day, hours, minutes, seconds };
}

/**
 * Retorna a data e hora atual ou informada no formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
 * garantindo o fuso horário de Cuiabá / MT.
 */
export function formatDateTimeForInput(dateInput?: Date | string | null): string {
  const parts = getCuiabaDateParts(dateInput);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hours}:${parts.minutes}`;
}

/**
 * Retorna a data atual ou informada no formato aceito por <input type="date"> (YYYY-MM-DD)
 * no fuso horário de Cuiabá / MT.
 */
export function formatDateForInput(dateInput?: Date | string | null): string {
  const parts = getCuiabaDateParts(dateInput);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Converte a string de um <input type="datetime-local"> (YYYY-MM-DDTHH:mm) para uma string ISO UTC válida,
 * interpretando a data e horário como pertencentes ao fuso horário de Cuiabá / MT (UTC-4).
 */
export function parseInputDateTimeToISO(inputStr: string): string {
  if (!inputStr) return new Date().toISOString();
  
  if (!inputStr.includes('T')) {
    const d = new Date(inputStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  const [datePart, timePart] = inputStr.split('T');
  if (!datePart) return new Date().toISOString();
  
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const [hourStr, minStr] = (timePart || '00:00').split(':');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hours = Number(hourStr) || 0;
  const minutes = Number(minStr) || 0;

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date().toISOString();
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  // Cuiabá / Mato Grosso opera em UTC-4 permanente (sem horário de verão)
  const isoWithTz = `${pad(year)}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-04:00`;
  const parsedDate = new Date(isoWithTz);

  return isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
}

/**
 * Converte a string de um <input type="date"> (YYYY-MM-DD) para ISO UTC preservando a data no fuso de Cuiabá.
 */
export function parseInputDateToISO(inputStr: string): string {
  if (!inputStr) return new Date().toISOString();
  const [yearStr, monthStr, dayStr] = inputStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date().toISOString();
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoWithTz = `${pad(year)}-${pad(month)}-${pad(day)}T12:00:00-04:00`;
  const parsedDate = new Date(isoWithTz);

  return isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
}

/**
 * Formata data e hora para exibição no padrão brasileiro com fuso horário de Cuiabá / MT (DD/MM/AAAA HH:mm).
 */
export function formatDisplayDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata apenas data para exibição no padrão brasileiro com fuso horário de Cuiabá / MT (DD/MM/AAAA).
 */
export function formatDisplayDate(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata apenas hora para exibição no fuso horário de Cuiabá / MT (HH:mm).
 */
export function formatDisplayTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
}
