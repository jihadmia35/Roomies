# Proposed future HTTP API — not implemented

The application makes **no API requests**. These endpoints are a future contract proposal. Public mock methods include nearby Banglish integration comments with request, response, validation and authorization requirements. All routes below require authenticated identity derived by the backend, never a client-supplied user ID.

Base: `/messes/{messId}/months/{monthId}`. Dates are ISO date-only strings; timestamps are ISO instants; money is integer paisa and meals are integer thousandths. Read DTO names `amountPaisa` and `quantityMilli` have mappings in `src/data/contracts/dto.ts`. Existing typed mutation bodies use `amount` (paisa) and `quantity` (thousandths), documented in `src/domain/models.ts`.

| Proposed method and path        | Typed request/query                      | Proposed response                                                                        | Authorization                                                  |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| GET `/session`                  | none                                     | Current user and the single configured mess; replaces demo personas                      | Authenticated session                                          |
| GET `/mess`                     | none                                     | Single configured mess metadata                                                          | Mess membership                                                |
| GET `…/months` (mess-level)     | calendar/status filters                  | `MonthMeta[]`, effective month permissions                                               | Scoped membership                                              |
| GET `/participants`             | month                                    | Month participant DTOs, joined date, revision                                            | MANAGER; own participant for MEMBER                            |
| PATCH `/participants`           | `ParticipantsRequest`                    | `MutationResponse` + participants                                                        | OPEN MANAGER                                                   |
| GET `/my-meals`                 | optional date range                      | Only current user's `MealDTO[]`, relevant shared cook records and rules                  | Own month                                                      |
| GET `/meals`                    | date/member filters                      | Manager overview with members and configured slots                                       | OPEN MANAGER                                                   |
| PATCH `/meal-days/{date}`       | `DayUpdate`                              | Day meals/cook records, new revision, audit, updated accounting summary                  | OPEN MANAGER                                                   |
| GET `/my-deposits`              | optional date range                      | Only current user's `DepositDTO[]`                                                       | Own month                                                      |
| GET `/deposits`                 | member/date filters                      | Deposits with revision                                                                   | OPEN MANAGER                                                   |
| POST `/deposits`                | Deposit body + `FinancialRequest`        | Record, revision, audit, summary                                                         | OPEN MANAGER                                                   |
| PATCH `/deposits/{id}`          | same body, expected revision and new key | Updated record, revision, audit, summary                                                 | OPEN MANAGER                                                   |
| DELETE `/deposits/{id}`         | `DeleteRequest`                          | Mutation result                                                                          | OPEN MANAGER                                                   |
| GET `/expenses`                 | `kind=MARKET\|EXTRA`, date/category      | `ExpenseDTO[]`, revision                                                                 | OPEN MANAGER or authorized report                              |
| POST/PATCH `/expenses[/{id}]`   | Expense body + `FinancialRequest`        | Record, revision, audit, summary                                                         | OPEN MANAGER                                                   |
| DELETE `/expenses/{id}`         | `DeleteRequest`                          | Mutation result                                                                          | OPEN MANAGER                                                   |
| GET `/settings`                 | month                                    | Rules, slot definitions, revision                                                        | Own month rules allowed                                        |
| PATCH `/settings`               | `SettingsRequest`                        | Mutation result and updated rules                                                        | OPEN MANAGER                                                   |
| GET `/my-statement`             | month                                    | Only own `Statement`, aggregate summary and explanation metrics                          | Own month                                                      |
| GET `/accounts`                 | member filter                            | Manager `Statement[]` and authorized account details                                     | OPEN MANAGER or active POST_MANAGER                            |
| GET `/accounts/{memberId}`      | member ID                                | Authorized member statement/account                                                      | Accounts permission or own ID                                  |
| GET `/closing-preview`          | expected revision                        | Rules, participants, missing records, statements, reconciliation, possible next managers | OPEN MANAGER                                                   |
| POST `/close`                   | `CloseRequest`                           | Closed snapshot, next month identity, revision, audit                                    | OPEN MANAGER                                                   |
| GET `/settlement-overview`      | direction/status filters                 | Accounts, outstanding amounts, treasury and revision                                     | Active POST_MANAGER                                            |
| GET `/my-settlements`           | month                                    | Own `SettlementDTO[]` and remaining account                                              | Own month                                                      |
| POST `/settlement-transactions` | `SettlementRequest`                      | New transaction, remaining account, month status, effective roles, revision, treasury    | Active POST_MANAGER                                            |
| GET `/settlement-transactions`  | own/member filters                       | Authorized settlement history                                                            | Active POST_MANAGER or own ID                                  |
| GET `/audit`                    | actor/action/date, cursor                | Append-only audit page                                                                   | OPEN MANAGER; independently authorized historical audit policy |
| GET `/my-history` (mess-level)  | cursor                                   | `HistoryDTO[]` for current user                                                          | Historical month participation                                 |

