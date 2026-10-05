'use client';
import { useConfirm } from '@/components/ui/confirmation';
import Image from 'next/image';
import { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Wallet,
  ShoppingBasket,
  ReceiptText,
  FileImage,
} from 'lucide-react';
import { Deposit, Expense, MonthView } from '@/domain/models';
import { useDemo, useMutation } from '@/features/demo/provider';
import {
  Card,
  PageHeading,
  Button,
  Field,
  Modal,
  Badge,
  Avatar,
  Empty,
  Alert,
} from '@/components/ui';
import { dateLabel, decimalUnits, money, monthLabel, timestamp } from '@/lib/format';
import { monthDates } from '@/domain/dates';
import { RecordRequest } from '@/data/contracts';
type RecordRow = Deposit | Expense;
export function RecordsScreen({
  view,
  type,
  personal = false,
}: {
  view: MonthView;
  type: 'deposit' | 'expense';
  personal?: boolean;
}) {
  const ask = useConfirm();
  const [kind, setKind] = useState<'MARKET' | 'EXTRA'>('MARKET');
  const [search, setSearch] = useState('');
  const [member, setMember] = useState('all');
  const [editing, setEditing] = useState<RecordRow | null | undefined>(undefined);
  const [receipt, setReceipt] = useState<string | null>(null);
  const { repo, context } = useDemo();
  const { run, pending } = useMutation();
  const rows: RecordRow[] =
    type === 'deposit'
      ? view.deposits.filter((d) => !personal || d.memberId === view.context.userId)
      : view.expenses.filter((e) => e.kind === kind);
  const filtered = rows
    .filter((r) => {
      const name =
        'memberId' in r
          ? (view.people.find((p) => p.id === r.memberId)?.name ?? '')
          : r.description;
      return (
        (
          name +
          ('category' in r ? r.category : r.reference) +
          ('note' in r ? r.note : '')
        ).includes(search) &&
        (member === 'all' || ('memberId' in r && r.memberId === member))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const remove = async (r: RecordRow) => {
    if (!(await ask(`${money(r.amount)}-এর রেকর্ড মুছে ফেলবেন? পরিবর্তনটি ইতিহাসে থাকবে।`))) return;
    run(
      () => repo.deleteRecord(context, { type, id: r.id, expectedRevision: view.revision }),
      'রেকর্ড মুছে ফেলা হয়েছে।',
    );
  };
  return (
    <>
      <PageHeading
        eyebrow={monthLabel(view.calendar)}
        title={personal ? 'আমার জমার খাতা' : type === 'deposit' ? 'জমার খাতা' : 'খরচের খাতা'}
        description={
          type === 'deposit'
            ? 'সদস্যের প্রতিটি জমা, তারিখ ও পেমেন্টের মাধ্যম এক জায়গায়।'
            : 'বাজার খরচ থেকে মিল রেট হয়। অতিরিক্ত খরচ সবাই সমান ভাগে দেন।'
        }
      >
        {!personal && (
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} />
            {type === 'deposit' ? 'নতুন জমা' : 'নতুন খরচ'}
          </Button>
        )}
      </PageHeading>
      <div className="record-summary">
        <div className="record-summary-icon">
          {type === 'deposit' ? (
            <Wallet size={23} />
          ) : kind === 'MARKET' ? (
            <ShoppingBasket size={23} />
          ) : (
            <ReceiptText size={23} />
          )}
        </div>
        <div>
          <span>
            {type === 'deposit'
              ? 'মোট জমা'
              : kind === 'MARKET'
                ? 'মোট বাজার খরচ'
                : 'মোট অতিরিক্ত খরচ'}
          </span>
          <strong>{money(total)}</strong>
        </div>
        <Badge>{rows.length}টি লেনদেন</Badge>
        {type === 'expense' && kind === 'EXTRA' && (
          <span className="muted">
            জনপ্রতি গড় {money(total / (view.summary.participants || 1))}
          </span>
        )}
      </div>
      <Card>
        {type === 'expense' && (
          <div className="tabs">
            <button
              className={kind === 'MARKET' ? 'tab-active' : ''}
              onClick={() => setKind('MARKET')}
            >
              <ShoppingBasket size={17} />
              বাজার খরচ
            </button>
            <button
              className={kind === 'EXTRA' ? 'tab-active' : ''}
              onClick={() => setKind('EXTRA')}
            >
              <ReceiptText size={17} />
              অতিরিক্ত খরচ
            </button>
          </div>
        )}
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="লেনদেন খুঁজুন"
              placeholder="নাম, বিবরণ বা রেফারেন্স খুঁজুন…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {type === 'deposit' && !personal && (
            <select
              aria-label="জমার সদস্য ফিল্টার"
              value={member}
              onChange={(e) => setMember(e.target.value)}
            >
              <option value="all">সব সদস্য</option>
              {view.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <span className="muted small">{filtered.length}টি রেকর্ড</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{type === 'deposit' ? 'সদস্য' : 'বিভাগ ও বিবরণ'}</th>
                <th>তারিখ</th>
                <th>{type === 'deposit' ? 'মাধ্যম / রেফারেন্স' : 'বিক্রেতা / রসিদ'}</th>
                <th className="num">পরিমাণ</th>
                <th>রেকর্ড করেছেন</th>
                {!personal && <th className="num">কাজ</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    {'memberId' in r ? (
                      <div className="person-cell">
                        <Avatar person={view.people.find((p) => p.id === r.memberId)!} small />
                        <div>
                          <strong>{view.people.find((p) => p.id === r.memberId)?.name}</strong>
                          <small>{r.note}</small>
                        </div>
                      </div>
                    ) : (
                      <>
                        <strong>{r.category}</strong>
                        <span className="tiny-note">{r.description}</span>
                      </>
                    )}
                  </td>
                  <td>{dateLabel(r.date)}</td>
                  <td>
                    {'method' in r ? (
                      <>
                        <Badge tone="blue">{r.method}</Badge>
                        <span className="tiny-note">{r.reference || '—'}</span>
                      </>
                    ) : (
                      <>
                        {r.vendor || '—'}
                        {r.receipt && (
                          <button className="text-link" onClick={() => setReceipt(r.receipt!)}>
                            <FileImage size={14} />
                            রসিদ দেখুন
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  <td className="num">
                    <strong>{money(r.amount)}</strong>
                  </td>
                  <td>
                    <span>
                      {view.people.find((p) => p.id === r.recordedBy)?.name ??
                        view.managers.find((p) => p.id === r.recordedBy)?.name ??
                        'ম্যানেজার'}
                    </span>
                    <span className="tiny-note">{timestamp(r.updatedAt)}</span>
                  </td>
                  {!personal && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          aria-label={`${r.id} সম্পাদনা`}
                          onClick={() => setEditing(r)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          disabled={pending}
                          className="icon-btn danger-icon"
                          aria-label={`${r.id} মুছুন`}
                          onClick={() => remove(r)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty />}
        </div>
      </Card>
      {editing !== undefined && (
        <RecordForm
          view={view}
          type={type}
          initial={editing}
          defaultKind={kind}
          close={() => setEditing(undefined)}
        />
      )}{' '}
      {receipt && (
        <Modal title="স্থানীয় ডেমো রসিদ" onClose={() => setReceipt(null)}>
          <div className="modal-body">
            <Image
              unoptimized
              width={500}
              height={650}
              className="receipt-preview"
              src={receipt}
              alt="খরচের রসিদ"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
function RecordForm({
  view,
  type,
  initial,
  defaultKind,
  close,
}: {
  view: MonthView;
  type: 'deposit' | 'expense';
  initial: RecordRow | null;
  defaultKind: 'MARKET' | 'EXTRA';
  close: () => void;
}) {
  const { repo, context } = useDemo();
  const { run, pending, error } = useMutation();
  const key = useRef(crypto.randomUUID());
  const [amount, setAmount] = useState(initial ? String(initial.amount / 100) : '');
  const [date, setDate] = useState(initial?.date ?? monthDates(view.calendar).at(-1)!);
  const [member, setMember] = useState(
    initial && 'memberId' in initial ? initial.memberId : (view.people[0]?.id ?? ''),
  );
  const [method, setMethod] = useState(initial && 'method' in initial ? initial.method : 'নগদ');
  const [reference, setReference] = useState(
    initial && 'reference' in initial ? initial.reference : '',
  );
  const [note, setNote] = useState(initial && 'note' in initial ? initial.note : '');
  const [kind, setKind] = useState(initial && 'kind' in initial ? initial.kind : defaultKind);
  const [category, setCategory] = useState(
    initial && 'category' in initial
      ? initial.category
      : defaultKind === 'MARKET'
        ? 'সাপ্তাহিক বাজার'
        : 'বাবুর্চির বেতন',
  );
  const [description, setDescription] = useState(
    initial && 'description' in initial ? initial.description : '',
  );
  const [vendor, setVendor] = useState(initial && 'vendor' in initial ? initial.vendor : '');
  const [receipt, setReceipt] = useState(
    initial && 'receipt' in initial ? initial.receipt : undefined,
  );
  const [fileError, setFileError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const done = await run(async () => {
      const record: RecordRequest['record'] =
        type === 'deposit'
          ? {
              type,
              body: {
                memberId: member,
                amount: decimalUnits(amount, 2),
                date,
                method,
                reference,
                note,
              },
            }
          : {
              type,
              body: {
                kind,
                category,
                amount: decimalUnits(amount, 2),
                date,
                description,
                vendor,
                receipt,
              },
            };
      await repo.saveRecord(context, {
        record,
        id: initial?.id,
        expectedRevision: view.revision,
        idempotencyKey: key.current,
      });
    });
    if (done) close();
  };
  return (
    <Modal
      title={`${initial ? 'সংশোধন' : 'নতুন'} ${type === 'deposit' ? 'জমা' : 'খরচ'}`}
      onClose={() => {
        if (!pending) close();
      }}
    >
      <form className="modal-body form" onSubmit={submit}>
        {type === 'deposit' ? (
          <Field label="সদস্য">
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              {view.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="form-grid">
            <Field label="খরচের ধরন">
              <select value={kind} onChange={(e) => setKind(e.target.value as 'MARKET' | 'EXTRA')}>
                <option value="MARKET">বাজার</option>
                <option value="EXTRA">অতিরিক্ত</option>
              </select>
            </Field>
            <Field label="বিভাগ">
              <input
                required
                list="categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="categories">
                {[
                  'চাল ও ডাল',
                  'মাছ ও মাংস',
                  'সাপ্তাহিক বাজার',
                  'সবজি ও মসলা',
                  'বাবুর্চির বেতন',
                  'গ্যাস',
                  'বিদ্যুৎ',
                  'ইন্টারনেট',
                  'পরিচ্ছন্নতা',
                  'অন্যান্য',
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </datalist>
            </Field>
          </div>
        )}
        <div className="form-grid">
          <Field label="পরিমাণ (৳)" hint="সর্বোচ্চ দুই ঘর দশমিক">
            <input
              required
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="তারিখ">
            <input
              required
              type="date"
              value={date}
              min={`${view.calendar}-01`}
              max={monthDates(view.calendar).at(-1)}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        {type === 'deposit' ? (
          <>
            <div className="form-grid">
              <Field label="পেমেন্ট মাধ্যম">
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {['নগদ', 'বিকাশ', 'নগদ মোবাইল', 'ব্যাংক'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="রেফারেন্স (ঐচ্ছিক)">
                <input value={reference} onChange={(e) => setReference(e.target.value)} />
              </Field>
            </div>
            <Field label="নোট (ঐচ্ছিক)">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </Field>
          </>
        ) : (
          <>
            <Field label="বিবরণ">
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="বিক্রেতা (ঐচ্ছিক)">
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </Field>
            <Field
              label="রসিদ (ঐচ্ছিক)"
              hint="PNG, JPEG বা WebP · সর্বোচ্চ 2 MB · কোথাও আপলোড হবে না"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 2 * 1024 * 1024 ||
                    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
                  ) {
                    setFileError('2 MB-এর মধ্যে PNG, JPEG বা WebP দিন।');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setReceipt(String(reader.result));
                    setFileError('');
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            {receipt && (
              <div className="receipt-local">
                <Badge tone="success">স্থানীয় রসিদ যুক্ত আছে</Badge>
                <Button variant="ghost" type="button" onClick={() => setReceipt(undefined)}>
                  সরান
                </Button>
              </div>
            )}
          </>
        )}
        {(error || fileError) && <Alert tone="danger">{error || fileError}</Alert>}
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={pending} onClick={close}>
            বাতিল
          </Button>
          <Button disabled={pending || !!fileError} type="submit">
            {pending ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
