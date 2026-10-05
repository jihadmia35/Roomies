'use client';
import Link from 'next/link';
import { Calculator, ReceiptText, Utensils, Users } from 'lucide-react';
import { MonthView } from '@/domain/models';
import { Alert, Badge, Card } from '@/components/ui';
import { meals, money } from '@/lib/format';

/** Display the authoritative allocated extra shares, including any one-paisa remainder. */
export function AccountsOverview({ view }: { view: MonthView }) {
  const { summary, rules } = view;
  const shares = view.statements.map((s) => s.extraCost);
  const lowest = shares.length ? Math.min(...shares) : 0;
  const highest = shares.length ? Math.max(...shares) : 0;
  const extraPerPerson = !summary.participants
    ? '—'
    : lowest === highest
      ? money(lowest)
      : `${money(lowest)}–${money(highest)}`;
  const totalCost = summary.market + summary.extra;
  const missing = summary.missingMeals + summary.missingCook;
  const cards = [
    {
      label: 'প্রতি মিলের রেট',
      value: summary.billable > 0 && !summary.error ? money(summary.rate) : '—',
      icon: Utensils,
      tone: 'mint',
      note: `${money(summary.market)} বাজার ÷ ${meals(summary.billable)} বিলযোগ্য মিল`,
    },
    {
      label: 'জনপ্রতি অতিরিক্ত খরচ',
      value: extraPerPerson,
      icon: Users,
      tone: 'purple',
      note: `${money(summary.extra)} অতিরিক্ত খরচ ÷ ${summary.participants} জন`,
    },
    {
      label: 'মোট বিলযোগ্য মিল',
      value: `${meals(summary.billable)} মিল`,
      icon: Calculator,
      tone: 'blue',
      note: `খাওয়া ${meals(summary.actual)} + ন্যূনতমের বাড়তি ${meals(summary.billable - summary.actual)} মিল`,
    },
    {
      label: 'মেসের মোট খরচ',
      value: money(totalCost),
      icon: ReceiptText,
      tone: 'amber',
      note: `বাজার ${money(summary.market)} + অতিরিক্ত ${money(summary.extra)}`,
    },
  ];
  return (
    <section className="accounts-overview" aria-label="মাসের হিসাবের সারসংক্ষেপ">
      <div className="stat-grid accounts-stat-grid">
        {cards.map((card) => (
          <Card key={card.label} className="stat-card">
            <div className="stat-top">
              <span>{card.label}</span>
              <span className={`stat-icon ${card.tone}`}>
                <card.icon size={19} />
              </span>
            </div>
            <strong className="stat-value">{card.value}</strong>
            <p className="accounts-stat-note">{card.note}</p>
          </Card>
        ))}
      </div>
      {summary.error && (
        <Alert tone="danger">
          <strong>হিসাব সম্পূর্ণ করা দরকার।</strong> {summary.error}{' '}
          {view.role === 'MANAGER' && (
            <Link className="text-link" href={summary.participants ? '/meals/daily' : '/members'}>
              তথ্য সংশোধন করুন
            </Link>
          )}
        </Alert>
      )}
      <Card className="accounts-guide">
        <div className="accounts-guide-heading">
          <div>
            <h3>আপনার বিল যেভাবে হিসাব হয়</h3>
            <p>নিচের প্রতিটি সদস্যের সারিতে এই একই নিয়ম প্রযোজ্য।</p>
          </div>
          <Badge tone={view.status === 'OPEN' ? 'warning' : 'success'}>
            {view.status === 'OPEN' ? 'প্রাথমিক হিসাব' : 'চূড়ান্ত হিসাব'}
          </Badge>
        </div>
        <ol className="accounts-formulas">
          <li>
            <span className="formula-number">1</span>
            <div>
              <strong>বিলযোগ্য মিল</strong>
              <p>
                {rules.minimumEnabled
                  ? `খাওয়া মিল ও ন্যূনতম মিলের বড়টি। ন্যূনতম = পুরো মাসের যোগ্য স্লট × ${rules.minimumPercent}%, ভগ্নাংশ বাদ দিয়ে।`
                  : 'ন্যূনতম মিলের নিয়ম বন্ধ। যত মিল খেয়েছেন, ঠিক তত মিলের বিল।'}
              </p>
            </div>
          </li>
          <li>
            <span className="formula-number">2</span>
            <div>
              <strong>খাবারের খরচ</strong>
              <p>
                নিজের বিলযোগ্য মিল × মিল রেট। বাজারের পুরো খরচ সব সদস্যের মোট বিলযোগ্য মিল দিয়ে ভাগ
                হয়।
              </p>
            </div>
          </li>
          <li>
            <span className="formula-number">3</span>
            <div>
              <strong>মোট খরচ</strong>
              <p>
                খাবারের খরচ + জনপ্রতি অতিরিক্ত খরচ। বেতন, গ্যাস ও অন্যান্য খরচ এই মাসের{' '}
                {summary.participants} জনের সমান ভাগ।
              </p>
            </div>
          </li>
          <li>
            <span className="formula-number">4</span>
            <div>
              <strong>ব্যালেন্স</strong>
              <p>
                নিজের জমা − মোট খরচ। <span className="negative">ঋণাত্মক হলে দিতে হবে</span>;{' '}
                <span className="positive">ধনাত্মক হলে ফেরত পাবেন</span>। শূন্য হলে হিসাব সমান।
              </p>
            </div>
          </li>
        </ol>
        <div className="accounts-guide-notes">
          <p>
            {rules.minimumEnabled
              ? `ন্যূনতমের যোগ্য স্লট থেকে ${rules.cookTracking && rules.homeTracking ? 'বাবুর্চি না আসা বা সদস্য বাসায় থাকা স্লট একবার করে বাদ যায়' : rules.cookTracking ? 'বাবুর্চি না আসা স্লট বাদ যায়' : rules.homeTracking ? 'সদস্য বাসায় থাকা স্লট বাদ যায়' : 'কোনো স্লট বাদ যায় না, কারণ দুই ধরনের ট্র্যাকিং বন্ধ'}। মাঝমাসে যোগ দিলেও পুরো মাস ধরে ন্যূনতম হিসাব হয়। `
              : ''}
            অতিরিক্ত খরচে মাঝমাসে যোগ দেওয়া বা বাসায় থাকা সদস্যেরও সমান ভাগ।
          </p>
          <p>
            মিল রেট দেখানোর সময় দুই দশমিক করা হয়েছে; খরচ হিসাব হয় পূর্ণ নির্ভুল রেট দিয়ে। পয়সার
            ভাগশেষ মিলিয়ে কারও খরচ 1 পয়সা আলাদা হতে পারে; সবার খরচের যোগফল মেসের খরচের সমান।
            {lowest !== highest &&
              ' তাই জনপ্রতি অতিরিক্ত খরচ উপরে ছোট একটি সীমা হিসেবে দেখানো হয়েছে।'}
          </p>
        </div>
        <div className="accounts-reconciliation">
          <span>
            এই মাসে মোট জমা <strong>{money(summary.deposits)}</strong>
          </span>
          <span>
            সব সদস্যের খাবারের খরচ <strong>{money(summary.mealAllocated)}</strong>
          </span>
          <span>
            সব সদস্যের অতিরিক্ত খরচ <strong>{money(summary.extraAllocated)}</strong>
          </span>
        </div>
      </Card>
      {view.status === 'OPEN' ? (
        <p className="accounts-status-note">
          মাস চলমান: মিল, জমা বা খরচ বদলালে রেট ও ব্যালেন্সও বদলাবে।
          {missing > 0 &&
            ` এখনও ${summary.missingMeals}টি মিল ও ${summary.missingCook}টি বাবুর্চির রেকর্ড অসম্পূর্ণ; এগুলো নিশ্চিত হলে হিসাব আপডেট হবে।`}
        </p>
      ) : (
        <p className="accounts-status-note">
          এটি মাস বন্ধের সময়ের চূড়ান্ত বিল। পরের পেমেন্ট বা টাকা ফেরতের রেকর্ড মূল বিল বদলায় না;
          বাকি পাওনা নিষ্পত্তির পাতায় দেখুন।
        </p>
      )}
    </section>
  );
}
