import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '@/data/mock/repository';
import { Context, MonthView } from '@/domain/models';
import { monthDates } from '@/domain/dates';
let repo: InMemoryRepository;
const manager: Context = { messId: 'a', monthId: 'a-2026-09', userId: 'a1' };
const member: Context = { ...manager, userId: 'a3' };
const post: Context = { messId: 'a', monthId: 'a-2026-08', userId: 'a3' };
beforeEach(() => {
  repo = new InMemoryRepository();
});
async function resolveMissing(context: Context) {
  const view = await repo.view(context);
  let revision = view.revision;
  for (const date of monthDates(view.calendar)) {
    const entries = view.meals
      .filter((m) => m.date === date && !m.recorded)
      .map((m) => ({
        memberId: m.memberId,
        slotId: m.slotId,
        quantity: 0,
        isHome: m.isHome,
        recorded: true,
      }));
    const cooks = view.cooks
      .filter((c) => c.date === date && c.available === null)
      .map((c) => ({ ...c, available: true }));
    if (entries.length || cooks.length)
      revision = (
        await repo.updateDay(context, {
          date,
          entries,
          cooks,
          expectedRevision: revision,
          acknowledgeDiscard: false,
        })
      ).revision;
  }
  return repo.view(context);
}
const settlement = (
  v: MonthView,
  a: MonthView['accounts'][number],
  amount: number,
  key: string,
) => ({
  memberId: a.person.id,
  direction: a.direction,
  amount,
  date: '2026-09-30',
  method: 'নগদ',
  note: 'test',
  expectedRevision: v.revision,
  idempotencyKey: key,
});
describe('privacy, revisions and mutation permissions', () => {
  it('returns only member own individual records', async () => {
    const v = await repo.view(member);
    expect(v.statements.map((s) => s.memberId)).toEqual(['a3']);
    expect(v.meals.every((s) => s.memberId === 'a3')).toBe(true);
    expect(v.deposits.every((s) => s.memberId === 'a3')).toBe(true);
    expect(v.accounts.map((a) => a.person.id)).toEqual(['a3']);
    expect(v.expenses).toEqual([]);
    expect(v.audit).toEqual([]);
    expect(v.treasury).toBeUndefined();
  });
  it('scopes historical queries to current identity', async () => {
    const history = await repo.history(member);
    expect(history).toHaveLength(3);
    const own = await repo.view(member);
    expect(history.find((h) => h.monthId === member.monthId)?.balance).toBe(
      own.statements[0].balance,
    );
  });
  it('rejects cross mess access', async () => {
    await expect(repo.view({ ...member, messId: 'b' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('rejects nonparticipants', async () => {
    await expect(repo.view({ ...member, userId: 'a7' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('rejects unauthorized member mutations, even without UI', async () => {
    await expect(
      repo.updateSettings(member, { expectedRevision: 1, rules: (await repo.view(member)).rules }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      repo.saveRecord(member, {
        expectedRevision: 1,
        idempotencyKey: 'unauthorized',
        record: {
          type: 'deposit',
          body: {
            memberId: 'a1',
            amount: 100,
            date: '2026-09-01',
            method: 'cash',
            reference: '',
            note: '',
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('gives both managers equal scoped editing permission and records actor', async () => {
    const other = { ...manager, userId: 'a2' };
    const v = await repo.view(other);
    const res = await repo.updateDay(other, {
      expectedRevision: v.revision,
      date: '2026-09-30',
      cooks: [],
      entries: [{ memberId: 'a1', slotId: 'lunch', quantity: 1234, isHome: false, recorded: true }],
      acknowledgeDiscard: false,
    });
    expect(res.audit.actor).toBe('a2');
    expect(
      (await repo.view(other)).meals.find(
        (m) => m.date === '2026-09-30' && m.memberId === 'a1' && m.slotId === 'lunch',
      )?.quantity,
    ).toBe(1234);
  });
  it('rejects stale manager writes with useful conflict', async () => {
    const v = await repo.view(manager);
    await repo.updateSettings(manager, { expectedRevision: v.revision, rules: v.rules });
    await expect(
      repo.updateSettings(
        { ...manager, userId: 'a2' },
        { expectedRevision: v.revision, rules: v.rules },
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('preserves historical finances after an open-month write', async () => {
    const historical = { ...manager, monthId: 'a-2026-07' };
    const before = await repo.view(historical);
    const a = await repo.view(manager);
    await repo.saveRecord(manager, {
      expectedRevision: a.revision,
      idempotencyKey: 'dep1',
      record: {
        type: 'deposit',
        body: {
          memberId: 'a1',
          amount: 100000,
          date: '2026-09-01',
          method: 'cash',
          reference: '',
          note: '',
        },
      },
    });
    expect((await repo.view(historical)).summary).toEqual(before.summary);
  });
  it('requires acknowledgement before cook-missed discards consumption', async () => {
    const v = await repo.view(manager);
    const request = {
      expectedRevision: v.revision,
      date: '2026-09-29',
      cooks: [{ date: '2026-09-29', slotId: 'lunch', available: false }],
      entries: [],
      acknowledgeDiscard: false,
    };
    await expect(repo.updateDay(manager, request)).rejects.toMatchObject({ code: 'VALIDATION' });
    await repo.updateDay(manager, { ...request, acknowledgeDiscard: true });
    expect(
      (await repo.view(manager)).meals
        .filter((m) => m.date === request.date && m.slotId === 'lunch')
        .every((m) => m.quantity === 0),
    ).toBe(true);
  });
  it('makes home quantity zero and ignores home markers when disabled', async () => {
    const v = await repo.view(manager);
    await repo.updateDay(manager, {
      expectedRevision: v.revision,
      date: '2026-09-30',
      cooks: [],
      entries: [{ memberId: 'a1', slotId: 'lunch', quantity: 1500, isHome: true, recorded: true }],
      acknowledgeDiscard: false,
    });
    expect(
      (await repo.view(manager)).meals.find(
        (m) => m.memberId === 'a1' && m.slotId === 'lunch' && m.date === '2026-09-30',
      )?.quantity,
    ).toBe(0);
    const enabled = await repo.view(manager);
    await repo.updateSettings(manager, {
      expectedRevision: enabled.revision,
      rules: { ...enabled.rules, homeTracking: false, cookTracking: false, minimumEnabled: false },
    });
    const disabled = await repo.view(manager);
    await repo.updateDay(manager, {
      expectedRevision: disabled.revision,
      date: '2026-09-30',
      cooks: [{ date: '2026-09-30', slotId: 'lunch', available: false }],
      entries: [{ memberId: 'a1', slotId: 'lunch', quantity: 300, isHome: true, recorded: true }],
      acknowledgeDiscard: false,
    });
    const after = await repo.view(manager);
    expect(
      after.meals.find(
        (m) => m.memberId === 'a1' && m.slotId === 'lunch' && m.date === '2026-09-30',
      ),
    ).toMatchObject({ quantity: 300, isHome: false });
    expect(after.statements.every((s) => s.minimum === 0 && s.billable === s.actual)).toBe(true);
  });
  it('rejects duplicate financial submissions', async () => {
    const v = await repo.view(manager);
    const request = {
      expectedRevision: v.revision,
      idempotencyKey: 'same',
      record: {
        type: 'deposit' as const,
        body: {
          memberId: 'a1',
          amount: 100,
          date: '2026-09-01',
          method: 'cash',
          reference: '',
          note: '',
        },
      },
    };
    await repo.saveRecord(manager, request);
    await expect(
      repo.saveRecord(manager, { ...request, expectedRevision: v.revision + 1 }),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
  });
  it('supports record edit/delete with audit and recalculation', async () => {
    const v = await repo.view(manager);
    const old = v.deposits[0];
    await repo.saveRecord(manager, {
      id: old.id,
      expectedRevision: v.revision,
      idempotencyKey: 'edit',
      record: { type: 'deposit', body: { ...old, amount: old.amount + 100 } },
    });
    const next = await repo.view(manager);
    expect(next.summary.deposits).toBe(v.summary.deposits + 100);
    expect(next.audit[0].before).toBeDefined();
    await repo.deleteRecord(manager, {
      type: 'deposit',
      id: old.id,
      expectedRevision: next.revision,
    });
    expect((await repo.view(manager)).summary.deposits).toBe(v.summary.deposits - old.amount);
  });
});
describe('closing, snapshots and settlements', () => {
  it('blocks closing on deliberate missing records', async () => {
    const v = await repo.view(manager);
    await expect(
      repo.close(manager, {
        expectedRevision: v.revision,
        idempotencyKey: 'close-missing',
        nextManagers: ['a3', 'a4'],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('requires two distinct next managers', async () => {
    const v = await resolveMissing(manager);
    await expect(
      repo.close(manager, {
        expectedRevision: v.revision,
        idempotencyKey: 'same-managers',
        nextManagers: ['a3', 'a3'],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('closes atomically, starts zero next month, freezes historical rules', async () => {
    const v = await resolveMissing(manager);
    await repo.close(manager, {
      expectedRevision: v.revision,
      idempotencyKey: 'close',
      nextManagers: ['a3', 'a4'],
    });
    const closed = await repo.view(manager);
    expect(closed.role).toBe('POST_MANAGER');
    expect(closed.status).toBe('CLOSED_PENDING_SETTLEMENT');
    const nextContext = { messId: 'a', monthId: 'a-2026-10', userId: 'a3' };
    const next = await repo.view(nextContext);
    expect(next.role).toBe('MANAGER');
    expect(next.summary.deposits).toBe(0);
    expect(next.summary.market).toBe(0);
    expect(next.meals).toHaveLength(0);
    await repo.updateSettings(nextContext, {
      expectedRevision: next.revision,
      rules: { ...next.rules, minimumPercent: 50 },
    });
    expect((await repo.view(manager)).rules.minimumPercent).toBe(70);
    expect((await repo.view(manager)).summary).toEqual(closed.summary);
  });
  it('blocks all ordinary editing of closed records', async () => {
    const v = await repo.view(post);
    await expect(
      repo.updateSettings(post, { expectedRevision: v.revision, rules: v.rules }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      repo.updateDay(post, {
        expectedRevision: v.revision,
        date: '2026-08-01',
        cooks: [],
        entries: [],
        acknowledgeDiscard: false,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      repo.deleteRecord(post, {
        type: 'deposit',
        id: v.deposits[0].id,
        expectedRevision: v.revision,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('supports partial settlement without changing original bill or next month deposits', async () => {
    const v = await repo.view(post);
    const a = v.accounts.find((a) => a.remaining > 1)!;
    const original = a.statement;
    const nextBefore = (await repo.view(manager)).summary.deposits;
    const amount = Math.floor(a.remaining / 2);
    await repo.settle(post, settlement(v, a, amount, 'partial'));
    const after = await repo.view(post);
    const updated = after.accounts.find((x) => x.person.id === a.person.id)!;
    expect(updated.remaining).toBe(a.remaining - amount);
    expect(updated.statement).toEqual(original);
    expect((await repo.view(manager)).summary.deposits).toBe(nextBefore);
    expect(after.treasury?.cash).toBe(
      v.treasury!.cash + (a.direction === 'PAYMENT' ? amount : -amount),
    );
  });
  it('rejects overpayments, nonpositive values, wrong direction and duplicates', async () => {
    const v = await repo.view(post);
    const a = v.accounts.find((a) => a.remaining > 1)!;
    await expect(
      repo.settle(post, settlement(v, a, a.remaining + 1, 'over')),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(repo.settle(post, settlement(v, a, 0, 'zero'))).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await expect(
      repo.settle(post, {
        ...settlement(v, a, 1, 'wrong'),
        direction: a.direction === 'PAYMENT' ? 'REFUND' : 'PAYMENT',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await repo.settle(post, settlement(v, a, 1, 'dup'));
    const updated = await repo.view(post);
    await expect(repo.settle(post, { ...settlement(updated, a, 1, 'dup') })).rejects.toMatchObject({
      code: 'DUPLICATE',
    });
  });
  it('ends both POST_MANAGER assignments after all dues AND refunds resolve', async () => {
    let v = await repo.view(post);
    const people = v.accounts.map((a) => a.person.id);
    let n = 0;
    for (const id of people) {
      const a = v.accounts.find((a) => a.person.id === id)!;
      if (a.remaining) {
        await repo.settle(post, settlement(v, a, a.remaining, `complete-${n++}`));
        v = await repo.view(post);
      }
    }
    expect(v.status).toBe('SETTLED');
    expect(v.role).toBe('MEMBER');
    expect(v.statements.map((s) => s.memberId)).toEqual(['a3']);
    expect((await repo.view({ ...post, userId: 'a4' })).role).toBe('MEMBER');
    await expect(
      repo.settle(post, { ...settlement(v, v.accounts[0], 1, 'expired') }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(v.settlements.every((s) => s.memberId === 'a3')).toBe(true);
  });
  it('keeps settled historical statements accessible only to owner', async () => {
    const v = await repo.view({ ...post, monthId: 'a-2026-07' });
    expect(v.role).toBe('MEMBER');
    expect(v.statements).toHaveLength(1);
    expect(v.accounts[0].remaining).toBe(0);
  });
});
