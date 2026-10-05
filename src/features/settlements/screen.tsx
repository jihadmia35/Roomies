'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowDownToLine,
  CheckCheck,
  ArrowUpRight,
  Search,
  ArrowLeftRight,
} from 'lucide-react';
import { Account, MonthView, Settlement } from '@/domain/models';
import {
  Card,
  PageHeading,
  Badge,
  Button,
  Avatar,
  Modal,
  Field,
  Alert,
  Empty,
} from '@/components/ui';
import { dateLabel, decimalUnits, money, monthLabel } from '@/lib/format';
import { useDemo, useMutation } from '@/features/demo/provider';
import { StatementDetail } from '@/features/accounting/components';
export function TreasuryCard({ view }: { view: MonthView }) {
  const t = view.treasury;
  if (!t) return null;
  return (
    <Card className="padded treasury-card">
      <div>
        <span className="eyebrow">মেসের তহবিল</span>
        <h3>প্রত্যাশিত হাতে থাকা নগদ</h3>
        <strong className={`treasury-value ${t.cash < 0 ? 'negative' : 'positive'}`}>
          {money(t.cash)}
        </strong>
        <p>শুরুর নগদ ৳0.00 ধরে হিসাব। এটি কোনো সদস্যের ব্যক্তিগত ব্যালেন্স নয়।</p>
      </div>
      <dl>
        <div>
          <dt>জমা পাওয়া</dt>
          <dd>+ {money(t.deposits)}</dd>
        </div>
        <div>
          <dt>খরচ পরিশোধ</dt>
          <dd>− {money(t.expenses)}</dd>
        </div>
        <div>
          <dt>নিষ্পত্তির টাকা পাওয়া</dt>
          <dd>+ {money(t.payments)}</dd>
        </div>
        <div>
          <dt>টাকা ফেরত দেওয়া</dt>
          <dd>− {money(t.refunds)}</dd>
        </div>
      </dl>
    </Card>
  );
}
export function SettlementScreen({
  view,
  filter = 'all',
}: {
  view: MonthView;
  filter?: 'all' | 'payments' | 'refunds' | 'completed';
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Account | null>(null);
  const due = view.accounts
    .filter((a) => a.direction === 'PAYMENT')
    .reduce((a, x) => a + x.remaining, 0);
  const refund = view.accounts
    .filter((a) => a.direction === 'REFUND')
    .reduce((a, x) => a + x.remaining, 0);
  const completed = view.accounts.filter((a) => !a.remaining).length;
  const filtered = view.accounts.filter(
    (a) =>
      a.person.name.includes(search) &&
      (filter === 'all' ||
        (filter === 'completed' && a.remaining === 0) ||
        (filter === 'payments' && a.direction === 'PAYMENT' && a.remaining > 0) ||
        (filter === 'refunds' && a.direction === 'REFUND' && a.remaining > 0)),
  );
  const titles = {
    all: 'মাসের নিষ্পত্তি',
    payments: 'বকেয়া আদায়',
    refunds: 'টাকা ফেরত',
    completed: 'সম্পন্ন নিষ্পত্তি',
  };
  return (
    <>
      <PageHeading
        eyebrow={`${monthLabel(view.calendar)} / সাবেক ম্যানেজারের দায়িত্ব`}
        title={titles[filter]}
        description="চূড়ান্ত বিল অপরিবর্তিত থাকে। এখানে আংশিক বা পুরো নিষ্পত্তির টাকা রেকর্ড করুন।"
      >
        <Link className="btn btn-secondary" href="/report">
          চূড়ান্ত রিপোর্ট
        </Link>
      </PageHeading>
      <div className="settlement-stats">
        <Link href="/settlements/payments" className="card padded">
          <Wallet className="negative" size={22} />
          <span>আদায় বাকি</span>
          <strong className="negative">{money(due)}</strong>
        </Link>
        <Link href="/settlements/refunds" className="card padded">
          <ArrowDownToLine className="positive" size={22} />
          <span>ফেরত বাকি</span>
          <strong className="positive">{money(refund)}</strong>
        </Link>
        <Link href="/settlements/completed" className="card padded">
          <CheckCheck className="muted" size={22} />
          <span>নিষ্পত্তি সম্পন্ন</span>
          <strong>
            {completed} / {view.accounts.length} জন
          </strong>
        </Link>
      </div>
      <Alert>
        সব বকেয়া ও ফেরত শেষ হলে মাসটি “নিষ্পত্তি সম্পন্ন” হবে। দুই সাবেক ম্যানেজারের এই মাসের
        বাড়তি অনুমতি তখন শেষ হবে।
      </Alert>
      <Card>
        <div className="tabs">
          {(['all', 'payments', 'refunds', 'completed'] as const).map((f) => (
            <Link
              className={filter === f ? 'tab-active' : ''}
              key={f}
              href={f === 'all' ? '/settlements' : `/settlements/${f}`}
            >
              {f === 'all' ? 'সব হিসাব' : titles[f]}
            </Link>
          ))}
        </div>
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="নিষ্পত্তির সদস্য খুঁজুন"
              placeholder="সদস্যের নাম খুঁজুন…"
            />
          </div>
          <Badge>{filtered.length} জন</Badge>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>সদস্য</th>
                <th>ধরন</th>
                <th className="num">চূড়ান্ত পরিমাণ</th>
                <th className="num">নিষ্পত্তি হয়েছে</th>
                <th className="num">বাকি</th>
                <th className="num">কাজ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.person.id}>
                  <td>
                    <div className="person-cell">
                      <Avatar person={a.person} />
                      <Link href={`/settlements/member/${a.person.id}`}>
                        <strong>{a.person.name}</strong>
                      </Link>
                    </div>
                  </td>
                  <td>
                    <Badge
                      tone={
                        a.remaining === 0
                          ? 'neutral'
                          : a.direction === 'PAYMENT'
                            ? 'danger'
                            : 'success'
                      }
                    >
                      {a.remaining === 0
                        ? 'সম্পন্ন'
                        : a.direction === 'PAYMENT'
                          ? 'টাকা আদায়'
                          : 'টাকা ফেরত'}
                    </Badge>
                  </td>
                  <td className="num">{money(a.original)}</td>
                  <td className="num">{money(a.settled)}</td>
                  <td className={`num ${a.direction === 'PAYMENT' ? 'negative' : 'positive'}`}>
                    <strong>{money(a.remaining)}</strong>
                  </td>
                  <td className="num">
                    {a.remaining > 0 ? (
                      <Button variant="secondary" onClick={() => setSelected(a)}>
                        {a.direction === 'PAYMENT' ? 'আদায় লিখুন' : 'ফেরত লিখুন'}
                        <ArrowUpRight size={14} />
                      </Button>
                    ) : (
                      <Link className="text-link" href={`/settlements/member/${a.person.id}`}>
                        ইতিহাস দেখুন
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <Empty
              title="এই তালিকায় কোনো বকেয়া নেই"
              description="সব লেনদেন থেকে বা সদস্যের বিস্তারিত পাতায় ইতিহাস দেখতে পারেন।"
            />
          )}
        </div>
      </Card>
      <TreasuryCard view={view} />
      {selected && (
        <SettlementForm account={selected} view={view} close={() => setSelected(null)} />
      )}
    </>
  );
}
function SettlementForm({
  account,
  view,
  close,
}: {
  account: Account;
  view: MonthView;
  close: () => void;
}) {
  const [amount, setAmount] = useState(String(account.remaining / 100));
  const [date, setDate] = useState('2026-09-30');
  const [method, setMethod] = useState('বিকাশ');
  const [note, setNote] = useState('');
  const { repo, context } = useDemo();
  const { run, pending, error } = useMutation();
  const key = useRef(crypto.randomUUID());
  const router = useRouter();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let units = 0;
    const ok = await run(async () => {
      units = decimalUnits(amount, 2);
      await repo.settle(context, {
        expectedRevision: view.revision,
        idempotencyKey: key.current,
        memberId: account.person.id,
        amount: units,
        direction: account.direction,
        date,
        method,
        note,
      });
    }, 'নিষ্পত্তির লেনদেন সংরক্ষিত হয়েছে।');
    if (ok) {
      close();
      if (
        view.accounts.every((a) =>
          a.person.id === account.person.id ? a.remaining === units : a.remaining === 0,
        )
      )
        router.replace('/my/settlements');
    }
  };
  return (
    <Modal
      title={account.direction === 'PAYMENT' ? 'বকেয়া আদায় রেকর্ড' : 'টাকা ফেরত রেকর্ড'}
      onClose={() => {
        if (!pending) close();
      }}
    >
      <form className="modal-body form" onSubmit={submit}>
        <div className="settlement-form-person">
          <Avatar person={account.person} />
          <div>
            <strong>{account.person.name}</strong>
            <small>
              বাকি {money(account.remaining)} ·{' '}
              {account.direction === 'PAYMENT' ? 'পেমেন্ট পাওয়া' : 'ফেরত দেওয়া'}
            </small>
          </div>
        </div>
        <Field label="পরিমাণ (৳)" hint="আংশিক পরিমাণও দিতে পারেন। বকেয়ার বেশি দেওয়া যাবে না।">
          <input
            required
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="নিষ্পত্তির তারিখ">
            <input
              required
              type="date"
              min={`${view.calendar}-01`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="মাধ্যম">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {['নগদ', 'বিকাশ', 'নগদ মোবাইল', 'ব্যাংক'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="নোট (ঐচ্ছিক)">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="muted small">
          এই টাকা {monthLabel(view.calendar)}-এর নিষ্পত্তি হিসেবে থাকবে; নতুন মাসের জমা হবে না।
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={pending} onClick={close}>
            বাতিল
          </Button>
          <Button disabled={pending} type="submit">
            {pending ? 'রেকর্ড হচ্ছে…' : 'নিষ্পত্তি নিশ্চিত করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function SettlementDetail({ view, memberId }: { view: MonthView; memberId: string }) {
  const account = view.accounts.find((a) => a.person.id === memberId);
  const [form, setForm] = useState(false);
  if (!account)
    return (
      <Empty
        title="সদস্যের হিসাব পাওয়া যায়নি"
        description="এই মাসে সদস্যটি নেই বা তার হিসাব দেখার অনুমতি নেই।"
      />
    );
  return (
    <>
      <PageHeading
        title={`${account.person.name}-এর নিষ্পত্তি`}
        eyebrow={monthLabel(view.calendar)}
        description="মূল বিল ও নিষ্পত্তির লেনদেন আলাদা। চূড়ান্ত ব্যালেন্স পরিবর্তন হয় না।"
      >
        {account.remaining > 0 && view.role === 'POST_MANAGER' && (
          <Button onClick={() => setForm(true)}>
            <ArrowLeftRight size={16} />
            নিষ্পত্তি লিখুন
          </Button>
        )}
      </PageHeading>
      <div className="settlement-stats">
        <Card className="padded">
          <span>মূল {account.direction === 'PAYMENT' ? 'দেনা' : 'ফেরত'}</span>
          <strong>{money(account.original)}</strong>
        </Card>
        <Card className="padded">
          <span>নিষ্পত্তি হয়েছে</span>
          <strong>{money(account.settled)}</strong>
        </Card>
        <Card className="padded">
          <span>বাকি আছে</span>
          <strong className={account.direction === 'PAYMENT' ? 'negative' : 'positive'}>
            {money(account.remaining)}
          </strong>
        </Card>
      </div>
      <SettlementHistory
        view={view}
        records={view.settlements.filter((s) => s.memberId === memberId)}
      />
      <StatementDetail view={view} statement={account.statement} />
      {form && <SettlementForm view={view} account={account} close={() => setForm(false)} />}
    </>
  );
}
export function SettlementHistory({
  view,
  records = view.settlements,
}: {
  view: MonthView;
  records?: Settlement[];
}) {
  return (
    <Card>
      <div className="card-heading">
        <div>
          <h3>নিষ্পত্তির লেনদেন</h3>
          <p>প্রতিটি আংশিক ও চূড়ান্ত পরিশোধের ইতিহাস</p>
        </div>
        <Badge>{records.length}টি</Badge>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>তারিখ</th>
              <th>ধরন</th>
              <th className="num">পরিমাণ</th>
              <th>মাধ্যম</th>
              <th>নোট</th>
              <th>রেকর্ড করেছেন</th>
            </tr>
          </thead>
          <tbody>
            {records.map((s) => (
              <tr key={s.id}>
                <td>{dateLabel(s.date)}</td>
                <td>
                  <Badge tone={s.direction === 'PAYMENT' ? 'danger' : 'success'}>
                    {s.direction === 'PAYMENT' ? 'দেনা পরিশোধ' : 'ফেরত পাওয়া'}
                  </Badge>
                </td>
                <td className="num">{money(s.amount)}</td>
                <td>{s.method}</td>
                <td>{s.note || '—'}</td>
                <td>
                  {view.managers.find((p) => p.id === s.recordedBy)?.name ??
                    view.people.find((p) => p.id === s.recordedBy)?.name ??
                    'ম্যানেজার'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && (
          <Empty
            title="নিষ্পত্তির লেনদেন নেই"
            description="মাস বন্ধের পরে দেনা পরিশোধ ও টাকা ফেরতের রেকর্ড এখানে থাকবে।"
          />
        )}
      </div>
    </Card>
  );
}
