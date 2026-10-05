# Verification

Verified locally on October 5, 2026. Financial demo timeline remains September 30, 2026.

## Automated checks

- `npm run typecheck`: passed with strict TypeScript.
- `npm run lint`: passed without errors or warnings.
- `npm test`: **52 tests across 4 files passed**.
- `npm run build`: production compilation, type validation, page generation and route optimization passed.

`tests/accounting.test.ts` (17 tests) covers fixed-precision parsing/accumulation, floor minimums, full-month eligibility for midmonth participants, home/cook exclusions, overlap deduplication, disabled features, missing versus recorded zero, calendar lengths, billable denominators, deterministic exact allocations, zero billable meals and empty participation.

`tests/repository.test.ts` (20 tests) covers scoped member and historical reads, unsupported-mess rejection and historical account isolation, unauthorized operations, equal manager permissions and audit attribution, revision conflicts, cook discard acknowledgment, tracking-disabled behavior, idempotency, record edit/delete reconciliation, missing-record close blocking, distinct manager selection, atomic handover, zero new-month finances, closed-month immutability, historical rule snapshots, partial settlements, treasury effects, overpayment/nonpositive/wrong-direction/duplicate rejection, completing all payments and refunds, both POST_MANAGER assignments expiring, and settled-history scope.

`tests/workflows.test.tsx` (7 rendered React integration tests) exercises the actual screens, provider, asynchronous repository and confirmations:

1. Save a custom 1.25 lunch, record a missing 0.3 lunch, confirm cook availability and observe new accounting totals.
2. Change to a member identity, show only personal deposits, clear old records and deny manager settings.
3. Configure three slots in the single mess, disable tracking and minimum rules in settings, and verify no mess selector or minimum adjustments.
4. Create a deposit, edit its amount, delete it through the confirmation dialog, and reconcile live totals.
5. Confirm missing records, close September, choose October's managers, verify zero new-month deposits/expenses, record a partial ৳300 payment, complete every payment/refund, observe role expiry and retain only the former manager's personal history.

6. Upload a local profile picture, inspect its unsaved preview, save, navigate to a statement and remove the photo with confirmation.
7. Reject an incorrect current password, change the demo password, clear password inputs and switch to a nonparticipating identity's own profile without leaking the previous identity's metadata.

`tests/profile.test.ts` (8 tests) covers the single-mess session contract, unsupported-mess rejection, self-only profile reads and writes (including managers), nonparticipant profile access, photo propagation and removal, closed-finance immutability after profile edits, defensive response copies, image type/signature/size validation, profile revision conflicts, current-password verification, confirmation/length/different-password rules, subsequent use of the changed password, identity isolation, omission of credentials from responses/audit and reset behavior.

These integration tests use JSDOM. They stub Next's navigation and native `dialog.showModal` while exercising the application controls and business repository. They are not full browser end-to-end tests.

## Browser checks for the updated profile and single-mess application

Using the local development build and available in-app browser:

- Opened `/profile` and used the visible file chooser to select a generated local PNG test fixture.
- Verified unsaved preview, saved the photo, observed header and profile avatars update, then navigated to the monthly statement and saw the photo remain.
- Returned through the header's profile link, changed a disposable demo password, and observed the changed timestamp and cleared password inputs.
- Tested the profile at 390 × 844, confirmed its content stayed within the viewport after responsive styles settled, and opened/closed the mobile navigation through the profile link.
- Inspected browser error/warning logs during these profile flows: no application error or warning was captured.
- Opened the production build's `/profile` and expanded the demo panel: only identities, accounting months and reset were present; no mess switcher.
- Selected the nonparticipating roster identity, opened their profile through the header, verified the photo control was usable, and completed the in-app reset confirmation to return to the initial manager.

## Earlier accounting browser checks

These checks were performed on the preceding implementation; the updated financial workflows were re-run in the React integration tests above.

Using the available in-app browser on the local development server:

- Viewed desktop dashboard at 1440 × 1000 and mobile layout at 390 × 844.
- Saved custom fractional meals and resolved the missing cook/meal entries. Billable meals changed from 268.4 to 269.65 and the shared rate changed from ৳46.44 to ৳46.23.
- Navigated back to the manager dashboard and saw those updated totals survive navigation.
- Changed to Rafi as a member, opened personal deposits (two records, ৳1,800.00), and verified manager navigation was absent.
- Opened `/settings` directly with remembered member identity and observed the access-denied state.
- Opened the mobile navigation drawer and used it to reach daily meals. Entered and saved decimals on mobile. Body width stayed within the viewport; the meal table scrolled horizontally.
- Opened the closing review with zero incomplete records and exact market/extra reconciliation.
- Inspected captured console logs: no application error was reported; development hot-reload warnings occurred during source edits.

## Browser-tool limitation and resulting improvement

The in-app browser tool stalled on the original native `window.confirm` during closing and could not clear that stale prompt. All native confirmations were subsequently replaced with asynchronous, accessible in-app dialogs for closing, resets, bulk changes and deletion. Their rendered interactions and complete close/settlement lifecycle passed the React integration tests above. The complete lifecycle was **not re-verified end-to-end in the native browser** after that tool stalled. No native confirm calls remain in the delivered source.

Production build and static checks validate the final source. No deployment, live authentication, external API, real payment or external upload was performed.
