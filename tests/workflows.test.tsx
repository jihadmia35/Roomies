// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode, AnchorHTMLAttributes } from 'react';
import { DemoProvider } from '@/features/demo/provider';
import { DemoControls } from '@/features/demo/controls';
import { ConfirmationProvider } from '@/components/ui/confirmation';
import { RouteScreen } from '@/app/route-screen';
import { repository } from '@/data/mock/repository';
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
// These are rendered component tests; actual Next navigation was checked in the browser.
vi.mock('next/link', () => ({
  default: ({
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
});
beforeEach(async () => {
  sessionStorage.clear();
  router.replace.mockClear();
  router.push.mockClear();
  await repository.reset();
});
afterEach(cleanup);
const manager = { messId: 'a', monthId: 'a-2026-09', userId: 'a1' };
function app(path: string) {
  return (
    <ConfirmationProvider>
      <DemoProvider>
        <DemoControls />
        <RouteScreen path={path} />
      </DemoProvider>
    </ConfirmationProvider>
  );
}
async function openDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /ডেমো পরিবেশ/ }));
  await screen.findByLabelText('ডেমো পরিচয়');
}
async function accept(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'হ্যাঁ, নিশ্চিত করুন' }));
}
describe('rendered frontend workflows', () => {
  it('manager saves custom fractional meals, resolves missing records and updates accounting', async () => {
    const user = userEvent.setup();
    render(app('meals/daily'));
    const input = await screen.findByLabelText('আরিফ হাসান দুপুর মিল');
    const before = await repository.view(manager);
    await user.clear(input);
    await user.type(input, '1.25');
    await user.type(screen.getByLabelText('রাফি ইসলাম দুপুর মিল'), '0.3');
    await user.selectOptions(screen.getByLabelText('রাত বাবুর্চি'), 'true');
    await user.click(screen.getByRole('button', { name: 'মিল সংরক্ষণ' }));
    await screen.findByText('দৈনিক মিল সংরক্ষিত। হিসাবও আপডেট হয়েছে।');
    const after = await repository.view(manager);
    expect(after.summary.actual - before.summary.actual).toBe(1250);
    expect(after.summary.billable).toBe(269650);
    expect(after.summary.rate).not.toBe(before.summary.rate);
    expect(after.summary.missingMeals + after.summary.missingCook).toBe(0);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'মিল সংরক্ষণ' }).hasAttribute('disabled')).toBe(
        true,
      ),
    );
  });
  it('identity switching clears old personal records and blocks manager routes', async () => {
    const user = userEvent.setup();
    const ui = render(app('my/deposits'));
    await screen.findByRole('heading', { name: 'আমার জমার খাতা' });
    await openDemo(user);
    await user.selectOptions(screen.getByLabelText('ডেমো পরিচয়'), 'a3');
    await waitFor(() =>
      expect(
        screen.getAllByRole('row').filter((r) => r.textContent?.includes('রাফি ইসলাম')).length,
      ).toBe(2),
    );
    expect(screen.queryByText('৳4,400.00')).toBeNull();
    expect(
      screen.getAllByRole('row').filter((r) => r.textContent?.includes('আরিফ হাসান')).length,
    ).toBe(2); // recorder only
    const member = await repository.view({ ...manager, userId: 'a3' });
    expect(member.deposits.every((d) => d.memberId === 'a3')).toBe(true);
    ui.rerender(app('settings'));
    await screen.findByRole('heading', { name: 'অ্যাক্সেসের অনুমতি নেই' });
    expect(router.replace).toHaveBeenCalledWith('/');
  });
  it('single-mess settings can disable tracking/minimum and configure three slots', async () => {
    const user = userEvent.setup();
    const ui = render(app('settings'));
    await screen.findByRole('heading', { name: 'মাসের নিয়ম' });
    for (const toggle of screen.getAllByRole('switch')) await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'নতুন স্লট' }));
    await user.clear(screen.getByLabelText('স্লট 3-এর নাম'));
    await user.type(screen.getByLabelText('স্লট 3-এর নাম'), 'সকাল');
    await user.click(screen.getByRole('button', { name: 'নিয়ম সংরক্ষণ' }));
    await screen.findByText('পরিবর্তন সংরক্ষিত হয়েছে।');
    ui.rerender(app('meals/daily'));
    await screen.findByLabelText('আরিফ হাসান সকাল মিল');
    expect(screen.queryByLabelText('রাত বাবুর্চি')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /বাসায়/ })).toBeNull();
    expect(screen.getAllByText('বাবুর্চি ট্র্যাকিং বন্ধ')).toHaveLength(3);
    await openDemo(user);
    expect(screen.queryByLabelText('ডেমো মেস')).toBeNull();
    ui.rerender(app('my/meals'));
    await screen.findByText(
      'এই মাসে ন্যূনতম মিল বন্ধ। আপনি যতটুকু খেয়েছেন, ততটুকুরই খাবারের বিল।',
    );
    expect((await repository.view(manager)).statements.every((s) => s.billable === s.actual)).toBe(
      true,
    );
  });
  it('creates, edits and deletes a deposit with dialogs and live financial totals', async () => {
    const user = userEvent.setup();
    render(app('deposits'));
    await screen.findByRole('heading', { name: 'জমার খাতা' });
    await user.click(screen.getByRole('button', { name: 'নতুন জমা' }));
    await user.type(screen.getByLabelText(/পরিমাণ \(৳\)/), '100.25');
    await user.type(screen.getByLabelText('নোট (ঐচ্ছিক)'), 'UI integration deposit');
    await user.click(screen.getByRole('button', { name: 'সংরক্ষণ করুন' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    let view = await repository.view(manager);
    const deposit = view.deposits.find((d) => d.note === 'UI integration deposit')!;
    expect(deposit.amount).toBe(10025);
    expect(view.summary.deposits).toBe(1810025);
    await user.click(await screen.findByRole('button', { name: `${deposit.id} সম্পাদনা` }));
    await user.clear(screen.getByLabelText(/পরিমাণ \(৳\)/));
    await user.type(screen.getByLabelText(/পরিমাণ \(৳\)/), '200.01');
    await user.click(screen.getByRole('button', { name: 'সংরক্ষণ করুন' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    view = await repository.view(manager);
    expect(view.deposits.find((d) => d.id === deposit.id)?.amount).toBe(20001);
    await screen.findByText('৳200.01');
    await user.click(screen.getByRole('button', { name: `${deposit.id} মুছুন` }));
    await screen.findByRole('dialog');
    await accept(user);
    await waitFor(async () =>
      expect((await repository.view(manager)).deposits.some((d) => d.id === deposit.id)).toBe(
        false,
      ),
    );
    expect((await repository.view(manager)).summary.deposits).toBe(1800000);
  });
  it('resolves missing entries, closes and hands over, records partial settlement, completes every account and expires access', async () => {
    const user = userEvent.setup();
    const ui = render(app('meals/overview'));
    await user.click(await screen.findByRole('button', { name: 'সব অনথিভুক্ত তথ্য নিশ্চিত করুন' }));
    await accept(user);
    await waitFor(async () =>
      expect((await repository.view(manager)).summary.missingMeals).toBe(0),
    );
    ui.rerender(app('closing'));
    await screen.findByRole('heading', { name: 'মাস বন্ধ ও দায়িত্ব হস্তান্তর' });
    await user.selectOptions(screen.getByLabelText('পরের প্রথম ম্যানেজার'), 'a3');
    await user.selectOptions(screen.getByLabelText('পরের দ্বিতীয় ম্যানেজার'), 'a4');
    await user.click(screen.getByRole('checkbox', { name: /আমি সদস্য/ }));
    await user.click(screen.getByRole('button', { name: 'মাস বন্ধ ও হস্তান্তর করুন' }));
    await accept(user);
    await waitFor(async () => expect((await repository.view(manager)).role).toBe('POST_MANAGER'));
    expect(router.push).toHaveBeenCalledWith('/settlements');
    const next = await repository.view({ messId: 'a', monthId: 'a-2026-10', userId: 'a3' });
    expect(next.role).toBe('MANAGER');
    expect(next.summary.deposits + next.summary.market + next.summary.extra).toBe(0);
    ui.rerender(app('settlements'));
    await screen.findByRole('heading', { name: 'মাসের নিষ্পত্তি' });
    const rafi = await screen.findByRole('row', { name: /রাফি ইসলাম/ });
    await user.click(within(rafi).getByRole('button', { name: /আদায় লিখুন/ }));
    await user.clear(screen.getByLabelText(/পরিমাণ \(৳\)/));
    await user.type(screen.getByLabelText(/পরিমাণ \(৳\)/), '300');
    await user.click(screen.getByRole('button', { name: 'নিষ্পত্তি নিশ্চিত করুন' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    let view = await repository.view(manager);
    expect(view.accounts.find((a) => a.person.id === 'a3')?.settled).toBe(30000);
    const original = view.statements.map((s) => ({ ...s }));
    for (let n = 0; n < 6; n++) {
      const account = view.accounts.find((a) => a.remaining > 0);
      if (!account) break;
      await waitFor(() =>
        expect(screen.getByRole('row', { name: new RegExp(account.person.name) })).toBeTruthy(),
      );
      const row = screen.getByRole('row', { name: new RegExp(account.person.name) });
      await user.click(within(row).getByRole('button', { name: /আদায় লিখুন|ফেরত লিখুন/ }));
      await user.click(screen.getByRole('button', { name: 'নিষ্পত্তি নিশ্চিত করুন' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      view = await repository.view(manager);
    }
    expect(view.status).toBe('SETTLED');
    expect(view.role).toBe('MEMBER');
    expect(view.accounts).toHaveLength(1);
    expect(view.statements[0]).toEqual(original.find((s) => s.memberId === 'a1'));
    expect(router.replace).toHaveBeenCalledWith('/my/settlements');
    ui.rerender(app('my/settlements'));
    await screen.findByRole('heading', { name: 'আরিফ হাসান-এর নিষ্পত্তি' });
    expect(screen.queryByRole('button', { name: 'নিষ্পত্তি লিখুন' })).toBeNull();
    expect(
      screen.getAllByRole('row').filter((r) => r.textContent?.includes('ফেরত পাওয়া')).length,
    ).toBe(1);
  });
});

describe('profile frontend workflows', () => {
  it('uploads, previews and saves an own photo, preserves it on navigation and removes it', async () => {
    const user = userEvent.setup();
    const ui = render(app('profile'));
    await screen.findByRole('heading', { name: 'আমার প্রোফাইল' });
    const base64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ozkAAAAASUVORK5CYII=';
    const file = new File([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], 'avatar.png', {
      type: 'image/png',
    });
    await user.upload(screen.getByLabelText('প্রোফাইলের ছবি আপলোড'), file);
    await screen.findByText('avatar.png');
    expect((await repository.profile({ ...manager, memberId: 'a1' })).person.photo).toBeUndefined();
    expect(screen.getAllByAltText('আরিফ হাসান এর ছবি')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'ছবি সংরক্ষণ' }));
    await screen.findByText('প্রোফাইলের ছবি সংরক্ষিত হয়েছে।');
    await waitFor(() => expect(screen.getAllByAltText('আরিফ হাসান এর ছবি')).toHaveLength(2));
    ui.rerender(app('my/statement'));
    await screen.findByRole('heading', { name: 'আমার মাসিক বিবরণী' });
    expect(screen.getByAltText('আরিফ হাসান এর ছবি').getAttribute('src')).toBe(
      'data:image/png;base64,' + base64,
    );
    ui.rerender(app('profile'));
    await screen.findByRole('heading', { name: 'আমার প্রোফাইল' });
    await user.click(screen.getByRole('button', { name: 'ছবি সরান' }));
    await accept(user);
    await screen.findByText('প্রোফাইলের ছবি সরানো হয়েছে।');
    await waitFor(() => expect(screen.queryByAltText('আরিফ হাসান এর ছবি')).toBeNull());
  });
  it('rejects incorrect passwords, changes own password, clears fields and isolates identity changes', async () => {
    const user = userEvent.setup();
    render(app('profile'));
    await screen.findByRole('heading', { name: 'আমার প্রোফাইল' });
    const current = screen.getByLabelText('বর্তমান পাসওয়ার্ড');
    await user.type(current, 'Incorrect123!');
    await user.type(screen.getByLabelText('নতুন পাসওয়ার্ড'), 'PracticeOnly456!');
    await user.type(screen.getByLabelText('নতুন পাসওয়ার্ড নিশ্চিত করুন'), 'PracticeOnly456!');
    await user.click(screen.getByRole('button', { name: 'পাসওয়ার্ড পরিবর্তন করুন' }));
    await screen.findAllByText('বর্তমান পাসওয়ার্ড সঠিক নয়।');
    await user.clear(current);
    await user.type(current, 'MessKhata123!');
    await user.click(screen.getByRole('button', { name: 'পাসওয়ার্ড পরিবর্তন করুন' }));
    await screen.findByText(
      'ডেমো পাসওয়ার্ড পরিবর্তিত হয়েছে। পরেরবার নতুন পাসওয়ার্ডটি ব্যবহার করুন।',
    );
    await waitFor(() =>
      expect((screen.getByLabelText('বর্তমান পাসওয়ার্ড') as HTMLInputElement).value).toBe(''),
    );
    await screen.findByText(/শেষ পরিবর্তন:/);
    await openDemo(user);
    await user.selectOptions(screen.getByLabelText('ডেমো পরিচয়'), 'a7');
    await screen.findByRole('heading', { name: 'ইমরান হোসেন' });
    expect(screen.queryByText(/শেষ পরিবর্তন:/)).toBeNull();
    expect((screen.getByLabelText('নতুন পাসওয়ার্ড') as HTMLInputElement).value).toBe('');
    expect(screen.queryByLabelText('ডেমো মেস')).toBeNull();
  });
});

describe('monthly account explanation', () => {
  it('shows authoritative shared totals, separate meal/extra costs and preserves totals during search', async () => {
    const user = userEvent.setup();
    render(app('accounts'));
    await screen.findByRole('heading', { name: 'সদস্যদের মাসিক হিসাব' });
    const overview = screen.getByRole('region', { name: 'মাসের হিসাবের সারসংক্ষেপ' });
    const rate = within(overview).getByText('প্রতি মিলের রেট').closest('section')!;
    const extra = within(overview).getByText('জনপ্রতি অতিরিক্ত খরচ').closest('section')!;
    expect(rate.textContent).toContain('৳46.44');
    expect(extra.textContent).toContain('৳750.00');
    expect(extra.textContent).toContain('৳4,500.00 অতিরিক্ত খরচ ÷ 6 জন');
    expect(overview.textContent).toContain('খাওয়া 255 + ন্যূনতমের বাড়তি 13.4 মিল');
    expect(overview.textContent).toContain('জমা − মোট খরচ');
    expect(overview.textContent).toContain('এখনও 1টি মিল ও 1টি বাবুর্চির রেকর্ড অসম্পূর্ণ');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'খাবারের খরচ' })).toBeDefined();
    expect(within(table).getByRole('columnheader', { name: 'অতিরিক্ত খরচ' })).toBeDefined();
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    await user.type(screen.getByLabelText('হিসাবের সদস্য খুঁজুন'), 'রাফি');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(extra.textContent).toContain('৳4,500.00 অতিরিক্ত খরচ ÷ 6 জন');
    expect(rate.textContent).toContain('৳46.44');
  });
  it('displays the real range of allocated extra shares when there is a one-paisa remainder', async () => {
    const view = await repository.view(manager);
    await repository.saveRecord(manager, {
      expectedRevision: view.revision,
      idempotencyKey: 'extra-remainder',
      record: {
        type: 'expense',
        body: {
          kind: 'EXTRA',
          category: 'অন্যান্য',
          amount: 1,
          date: '2026-09-30',
          description: 'পয়সার ভাগশেষ যাচাই',
          vendor: '',
        },
      },
    });
    render(app('accounts'));
    await screen.findByRole('heading', { name: 'সদস্যদের মাসিক হিসাব' });
    const card = screen.getByText('জনপ্রতি অতিরিক্ত খরচ').closest('section')!;
    expect(card.textContent).toContain('৳750.00–৳750.01');
    expect(card.textContent).toContain('৳4,500.01 অতিরিক্ত খরচ ÷ 6 জন');
    const row = screen.getByRole('row', { name: /আরিফ হাসান/ });
    expect(within(row).getByText('৳750.01')).toBeDefined();
    expect(screen.getByText(/জনপ্রতি অতিরিক্ত খরচ উপরে ছোট একটি সীমা/)).toBeDefined();
  });
  it('does not display a fictitious meal rate when market expenses have no billable meals', async () => {
    let view = await repository.view(manager);
    await repository.updateSettings(manager, {
      expectedRevision: view.revision,
      rules: { ...view.rules, minimumEnabled: false },
    });
    view = await repository.view(manager);
    let revision = view.revision;
    for (let day = 1; day <= 30; day++) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      const result = await repository.updateDay(manager, {
        expectedRevision: revision,
        date,
        cooks: [],
        acknowledgeDiscard: false,
        entries: view.participants.flatMap((p) =>
          view.rules.slots.map((s) => ({
            memberId: p.memberId,
            slotId: s.id,
            quantity: 0,
            isHome: false,
            recorded: true,
          })),
        ),
      });
      revision = result.revision;
    }
    render(app('accounts'));
    await screen.findByRole('heading', { name: 'সদস্যদের মাসিক হিসাব' });
    const rate = screen.getByText('প্রতি মিলের রেট').closest('section')!;
    expect(within(rate).getByText('—')).toBeDefined();
    expect(screen.getByText(/বাজার খরচ আছে কিন্তু বিলযোগ্য মিল শূন্য/)).toBeDefined();
    expect(screen.getByRole('link', { name: 'তথ্য সংশোধন করুন' }).getAttribute('href')).toBe(
      '/meals/daily',
    );
    expect(
      screen.getByRole('region', { name: 'মাসের হিসাবের সারসংক্ষেপ' }).textContent,
    ).not.toMatch(/NaN|Infinity/);
  });
});
