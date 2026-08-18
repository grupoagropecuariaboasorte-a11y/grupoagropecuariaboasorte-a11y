/**
 * Utilitários para tratamento rigoroso de Data e Hora no Fuso Horário de Cuiabá / Mato Grosso (America/Cuiaba, UTC-4).
 * Garante sincronia exata e sem desvios entre o relógio do operador, interface e banco de dados.
 */

export const APP_TIMEZONE = 'America/Cuiaba';

/**
 * Retorna a data e hora EXATA do relógio do aparelho (celular/computador) do operador
 * no formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 */
export function getDeviceLocalDateTimeString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Retorna a data EXATA do relógio do aparelho no formato aceito por <input type="date"> (YYYY-MM-DD).
 */
export function getDeviceLocalDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Formata qualquer entrada de data (Date, string ISO ou string local) para <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 */
export function formatDateTimeForInput(dateInput?: Date | string | null): string {
  if (!dateInput) {
    return getDeviceLocalDateTimeString();
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Se a string já é um formato limpo local YYYY-MM-DDTHH:mm...
    if (trimmed.length >= 16 && trimmed.includes('T') && !trimmed.endsWith('Z') && !trimmed.includes('+') && !trimmed.slice(11).includes('-')) {
      return trimmed.substring(0, 16);
    }
    if (trimmed.length >= 16 && trimmed.includes(' ') && !trimmed.endsWith('Z')) {
      return trimmed.substring(0, 16).replace(' ', 'T');
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return getDeviceLocalDateTimeString();

  // Converte data UTC para o fuso horário de Cuiabá / MT
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

/**
 * Retorna a data no formato aceito por <input type="date"> (YYYY-MM-DD).
 */
export function formatDateForInput(dateInput?: Date | string | null): string {
  if (!dateInput) {
    return getDeviceLocalDateString();
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.length >= 10 && !trimmed.endsWith('Z')) {
      return trimmed.substring(0, 10);
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return getDeviceLocalDateString();

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const findPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${findPart('year')}-${findPart('month')}-${findPart('day')}`;
  } catch (e) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

/**
 * Converte a string de um <input type="datetime-local"> (YYYY-MM-DDTHH:mm) para salvar no banco.
 * Preserva exatamente a data e hora informada pelo usuário em Cuiabá sem deslocamentos indevidos.
 */
export function parseInputDateTimeToISO(inputStr: string): string {
  if (!inputStr) {
    return getDeviceLocalDateTimeString() + ':00';
  }

  if (inputStr.includes('T')) {
    const [datePart, timePart] = inputStr.split('T');
    if (datePart) {
      const [year, month, day] = datePart.split('-');
      const [hours, minutes] = (timePart || '00:00').split(':');
      const pad = (n: string | number) => String(n || '00').padStart(2, '0');
      return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
    }
  }

  return inputStr;
}

/**
 * Converte a string de um <input type="date"> (YYYY-MM-DD) para salvar no banco.
 */
export function parseInputDateToISO(inputStr: string): string {
  if (!inputStr) {
    return getDeviceLocalDateString();
  }
  return inputStr.split('T')[0];
}

/**
 * Formata data e hora para exibição amigável (DD/MM/AAAA HH:mm) respeitando o fuso de Cuiabá.
 */
export function formatDisplayDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';

  const trimmed = isoStr.trim();
  // Se for string ISO local sem timezone (ex: "2026-08-18T10:00:00" ou "2026-08-18 10:00")
  if ((trimmed.includes('T') || trimmed.includes(' ')) && !trimmed.endsWith('Z') && !trimmed.includes('+') && !trimmed.slice(11).includes('-')) {
    const separator = trimmed.includes('T') ? 'T' : ' ';
    const [datePart, timePart] = trimmed.split(separator);
    if (datePart && timePart) {
      const [year, month, day] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');
      if (year && month && day && hours && minutes) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    }
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;

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
 * Formata apenas a data para exibição (DD/MM/AAAA) respeitando o fuso de Cuiabá.
 */
export function formatDisplayDate(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';

  const trimmed = isoStr.trim();
  if (trimmed.length >= 10 && !trimmed.endsWith('Z') && !trimmed.includes('T')) {
    const [year, month, day] = trimmed.substring(0, 10).split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  if (trimmed.includes('T') && !trimmed.endsWith('Z')) {
    const datePart = trimmed.split('T')[0];
    const [year, month, day] = datePart.split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;

  return d.toLocaleDateString('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata apenas a hora para exibição (HH:mm).
 */
export function formatDisplayTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const trimmed = isoStr.trim();
  if (trimmed.includes('T') && !trimmed.endsWith('Z')) {
    const timePart = trimmed.split('T')[1];
    if (timePart) {
      const [h, m] = timePart.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
}
