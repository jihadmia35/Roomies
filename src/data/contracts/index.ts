import {
  Context,
  Deposit,
  Expense,
  Rules,
  Participant,
  Direction,
  Meal,
  Cook,
  Summary,
  Audit,
} from '@/domain/models';
export interface RevisionRequest {
  expectedRevision: number;
}
export interface FinancialRequest extends RevisionRequest {
  idempotencyKey: string;
}
export interface DayUpdate extends RevisionRequest {
  date: string;
  cooks: Cook[];
  entries: Pick<Meal, 'memberId' | 'slotId' | 'quantity' | 'isHome' | 'recorded'>[];
  acknowledgeDiscard: boolean;
}
export interface MutationResponse {
  revision: number;
  audit: Audit;
  summary: Summary;
}
export type DepositBody = Pick<
  Deposit,
  'memberId' | 'amount' | 'date' | 'method' | 'reference' | 'note'
>;
export type ExpenseBody = Pick<
  Expense,
  'kind' | 'category' | 'amount' | 'date' | 'description' | 'vendor' | 'receipt'
>;
export interface RecordRequest extends FinancialRequest {
  id?: string;
  record: { type: 'deposit'; body: DepositBody } | { type: 'expense'; body: ExpenseBody };
}
export interface DeleteRequest extends RevisionRequest {
  type: 'deposit' | 'expense';
  id: string;
}
export interface SettingsRequest extends RevisionRequest {
  rules: Rules;
}
export interface ParticipantsRequest extends RevisionRequest {
  participants: Participant[];
}
export interface CloseRequest extends FinancialRequest {
  nextManagers: [string, string];
}
export interface SettlementRequest extends FinancialRequest {
  memberId: string;
  amount: number;
  direction: Direction;
  date: string;
  method: string;
  note: string;
}
export interface ErrorDTO {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
export interface HistoryDTO {
  monthId: string;
  calendar: string;
  status: string;
  actual: number;
  billable: number;
  deposits: number;
  totalCost: number;
  balance: number;
}
export interface SessionQuery {
  messId: string;
  userId: string;
}
export type ScopedQuery = Context;

/** Mock userId represents the selected identity; a future server derives it from authentication. */
export interface ProfileQuery extends SessionQuery {
  memberId: string;
}
export interface PhotoRequest extends RevisionRequest {
  photo: string | null;
}
export interface PasswordRequest extends RevisionRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