`MessRepository.view` composes the appropriate authorized reads into a scoped presentation model. An HTTP repository should call own endpoints for MEMBER and account/manager endpoints only when authorized. It must not fetch an all-member endpoint then filter locally.

## Own profile proposal

The current product supports one configured mess. Existing `/messes/{messId}` URLs are a scoped future adapter contract, not a multi-mess selector or implemented service. `GET /session` resolves that single mess and the authenticated identity.

| Proposed operation       | Request                                                                                                         | Response                                                        | Authorization                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| GET `/profile`           | `ProfileQuery` in mock; future identity derived from session                                                    | `MemberProfile`: person, revision, updatedAt, passwordChangedAt | Own roster profile; no month participation required |
| PATCH `/profile/photo`   | `PhotoRequest`: expectedRevision, photo data URL or null in mock; authorized attachment reference in production | Updated `MemberProfile`                                         | Own profile only, including for managers            |
| POST `/profile/password` | `PasswordRequest`: expectedRevision, currentPassword, newPassword, confirmPassword                              | Updated profile metadata, no credential values                  | Own profile; verify current credential              |

Errors use the same `ErrorDTO` shape (FORBIDDEN, VALIDATION, CONFLICT). Reject stale profile revisions. Production must authenticate the user independently, verify current credentials with secure password hashing, transmit over HTTPS, rate-limit attempts, handle session invalidation and omit credentials from logs/responses. The frontend's demo password map provides no authentication. Validate image contents/size on the backend and store authorized attachments; local data URLs are temporary demo previews.

## Batch meal request

```ts
interface DayUpdate {
  expectedRevision: number;
  date: string;
  cooks: { date: string; slotId: string; available: boolean | null }[];
  entries: {
    memberId: string;
    slotId: string;
    quantity: number; // integer thousandths, 0..10000
    isHome: boolean;
    recorded: boolean;
  }[];
  acknowledgeDiscard: boolean;
}
```

The server validates distinct member/slot keys, calendar boundaries, valid participants and slots, tracking flags, nonnegative integer quantities and explicit acknowledgment before deleting consumed meals due to cook absence. Cook-missed changes apply to all relevant member entries atomically. Reject stale `expectedRevision` with 409 and the current revision. Return updated records, audit attribution, summary and new revision.

## Financial submission

```ts
interface FinancialRequest {
  expectedRevision: number;
  idempotencyKey: string;
}
interface MutationResponse {
  revision: number;
  audit: Audit;
  summary: Summary;
}
interface ErrorDTO {
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'CLOSED' | 'DUPLICATE';
  message: string;
  fieldErrors?: Record<string, string>;
}
```

Use HTTP 403 for permissions, 404 for missing scoped resources, 422 for validation and 409 for conflicts/duplicates. The demo throws the corresponding `DomainError`, shows its Bengali message and refreshes on failure. The server should return field errors for forms and structured missing-record details for closing. Error messages must not disclose another member's private resources.

A record request discriminates `deposit` / `expense`. Deposit fields: memberId, amount (paisa), date, method, reference, note. Expense fields: kind, category, amount, date, description, vendor and attachment reference. Audit recorder and timestamps are server-owned. Demo image data URLs stay local; future attachment APIs need separate authorization, validation and storage design.

Settlement fields: memberId, amount, direction, settlement date, method and note. A settlement may occur after the original calendar month but is always stored under the original month ID. Deduplicate by authenticated identity and operation scope/key. Reusing a key with a different body is an error. Production may replay the first response for identical keys instead of the mock's explicit duplicate rejection.

## Backend responsibilities

Validate every request independently. Authorize each mess and month against authenticated identity and current role/status. Recalculate all financial results server-side with the same exact allocation specification. Serialize manager writes and settlement updates with transactional revision checks. Close the month and create/activate next month in one transaction. Store immutable snapshot rules and bills, preserve append-only audit history, expire POST_MANAGER permission atomically after the final transaction, and prevent overpayments under concurrent requests. Demo guards alone provide no security.
