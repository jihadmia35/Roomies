'use client';
import Link from 'next/link';
import { ArrowUpRight, Download, Printer } from 'lucide-react';
import { useDemo } from '@/features/demo/provider';
import { MonthView, Statement } from '@/domain/models';
import { Card, Avatar, Balance, Badge, Button, Empty } from '@/components/ui';
import { meals, money, dateLabel, monthLabel } from '@/lib/format';
export function AccountsTable({ view, search = '' }: { view: MonthView; search?: string }) {
  const items = view.statements.filter((s) =>
    view.people.find((p) => p.id === s.memberId)?.name.includes(search),
  );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>সদস্য</th>
            <th className="num">প্রকৃত মিল</th>
            <th className="num">বিলযোগ্য মিল</th>
            <th className="num">মোট জমা</th>
            <th className="num">মোট খরচ</th>
            <th className="num">ব্যালেন্স</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const p = view.people.find((p) => p.id === s.memberId)!;
            return (
              <tr key={s.memberId}>
                <td>
                  <div className="person-cell">
                    <Avatar person={p} small />
                    <strong>{p.name}</strong>
                    {view.managers.some((m) => m.id === p.id) && (
                      <span className="manager-dot" title="ম্যানেজার" />
                    )}
                  </div>
                </td>
                <td className="num">{meals(s.actual)}</td>
                <td className="num">
                  {meals(s.billable)}
                  {s.additional > 0 && (
                    <span className="tiny-note">+{meals(s.additional)} ন্যূনতম</span>
                  )}
                </td>
                <td className="num">{money(s.deposits)}</td>
                <td className="num">{money(s.totalCost)}</td>
                <td className="num">
                  <Balance value={s.balance} />
                </td>
                <td>
                  <Link
                    aria-label={`${p.name} এর হিসাব`}
                    className="table-link"
                    href={`/accounts/${p.id}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!items.length && <Empty title="কোনো সদস্য পাওয়া যায়নি" />}
    </div>
  );
}
export function StatementDetail({ view, statement }: { view: MonthView; statement: Statement }) {
  const { session } = useDemo();
  const person = view.people.find((p) => p.id === statement.memberId)!;
  const download = () => {
    const rows = [
      [
        'Month',
        'Member',
        'Actual meals',
        'Billable meals',
        'Deposits BDT',
        'Meal cost BDT',
        'Extra cost BDT',
        'Balance BDT',
      ],
      [
        view.calendar,
        person.name,
        meals(statement.actual),
        meals(statement.billable),
        (statement.deposits / 100).toFixed(2),
        (statement.mealCost / 100).toFixed(2),
        (statement.extraCost / 100).toFixed(2),
        (statement.balance / 100).toFixed(2),
      ],
    ];
    const blob = new Blob(
      [
        '\uFEFF' +
          rows
            .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
            .join('\n'),
      ],
      { type: 'text/csv;charset=utf-8;' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messkhata-${view.calendar}-${person.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="statement-toolbar">
        <Badge tone={view.status === 'OPEN' ? 'warning' : 'success'}>
          {view.status === 'OPEN'
            ? 'প্রাথমিক হিসাব · পরিবর্তন হতে পারে'
            : 'চূড়ান্ত ও অপরিবর্তনীয় হিসাব'}
        </Badge>
        <div className="button-group">
          <Button variant="secondary" onClick={download}>
            <Download size={16} />
            CSV নামান
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} />
            প্রিন্ট
          </Button>
        </div>
      </div>
      <div className="statement-layout">
        <Card className="statement-card">
          <div className="statement-brand">
            <div>
              <span className="eyebrow">মেসখাতা / মাসিক বিবরণী</span>
              <h2>{person.name}</h2>
              <p>
                {monthLabel(view.calendar)} · {session?.mess.name ?? 'সুবর্ণ মেস'}
              </p>
            </div>
            <Avatar person={person} />
          </div>
          <div className="statement-lines">
            <div>
              <span>বিলযোগ্য মিল</span>
              <strong>{meals(statement.billable)} মিল</strong>
            </div>
            <div>
              <span>শেয়ার করা মিল রেট</span>
              <strong>{money(view.summary.rate)} / মিল</strong>
            </div>
            <div>
              <span>
                খাবারের খরচ <small>(অপরিবর্তিত রেট থেকে হিসাব)</small>
              </span>
              <strong>{money(statement.mealCost)}</strong>
            </div>
            <div>
              <span>অতিরিক্ত খরচের সমান ভাগ</span>
              <strong>{money(statement.extraCost)}</strong>
            </div>
            <div className="line-total">
              <strong>মোট খরচ</strong>
              <strong>{money(statement.totalCost)}</strong>
            </div>
            <div>
              <span>আপনার মোট জমা</span>
              <strong>{money(statement.deposits)}</strong>
            </div>
          </div>
          <div className={`statement-balance ${statement.balance < 0 ? 'owed' : 'refund'}`}>
            <div>
              <span>
                {statement.balance < 0
                  ? 'আপনার দিতে হবে'
                  : statement.balance > 0
                    ? 'আপনি ফেরত পাবেন'
                    : 'হিসাব সমান'}
              </span>
              <h2>{money(Math.abs(statement.balance))}</h2>
            </div>
            <Badge tone={statement.balance < 0 ? 'danger' : 'success'}>
              {statement.balance < 0
                ? 'বকেয়া'
                : statement.balance > 0
                  ? 'ফেরতযোগ্য'
                  : 'কোনো বকেয়া নেই'}
            </Badge>
          </div>
          <p className="muted small">
            ব্যালেন্স = মোট জমা − মোট খরচ। রাউন্ডিংয়ের পরে সব সদস্যের খরচ মিলে মেসের মোট খরচের
            সমান।
          </p>
          {view.snapshotAt && (
            <p className="muted small">
              চূড়ান্ত করা হয়েছে: {dateLabel(view.snapshotAt.slice(0, 10))}
            </p>
          )}
        </Card>
        <MealExplanation view={view} statement={statement} />
      </div>
    </>
  );
}
export function MealExplanation({ view, statement: s }: { view: MonthView; statement: Statement }) {
  return (
    <Card className="padded">
      <span className="eyebrow">আপনার মিলের হিসাব</span>
      <h3>প্রকৃত থেকে বিলযোগ্য</h3>
      <div className="explanation-list">
        <div>
          <span>খেয়েছেন</span>
          <strong>{meals(s.actual)} মিল</strong>
        </div>
        <div>
          <span>বাসায় ছিলেন</span>
          <strong>{s.homeSlots} স্লট</strong>
        </div>
        <div>
          <span>যোগ্য স্লট</span>
          <strong>{s.eligibleSlots} স্লট</strong>
        </div>
        <div>
          <span>ন্যূনতম মিল ({view.rules.minimumEnabled ? view.rules.minimumPercent : 0}%)</span>
          <strong>{meals(s.minimum)} মিল</strong>
        </div>
        <div>
          <span>ন্যূনতমের জন্য বাড়তি</span>
          <strong>{meals(s.additional)} মিল</strong>
        </div>
        <div className="line-total">
          <strong>বিলযোগ্য মিল</strong>
          <strong>{meals(s.billable)} মিল</strong>
        </div>
      </div>
      <div className="info-box">
        {view.rules.minimumEnabled ? (
          <>
            পুরো মাসের যোগ্য স্লট × {view.rules.minimumPercent}% থেকে ভগ্নাংশ বাদ দিয়ে ন্যূনতম মিল
            নির্ধারণ করা হয়। খাওয়া মিল ও ন্যূনতম মিলের বড়টিই বিলযোগ্য।
          </>
        ) : (
          'এই মাসে ন্যূনতম মিল বন্ধ। আপনি যতটুকু খেয়েছেন, ততটুকুরই খাবারের বিল।'
        )}
      </div>
      <p className="muted small">
        একই স্লটে বাবুর্চি অনুপস্থিত ও সদস্য বাসায় থাকলে স্লটটি একবারই বাদ যায়। যোগদানের তারিখ
        ন্যূনতম মিল কমায় না।
      </p>
    </Card>
  );
}
