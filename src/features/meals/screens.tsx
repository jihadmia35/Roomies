'use client';
import { useConfirm } from '@/components/ui/confirmation';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Copy,
  Home,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { MonthView, Meal, Cook } from '@/domain/models';
import { DayUpdate } from '@/data/contracts';
import { useDemo, useMutation } from '@/features/demo/provider';
import { Button, Card, PageHeading, Field, Badge, Alert, Avatar } from '@/components/ui';
import { decimalUnits, meals, dateLabel, timestamp, monthLabel } from '@/lib/format';
import { monthDates, shiftDate } from '@/domain/dates';
import { MealExplanation } from '@/features/accounting/components';
type Draft = Pick<Meal, 'memberId' | 'slotId' | 'isHome' | 'recorded'> & { value: string };
function draftTotal(entries: Draft[], cooks: Cook[], memberId: string): number {
  return entries
    .filter((e) => e.memberId === memberId)
    .reduce((total, e) => {
      if (e.isHome || cooks.find((c) => c.slotId === e.slotId)?.available === false || !e.recorded)
        return total;
      try {
        return total + decimalUnits(e.value, 3);
      } catch {
        return total;
      }
    }, 0);
}
function drafts(view: MonthView, date: string): Draft[] {
  return view.participants.flatMap((p) =>
    view.rules.slots.map((s) => {
      const m = view.meals.find(
        (m) => m.memberId === p.memberId && m.date === date && m.slotId === s.id,
      );
      return {
        memberId: p.memberId,
        slotId: s.id,
        value: m?.recorded ? String(m.quantity / 1000) : '',
        isHome: m?.isHome ?? false,
        recorded: m?.recorded ?? false,
      };
    }),
  );
}
export function DailyMeals({ view }: { view: MonthView }) {
  const queryDate = useSearchParams().get('date');
  const [date, setDate] = useState(
    queryDate && monthDates(view.calendar).includes(queryDate)
      ? queryDate
      : `${view.calendar}-${view.calendar === '2026-09' ? '30' : '01'}`,
  );
  return <DailyEditor key={`${date}-${view.revision}`} view={view} date={date} setDate={setDate} />;
}
function DailyEditor({
  view,
  date,
  setDate,
}: {
  view: MonthView;
  date: string;
  setDate: (date: string) => void;
}) {
  const ask = useConfirm();
  const { repo, context } = useDemo();
  const { pending, run, error } = useMutation();
  const [entries, setEntries] = useState(() => drafts(view, date));
  const [cooks, setCooks] = useState<Cook[]>(() =>
    view.rules.slots.map((s) => ({
      date,
      slotId: s.id,
      available: view.rules.cookTracking
        ? (view.cooks.find((c) => c.date === date && c.slotId === s.id)?.available ?? null)
        : true,
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [ack, setAck] = useState(false);
  const [bulkMember, setBulkMember] = useState(view.participants[0]?.memberId ?? '');
  const [preset, setPreset] = useState('1');
  const change = (memberId: string, slotId: string, patch: Partial<Draft>) => {
    setEntries((old) =>
      old.map((e) => (e.memberId === memberId && e.slotId === slotId ? { ...e, ...patch } : e)),
    );
    setDirty(true);
  };
  const navigate = async (newDate: string) => {
    if (dirty && !(await ask('সংরক্ষণ না করা পরিবর্তন বাদ দিয়ে অন্য তারিখে যাবেন?'))) return;
    setDate(newDate);
  };
  const save = () =>
    run(async () => {
      const body: DayUpdate = {
        expectedRevision: view.revision,
        date,
        cooks,
        acknowledgeDiscard: ack,
        entries: entries.map((e) => ({
          memberId: e.memberId,
          slotId: e.slotId,
          isHome: e.isHome,
          recorded: e.recorded,
          quantity: e.recorded ? decimalUnits(e.value, 3) : 0,
        })),
      };
      await repo.updateDay(context, body);
      setDirty(false);
    }, 'দৈনিক মিল সংরক্ষিত। হিসাবও আপডেট হয়েছে।');
  const cookChange = async (slotId: string, available: boolean) => {
    if (!available && entries.some((e) => e.slotId === slotId && Number(e.value) > 0)) {
      if (
        !(await ask(
          'এই স্লটে খাওয়া মিল আছে। বাবুর্চি অনুপস্থিত করলে সব সদস্যের প্রকৃত মিল শূন্য হবে। নিশ্চিত?',
        ))
      )
        return;
      setAck(true);
      setEntries((old) =>
        old.map((e) => (e.slotId === slotId ? { ...e, value: e.recorded ? '0' : '' } : e)),
      );
    }
    setCooks((old) => old.map((c) => (c.slotId === slotId ? { ...c, available } : c)));
    setDirty(true);
  };
  return (
    <>
      <PageHeading
        eyebrow={monthLabel(view.calendar)}
        title="দৈনিক মিলের খাতা"
        description="প্রতিটি স্লটে খাওয়া মিল লিখুন। বাসায় থাকলে মিল স্বয়ংক্রিয়ভাবে শূন্য হবে।"
      >
        <Link className="btn btn-secondary" href="/meals/overview">
          মাসিক মিল দেখুন
        </Link>
      </PageHeading>
      <Card>
        <div className="meal-toolbar">
          <div className="date-nav">
            <Button
              aria-label="আগের দিন"
              variant="secondary"
              disabled={date === `${view.calendar}-01`}
              onClick={() => navigate(shiftDate(date, -1))}
            >
              <ChevronLeft size={17} />
            </Button>
            <Field label="মিলের তারিখ">
              <input
                type="date"
                aria-label="মিলের তারিখ"
                value={date}
                min={`${view.calendar}-01`}
                max={monthDates(view.calendar).at(-1)}
                onChange={(e) => {
                  if (e.target.value.startsWith(view.calendar)) navigate(e.target.value);
                }}
              />
            </Field>
            <Button
              aria-label="পরের দিন"
              variant="secondary"
              disabled={date === monthDates(view.calendar).at(-1)}
              onClick={() => navigate(shiftDate(date, 1))}
            >
              <ChevronRight size={17} />
            </Button>
          </div>
          <div className="save-status">
            {dirty ? (
              <Badge tone="warning">সংরক্ষণ বাকি</Badge>
            ) : (
              <Badge tone="success">
                <CheckCircle2 size={13} />
                সংরক্ষিত তথ্য
              </Badge>
            )}
            <Button disabled={pending || !dirty} onClick={save}>
              <Save size={16} />
              {pending ? 'সংরক্ষণ হচ্ছে…' : 'মিল সংরক্ষণ'}
            </Button>
          </div>
        </div>
        <div className="bulk-toolbar">
          <Button
            variant="secondary"
            disabled={date === `${view.calendar}-01`}
            onClick={async () => {
              if (
                !(await ask(
                  'আগের দিনের মিল দিয়ে আজকের সব পরিমাণ বদলাবেন? আজকের বাসায় থাকা ও বাবুর্চির তথ্য বজায় থাকবে।',
                ))
              )
                return;
              const previous = drafts(view, shiftDate(date, -1));
              setEntries((old) =>
                old.map((e) => {
                  const p = previous.find(
                    (p) => p.memberId === e.memberId && p.slotId === e.slotId,
                  );
                  return {
                    ...e,
                    value: e.isHome ? '0' : (p?.value ?? ''),
                    recorded: e.isHome || !!p?.recorded,
                  };
                }),
              );
              setDirty(true);
            }}
          >
            <Copy size={15} />
            আগের দিন থেকে কপি
          </Button>
          {view.rules.homeTracking && (
            <>
              <select
                aria-label="পুরো দিন বাসায় থাকার সদস্য"
                value={bulkMember}
                onChange={(e) => setBulkMember(e.target.value)}
              >
                {view.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (
                    !(await ask(
                      'নির্বাচিত সদস্যের পুরো দিনের মিল শূন্য ও বাসায় থাকা হিসেবে চিহ্নিত করবেন?',
                    ))
                  )
                    return;
                  setEntries((old) =>
                    old.map((e) =>
                      e.memberId === bulkMember
                        ? { ...e, isHome: true, value: '0', recorded: true }
                        : e,
                    ),
                  );
                  setDirty(true);
                }}
              >
                <Home size={15} />
                পুরো দিন বাসায়
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              if (
                !(await ask(
                  'আজকের অনথিভুক্ত মিলগুলো নিশ্চিত শূন্য হিসেবে লিখবেন? অনথিভুক্ত বাবুর্চির স্লট উপস্থিত হবে।',
                ))
              )
                return;
              setEntries((old) =>
                old.map((e) => (e.recorded ? e : { ...e, value: '0', recorded: true })),
              );
              setCooks((old) =>
                old.map((c) => (c.available === null ? { ...c, available: true } : c)),
              );
              setDirty(true);
            }}
          >
            অসম্পূর্ণ তথ্য পূরণ
          </Button>
        </div>
        <div className="quantity-presets">
          <span>দ্রুত পরিমাণ নির্বাচন:</span>
          {['0', '0.3', '0.5', '1', '1.5', '2'].map((v) => (
            <button
              key={v}
              aria-pressed={preset === v}
              className={preset === v ? 'preset-active' : ''}
              onClick={() => setPreset(v)}
            >
              {v}
            </button>
          ))}
          <small>একটি স্লটের দ্রুত বোতামে চাপলে এই পরিমাণ বসবে। নিজেও দশমিক লিখতে পারেন।</small>
        </div>
        <div className="table-wrap meal-table-wrap">
          <table className="meal-table">
            <thead>
              <tr>
                <th className="sticky-member">
                  সদস্য <small>{view.participants.length} জন অংশগ্রহণকারী</small>
                </th>
                {view.rules.slots.map((s) => (
                  <th key={s.id}>
                    <div className="slot-header">
                      <strong>{s.label}</strong>
                      {view.rules.cookTracking ? (
                        <select
                          aria-label={`${s.label} বাবুর্চি`}
                          value={
                            cooks.find((c) => c.slotId === s.id)?.available === null
                              ? ''
                              : String(cooks.find((c) => c.slotId === s.id)?.available)
                          }
                          onChange={(e) => cookChange(s.id, e.target.value === 'true')}
                        >
                          <option value="" disabled>
                            অনথিভুক্ত
                          </option>
                          <option value="true">বাবুর্চি উপস্থিত</option>
                          <option value="false">বাবুর্চি অনুপস্থিত</option>
                        </select>
                      ) : (
                        <Badge>বাবুর্চি ট্র্যাকিং বন্ধ</Badge>
                      )}
                    </div>
                  </th>
                ))}
                <th className="num">মোট মিল</th>
              </tr>
            </thead>
            <tbody>
              {view.people.map((p) => (
                <tr key={p.id}>
                  <td className="sticky-member">
                    <div className="person-cell">
                      <Avatar person={p} />
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  {view.rules.slots.map((s) => {
                    const entry = entries.find((e) => e.memberId === p.id && e.slotId === s.id)!;
                    const disabled =
                      entry.isHome || cooks.find((c) => c.slotId === s.id)?.available === false;
                    const original = view.meals.find(
                      (m) => m.memberId === p.id && m.date === date && m.slotId === s.id,
                    );
                    return (
                      <td key={s.id}>
                        <div className="meal-cell">
                          <div className="meal-input-row">
                            <input
                              aria-label={`${p.name} ${s.label} মিল`}
                              inputMode="decimal"
                              disabled={disabled}
                              value={disabled ? '0' : entry.value}
                              placeholder="অনথিভুক্ত"
                              onChange={(e) =>
                                change(p.id, s.id, {
                                  value: e.target.value,
                                  recorded: e.target.value !== '',
                                })
                              }
                            />
                            <button
                              aria-label={`${p.name} ${s.label} দ্রুত মিল`}
                              title={`${preset} মিল বসান`}
                              className="quick-quantity"
                              disabled={disabled}
                              onClick={() => change(p.id, s.id, { value: preset, recorded: true })}
                            >
                              {preset}
                            </button>
                          </div>
                          {view.rules.homeTracking && (
                            <label className="home-toggle">
                              <input
                                aria-label={`${p.name} ${s.label} বাসায়`}
                                type="checkbox"
                                checked={entry.isHome}
                                onChange={(e) =>
                                  change(p.id, s.id, {
                                    isHome: e.target.checked,
                                    ...(e.target.checked ? { value: '0', recorded: true } : {}),
                                  })
                                }
                              />
                              <Home size={13} />
                              বাসায়
                            </label>
                          )}
                          <small className={entry.recorded ? 'entry-note' : 'entry-note missing'}>
                            {entry.isHome
                              ? 'বাসায় · মিল শূন্য'
                              : !entry.recorded
                                ? 'অনথিভুক্ত'
                                : Number(entry.value) === 0
                                  ? 'নিশ্চিত শূন্য'
                                  : 'লেখা হয়েছে'}
                          </small>
                          {original && (
                            <span
                              className="updater"
                              title={`${view.people.find((p) => p.id === original.recordedBy)?.name ?? original.recordedBy} · ${timestamp(original.updatedAt)}`}
                            >
                              {
                                view.people
                                  .find((p) => p.id === original.recordedBy)
                                  ?.name.split(' ')[0]
                              }{' '}
                              · {dateLabel(original.updatedAt.slice(0, 10))}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="num">
                    <strong>{meals(draftTotal(entries, cooks, p.id))}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <AlertCircle size={15} />
          অনথিভুক্ত ও নিশ্চিত শূন্য আলাদা। অনথিভুক্ত রেকর্ড রেখে মাস বন্ধ করা যাবে না।
        </div>
      </Card>
      {error && <Alert tone="danger">{error}</Alert>}
    </>
  );
}
export function MealOverview({ view, personal = false }: { view: MonthView; personal?: boolean }) {
  const [member, setMember] = useState(personal ? view.context.userId : 'all');
  const [filter, setFilter] = useState('all');
  const ask = useConfirm();
  const { repo, context } = useDemo();
  const { run, pending } = useMutation();
  const dates = monthDates(view.calendar);
  const completeEntries = view.participants.flatMap((p) =>
    dates.flatMap((date) =>
      view.rules.slots.map(
        (slot) =>
          view.meals.find(
            (m) => m.memberId === p.memberId && m.date === date && m.slotId === slot.id,
          ) ?? {
            memberId: p.memberId,
            date,
            slotId: slot.id,
            quantity: 0,
            isHome: false,
            recorded: false,
            recordedBy: '',
            createdAt: '',
            updatedAt: '',
          },
      ),
    ),
  );
  const selected = completeEntries.filter(
    (m) =>
      (member === 'all' || m.memberId === member) &&
      (filter === 'all' ||
        (filter === 'home' && m.isHome) ||
        (filter === 'missing' && !m.recorded)),
  );
  const rows = dates
    .map((date) => ({ date, entries: selected.filter((m) => m.date === date) }))
    .filter((r) => filter === 'all' || r.entries.length);
  const resolveAll = async () => {
    if (
      !(await ask(
        'পুরো মাসের সব অনথিভুক্ত মিল নিশ্চিত শূন্য এবং অনথিভুক্ত বাবুর্চির স্লট উপস্থিত হিসেবে লিখবেন? এটি শুধু না-লেখা তথ্য পূরণ করবে।',
      ))
    )
      return;
    run(async () => {
      let revision = view.revision;
      for (const date of dates) {
        const entries = drafts(view, date).filter((e) => !e.recorded);
        const cooks = view.rules.slots
          .filter(
            (s) =>
              view.rules.cookTracking &&
              !view.cooks.some((c) => c.date === date && c.slotId === s.id && c.available !== null),
          )
          .map((s) => ({ date, slotId: s.id, available: true }));
        if (entries.length || cooks.length) {
          const result = await repo.updateDay(context, {
            expectedRevision: revision,
            date,
            cooks,
            entries: entries.map((e) => ({
              memberId: e.memberId,
              slotId: e.slotId,
              isHome: e.isHome,
              quantity: 0,
              recorded: true,
            })),
            acknowledgeDiscard: false,
          });
          revision = result.revision;
        }
      }
    }, 'মাসের অসম্পূর্ণ তথ্য নিশ্চিতভাবে পূরণ হয়েছে।');
  };
  return (
    <>
      <PageHeading
        eyebrow={monthLabel(view.calendar)}
        title={personal ? 'আমার মিলের খাতা' : 'মাসিক মিলের সারাংশ'}
        description="প্রকৃত খাবার, বাসায় থাকা ও ন্যূনতম মিলের হিসাব আলাদাভাবে দেখুন।"
      >
        {!personal && (
          <Link href="/meals/daily" className="btn btn-primary">
            দৈনিক মিল লিখুন
          </Link>
        )}
      </PageHeading>
      {personal && (
        <div className="personal-meal-explanation">
          <MealExplanation
            view={view}
            statement={view.statements.find((s) => s.memberId === view.context.userId)!}
          />
        </div>
      )}
      {!personal && view.summary.missingMeals + view.summary.missingCook > 0 && (
        <Alert>
          {view.summary.missingMeals}টি মিল ও {view.summary.missingCook}টি বাবুর্চির স্লট অনথিভুক্ত।{' '}
          <Button variant="secondary" disabled={pending} onClick={resolveAll}>
            {pending ? 'পূরণ হচ্ছে…' : 'সব অনথিভুক্ত তথ্য নিশ্চিত করুন'}
          </Button>
        </Alert>
      )}
      <Card>
        <div className="filter-toolbar">
          <Filter size={16} />
          {!personal && (
            <select
              aria-label="মিলের সদস্য ফিল্টার"
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
          <select
            aria-label="মিলের অবস্থা"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">সব তথ্য</option>
            {view.rules.homeTracking && <option value="home">বাসায় থাকা</option>}
            <option value="missing">অনথিভুক্ত</option>
          </select>
          <Badge>
            {meals(selected.filter((m) => m.recorded).reduce((a, m) => a + m.quantity, 0))} প্রকৃত
            মিল
          </Badge>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>তারিখ</th>
                {view.rules.slots.map((s) => (
                  <th key={s.id} className="num">
                    {s.label}
                  </th>
                ))}
                <th className="num">মোট প্রকৃত মিল</th>
                <th className="num">বাসায় / অনথিভুক্ত</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <td>
                    {dateLabel(r.date)}
                    {!personal && (
                      <Link className="tiny-note text-link" href={`/meals/daily?date=${r.date}`}>
                        দৈনিক খাতায় সম্পাদনা
                      </Link>
                    )}
                  </td>
                  {view.rules.slots.map((s) => (
                    <td key={s.id} className="num">
                      {view.rules.cookTracking &&
                      view.cooks.some(
                        (c) => c.date === r.date && c.slotId === s.id && c.available === false,
                      ) ? (
                        <>
                          <Badge tone="warning">বাবুর্চি নেই</Badge>
                          {personal &&
                            view.rules.homeTracking &&
                            r.entries.some((e) => e.slotId === s.id && e.isHome) && (
                              <span className="tiny-note">বাসায়ও ছিলেন</span>
                            )}
                        </>
                      ) : personal &&
                        view.rules.homeTracking &&
                        r.entries.some((e) => e.slotId === s.id && e.isHome) ? (
                        <Badge tone="blue">বাসায় · 0</Badge>
                      ) : r.entries.some((e) => e.slotId === s.id && !e.recorded) ? (
                        <Badge tone="warning">অনথিভুক্ত</Badge>
                      ) : (
                        meals(
                          r.entries
                            .filter((e) => e.slotId === s.id && e.recorded)
                            .reduce((a, e) => a + e.quantity, 0),
                        )
                      )}
                    </td>
                  ))}
                  <td className="num">
                    <strong>
                      {meals(
                        r.entries.filter((e) => e.recorded).reduce((a, e) => a + e.quantity, 0),
                      )}
                    </strong>
                  </td>
                  <td className="num">
                    {view.rules.homeTracking ? r.entries.filter((e) => e.isHome).length : 0} /{' '}
                    {r.entries.filter((e) => !e.recorded).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
