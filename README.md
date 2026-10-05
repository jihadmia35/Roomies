# মেসখাতা / MessKhata

A complete Bengali frontend for a single mess: meals, deposits, expenses, monthly bills, manager handover and partial settlements. React + Next.js App Router + strict TypeScript + Tailwind CSS. No backend, database, real authentication, API keys, API routes, Server Actions or deployed services.

## Run

Use Node.js 20.9+ (verified with Node 22). Dependencies are pinned by `package-lock.json`.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. To run a production build:

```bash
npm run build
npm start
```

Checks:

```bash
npm run typecheck
npm run lint
npm test
```

## Explore the demo

The fixed timeline is **September 30, 2026**. Display conventions are Bengali, BDT and Asia/Dhaka. Open the labeled **ডেমো পরিবেশ** panel above the page to switch identity or accounting month, or use **ডেমো রিসেট**.

| Scenario        | Mess       | Identity                                             | Month                 |
| --------------- | ---------- | ---------------------------------------------------- | --------------------- |
| Manager         | সুবর্ণ মেস | আরিফ হাসান or তানভীর আহমেদ                           | September 2026        |
| Member          | সুবর্ণ মেস | রাফি ইসলাম, সাকিব রহমান, নাফিস ইকবাল or মেহেদী হাসান | September 2026        |
| POST_MANAGER    | সুবর্ণ মেস | রাফি ইসলাম or সাকিব রহমান                            | August 2026           |
| Settled history | সুবর্ণ মেস | Any participating identity                           | July 2026             |
| No month access | সুবর্ণ মেস | ইমরান হোসেন (roster candidate)                       | September until added |

সুবর্ণ মেস has six September participants, two slots, 70% minimum, cook/home tracking, fractional meals, overlapping exclusions, midmonth membership, owed/refundable balances and two deliberate missing records on September 30.

Changes survive client-side navigation. A full reload restores all demo data, including profile photos and demo passwords. Identity/month selections are remembered in sessionStorage to make direct-route access checks useful; a newly created month disappears on reload and falls back to September. Reset restores records and selects Arif, the initial manager and September. No actual payment is made.

## Own profile

Open **আমার প্রোফাইল** in the sidebar or click your name/photo in the top bar. Every roster member can use their own profile, including someone who does not participate in the selected month. Managers cannot read or change another member's private profile or password.

Choose a PNG, JPEG or WebP image up to 2 MB, review the local preview and press **ছবি সংরক্ষণ**. The saved photo appears in the header, member tables and statement avatars. **ছবি সরান** requires confirmation and restores initials. No file is sent to a server.

Every identity starts with the disposable demo password **`MessKhata123!`**. Enter the current password, a different new password (8–128 characters) and matching confirmation. Changes apply only to the selected identity; subsequent changes require their new password. This does not implement authentication or modify a real account. Use dummy passwords only. Password values are never included in profile/session responses, monthly records or audit history. Reload/reset clears all photo and password changes.

Only **সুবর্ণ মেস** is implemented. There is no mess selector or second mess dataset. To explore disabled tracking/minimum or another slot configuration, change September's **মাসের নিয়ম** as a manager. Historical rules remain frozen.

## Walk through closing and handover

1. As Arif in September, open **দৈনিক মিল**. Enter a custom decimal (e.g. 1.25). Complete Rafi's missing lunch and mark the missing dinner cook slot present, then save. Alternatively, use the confirmed missing-record resolver in the monthly overview.
2. Open **মাস বন্ধ ও হস্তান্তর**. Review completeness, settings, participants, statements and exact reconciliation. Pick two different next managers, acknowledge the review and close.
3. September managers become POST_MANAGERs. October appears in the month selector with the new two managers, zero deposits/expenses and editable participant/settings defaults.
4. In September's settlement dashboard, record a partial payment/refund; verify the remaining amount. Complete all outstanding accounts. September becomes SETTLED and both former managers have only their own member access.
5. August starts closed with an existing partial refund so settlement exploration does not require closing first.

The **সদস্যদের মাসিক হিসাব** page shows the shared meal rate, allocated per-person extra cost, billable-meal adjustments and total month expenses above a plain-language bill explanation. Its table separates meal cost and extra cost, so each member's total and balance can be understood without opening another page. Member search filters rows while keeping month-wide summary values intact.

Create/edit/delete deposits and expenses, attach a local image receipt, adjust monthly participation, configure slots and rules, view audit before/after records, inspect personal statements, download a CSV or print a statement. Mobile navigation uses the hamburger; large financial and meal tables scroll horizontally with sticky member columns and headers. Search accessible pages via the header or Ctrl/Cmd+K.

## Source and integration

See [architecture](docs/architecture.md), [business rules](docs/business-rules.md), [future API proposal](docs/future-api.md), and [verification](docs/verification.md).

The sole store is `InMemoryRepository`. UI hooks depend on `MessRepository`; replace the provider's repository binding with an HTTP implementation and keep the DTO mappings. Mock methods have endpoint/request/response/authorization comments. There are no implemented endpoints. Production must remove demo controls and independently authorize all requests, validate calculations and commit closing/settlement operations atomically.

## Limits

Browser-memory only; no multi-tab synchronization or persistent financial data. Local image previews never upload. Frontend permissions demonstrate behavior and are not an authentication or security system. Seed audit entries are illustrative; actual demo mutations record the current updater and time.
