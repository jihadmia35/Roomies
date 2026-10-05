import { Context, Month, Role } from './models';
import { ensure } from './errors';
export type Permission = 'own' | 'manage' | 'accounts' | 'settle' | 'audit';
export function effectiveRole(month: Month, userId: string): Role | null {
  if (!month.participants.some((p) => p.memberId === userId)) return null;
  if (month.managers.includes(userId)) {
    if (month.status === 'OPEN') return 'MANAGER';
    if (month.status === 'CLOSED_PENDING_SETTLEMENT') return 'POST_MANAGER';
  }
  return 'MEMBER';
}
export function permits(
  role: Role | null,
  status: Month['status'],
  permission: Permission,
): boolean {
  if (!role) return false;
  if (permission === 'own') return true;
  if (permission === 'manage' || permission === 'audit')
    return role === 'MANAGER' && status === 'OPEN';
  if (permission === 'settle')
    return role === 'POST_MANAGER' && status === 'CLOSED_PENDING_SETTLEMENT';
  return (
    (role === 'MANAGER' && status === 'OPEN') ||
    (role === 'POST_MANAGER' && status === 'CLOSED_PENDING_SETTLEMENT')
  );
}
export function authorize(context: Context, month: Month, permission: Permission): Role {
  ensure(context.messId === month.messId, 'এই মেসের তথ্য দেখার অনুমতি নেই।', 'FORBIDDEN');
  const role = effectiveRole(month, context.userId);
  ensure(
    permits(role, month.status, permission),
    'এই মাসে কাজটি করার অনুমতি নেই। পরিচয় ও মাস পরীক্ষা করুন।',
    'FORBIDDEN',
  );
  return role!;
}
export function routePermission(path: string): Permission {
  if (path.startsWith('settlements')) return 'settle';
  if (path === 'report' || path.startsWith('accounts')) return 'accounts';
  if (path === 'audit') return 'audit';
  if (
    [
      'meals/daily',
      'meals/overview',
      'deposits',
      'expenses',
      'members',
      'settings',
      'closing',
      'manager',
    ].includes(path)
  )
    return 'manage';
  return 'own';
}

/** Everyone in this mess can manage only their own profile, across all month statuses. */
export function authorizeProfile(
  context: Pick<Context, 'messId' | 'userId'>,
  mess: import('./models').Mess,
  memberId: string,
) {
  ensure(context.messId === mess.id, 'এই মেসের প্রোফাইলের অনুমতি নেই।', 'FORBIDDEN');
  ensure(
    mess.people.some((p) => p.id === context.userId),
    'এই মেসের সদস্য নন।',
    'FORBIDDEN',
  );
  ensure(context.userId === memberId, 'শুধু নিজের প্রোফাইল পরিবর্তন বা দেখা যাবে।', 'FORBIDDEN');
}
