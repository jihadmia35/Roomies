# Accounting and lifecycle rules

## Units and calendar

Money is stored as integer paisa (৳1 = 100); quantities are integer thousandths (1 meal = 1000). UI input is parsed from strings, never by multiplying a binary decimal. Only the minimum-meal calculation is floored. Actual meals retain three fractional digits. Displayed BDT amounts use two decimal places; the displayed meal rate is never fed back into allocation.

Calendar and transaction dates are `YYYY-MM-DD`. Calendar lengths use UTC calendar arithmetic; display uses Bengali month labels and Asia/Dhaka. The demo date is September 30, 2026, independent of the machine clock. Audit timestamps are actual ISO instants displayed in Dhaka time.

## Meal rules

Each configured slot represents one possible base meal regardless of its label. Cook availability is shared by date/slot; home is individual by member/date/slot. Home or a cook-missed slot has zero actual consumption in the demo. A manager must acknowledge a cook-missed change that discards existing quantities. Shared cook changes zero all applicable records atomically.

Missing meal records are different from recorded zero. Missing cook records are counted separately. Both block closing. Managers can explicitly confirm missing entries as zero and missing cook entries as present, or enter their real values individually. This action is explained and confirmed before execution.

If cook tracking is disabled, every slot is cook-available. If home tracking is disabled, home does not exclude a slot from minimum. Disabling tracking does not recreate previously zeroed actual consumption.

For every monthly participant (including a midmonth joiner):

1. Enumerate every date and configured slot in the full calendar month.
2. A slot is eligible if cook availability is true (or tracking disabled), and the member is not home (or tracking disabled).
3. `minimum = floor(eligibleSlots × minimumPercent / 100)` when enabled, otherwise zero.
4. `billable = max(actual, minimum)`; `additional = billable − actual`.

Eligibility is a boolean test, so overlapping cook-missed/home markers subtract a slot only once. Five full days at home in a two-slot mess excludes ten slots. Joining midmonth by itself excludes nothing. Seeded pre-join consumption is confirmed zero and does not manufacture consumed meals.

## Financial allocations

`mealRate = marketPaisa × 1000 / totalBillableMilli`. The denominator includes all minimum adjustments. Allocate market paisa proportionally to each member's billable units. Allocate extra paisa equally to explicit monthly participants, even midmonth joiners and people at home.

Allocation uses BigInt numerators and denominators, floors each proportional share to a paisa, then distributes remainder paisa by descending fractional remainder. Ties are sorted by member ID. Costs reconcile exactly to market and extra totals.

`totalCost = allocatedMealCost + allocatedExtraCost`; `balance = deposits − totalCost`. Positive balance is refundable; negative balance is payable. Empty participation is invalid. Positive market spending with no billable meals is invalid and blocks closing. Zero spending and zero meals has a zero rate; no NaN, Infinity or fallback charge is used.

## Participation and historical data

Month participation is explicit, not today's mess roster. Current managers must remain participants. A participant with deposits or actual consumption cannot be removed until records are corrected. Closed participation and settings are immutable snapshots. Historical member access is based on that month's participation.

Slots with consumption cannot be removed; new slots create missing records throughout the full month. Labels can change without changing quantity value. Rule changes immediately recalculate open accounts only.

## Closing

OPEN requires exactly two distinct participant managers. Review missing records, monthly membership, rules, financial summaries, rounding reconciliation and next managers. Closing validates and snapshots settings, participation, statements and aggregate summary. Normal edit authorization ends. Former managers receive settlement access for CLOSED_PENDING_SETTLEMENT.

The next calendar month is created with the retained participant/settings defaults, two selected managers, no meal entries, no deposits, no expenses, no settlements, and no carried financial balance. The demo refuses to overwrite an existing next month. All validation occurs before commit. A backend must perform this transition atomically.

## Settlements

Settlement records belong to the original closed month. They never count as next-month deposits or change the final bill. For each account: `original = abs(finalBalance)`, `settled = sum(settlementTransactions)`, `remaining = original − settled`.

Reject zero/negative amounts, fractional paisa, duplicates, incorrect direction and amounts exceeding outstanding balance. Partial payments/refunds reduce only the remaining amount. When every outstanding amount is zero, status becomes SETTLED and both POST_MANAGER roles expire. They then see only their own accounts and histories as ordinary members.

Treasury is distinct from personal balances: zero opening cash + deposits − market/extra spending + settlement payments received − settlement refunds paid. A negative figure means the modeled treasury requires funding; it is not a member's balance. At full settlement the net treasury reconciles to zero.

## Single-mess profiles

The demo supports only সুবর্ণ মেস. Role permissions remain specific to the selected accounting month. An own profile is independent of accounting-month participation and status: every roster member can upload/remove only their own photo and change only their own disposable demo password. Profile changes never alter financial statements, snapshots, deposits or settlement balances. Photos are local PNG/JPEG/WebP previews up to 2 MB. Password changes verify the current value, require a different 8–128 character value and matching confirmation, and use separate profile revisions. Reload/reset restores initial profiles and passwords. Real authentication, persistent credentials and uploads require a future backend.
