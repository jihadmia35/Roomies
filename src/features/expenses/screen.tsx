import { MonthView } from '@/domain/models';
import { RecordsScreen } from '@/features/deposits/screen';
export function Expenses({ view }: { view: MonthView }) {
  return <RecordsScreen view={view} type="expense" />;
}
