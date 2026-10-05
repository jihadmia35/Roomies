import { describe, it, expect } from 'vitest';
import { allocate, calculate } from '@/domain/accounting';
import { daysInMonth, monthDates, nextCalendar } from '@/domain/dates';
import { Month } from '@/domain/models';
import { decimalUnits } from '@/lib/format';
function fixture(): Month {
  const m: Month = {
    id: 'test',
    messId: 'a',
    calendar: '2026-09',
    status: 'OPEN',
    managers: ['p', 'q'],
    participants: [{ memberId: 'p', joinedOn: '2026-09-16' }],
    rules: {
      slots: [
        { id: 'l', label: 'দুপুর' },
        { id: 'd', label: 'রাত' },
      ],
      minimumEnabled: true,
      minimumPercent: 70,
      cookTracking: true,
      homeTracking: true,
    },
    meals: [],
    cooks: [],
    deposits: [],
    expenses: [],
    settlements: [],
    audit: [],
    revision: 1,
    usedKeys: [],
  };
  for (const date of monthDates(m.calendar))
    for (const s of m.rules.slots) {
      m.cooks.push({ date, slotId: s.id, available: true });
      m.meals.push({
        memberId: 'p',
        date,
        slotId: s.id,
        quantity: 0,
        isHome: false,
        recorded: true,
        recordedBy: 'p',
        createdAt: date,
        updatedAt: date,
      });
    }
  return m;
}
describe('fixed precision and month rules', () => {
  it('preserves fractional actual meals exactly', () => {
    const m = fixture();
    [300, 300, 300, 1500, 500].forEach((q, i) => (m.meals[i].quantity = q));
    expect(calculate(m).statements[0].actual).toBe(2900);
  });
  it('floors only the minimum and retains decimal actual', () => {
    const m = fixture();
    m.cooks[0].available = false;
    m.meals[1].quantity = 1530;
    const s = calculate(m).statements[0];
    expect(s.minimum).toBe(41000);
    expect(s.actual).toBe(1530);
  });
  it('uses full month for midmonth participants', () => {
    const m = fixture();
    expect(calculate(m).statements[0].minimum).toBe(42000);
    m.participants[0].joinedOn = '2026-09-30';
    expect(calculate(m).statements[0].minimum).toBe(42000);
  });
  it('counts five home days as ten slots', () => {
    const m = fixture();
    m.meals.slice(0, 10).forEach((x) => (x.isHome = true));
    const s = calculate(m).statements[0];
    expect(s.homeSlots).toBe(10);
    expect(s.eligibleSlots).toBe(50);
    expect(s.minimum).toBe(35000);
  });
  it('excludes cook missed slots', () => {
    const m = fixture();
    m.cooks.slice(0, 4).forEach((x) => (x.available = false));
    expect(calculate(m).statements[0].eligibleSlots).toBe(56);
  });
  it('subtracts overlapping cook/home exclusions only once (spec example)', () => {
    const m = fixture();
    m.cooks.slice(0, 4).forEach((c) => (c.available = false));
    m.meals.slice(2, 12).forEach((x) => (x.isHome = true));
    const s = calculate(m).statements[0];
    expect(s.eligibleSlots).toBe(48);
    expect(s.minimum).toBe(33000);
  });
  it('uses zero minimum when disabled', () => {
    const m = fixture();
    m.rules.minimumEnabled = false;
    m.meals[0].quantity = 300;
    const s = calculate(m).statements[0];
    expect(s.minimum).toBe(0);
    expect(s.billable).toBe(300);
  });
  it('ignores disabled cook and home tracking exclusions', () => {
    const m = fixture();
    m.cooks.forEach((c) => (c.available = false));
    m.meals.forEach((x) => (x.isHome = true));
    m.rules.cookTracking = false;
    m.rules.homeTracking = false;
    expect(calculate(m).statements[0].eligibleSlots).toBe(60);
  });
  it('never adds artificial actual meals to meet minimum', () => {
    const m = fixture();
    expect(calculate(m).statements[0].actual).toBe(0);
    expect(calculate(m).statements[0].additional).toBe(42000);
    expect(m.meals.every((e) => e.quantity === 0)).toBe(true);
  });
  it('distinguishes unrecorded from recorded zero', () => {
    const m = fixture();
    m.meals[0].recorded = false;
    m.cooks[0].available = null;
    expect(calculate(m).summary.missingMeals).toBe(1);
    expect(calculate(m).summary.missingCook).toBe(1);
  });
  it('derives actual calendar lengths including leap February', () => {
    expect(daysInMonth('2026-09')).toBe(30);
    expect(daysInMonth('2026-07')).toBe(31);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(nextCalendar('2026-12')).toBe('2027-01');
  });
  it('parses decimal input without binary floating error and rejects invalid precision', () => {
    expect(decimalUnits('0.3', 3)).toBe(300);
    expect(decimalUnits('1.005', 3)).toBe(1005);
    expect(decimalUnits('15.01', 2)).toBe(1501);
    expect(() => decimalUnits('1.005', 2)).toThrow();
    expect(() => decimalUnits('-1', 3)).toThrow();
    expect(() => decimalUnits('Infinity', 3)).toThrow();
  });
});
describe('financial allocations', () => {
  it('uses billable meals in denominator including minimum adjustments', () => {
    const m = fixture();
    m.meals[0].quantity = 1500;
    m.expenses.push({
      id: 'e',
      kind: 'MARKET',
      category: 'rice',
      amount: 10001,
      date: '2026-09-01',
      description: 'rice',
      vendor: '',
      recordedBy: 'p',
      createdAt: '',
      updatedAt: '',
    });
    const { summary, statements } = calculate(m);
    expect(summary.billable).toBe(42000);
    expect(summary.rate).toBe(10001 / 42);
    expect(statements[0].mealCost).toBe(10001);
  });
  it('reconciles every paisa and allocates ties by member ID', () => {
    const weights = [
      { id: 'b', weight: 1 },
      { id: 'a', weight: 1 },
      { id: 'c', weight: 1 },
    ];
    const allocation = allocate(100, weights);
    expect(allocation.get('a')).toBe(34);
    expect([...allocation.values()].reduce((a, b) => a + b, 0)).toBe(100);
    expect(allocate(100, [...weights].reverse())).toEqual(allocation);
  });
  it('reconciles weighted financial allocations without rounded rate', () => {
    const m = fixture();
    m.participants.push({ memberId: 'q', joinedOn: '2026-09-30' });
    m.meals.push(...m.meals.map((e) => ({ ...e, memberId: 'q', quantity: 1500 })));
    m.expenses = [
      {
        id: 'e',
        kind: 'MARKET',
        category: 'rice',
        amount: 10001,
        date: '2026-09-01',
        description: 'rice',
        vendor: '',
        recordedBy: 'p',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'x',
        kind: 'EXTRA',
        category: 'gas',
        amount: 101,
        date: '2026-09-01',
        description: 'gas',
        vendor: '',
        recordedBy: 'p',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const { statements, summary } = calculate(m);
    expect(statements.reduce((a, s) => a + s.mealCost, 0)).toBe(10001);
    expect(statements.reduce((a, s) => a + s.extraCost, 0)).toBe(101);
    expect(summary.mealAllocated).toBe(summary.market);
    expect(Math.abs(statements[0].extraCost - statements[1].extraCost)).toBe(1);
  });
  it('handles positive expense with zero billable meals as invalid', () => {
    const m = fixture();
    m.rules.minimumEnabled = false;
    m.expenses.push({
      id: 'e',
      kind: 'MARKET',
      category: 'rice',
      amount: 100,
      date: '2026-09-01',
      description: 'rice',
      vendor: '',
      recordedBy: 'p',
      createdAt: '',
      updatedAt: '',
    });
    const { summary } = calculate(m);
    expect(summary.error).toBeDefined();
    expect(summary.rate).toBe(0);
    expect(Number.isFinite(summary.rate)).toBe(true);
  });
  it('handles zero participants explicitly', () => {
    const m = fixture();
    m.participants = [];
    expect(calculate(m).summary.error).toContain('অংশগ্রহণকারী');
  });
});
