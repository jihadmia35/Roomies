import { Mess, Month, Rules, Person } from '@/domain/models';
import { monthDates } from '@/domain/dates';
import { calculate } from '@/domain/accounting';
export const DEMO_DATE = '2026-09-30';
function people(prefix: string, names: string[]): Person[] {
  const colors = ['mint', 'blue', 'purple', 'amber', 'rose', 'sky', 'slate'];
  return names.map((name, i) => ({
    id: `${prefix}${i + 1}`,
    name,
    initials: name
      .split(' ')
      .map((n) => n[0])
      .join(''),
    color: colors[i % colors.length],
  }));
}
export function seed() {
  const mess: Mess = {
    id: 'a',
    name: 'সুবর্ণ মেস',
    address: 'ধানমন্ডি, ঢাকা',
    people: people('a', [
      'আরিফ হাসান',
      'তানভীর আহমেদ',
      'রাফি ইসলাম',
      'সাকিব রহমান',
      'নাফিস ইকবাল',
      'মেহেদী হাসান',
      'ইমরান হোসেন',
    ]),
  };
  const months: Month[] = [];
  for (const calendar of ['2026-07', '2026-08', '2026-09']) {
    const rules: Rules = {
      slots: [
        { id: 'lunch', label: 'দুপুর' },
        { id: 'dinner', label: 'রাত' },
      ],
      minimumEnabled: true,
      minimumPercent: 70,
      cookTracking: true,
      homeTracking: true,
    };
    const managers: [string, string] =
      calendar === '2026-09'
        ? [mess.people[0].id, mess.people[1].id]
        : [mess.people[2].id, mess.people[3].id];
    const month: Month = {
      id: `${mess.id}-${calendar}`,
      messId: mess.id,
      calendar,
      status: 'OPEN',
      managers,
      rules,
      participants: mess.people
        .slice(0, 6)
        .map((p, i) => ({ memberId: p.id, joinedOn: `${calendar}-${i === 5 ? '16' : '01'}` })),
      meals: [],
      cooks: [],
      deposits: [],
      expenses: [],
      settlements: [],
      audit: [],
      revision: 1,
      usedKeys: [],
    };
    const at = `${calendar}-30T12:00:00.000Z`;
    const meta = { recordedBy: managers[0], createdAt: at, updatedAt: at };
    for (const date of monthDates(calendar))
      for (const [s, slot] of rules.slots.entries()) {
        const day = Number(date.slice(-2));
        const cook = !((day === 7 || day === 14) && s <= 1);
        month.cooks.push({
          date,
          slotId: slot.id,
          available: calendar === '2026-09' && day === 30 && s === 1 ? null : cook,
        });
        for (const [i, p] of month.participants.entries()) {
          const isHome =
            (i === 2 && day >= 5 && day <= 9) ||
            (i === 4 && day >= 13 && day <= 17) ||
            (i === 5 && day >= 20 && day <= 21);
          const qty =
            isHome || !cook || (i === 5 && day < 16)
              ? 0
              : (day + i + s) % 7 === 0
                ? 1500
                : (day + i + s) % 5 === 0
                  ? 300
                  : i === 4
                    ? 500
                    : 1000;
          month.meals.push({
            ...meta,
            memberId: p.memberId,
            date,
            slotId: slot.id,
            quantity: qty,
            isHome,
            recorded: !(calendar === '2026-09' && day === 30 && s === 0 && i === 2),
          });
        }
      }
    month.deposits = month.participants.flatMap((p, i) =>
      [0, 1].map((j) => ({
        ...meta,
        id: `${month.id}-d${i}-${j}`,
        memberId: p.memberId,
        amount: [210000, 165000, 80000, 105000, 190000, 90000][i] + (j ? 20000 : 0),
        date: `${calendar}-${j ? '18' : '03'}`,
        method: j ? 'বিকাশ' : 'নগদ',
        reference: j ? `MK${i}821` : '',
        note: j ? 'দ্বিতীয় কিস্তি' : 'মাসের প্রাথমিক জমা',
      })),
    );
    const market = [320000, 245000, 385000, 296500];
    month.expenses = [
      ...market.map((amount, i) => ({
        ...meta,
        id: `${month.id}-e${i}`,
        kind: 'MARKET' as const,
        amount,
        date: `${calendar}-${String(2 + i * 7).padStart(2, '0')}`,
        category: ['চাল ও ডাল', 'মাছ ও মাংস', 'সাপ্তাহিক বাজার', 'সবজি ও মসলা'][i],
        description: [
          'মাসের চাল, ডাল ও তেল',
          'মাছ, মুরগি ও ডিম',
          'দুই সপ্তাহের বাজার',
          'সবজি, লবণ ও মসলা',
        ][i],
        vendor: 'ধানমন্ডি কাঁচাবাজার',
      })),
      ...[
        { category: 'বাবুর্চির বেতন', amount: 240000 },
        { category: 'গ্যাস', amount: 120000 },
        { category: 'ইন্টারনেট', amount: 60000 },
        { category: 'পরিচ্ছন্নতা', amount: 30000 },
      ].map((e, i) => ({
        ...meta,
        ...e,
        id: `${month.id}-x${i}`,
        kind: 'EXTRA' as const,
        date: `${calendar}-25`,
        description: e.category,
        vendor: '',
      })),
    ];
    month.audit = [
      {
        id: `${month.id}-audit`,
        actor: managers[0],
        at,
        action: 'ডেমো হিসাব প্রস্তুত',
        detail: 'মিল, জমা ও খরচের প্রাথমিক রেকর্ড তৈরি হয়েছে।',
      },
    ];
    if (calendar !== '2026-09') {
      const calculated = calculate(month);
      month.snapshot = {
        ...calculated,
        rules: structuredClone(rules),
        participants: structuredClone(month.participants),
        closedAt: at,
        closedBy: managers[0],
      };
      month.status = 'CLOSED_PENDING_SETTLEMENT';
      for (const [i, s] of calculated.statements.entries()) {
        const original = Math.abs(s.balance);
        const amount = calendar === '2026-07' ? original : i === 0 ? Math.floor(original / 2) : 0;
        if (amount)
          month.settlements.push({
            ...meta,
            id: `${month.id}-s${i}`,
            memberId: s.memberId,
            amount,
            direction: s.balance < 0 ? 'PAYMENT' : 'REFUND',
            date: `${calendar}-31`.replace('08-31', '08-31'),
            method: 'বিকাশ',
            note: calendar === '2026-07' ? 'চূড়ান্ত নিষ্পত্তি' : 'প্রথম আংশিক নিষ্পত্তি',
          });
      }
      if (calendar === '2026-07') month.status = 'SETTLED';
    }
    months.push(month);
  }
  return { mess, months };
}
