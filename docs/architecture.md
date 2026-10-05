# MessKhata architecture

This is a browser-only demonstration. There are **no implemented HTTP endpoints, backend, database, real authentication, environment secrets, Server Actions, or external integrations**. Next.js serves route shells; all demo reads and mutations happen in the browser.

## Boundaries

- `src/app`: App Router layout, asynchronous route params, Suspense boundary, loading and error pages; catch-all URLs dispatch to focused feature screens. Unknown paths and inaccessible records show explanatory states.
- `src/components`: navigation, responsive shell, accessible native forms and modal dialogs, financial table patterns. Icons are Lucide; Bengali font files are locally bundled from Fontsource.
- `src/features`: meal editing, record forms, participation, settings, accounting review and settlement screens. Components obtain data through hooks and the repository interface, never seed imports.
- `src/features/demo/provider.tsx`: holds only selected context, session metadata, refresh version and notifications. No financial calculations or business mutations are implemented in the provider.
- `src/data/repositories/interface.ts`: asynchronous `MessRepository` contract. `InMemoryRepository` is the sole authoritative store. Returned values are defensive clones.
- `src/data/contracts`: typed requests, errors, response metadata, and wire DTO mappers. Wire `quantityMilli` / `amountPaisa` names clarify units. Date-only strings stay strings.
- `src/domain`: pure calendar calculations, exact proportional allocations, scoped permissions, typed entities and consistent domain errors.

## Data loading and isolation

The browser-memory store starts from generated seed records. It is shared across client route navigation. A full reload generates fresh records; context selectors are remembered in sessionStorage and initialized in an effect after hydration. Newly created months that disappear on reload fall back to September. Reset explicitly resets both the records and selection.

`useMonth` keys responses by mess, month and identity. Old responses cannot render after a context change. Effect cleanup ignores late asynchronous responses. The default manager's records are never fetched before the remembered identity has initialized. Context switches immediately invalidate metadata and redirect to the shared root, which displays the effective role's dashboard.

The mock repository checks the mess/month context and derives permission from that month's participation, status and two manager IDs. Member views are scoped **before** DTO construction: only the user's meals, deposits, statements, settlement records and own participant details are returned. Members may see shared cook data and aggregate accounting numbers needed to explain their bill. The demo session directory intentionally exposes selectable personas, including names in the single সুবর্ণ মেস roster, but no private finances.

A route permission map, navigation role selection, repository authorization checks and action guards use the centralized permission layer. Frontend guards and the identity selector are **not security**. The future backend must independently enforce authorization and derive identity from its authenticated session.

## Single mess and own profiles

Seed storage contains one `mess` and its months; session responses expose `mess`, not a mess collection. The context keeps the fixed mess ID as an authorization scope for future HTTP adapters, but the UI cannot switch messes and unsupported IDs are rejected. Previously remembered selections from removed messes fall back to safe defaults.

`src/features/profile` owns profile loading and forms. `useProfile` keys responses by identity and ignores late replies; `/profile` does not require participation in a financial month. `authorizeProfile` centrally checks roster membership and self-only access for every profile repository read/write. Managers have no privilege to change another profile. Saved `Person.photo` data comes from the sole repository store and propagates through session and monthly DTOs to the reusable avatar component. Calendar snapshots and financial revisions are unaffected.

Profile metadata has its own revision and timestamps, separate from monthly revisions. Mock passwords live only in a private repository map and never enter DTOs, logs, financial audit records or persistent storage. They are disposable clear-text in-memory demo values, not production credential handling. Photo validation checks allowed raster types, file signatures and a 2 MB bound. FileReader runs only in a client event handler; unfinished reads abort on unmount. Reload/reset restores photos and initial demo passwords.

## Mutations and refresh

Mutations clone the selected month, validate all records, check `expectedRevision`, update it, record the actor with before/after audit values, then commit once. A revision conflict produces a Bengali message and refreshes the screen instead of silently overwriting another manager. The user can retry against the refreshed state.

Financial submissions and close/settlement operations also use an idempotency key. Duplicate submissions are rejected in the mock. Buttons disable while processing. A future service can safely return the original result for an identical repeated key; it must reject reuse with a different payload.

A successful mutation increments the shared refresh version. Derived numbers are recomputed from the authoritative records by `calculate`; there are no independently maintained dashboard counters. Snapshot accounts bypass live recalculation after close.

## HTTP replacement

Implement `MessRepository` in a new HTTP repository and replace the provider's imported repository binding. Keep DTO validation/mapping in the data layer. Real individual endpoints should return only the authenticated user's records. Account and closing endpoints must be authorized independently even if navigation hides them. See [future-api.md](future-api.md).

Production must remove the demo session selector and reset function. It should add authenticated session resolution, server-calculated summaries, request cancellation, retries for transient reads, pagination and server-side audit retention. Browser-only receipt data URLs should be replaced with an authorized attachment workflow.

## Deliberate demo limits

Data is in-memory per browser tab. Two identities share one tab's revisions; there is no multi-tab synchronization. Demo selections use sessionStorage, not authentication. Receipts are local image previews, not uploaded files. No real cash moves, no notification is sent, and nothing is deployed.
