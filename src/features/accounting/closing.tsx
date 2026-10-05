'use client';
import { useConfirm } from '@/components/ui/confirmation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, LockKeyhole } from 'lucide-react';
import { MonthView } from '@/domain/models';
import { useDemo, useMutation } from '@/features/demo/provider';
import { Button, Card, PageHeading, Badge, Alert, Field } from '@/components/ui';
import { AccountsTable } from './components';
import { monthLabel, money } from '@/lib/format';
import { nextCalendar } from '@/domain/dates';
export function Closing({ view }: { view: MonthView }) {
  const [first, setFirst] = useState(view.people[2]?.id ?? '');
  const [second, setSecond] = useState(view.people[3]?.id ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const ask = useConfirm();
  const { repo, context } = useDemo();
  const { run, pending, error } = useMutation();
  const key = useRef(crypto.randomUUID());
  const router = useRouter();
  const summary = view.summary;
  const missing = summary.missingMeals + summary.missingCook;
  const reconcile =
    summary.mealAllocated === summary.market && summary.extraAllocated === summary.extra;
  const invalid =
    missing > 0 || !!summary.error || !reconcile || first === second || !first || !second;
  const close = async () => {
    if (
      !(await ask(
        `${monthLabel(view.calendar)} চূড়ান্ত করে বন্ধ করবেন? মিল, জমা, খরচ ও নিয়ম এরপর আর সম্পাদনা করা যাবে না।`,
      ))
    )
      return;
    const ok = await run(
      () =>
        repo.close(context, {
          expectedRevision: view.revision,
          idempotencyKey: key.current,
          nextManagers: [first, second],
        }),
      'মাস বন্ধ হয়েছে। পরের মাসে নতুন দুই ম্যানেজারের দায়িত্ব শুরু।',
    );
    if (ok)
      router.push(view.statements.every((s) => s.balance === 0) ? '/my/statement' : '/settlements');
  };
  return (
    <>
      <PageHeading
        title="মাস বন্ধ ও দায়িত্ব হস্তান্তর"
        eyebrow={monthLabel(view.calendar)}
        description="একবার চূড়ান্ত হলে এই মাসের হিসাব অপরিবর্তনীয় থাকবে। প্রতিটি ধাপ পর্যালোচনা করুন।"
      >
        <Badge tone="warning">
          <LockKeyhole size={14} />
          চূড়ান্ত করার আগে যাচাই
        </Badge>
      </PageHeading>
      <div className="closing-checks">
        <Card className="padded">
          <div className="check-title">
            {missing ? (
              <AlertTriangle size={22} className="warning-text" />
            ) : (
              <CheckCircle2 size={22} className="positive" />
            )}
            <h3>মিল ও উপস্থিতি</h3>
          </div>
          <strong className="check-number">{missing}টি অসম্পূর্ণ</strong>
          <p>
            {summary.missingMeals}টি মিল · {summary.missingCook}টি বাবুর্চির রেকর্ড
          </p>
          {missing > 0 ? (
            <Link href="/meals/overview" className="text-link">
              অসম্পূর্ণ তথ্য সমাধান করুন
              <ArrowRight size={15} />
            </Link>
          ) : (
            <Badge tone="success">সব তথ্য সম্পূর্ণ</Badge>
          )}
        </Card>
        <Card className="padded">
          <div className="check-title">
            <ShieldCheck size={22} className="positive" />
            <h3>রাউন্ডিং যাচাই</h3>
          </div>
          <p>
            বাজার বরাদ্দ: {money(summary.mealAllocated)} / {money(summary.market)}
          </p>
          <p>
            অতিরিক্ত বরাদ্দ: {money(summary.extraAllocated)} / {money(summary.extra)}
          </p>
          <Badge tone={reconcile ? 'success' : 'danger'}>
            {reconcile ? 'প্রতিটি পয়সা মিলেছে' : 'বরাদ্দে ত্রুটি আছে'}
          </Badge>
        </Card>
        <Card className="padded">
          <div className="check-title">
            <CheckCircle2 size={22} className="positive" />
            <h3>মাসের নিয়ম</h3>
          </div>
          <p>
            {view.participants.length} জন অংশগ্রহণকারী · {view.rules.slots.length}টি মিল স্লট
          </p>
          <p>
            ন্যূনতম {view.rules.minimumEnabled ? `${view.rules.minimumPercent}%` : 'বন্ধ'} · বাসায়
            থাকা {view.rules.homeTracking ? 'চালু' : 'বন্ধ'}
          </p>
          <Link href="/settings" className="text-link">
            নিয়ম দেখুন
            <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
      {summary.error && <Alert tone="danger">{summary.error}</Alert>}
      <Card>
        <div className="card-heading">
          <div>
            <h3>চূড়ান্ত করার জন্য সদস্যদের হিসাব</h3>
            <p>হিসাব স্থির হবে; নিষ্পত্তির টাকা এই মাসের লেনদেনেই থাকবে।</p>
          </div>
        </div>
        <AccountsTable view={view} />
      </Card>
      <Card className="padded handover-card">
        <div>
          <span className="eyebrow">পরবর্তী ধাপ</span>
          <h2>{monthLabel(nextCalendar(view.calendar))}-এর ম্যানেজার</h2>
          <p className="muted">
            দুইজন ভিন্ন সদস্য নির্বাচন করুন। অংশগ্রহণ ও নিয়ম পরের মাসে প্রাথমিক সেটিংস হবে; জমা,
            খরচ ও ব্যালেন্স শূন্য থেকে শুরু হবে।
          </p>
        </div>
        <div className="form-grid">
          <Field label="প্রথম ম্যানেজার">
            <select
              aria-label="পরের প্রথম ম্যানেজার"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            >
              {view.people.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="দ্বিতীয় ম্যানেজার">
            <select
              aria-label="পরের দ্বিতীয় ম্যানেজার"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            >
              {view.people.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {first === second && <Alert tone="danger">দুইজন ভিন্ন ম্যানেজার নির্বাচন করুন।</Alert>}
        <label className="confirm-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          আমি সদস্য, মিল, খরচ ও জমার হিসাব পর্যালোচনা করেছি। বন্ধ হলে আর পরিবর্তন করা যাবে না।
        </label>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button disabled={pending || invalid || !confirmed} onClick={close}>
          <LockKeyhole size={17} />
          {pending ? 'মাস চূড়ান্ত হচ্ছে…' : 'মাস বন্ধ ও হস্তান্তর করুন'}
        </Button>
      </Card>
    </>
  );
}
