export type ErrorCode =
  'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'CLOSED' | 'DUPLICATE';
export class DomainError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export function ensure(
  condition: unknown,
  message: string,
  code: ErrorCode = 'VALIDATION',
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
