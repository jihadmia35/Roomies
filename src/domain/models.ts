/** Money: integer paisa. Meals: integer thousandths (1 meal = 1000). Dates: YYYY-MM-DD. */
export type MonthStatus = 'OPEN' | 'CLOSED_PENDING_SETTLEMENT' | 'SETTLED';
export type Role = 'MEMBER' | 'MANAGER' | 'POST_MANAGER';
export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  photo?: string;
}
export interface Mess {
  id: string;
  name: string;
  address: string;
  people: Person[];
}
export interface Slot {
  id: string;
  label: string;
}
export interface Rules {
  slots: Slot[];
  minimumEnabled: boolean;
  minimumPercent: number;
  cookTracking: boolean;
  homeTracking: boolean;
}
export interface Participant {
  memberId: string;
  joinedOn: string;
}
export interface AuditMeta {
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}
export interface Meal extends AuditMeta {
  memberId: string;
  date: string;
  slotId: string;
  quantity: number;
  isHome: boolean;
  recorded: boolean;
}
export interface Cook {
  date: string;
  slotId: string;
  available: boolean | null;
}
export interface Deposit extends AuditMeta {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  note: string;
}
export interface Expense extends AuditMeta {
  id: string;
  kind: 'MARKET' | 'EXTRA';
  category: string;
  amount: number;
  date: string;
  description: string;
  vendor: string;
  receipt?: string;
}
export interface Statement {
  memberId: string;
  actual: number;
  homeSlots: number;
  eligibleSlots: number;
  minimum: number;
  billable: number;
  additional: number;
  deposits: number;
  mealCost: number;
  extraCost: number;
  totalCost: number;
  balance: number;
}
export interface Summary {
  market: number;
  extra: number;
  deposits: number;
  actual: number;
  billable: number;
  rate: number;
  participants: number;
  missingMeals: number;
  missingCook: number;
  error?: string;
  mealAllocated: number;
  extraAllocated: number;
}
export interface Snapshot {
  rules: Rules;
  participants: Participant[];
  statements: Statement[];
  summary: Summary;
  closedAt: string;
  closedBy: string;
}
export type Direction = 'PAYMENT' | 'REFUND';
export interface Settlement extends AuditMeta {
  id: string;
  memberId: string;
  amount: number;
  direction: Direction;
  date: string;
  method: string;
  note: string;
}
export interface Audit {
  id: string;
  actor: string;
  at: string;
  action: string;
  detail: string;
  before?: string;
  after?: string;
}
export interface Month {
  id: string;
  messId: string;
  calendar: string;
  status: MonthStatus;
  managers: [string, string];
  participants: Participant[];
  rules: Rules;
  meals: Meal[];
  cooks: Cook[];
  deposits: Deposit[];
  expenses: Expense[];
  settlements: Settlement[];
  audit: Audit[];
  revision: number;
  snapshot?: Snapshot;
  usedKeys: string[];
}
export interface Context {
  messId: string;
  monthId: string;
  userId: string;
}
export interface Treasury {
  deposits: number;
  expenses: number;
  payments: number;
  refunds: number;
  cash: number;
}
export interface Account {
  statement: Statement;
  person: Person;
  original: number;
  settled: number;
  remaining: number;
  direction: Direction;
}
export interface MonthMeta {
  id: string;
  calendar: string;
  status: MonthStatus;
  role: Role | null;
}
export interface Session {
  mess: Mess;
  months: MonthMeta[];
}
/** Scoped DTO; members never receive other people's statements, meals or deposits. */
export interface MonthView {
  context: Context;
  calendar: string;
  status: MonthStatus;
  role: Role;
  revision: number;
  rules: Rules;
  managers: Person[];
  participants: Participant[];
  people: Person[];
  summary: Summary;
  statements: Statement[];
  meals: Meal[];
  cooks: Cook[];
  deposits: Deposit[];
  expenses: Expense[];
  settlements: Settlement[];
  accounts: Account[];
  treasury?: Treasury;
  audit: Audit[];
  snapshotAt?: string;
}

/** Own profile is mess-scoped, independent of accounting month participation. */
export interface MemberProfile {
  person: Person;
  revision: number;
  updatedAt?: string;
  passwordChangedAt?: string;
}
