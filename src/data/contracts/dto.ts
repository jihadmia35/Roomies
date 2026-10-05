import { Deposit, Expense, Meal, MonthView, Settlement } from '@/domain/models';
import { ensure } from '@/domain/errors';
/** Future wire names make units explicit. No date-to-Date conversion at the boundary. */
export interface MealDTO extends Omit<Meal, 'quantity'> {
  quantityMilli: number;
}
export interface DepositDTO extends Omit<Deposit, 'amount'> {
  amountPaisa: number;
}
export interface ExpenseDTO extends Omit<Expense, 'amount'> {
  amountPaisa: number;
}
export interface SettlementDTO extends Omit<Settlement, 'amount'> {
  amountPaisa: number;
}
export interface MonthViewDTO extends Omit<
  MonthView,
  'meals' | 'deposits' | 'expenses' | 'settlements'
> {
  meals: MealDTO[];
  deposits: DepositDTO[];
  expenses: ExpenseDTO[];
  settlements: SettlementDTO[];
}
function integer(value: number): number {
  ensure(Number.isSafeInteger(value) && value >= 0, 'প্রতিক্রিয়ায় পরিমাণের একক সঠিক নয়।');
  return value;
}
export function toMonthViewDTO(model: MonthView): MonthViewDTO {
  return structuredClone({
    ...model,
    meals: model.meals.map(({ quantity, ...rest }) => ({ ...rest, quantityMilli: quantity })),
    deposits: model.deposits.map(({ amount, ...rest }) => ({ ...rest, amountPaisa: amount })),
    expenses: model.expenses.map(({ amount, ...rest }) => ({ ...rest, amountPaisa: amount })),
    settlements: model.settlements.map(({ amount, ...rest }) => ({ ...rest, amountPaisa: amount })),
  });
}
/** An HTTP repository can validate its JSON schema then use the same mapper. */
export function fromMonthViewDTO(dto: MonthViewDTO): MonthView {
  return structuredClone({
    ...dto,
    meals: dto.meals.map(({ quantityMilli, ...rest }) => ({
      ...rest,
      quantity: integer(quantityMilli),
    })),
    deposits: dto.deposits.map(({ amountPaisa, ...rest }) => ({
      ...rest,
      amount: integer(amountPaisa),
    })),
    expenses: dto.expenses.map(({ amountPaisa, ...rest }) => ({
      ...rest,
      amount: integer(amountPaisa),
    })),
    settlements: dto.settlements.map(({ amountPaisa, ...rest }) => ({
      ...rest,
      amount: integer(amountPaisa),
    })),
  });
}
