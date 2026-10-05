export const money = (paisa: number) =>
  `৳${(paisa / 100).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const meals = (units: number) =>
  (units / 1000).toLocaleString('en-BD', { maximumFractionDigits: 3 });
export const monthLabel = (calendar: string) =>
  new Intl.DateTimeFormat('bn-BD', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(`${calendar}-15T06:00:00Z`));
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('bn-BD', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(`${date}T06:00:00Z`));
export const timestamp = (date: string) =>
  new Intl.DateTimeFormat('bn-BD', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(date));
export const roleLabel = { MEMBER: 'সদস্য', MANAGER: 'ম্যানেজার', POST_MANAGER: 'সাবেক ম্যানেজার' };
export const statusLabel = {
  OPEN: 'চলমান',
  CLOSED_PENDING_SETTLEMENT: 'নিষ্পত্তি বাকি',
  SETTLED: 'নিষ্পত্তি সম্পন্ন',
};
export function decimalUnits(value: string, precision: number): number {
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`).test(value))
    throw new Error(`সর্বোচ্চ ${precision} ঘর দশমিকসহ সঠিক সংখ্যা লিখুন।`);
  const [whole, fraction = ''] = value.split('.');
  const n = Number(whole) * 10 ** precision + Number(fraction.padEnd(precision, '0'));
  if (!Number.isSafeInteger(n) || n > 10000000000)
    throw new Error('সংখ্যাটি অনুমোদিত সীমার বাইরে।');
  return n;
}
