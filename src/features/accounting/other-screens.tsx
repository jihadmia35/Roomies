'use client';
import { useEffect, useState } from 'react';
import { Search, CheckCircle2, ArrowUpRight, Activity, ChevronDown } from 'lucide-react';
import { MonthView } from '@/domain/models';
import { HistoryDTO } from '@/data/contracts';
import { Card, PageHeading, Badge, Empty, Loading, Balance, Alert } from '@/components/ui';
import { AccountsTable, StatementDetail } from './components';
import { TreasuryCard } from '@/features/settlements/screen';
import { useDemo } from '@/features/demo/provider';
import { meals, money, monthLabel, statusLabel, timestamp } from '@/lib/format';
export function Accounts({ view, memberId }: { view: MonthView; memberId?: string }) {
  const [search, setSearch] = useState('');
  if (memberId) {
    const statement = view.statements.find((s) => s.memberId === memberId);
    return (
      <>
        <PageHeading
          title="সদস্যের মাসিক বিবরণী"
          eyebrow={monthLabel(view.calendar)}
          description="প্রকৃত মিল, বিলযোগ্য মিল ও খরচের পুরো ব্যাখ্যা।"
        />
        {statement ? (
          <StatementDetail view={view} statement={statement} />
        ) : (
          <Empty
            title="হিসাব পাওয়া যায়নি"
            description="সদস্যটি এই মাসের অংশগ্রহণকারী নন বা আপনার অ্যাক্সেস নেই।"
          />
        )}
      </>
    );
  }
  return (
    <>
      <PageHeading
        title="সদস্যদের মাসিক হিসাব"
        eyebrow={monthLabel(view.calendar)}
        description="সব সদস্যের প্রকৃত মিল, বিলযোগ্য মিল, জমা ও খরচ।"
      >
        <Badge>{view.statements.length} জন</Badge>
      </PageHeading>
      <Card>
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="হিসাবের সদস্য খুঁজুন"
              placeholder="সদস্যের নাম খুঁজুন…"
            />
          </div>
        </div>
        <AccountsTable view={view} search={search} />
      </Card>
    </>
  );
}
export function History() {
  const { repo, context, switchContext } = useDemo();
  const [records, setRecords] = useState<HistoryDTO[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    repo
      .history(context)
      .then((r) => {
        if (alive) setRecords(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [repo, context]);
  return (
    <>
      <PageHeading
        title="আগের মাসের খাতা"
        description="আপনার নিজের প্রতি মাসের হিসাব। বন্ধ মাসের বিবরণী অপরিবর্তনীয়।"
      />
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : !records ? (
        <Loading />
      ) : (
        <Card>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>মাস</th>
                  <th>অবস্থা</th>
                  <th className="num">প্রকৃত / বিলযোগ্য মিল</th>
                  <th className="num">জমা</th>
                  <th className="num">খরচ</th>
                  <th className="num">মূল ব্যালেন্স</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records
                  .sort((a, b) => b.calendar.localeCompare(a.calendar))
                  .map((r) => (
                    <tr key={r.monthId}>
                      <td>
                        <strong>{monthLabel(r.calendar)}</strong>
                      </td>
                      <td>
                        <Badge
                          tone={
                            r.status === 'OPEN'
                              ? 'blue'
                              : r.status === 'SETTLED'
                                ? 'success'
                                : 'warning'
                          }
                        >
                          {statusLabel[r.status as keyof typeof statusLabel]}
                        </Badge>
                      </td>
                      <td className="num">
                        {meals(r.actual)} / {meals(r.billable)}
                      </td>
                      <td className="num">{money(r.deposits)}</td>
                      <td className="num">{money(r.totalCost)}</td>
                      <td className="num">
                        <Balance value={r.balance} />
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => switchContext({ monthId: r.monthId })}
                        >
                          মাসটি খুলুন
                          <ArrowUpRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
export function AuditScreen({ view }: { view: MonthView }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const records = view.audit.filter((a) => (a.action + a.detail).includes(search));
  return (
    <>
      <PageHeading
        title="কার্যক্রমের ইতিহাস"
        eyebrow={monthLabel(view.calendar)}
        description="কোন ম্যানেজার কখন কী পরিবর্তন করেছেন — আগে ও পরের রেকর্ডসহ।"
      >
        <Badge>
          <Activity size={14} />
          {view.audit.length}টি কাজ
        </Badge>
      </PageHeading>
      <Card>
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              placeholder="কাজ বা বিবরণ খুঁজুন…"
              aria-label="কার্যক্রম খুঁজুন"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="audit-list">
          {records.map((a) => (
            <div className="audit-item" key={a.id}>
              <span className="audit-icon">
                <CheckCircle2 size={18} />
              </span>
              <div className="audit-content">
                <strong>{a.action}</strong>
                <p>{a.detail}</p>
                <small>
                  {view.people.find((p) => p.id === a.actor)?.name ?? a.actor} · {timestamp(a.at)}
                </small>
                {(a.before || a.after) && (
                  <>
                    <button
                      className="text-link"
                      onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      aria-expanded={expanded === a.id}
                    >
                      পরিবর্তন দেখুন
                      <ChevronDown size={13} />
                    </button>
                    {expanded === a.id && (
                      <div className="audit-diff">
                        {a.before && (
                          <div>
                            <strong>আগে</strong>
                            <pre>{JSON.stringify(JSON.parse(a.before), null, 2)}</pre>
                          </div>
                        )}
                        {a.after && (
                          <div>
                            <strong>পরে</strong>
                            <pre>{JSON.stringify(JSON.parse(a.after), null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {!records.length && <Empty title="কার্যক্রম পাওয়া যায়নি" />}
        </div>
      </Card>
    </>
  );
}
export function ClosedReport({ view }: { view: MonthView }) {
  return (
    <>
      <PageHeading
        title="বন্ধ মাসের চূড়ান্ত রিপোর্ট"
        eyebrow={monthLabel(view.calendar)}
        description="মাস বন্ধের সময় সংরক্ষিত নিয়ম ও হিসাব। নিষ্পত্তির লেনদেন মূল বিল বদলায় না।"
      >
        <Badge tone="success">অপরিবর্তনীয় স্ন্যাপশট</Badge>
      </PageHeading>
      <div className="closing-checks">
        <Card className="padded">
          <span>চূড়ান্ত বাজার খরচ</span>
          <strong className="stat-value">{money(view.summary.market)}</strong>
          <p>
            {meals(view.summary.billable)} বিলযোগ্য মিল · রেট {money(view.summary.rate)}
          </p>
        </Card>
        <Card className="padded">
          <span>চূড়ান্ত অতিরিক্ত খরচ</span>
          <strong className="stat-value">{money(view.summary.extra)}</strong>
          <p>{view.summary.participants} জনের সমান ভাগ</p>
        </Card>
        <Card className="padded">
          <span>সংরক্ষিত নিয়ম</span>
          <strong className="stat-value">
            ন্যূনতম {view.rules.minimumEnabled ? `${view.rules.minimumPercent}%` : 'বন্ধ'}
          </strong>
          <p>
            {view.rules.slots.map((s) => s.label).join(' / ')} ·{' '}
            {view.snapshotAt && timestamp(view.snapshotAt)}
          </p>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <h3>চূড়ান্ত সদস্য বিবরণী</h3>
          <Badge tone="success">বরাদ্দ মিলেছে</Badge>
        </div>
        <AccountsTable view={view} />
      </Card>
      <TreasuryCard view={view} />
    </>
  );
}
