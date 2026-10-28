/**
 * Calcula de manera robusta el inicio y fin de una fecha en UTC
 * respetando la zona horaria del restaurante (por defecto 'America/Guayaquil', UTC-5).
 */
export function getLocalDayRange(
  timeZone: string = 'America/Guayaquil',
  specificDateStr?: string | null,
): {
  dateStr: string;
  startIso: string;
  endIso: string;
} {
  const safeTimeZone = timeZone || 'America/Guayaquil';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dateStr =
    specificDateStr && /^\d{4}-\d{2}-\d{2}$/.test(specificDateStr)
      ? specificDateStr
      : formatter.format(new Date());

  const [y, m, d] = dateStr.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(utcNoon);

  const tzHour = Number(tzParts.find((p) => p.type === 'hour')?.value ?? 12);
  const tzMinute = Number(tzParts.find((p) => p.type === 'minute')?.value ?? 0);

  let offsetMinutes = tzHour * 60 + tzMinute - 720;
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;

  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMinutes * 60000;
  const endUtcMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMinutes * 60000;

  return {
    dateStr,
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
}

export type PeriodType = 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo';

export function getPeriodDateRange(
  period: PeriodType = 'hoy',
  timeZone: string = 'America/Guayaquil',
): {
  period: PeriodType;
  label: string;
  startIso?: string;
  endIso?: string;
} {
  const safeTimeZone = timeZone || 'America/Guayaquil';
  const todayRange = getLocalDayRange(safeTimeZone);

  if (period === 'todo') {
    return {
      period: 'todo',
      label: 'Histórico Completo',
    };
  }

  if (period === 'ayer') {
    const [y, m, d] = todayRange.dateStr.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const yesterdayStr = formatter.format(prevDate);
    const yesterdayRange = getLocalDayRange(safeTimeZone, yesterdayStr);
    return {
      period: 'ayer',
      label: 'Ventas de Ayer',
      startIso: yesterdayRange.startIso,
      endIso: yesterdayRange.endIso,
    };
  }

  if (period === 'semana') {
    const [y, m, d] = todayRange.dateStr.split('-').map(Number);
    const weekAgoDate = new Date(Date.UTC(y, m - 1, d - 6, 12, 0, 0));
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const weekAgoStr = formatter.format(weekAgoDate);
    const weekAgoRange = getLocalDayRange(safeTimeZone, weekAgoStr);
    return {
      period: 'semana',
      label: 'Últimos 7 Días',
      startIso: weekAgoRange.startIso,
      endIso: todayRange.endIso,
    };
  }

  if (period === 'mes') {
    const [y, m] = todayRange.dateStr.split('-').map(Number);
    const firstDayMonthStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const monthRange = getLocalDayRange(safeTimeZone, firstDayMonthStr);
    return {
      period: 'mes',
      label: 'Este Mes',
      startIso: monthRange.startIso,
      endIso: todayRange.endIso,
    };
  }

  return {
    period: 'hoy',
    label: 'Ventas de Hoy',
    startIso: todayRange.startIso,
    endIso: todayRange.endIso,
  };
}
