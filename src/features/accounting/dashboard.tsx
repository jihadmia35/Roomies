'use client';
import Link from 'next/link';
import {
  Wallet,
  ShoppingBasket,
  ReceiptText,
  Utensils,
  ArrowUpRight,
  Plus,
  CalendarDays,
  CheckCircle2,
  Info,
  ArrowRight,
  Clock3,
} from 'lucide-react';
import { MonthView } from '@/domain/models';
import { Card, Badge, PageHeading, Alert } from '@/components/ui';
import { AccountsTable, MealExplanation } from './components';
import { money, meals, monthLabel, dateLabel } from '@/lib/format';
import { monthDates } from '@/domain/dates';
export function Dashboard({ view }: { view: MonthView }) {
  const manager = view.role === 'MANAGER';
  const s = view.statements.find((s) => s.memberId === view.context.userId)!;
  const summary = view.summary;
  const total = summary.market + summary.extra;
  const ratio = total ? Math.round((summary.market / total) * 100) : 0;
  const days = monthDates(view.calendar).slice(-7);
  const daily = days.map((date) => ({
    date,
    actual: view.meals
      .filter((m) => m.date === date && m.recorded)
      .reduce((a, m) => a + m.quantity, 0),
  }));
  const max = Math.max(...daily.map((d) => d.actual), 1000);
  const missing = summary.missingCook + summary.missingMeals;
  const cards = manager
    ? [
        {
          label: 'মোট জমা',
          value: money(summary.deposits),
          icon: Wallet,
          tone: 'mint',
          note: `${summary.participants} জন সদস্যের জমা`,
          path: 'deposits',
        },
        {
          label: 'বাজার খরচ',
          value: money(summary.market),
          icon: ShoppingBasket,
          tone: 'blue',
          note: 'খাবারের জন্য মোট খরচ',
          path: 'expenses',
        },
        {
          label: 'অতিরিক্ত খরচ',
          value: money(summary.extra),
          icon: ReceiptText,
          tone: 'purple',
          note: 'বেতন, গ্যাস ও অন্যান্য',
          path: 'expenses',
        },
        {
          label: 'বর্তমান মিল রেট',
          value: money(summary.rate),
          icon: Utensils,
          tone: 'amber',
          note: `${meals(summary.billable)} বিলযোগ্য মিলের ভিত্তিতে`,
          path: 'meals/overview',
        },
      ]
    : [
        {
          label: 'আপনার মোট জমা',
          value: money(s.deposits),
          icon: Wallet,
          tone: 'mint',
          note: 'এই মাসে জমা দিয়েছেন',
          path: 'my/deposits',
        },
        {
          label: 'আপনার মোট খরচ',
          value: money(s.totalCost),
          icon: ReceiptText,
          tone: 'blue',
          note: 'খাবার ও অতিরিক্ত খরচ',
          path: 'my/statement',
        },
        {
          label: 'প্রকৃত / বিলযোগ্য মিল',
          value: `${meals(s.actual)} / ${meals(s.billable)}`,
          icon: Utensils,
          tone: 'purple',
          note: 'খাওয়া মিল / বিলের মিল',
          path: 'my/meals',
        },
        {
          label: s.balance < 0 ? 'আপনার বকেয়া' : 'ফেরতযোগ্য টাকা',
          value: money(Math.abs(s.balance)),
          icon: Wallet,
          tone: s.balance < 0 ? 'rose' : 'mint',
          note: 'জমা থেকে খরচ বাদ দিয়ে',
          path: 'my/statement',
        },
      ];
  return (
    <>
      <PageHeading
        eyebrow={`${monthLabel(view.calendar)} / ${manager ? 'ম্যানেজার ড্যাশবোর্ড' : 'আপনার ব্যক্তিগত হিসাব'}`}
        title={
          manager
            ? 'মেসের হিসাব, এক নজরে।'
            : `স্বাগতম, ${view.people.find((p) => p.id === view.context.userId)?.name.split(' ')[0]}।`
        }
        description={
          manager
            ? 'মিল, জমা আর খরচ — সব হিসাব থাকুক পরিষ্কার।'
            : 'আপনার মিল, মাসের খরচ ও জমার হিসাব এখানে দেখুন।'
        }
      >
        <Badge tone={view.status === 'OPEN' ? 'success' : 'warning'}>
          <span className="status-dot" />
          {view.status === 'OPEN' ? 'মাস চলমান' : 'চূড়ান্ত হিসাব'}
        </Badge>
        {manager && (
          <Link href="/deposits" className="btn btn-primary">
            <Plus size={17} />
            নতুন জমা
          </Link>
        )}
      </PageHeading>
      {summary.error && <Alert tone="danger">{summary.error}</Alert>}
      <div className="stat-grid">
        {cards.map((c) => (
          <Link key={c.label} href={`/${c.path}`} className="card stat-card">
            <div className="stat-top">
              <span>{c.label}</span>
              <span className={`stat-icon ${c.tone}`}>
                <c.icon size={19} />
              </span>
            </div>
            <strong className="stat-value">{c.value}</strong>
            <div className="stat-bottom">
              <span>{c.note}</span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <Card className="meal-hero">
            <div>
              <Badge tone="success">
                <CalendarDays size={13} />
                {view.calendar === '2026-09' ? '৩০ সেপ্টেম্বর' : 'মাসের শেষ দিন'}
              </Badge>
              <h2>{manager ? 'আজকের মিল লেখা হয়েছে?' : 'আপনার মিলের প্রতিটি হিসাব।'}</h2>
              <p>
                {manager
                  ? 'সময়মতো মিল লিখলে, মাস শেষে হিসাব হবে সহজ।'
                  : 'যতটুকু খেয়েছেন আর যতটুকুর বিল হচ্ছে — দুটোই দেখুন।'}
              </p>
              <Link className="btn btn-hero" href={manager ? '/meals/daily' : '/my/meals'}>
                {manager ? 'আজকের মিল লিখুন' : 'আমার মিল দেখুন'}
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-orbit" />
              <div className="hero-calendar">
                <div className="hero-calendar-top">
                  <span />
                  <span />
                </div>
                <small>
                  {new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'Asia/Dhaka' })
                    .format(new Date(`${view.calendar}-15T06:00:00Z`))
                    .toUpperCase()}
                </small>
                <strong>
                  {view.calendar === '2026-09' ? '30' : monthDates(view.calendar).length}
                </strong>
                <div className="hero-calendar-bottom">
                  <CheckCircle2 size={15} />
                  মিলের খাতা
                </div>
              </div>
              <span className="hero-float">
                <Utensils size={20} />
              </span>
            </div>
          </Card>
          {manager ? (
            <Card>
              <div className="card-heading">
                <div>
                  <h3>সদস্যদের হিসাব</h3>
                  <p>এই মাসের জমা, খরচ ও ব্যালেন্স</p>
                </div>
                <Link className="text-link" href="/accounts">
                  সব দেখুন
                  <ArrowUpRight size={15} />
                </Link>
              </div>
              <AccountsTable view={view} />
              <div className="table-footer">
                <Info size={14} />
                <span>চলমান মাসের হিসাব প্রাথমিক। মাস বন্ধ করলে চূড়ান্ত হবে।</span>
              </div>
            </Card>
          ) : (
            <MealExplanation view={view} statement={s} />
          )}
          <Card>
            <div className="card-heading">
              <div>
                <h3>শেষ ৭ দিনের মিল</h3>
                <p>
                  {manager ? 'মেসের প্রকৃত খাবার গ্রহণ' : 'আপনার প্রকৃত খাবার গ্রহণ'} ·{' '}
                  {monthLabel(view.calendar)}
                </p>
              </div>
              <Badge>{meals(daily.reduce((a, d) => a + d.actual, 0))} মিল</Badge>
            </div>
            <div className="bar-chart">
              {daily.map((d) => (
                <div className="bar-column" key={d.date}>
                  <span>{meals(d.actual)}</span>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{ height: `${Math.max(3, (d.actual / max) * 100)}%` }}
                    />
                  </div>
                  <small>{d.date.slice(-2)}</small>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="dashboard-aside">
          <Card className="padded expense-breakdown">
            <div className="card-title-line">
              <h3>খরচের সারাংশ</h3>
              <ReceiptText size={17} />
            </div>
            <p className="muted small">
              {manager ? 'মেসের মোট খরচ' : 'বিল বোঝার জন্য মেসের মোট খরচ'}
            </p>
            <div
              className="donut"
              role="img"
              aria-label={`বাজার ${ratio} শতাংশ, অতিরিক্ত ${100 - ratio} শতাংশ`}
              style={{
                background: `conic-gradient(var(--emerald) 0% ${ratio}%, #e4b86a ${ratio}% 100%)`,
              }}
            >
              <div>
                <small>মোট খরচ</small>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <div className="legend-row">
              <span>
                <i className="legend-dot emerald" />
                বাজার খরচ
              </span>
              <strong>{money(summary.market)}</strong>
            </div>
            <div className="legend-row">
              <span>
                <i className="legend-dot amber" />
                অতিরিক্ত খরচ
              </span>
              <strong>{money(summary.extra)}</strong>
            </div>
            <div className="breakdown-note">
              <Info size={15} />
              <p>
                বাজার খরচ বিলযোগ্য মিল অনুযায়ী। অতিরিক্ত খরচ {summary.participants} জনের মধ্যে সমান
                ভাগ।
              </p>
            </div>
          </Card>
          <Card className="padded attention-card">
            <div className="card-title-line">
              <h3>{manager ? 'আপনার করণীয়' : 'মনে রাখুন'}</h3>
              <Clock3 size={17} />
            </div>
            {manager ? (
              <>
                <Link className="task-item" href="/closing">
                  <span className={`task-icon ${missing ? 'amber' : 'mint'}`}>
                    {missing ? <Clock3 size={17} /> : <CheckCircle2 size={17} />}
                  </span>
                  <div>
                    <strong>
                      {missing ? `${missing}টি রেকর্ড অসম্পূর্ণ` : 'মিলের রেকর্ড সম্পূর্ণ'}
                    </strong>
                    <small>
                      {missing ? 'মাস বন্ধের আগে পূরণ করুন' : 'মাস বন্ধের পরবর্তী ধাপ দেখুন'}
                    </small>
                  </div>
                  <Chevron />
                </Link>
                <Link className="task-item" href="/closing">
                  <span className="task-icon blue">
                    <CalendarDays size={17} />
                  </span>
                  <div>
                    <strong>পরের মাসের দায়িত্ব</strong>
                    <small>নতুন দুই ম্যানেজার নির্বাচন</small>
                  </div>
                  <Chevron />
                </Link>
              </>
            ) : (
              <p className="muted">
                {view.rules.minimumEnabled
                  ? `এই মাসে ন্যূনতম মিলের হার ${view.rules.minimumPercent}%। বাড়িতে থাকা ও বাবুর্চির অনুপস্থিত স্লট হিসাব থেকে বাদ যায়।`
                  : 'এই মাসে ন্যূনতম মিল নেই। প্রকৃত খাবার গ্রহণ থেকেই বিল হিসাব হয়।'}
              </p>
            )}
          </Card>
          {manager && (
            <Card className="padded">
              <h3>সাম্প্রতিক লেনদেন</h3>
              <div className="recent-list">
                {view.deposits
                  .slice(-3)
                  .reverse()
                  .map((d) => (
                    <Link href="/deposits" className="recent-item" key={d.id}>
                      <span className="recent-icon">
                        <Wallet size={16} />
                      </span>
                      <div>
                        <strong>{view.people.find((p) => p.id === d.memberId)?.name}</strong>
                        <small>
                          {dateLabel(d.date)} · {d.method}
                        </small>
                      </div>
                      <b>{money(d.amount)}</b>
                    </Link>
                  ))}
              </div>
              <Link className="text-link" href="/audit">
                সব কার্যক্রম দেখুন
                <ArrowUpRight size={15} />
              </Link>
            </Card>
          )}
          <div className="help-note">
            <BookIcon />
            <span>
              হিসাবের প্রতিটি পরিবর্তন ইতিহাসে থাকে।
              <br />
              দুই ম্যানেজারই সমানভাবে কাজ করতে পারেন।
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
function Chevron() {
  return <ArrowUpRight size={15} className="muted" />;
}
function BookIcon() {
  return <Info size={17} />;
}
