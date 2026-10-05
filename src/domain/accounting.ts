import { Account, Month, Statement, Summary, Treasury, Person } from './models';
import { monthDates } from './dates';
/** Largest-remainder allocation using BigInt. Ties sorted by member ID. Every paisa reconciles. */
export function allocate(
  total: number,
  weights: { id: string; weight: number }[],
): Map<string, number> {
  const result = new Map(weights.map((w) => [w.id, 0]));
  const denominator = weights.reduce((a, w) => a + BigInt(w.weight), 0n);
  if (!denominator) return result;
  const shares = weights.map((w) => {
    const n = BigInt(total) * BigInt(w.weight);
    return { id: w.id, base: Number(n / denominator), remainder: n % denominator };
  });
  let remaining = total - shares.reduce((a, w) => a + w.base, 0);
  shares.sort((a, b) =>
    a.remainder === b.remainder ? a.id.localeCompare(b.id) : a.remainder > b.remainder ? -1 : 1,
  );
  for (const s of shares) {
    result.set(s.id, s.base + (remaining-- > 0 ? 1 : 0));
  }
  return result;
}
export function calculate(month: Month): { statements: Statement[]; summary: Summary } {
  if (month.snapshot)
    return structuredClone({
      statements: month.snapshot.statements,
      summary: month.snapshot.summary,
    });
  const dates = monthDates(month.calendar);
  const rules = month.rules;
  const cookMap = new Map(month.cooks.map((c) => [`${c.date}:${c.slotId}`, c.available]));
  const mealMap = new Map(month.meals.map((m) => [`${m.memberId}:${m.date}:${m.slotId}`, m]));
  let missingMeals = 0,
    missingCook = 0;
  for (const date of dates)
    for (const slot of rules.slots) {
      if (rules.cookTracking && cookMap.get(`${date}:${slot.id}`) == null) missingCook++;
    }
  const statements: Statement[] = month.participants.map((p) => {
    let actual = 0,
      eligibleSlots = 0,
      homeSlots = 0;
    for (const date of dates)
      for (const slot of rules.slots) {
        const meal = mealMap.get(`${p.memberId}:${date}:${slot.id}`);
        if (!meal?.recorded) missingMeals++;
        const cookAvailable = !rules.cookTracking || cookMap.get(`${date}:${slot.id}`) !== false;
        const home = rules.homeTracking && !!meal?.isHome;
        if (home) homeSlots++;
        if (cookAvailable && !home) eligibleSlots++;
        if (meal?.recorded && cookAvailable && !home) actual += meal.quantity;
      }
    const minimum = rules.minimumEnabled
      ? Math.floor((eligibleSlots * rules.minimumPercent) / 100) * 1000
      : 0;
    const billable = Math.max(actual, minimum);
    return {
      memberId: p.memberId,
      actual,
      homeSlots,
      eligibleSlots,
      minimum,
      billable,
      additional: billable - actual,
      deposits: month.deposits
        .filter((d) => d.memberId === p.memberId)
        .reduce((a, d) => a + d.amount, 0),
      mealCost: 0,
      extraCost: 0,
      totalCost: 0,
      balance: 0,
    };
  });
  const market = month.expenses
    .filter((e) => e.kind === 'MARKET')
    .reduce((a, e) => a + e.amount, 0);
  const extra = month.expenses.filter((e) => e.kind === 'EXTRA').reduce((a, e) => a + e.amount, 0);
  const billable = statements.reduce((a, s) => a + s.billable, 0);
  const mealCosts = allocate(
    market,
    statements.map((s) => ({ id: s.memberId, weight: s.billable })),
  );
  const extraCosts = allocate(
    extra,
    statements.map((s) => ({ id: s.memberId, weight: 1 })),
  );
  for (const s of statements) {
    s.mealCost = mealCosts.get(s.memberId) ?? 0;
    s.extraCost = extraCosts.get(s.memberId) ?? 0;
    s.totalCost = s.mealCost + s.extraCost;
    s.balance = s.deposits - s.totalCost;
  }
  const summary: Summary = {
    market,
    extra,
    billable,
    actual: statements.reduce((a, s) => a + s.actual, 0),
    deposits: statements.reduce((a, s) => a + s.deposits, 0),
    rate: billable ? (market * 1000) / billable : 0,
    participants: statements.length,
    missingMeals,
    missingCook,
    mealAllocated: statements.reduce((a, s) => a + s.mealCost, 0),
    extraAllocated: statements.reduce((a, s) => a + s.extraCost, 0),
  };
  if (!statements.length) summary.error = 'মাসে কোনো অংশগ্রহণকারী নেই। সদস্য যোগ করুন।';
  else if (market > 0 && !billable)
    summary.error = 'বাজার খরচ আছে কিন্তু বিলযোগ্য মিল শূন্য। মিল রেকর্ড বা খরচ সংশোধন করুন।';
  return { statements, summary };
}
export function accountsFor(month: Month, people: Person[]): Account[] {
  return calculate(month).statements.map((statement) => {
    const original = Math.abs(statement.balance);
    const settled = month.settlements
      .filter((s) => s.memberId === statement.memberId)
      .reduce((a, s) => a + s.amount, 0);
    return {
      statement,
      person: people.find((p) => p.id === statement.memberId)!,
      original,
      settled,
      remaining: Math.max(0, original - settled),
      direction: statement.balance < 0 ? 'PAYMENT' : 'REFUND',
    };
  });
}
export function treasury(month: Month): Treasury {
  const { summary } = calculate(month);
  const payments = month.settlements
    .filter((s) => s.direction === 'PAYMENT')
    .reduce((a, s) => a + s.amount, 0);
  const refunds = month.settlements
    .filter((s) => s.direction === 'REFUND')
    .reduce((a, s) => a + s.amount, 0);
  return {
    deposits: summary.deposits,
    expenses: summary.market + summary.extra,
    payments,
    refunds,
    cash: summary.deposits - summary.market - summary.extra + payments - refunds,
  };
}
