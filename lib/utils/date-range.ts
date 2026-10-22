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
