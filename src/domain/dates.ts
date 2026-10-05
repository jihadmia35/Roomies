export function daysInMonth(calendar: string): number {
  const [y, m] = calendar.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function monthDates(calendar: string): string[] {
  return Array.from(
    { length: daysInMonth(calendar) },
    (_, i) => `${calendar}-${String(i + 1).padStart(2, '0')}`,
  );
}
export function nextCalendar(calendar: string): string {
  const [y, m] = calendar.split('-').map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
}
export function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
