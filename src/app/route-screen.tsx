'use client';
import Link from 'next/link';
import { useMonth, useDemo } from '@/features/demo/provider';
import { permits, routePermission } from '@/domain/permissions';
import { Card, Denied, Loading, Empty, PageHeading } from '@/components/ui';
import { Dashboard } from '@/features/accounting/dashboard';
import { DailyMeals, MealOverview } from '@/features/meals/screens';
import { RecordsScreen } from '@/features/deposits/screen';
import { Expenses } from '@/features/expenses/screen';
import { Members } from '@/features/members/screen';
import { Settings } from '@/features/settings/screen';
import { Closing } from '@/features/accounting/closing';
import { Accounts, AuditScreen, ClosedReport, History } from '@/features/accounting/other-screens';
import { StatementDetail } from '@/features/accounting/components';
import { SettlementScreen, SettlementDetail } from '@/features/settlements/screen';
import { ProfileScreen } from '@/features/profile/screen';
const known = [
  '',
  'manager',
  'my/meals',
  'my/deposits',
  'my/statement',
  'my/settlements',
  'history',
  'meals/daily',
  'meals/overview',
  'deposits',
  'expenses',
  'members',
  'accounts',
  'settings',
  'closing',
  'audit',
  'settlements',
  'settlements/payments',
  'settlements/refunds',
  'settlements/completed',
  'report',
];
export function RouteScreen({ path }: { path: string }) {
  if (path === 'profile') return <ProfileScreen />;
  return <MonthRoute path={path} />;
}
function MonthRoute({ path }: { path: string }) {
  const { data: view, loading, error } = useMonth();
  const { context } = useDemo();
  if (loading) return <Loading />;
  if (error)
    return error.name === 'DomainError' && error.message.includes('পাওয়া') ? (
      <Card>
        <Empty title="মাস পাওয়া যায়নি" description={error.message} />
      </Card>
    ) : (
      <Denied message={error.message} />
    );
  if (!view) return null;
  if (
    !known.includes(path) &&
    !/^accounts\/[^/]+$/.test(path) &&
    !/^settlements\/member\/[^/]+$/.test(path)
  )
    return (
      <Card>
        <Empty
          title="পাতাটি খুঁজে পাওয়া যায়নি"
          description="ঠিকানাটি পরীক্ষা করুন অথবা মেনু থেকে একটি পাতা খুলুন।"
        >
          <Link className="btn btn-primary" href="/">
            ড্যাশবোর্ড
          </Link>
        </Empty>
      </Card>
    );
  if (!permits(view.role, view.status, routePermission(path))) return <Denied />;
  const screen = () => {
    if (path === '' || path === 'manager')
      return view.role === 'POST_MANAGER' ? (
        <SettlementScreen view={view} />
      ) : (
        <Dashboard view={view} />
      );
    if (path === 'my/meals') return <MealOverview view={view} personal />;
    if (path === 'my/deposits') return <RecordsScreen view={view} type="deposit" personal />;
    if (path === 'my/statement')
      return (
        <>
          <PageHeading
            title="আমার মাসিক বিবরণী"
            description="আপনার ব্যক্তিগত জমা, খাবারের খরচ ও মাসের ব্যালেন্স।"
          />
          <StatementDetail
            view={view}
            statement={view.statements.find((s) => s.memberId === context.userId)!}
          />
        </>
      );
    if (path === 'my/settlements')
      return <SettlementDetail view={view} memberId={context.userId} />;
    if (path === 'history') return <History />;
    if (path === 'meals/daily') return <DailyMeals view={view} />;
    if (path === 'meals/overview') return <MealOverview view={view} />;
    if (path === 'deposits') return <RecordsScreen view={view} type="deposit" />;
    if (path === 'expenses') return <Expenses view={view} />;
    if (path === 'members') return <Members view={view} />;
    if (path === 'settings') return <Settings view={view} />;
    if (path === 'closing') return <Closing view={view} />;
    if (path === 'audit') return <AuditScreen view={view} />;
    if (path === 'report') return <ClosedReport view={view} />;
    if (path === 'accounts' || path.startsWith('accounts/'))
      return <Accounts view={view} memberId={path.split('/')[1]} />;
    if (path.startsWith('settlements/member/'))
      return <SettlementDetail view={view} memberId={path.split('/')[2]} />;
    if (path.startsWith('settlements'))
      return (
        <SettlementScreen
          view={view}
          filter={path.split('/')[1] as 'payments' | 'refunds' | 'completed' | undefined}
        />
      );
    return null;
  };
  return (
    <div key={`${context.messId}-${context.monthId}-${context.userId}`} className="page-enter">
      {screen()}
    </div>
  );
}
