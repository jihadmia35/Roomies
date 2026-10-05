import { fromMonthViewDTO, toMonthViewDTO } from '@/data/contracts/dto';
import { MessRepository } from '@/data/repositories/interface';
import {
  ProfileQuery,
  PhotoRequest,
  PasswordRequest,
  CloseRequest,
  DayUpdate,
  DeleteRequest,
  HistoryDTO,
  MutationResponse,
  ParticipantsRequest,
  RecordRequest,
  SessionQuery,
  SettingsRequest,
  SettlementRequest,
} from '@/data/contracts';
import { Context, Month, MonthView, Session, Audit, MemberProfile } from '@/domain/models';
import { authorize, authorizeProfile, effectiveRole, permits } from '@/domain/permissions';
import { accountsFor, calculate, treasury } from '@/domain/accounting';
import { ensure } from '@/domain/errors';
import { monthDates, nextCalendar } from '@/domain/dates';
import { seed } from './seed';
import { DEMO_PASSWORD, validatePhoto, validatePassword } from '@/domain/profile';
/** One authoritative client-memory store. Not an authentication/security boundary. */
export class InMemoryRepository implements MessRepository {
  private state = seed();
  private serial = 0;
  // Demo credentials never appear in session/profile DTOs, month records or audit entries.
  private profiles = new Map<
    string,
    { revision: number; password: string; updatedAt?: string; passwordChangedAt?: string }
  >();
  private ownProfile(query: ProfileQuery) {
    authorizeProfile(query, this.state.mess, query.memberId);
    const person = this.state.mess.people.find((p) => p.id === query.memberId)!;
    let metadata = this.profiles.get(person.id);
    if (!metadata) {
      metadata = { revision: 1, password: DEMO_PASSWORD };
      this.profiles.set(person.id, metadata);
    }
    return { person, metadata };
  }
  private profileResponse(query: ProfileQuery): MemberProfile {
    const { person, metadata } = this.ownProfile(query);
    return structuredClone({
      person,
      revision: metadata.revision,
      updatedAt: metadata.updatedAt,
      passwordChangedAt: metadata.passwordChangedAt,
    });
  }
  private profileRevision(actual: number, expected: number) {
    ensure(
      actual === expected,
      'প্রোফাইল পরিবর্তিত হয়েছে। নতুন তথ্য লোড করে আবার চেষ্টা করুন।',
      'CONFLICT',
    );
  }
  private async pause() {
    await new Promise((resolve) => setTimeout(resolve, 35));
  }
  private get(c: Context) {
    const m = this.state.months.find((m) => m.id === c.monthId);
    ensure(m, 'মাসটি খুঁজে পাওয়া যায়নি।', 'NOT_FOUND');
    return m;
  }
  private begin(
    c: Context,
    revision: number,
    permission: 'manage' | 'settle',
    key?: string,
  ): Month {
    const month = this.get(c);
    authorize(c, month, permission);
    if (key) ensure(!month.usedKeys.includes(key), 'একই লেনদেন ইতিমধ্যে জমা হয়েছে।', 'DUPLICATE');
    ensure(
      month.revision === revision,
      'অন্য ম্যানেজার হিসাব পরিবর্তন করেছেন। নতুন তথ্য লোড করে আবার চেষ্টা করুন।',
      'CONFLICT',
    );
    return structuredClone(month);
  }
  private commit(
    c: Context,
    month: Month,
    action: string,
    detail: string,
    before?: unknown,
    after?: unknown,
    key?: string,
  ): MutationResponse {
    const audit: Audit = {
      id: `audit-${++this.serial}`,
      actor: c.userId,
      at: new Date().toISOString(),
      action,
      detail,
      before: before === undefined ? undefined : JSON.stringify(before),
      after: after === undefined ? undefined : JSON.stringify(after),
    };
    month.revision++;
    month.audit.unshift(audit);
    if (key) month.usedKeys.push(key);
    this.state.months[this.state.months.findIndex((m) => m.id === month.id)] = month;
    return structuredClone({ revision: month.revision, audit, summary: calculate(month).summary });
  }
  private date(month: Month, date: string) {
    ensure(monthDates(month.calendar).includes(date), 'তারিখটি নির্বাচিত মাসের মধ্যে হতে হবে।');
  }
  private amount(amount: number) {
    ensure(
      Number.isSafeInteger(amount) && amount > 0 && amount <= 10000000000,
      'সঠিক, শূন্যের বেশি টাকার পরিমাণ লিখুন।',
    );
  }
  // Eikhane GET /session and /messes/{messId}/months endpoint-er API use hobe.
  // Request/query: SessionQuery. Response: Session (demo-selectable identities and effective month roles).
  // Authorization: future authenticated session; mess membership. Future integration: replace this mock operation inside the HTTP repository.
  async session(query: SessionQuery): Promise<Session> {
    await this.pause();
    const mess = query.messId === this.state.mess.id ? this.state.mess : undefined;
    ensure(mess, 'মেস পাওয়া যায়নি।', 'NOT_FOUND');
    ensure(
      mess.people.some((p) => p.id === query.userId),
      'এই মেসের সদস্য নন।',
      'FORBIDDEN',
    );
    return structuredClone({
      mess,
      months: this.state.months
        .filter((m) => m.messId === query.messId)
        .map((m) => ({
          id: m.id,
          calendar: m.calendar,
          status: m.status,
          role: effectiveRole(m, query.userId),
        })),
    });
  }
  // Eikhane GET /messes/{messId}/months/{monthId}/my-statement, /my-meals, /my-deposits or /accounts endpoint-er API use hobe.
  // Request/query: Context; server MUST derive identity from session. Response: scoped MonthViewDTO mapped to domain MonthView.
  // Authorization: own or accounts permission; individual records are selected BEFORE mapping. Future integration: replace this mock operation inside the HTTP repository.
  async view(c: Context): Promise<MonthView> {
    await this.pause();
    const month = this.get(c);
    const role = authorize(c, month, 'own');
    const all = permits(role, month.status, 'accounts');
    const mess = this.state.mess;
    const statements = calculate(month).statements.filter((s) => all || s.memberId === c.userId);
    const allowed = new Set(statements.map((s) => s.memberId));
    const filter = <T extends { memberId: string }>(items: T[]) =>
      items.filter((i) => allowed.has(i.memberId));
    const scoped: MonthView = {
      context: c,
      calendar: month.calendar,
      status: month.status,
      role,
      revision: month.revision,
      rules: month.snapshot?.rules ?? month.rules,
      managers: mess.people.filter((p) => month.managers.includes(p.id)),
      participants: filter(month.snapshot?.participants ?? month.participants),
      people: mess.people.filter((p) => allowed.has(p.id)),
      summary: calculate(month).summary,
      statements,
      meals: filter(month.meals),
      cooks: month.cooks,
      deposits: filter(month.deposits),
      expenses: all ? month.expenses : [],
      settlements: filter(month.settlements),
      accounts: accountsFor(month, mess.people).filter((a) => allowed.has(a.person.id)),
      treasury: all ? treasury(month) : undefined,
      audit: permits(role, month.status, 'audit') ? month.audit : [],
      snapshotAt: month.snapshot?.closedAt,
    };
    return fromMonthViewDTO(toMonthViewDTO(scoped));
  }
  // Eikhane GET /messes/{messId}/my-history endpoint-er API use hobe.
  // Request/query: Context. Response: HistoryDTO[] with only current user's monthly statements.
  // Authorization: mess membership and own month permission. Future integration: replace this mock operation inside the HTTP repository.
  async history(c: Context): Promise<HistoryDTO[]> {
    await this.pause();
    authorize(c, this.get(c), 'own');
    return this.state.months
      .filter((m) => m.messId === c.messId && effectiveRole(m, c.userId))
      .map((m) => {
        const s = calculate(m).statements.find((s) => s.memberId === c.userId)!;
        return {
          monthId: m.id,
          calendar: m.calendar,
          status: m.status,
          actual: s.actual,
          billable: s.billable,
          deposits: s.deposits,
          totalCost: s.totalCost,
          balance: s.balance,
        };
      });
  }
  // Eikhane PATCH /messes/{messId}/months/{monthId}/meal-days/{date} endpoint-er API use hobe.
  // Request body: DayUpdate (expectedRevision, cook records, member entries, explicit discard acknowledgment).
  // Response: MutationResponse incl new revision, audit metadata and summary. Errors: ErrorDTO VALIDATION/CONFLICT/FORBIDDEN.
  // Authorization: MANAGER of OPEN month. Future integration: replace this mock operation inside the HTTP repository.
  async updateDay(c: Context, r: DayUpdate) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'manage');
    this.date(m, r.date);
    const before = m.meals.filter((e) => e.date === r.date);
    const slotIds = new Set(m.rules.slots.map((s) => s.id));
    const entries = new Set<string>();
    for (const cook of r.cooks) {
      ensure(
        cook.date === r.date && slotIds.has(cook.slotId) && typeof cook.available === 'boolean',
        'বাবুর্চির তথ্য সঠিকভাবে দিন।',
      );
      if (
        m.rules.cookTracking &&
        cook.available === false &&
        m.meals.some(
          (e) => e.date === r.date && e.slotId === cook.slotId && e.quantity > 0 && e.recorded,
        )
      )
        ensure(r.acknowledgeDiscard, 'এই স্লটে মিল রয়েছে। শূন্য করতে আগে সম্মতি দিন।');
      const old = m.cooks.find((e) => e.date === r.date && e.slotId === cook.slotId);
      if (old) old.available = m.rules.cookTracking ? cook.available : true;
      else m.cooks.push({ ...cook, available: m.rules.cookTracking ? cook.available : true });
    }
    for (const e of r.entries) {
      ensure(
        m.participants.some((p) => p.memberId === e.memberId) && slotIds.has(e.slotId),
        'সদস্য বা মিল স্লট সঠিক নয়।',
      );
      ensure(!entries.has(`${e.memberId}:${e.slotId}`), 'একই মিল দুইবার এসেছে।');
      entries.add(`${e.memberId}:${e.slotId}`);
      ensure(
        Number.isSafeInteger(e.quantity) && e.quantity >= 0 && e.quantity <= 10000,
        'মিল 0 থেকে 10; সর্বোচ্চ তিন ঘর দশমিক।',
      );
      const isHome = m.rules.homeTracking && e.isHome;
      const available =
        !m.rules.cookTracking ||
        m.cooks.find((cook) => cook.date === r.date && cook.slotId === e.slotId)?.available !==
          false;
      const old = m.meals.find(
        (x) => x.date === r.date && x.slotId === e.slotId && x.memberId === e.memberId,
      );
      const at = new Date().toISOString();
      const meal = {
        ...e,
        isHome,
        quantity: isHome || !available ? 0 : e.quantity,
        date: r.date,
        recordedBy: c.userId,
        createdAt: old?.createdAt ?? at,
        updatedAt: at,
      };
      if (old) Object.assign(old, meal);
      else m.meals.push(meal);
    }
    // Shared cook-missed updates apply atomically to every member, even partial batch requests.
    for (const meal of m.meals.filter((e) => e.date === r.date))
      if (
        m.rules.cookTracking &&
        m.cooks.find((x) => x.date === r.date && x.slotId === meal.slotId)?.available === false
      ) {
        meal.quantity = 0;
        meal.recordedBy = c.userId;
        meal.updatedAt = new Date().toISOString();
      }
    return this.commit(
      c,
      m,
      'দৈনিক মিল সংরক্ষণ',
      r.date,
      before,
      m.meals.filter((e) => e.date === r.date),
    );
  }
  // Eikhane POST/PATCH /messes/{messId}/months/{monthId}/deposits or /expenses endpoint-er API use hobe.
  // Request body: RecordRequest (integer paisa, date-only, expectedRevision, idempotencyKey).
  // Response: MutationResponse; ErrorDTO VALIDATION/CONFLICT/DUPLICATE/FORBIDDEN. Authorization: OPEN MANAGER.
  // Future integration: replace this mock operation inside the HTTP repository.
  async saveRecord(c: Context, r: RecordRequest) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'manage', r.idempotencyKey);
    const body = r.record.body;
    this.amount(body.amount);
    this.date(m, body.date);
    const at = new Date().toISOString();
    const list = r.record.type === 'deposit' ? m.deposits : m.expenses;
    const old = r.id ? list.find((x) => x.id === r.id) : undefined;
    if (r.id) ensure(old, 'লেনদেন পাওয়া যায়নি।', 'NOT_FOUND');
    const meta = {
      id: r.id ?? `record-${++this.serial}`,
      recordedBy: c.userId,
      createdAt: old?.createdAt ?? at,
      updatedAt: at,
    };
    if (r.record.type === 'deposit') {
      const depositBody = r.record.body;
      ensure(
        m.participants.some((p) => p.memberId === depositBody.memberId),
        'এই মাসের অংশগ্রহণকারী নির্বাচন করুন।',
      );
      ensure(r.record.body.method.trim(), 'পেমেন্ট মাধ্যম লিখুন।');
      const record = { ...r.record.body, ...meta };
      if (old) m.deposits = m.deposits.map((x) => (x.id === r.id ? record : x));
      else m.deposits.push(record);
    } else {
      ensure(
        r.record.body.description.trim() && r.record.body.category.trim(),
        'বিভাগ ও বিবরণ লিখুন।',
      );
      ensure(['MARKET', 'EXTRA'].includes(r.record.body.kind), 'খরচের ধরন সঠিক নয়।');
      ensure(
        !r.record.body.receipt ||
          /^data:image\/(png|jpeg|webp);base64,/.test(r.record.body.receipt),
        'শুধু স্থানীয় PNG, JPEG বা WebP রসিদ ব্যবহার করুন।',
      );
      const record = { ...r.record.body, ...meta };
      if (old) m.expenses = m.expenses.map((x) => (x.id === r.id ? record : x));
      else m.expenses.push(record);
    }
    return this.commit(
      c,
      m,
      old ? 'লেনদেন সংশোধন' : 'নতুন লেনদেন',
      r.record.type,
      old,
      { ...body, ...meta },
      r.idempotencyKey,
    );
  }
  // Eikhane DELETE /messes/{messId}/months/{monthId}/{deposits|expenses}/{id} endpoint-er API use hobe.
  // Request: DeleteRequest with revision. Response: MutationResponse; ErrorDTO NOT_FOUND/CONFLICT/FORBIDDEN.
  // Authorization: OPEN MANAGER. Future integration: replace this mock operation inside the HTTP repository.
  async deleteRecord(c: Context, r: DeleteRequest) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'manage');
    const old = (r.type === 'deposit' ? m.deposits : m.expenses).find((x) => x.id === r.id);
    ensure(old, 'রেকর্ড পাওয়া যায়নি।', 'NOT_FOUND');
    if (r.type === 'deposit') m.deposits = m.deposits.filter((x) => x.id !== r.id);
    else m.expenses = m.expenses.filter((x) => x.id !== r.id);
    return this.commit(c, m, 'লেনদেন মুছে ফেলা', r.type, old);
  }
  // Eikhane PATCH /messes/{messId}/months/{monthId}/settings endpoint-er API use hobe.
  // Request: SettingsRequest. Response: MutationResponse; ErrorDTO VALIDATION/CONFLICT/FORBIDDEN.
  // Authorization: OPEN MANAGER; closed snapshot immutable. Future integration: replace this mock operation inside the HTTP repository.
  async updateSettings(c: Context, r: SettingsRequest) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'manage');
    const rules = r.rules;
    ensure(rules.slots.length >= 1 && rules.slots.length <= 5, '1 থেকে 5টি স্লট দিন।');
    ensure(
      new Set(rules.slots.map((s) => s.id)).size === rules.slots.length &&
        rules.slots.every((s) => s.label.trim() && s.id.trim()),
      'স্লটের নাম ও আইডি স্বতন্ত্র হতে হবে।',
    );
    ensure(
      Number.isInteger(rules.minimumPercent) &&
        rules.minimumPercent >= 0 &&
        rules.minimumPercent <= 100,
      'শতকরা হার 0 থেকে 100 হতে হবে।',
    );
    ensure(
      !m.meals.some((e) => e.quantity > 0 && !rules.slots.some((s) => s.id === e.slotId)),
      'মিল আছে এমন স্লট মুছতে হলে আগে তার মিল শূন্য করুন।',
    );
    const before = m.rules;
    m.rules = structuredClone(rules);
    m.meals = m.meals.filter((e) => rules.slots.some((s) => s.id === e.slotId));
    m.cooks = m.cooks.filter((e) => rules.slots.some((s) => s.id === e.slotId));
    return this.commit(c, m, 'মাসের নিয়ম পরিবর্তন', 'সেটিংস', before, rules);
  }
  // Eikhane PATCH /messes/{messId}/months/{monthId}/participants endpoint-er API use hobe.
  // Request: ParticipantsRequest (explicit month membership). Response: MutationResponse; ErrorDTO VALIDATION/CONFLICT/FORBIDDEN.
  // Authorization: OPEN MANAGER. Future integration: replace this mock operation inside the HTTP repository.
  async updateParticipants(c: Context, r: ParticipantsRequest) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'manage');
    const mess = this.state.mess;
    ensure(
      new Set(r.participants.map((p) => p.memberId)).size === r.participants.length,
      'সদস্য দুইবার নির্বাচন করা হয়েছে।',
    );
    ensure(
      r.participants.every(
        (p) =>
          mess.people.some((x) => x.id === p.memberId) &&
          monthDates(m.calendar).includes(p.joinedOn),
      ),
      'সদস্য বা যোগদানের তারিখ সঠিক নয়।',
    );
    ensure(
      m.managers.every((id) => r.participants.some((p) => p.memberId === id)),
      'দুই ম্যানেজারকে মাসের অংশগ্রহণকারী রাখতে হবে।',
    );
    const removed = m.participants.filter(
      (p) => !r.participants.some((n) => n.memberId === p.memberId),
    );
    ensure(
      !removed.some(
        (p) =>
          m.deposits.some((d) => d.memberId === p.memberId) ||
          m.meals.some((e) => e.memberId === p.memberId && e.quantity > 0),
      ),
      'মিল বা জমা থাকা সদস্যকে বাদ দেওয়া যাবে না। আগে সংশ্লিষ্ট রেকর্ড সংশোধন করুন।',
    );
    const before = m.participants;
    m.participants = structuredClone(r.participants);
    m.meals = m.meals.filter((e) => r.participants.some((p) => p.memberId === e.memberId));
    return this.commit(c, m, 'মাসের অংশগ্রহণকারী পরিবর্তন', 'সদস্য', before, r.participants);
  }
  // Eikhane POST /messes/{messId}/months/{monthId}/close endpoint-er API use hobe.
  // Request: CloseRequest (revision, idempotency key, exactly two next managers).
  // Response: MutationResponse; ErrorDTO VALIDATION/CONFLICT/DUPLICATE/FORBIDDEN. Authorization: OPEN MANAGER.
  // Future integration: replace this mock operation inside the HTTP repository; backend must commit snapshot and handover atomically.
  async close(c: Context, r: CloseRequest) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'manage', r.idempotencyKey);
    const { summary, statements } = calculate(m);
    ensure(!summary.error, summary.error ?? '');
    ensure(
      summary.missingMeals === 0 && summary.missingCook === 0,
      'অসম্পূর্ণ মিল ও বাবুর্চির তথ্য আগে পূরণ করুন।',
    );
    ensure(
      r.nextManagers.length === 2 &&
        r.nextManagers[0] !== r.nextManagers[1] &&
        r.nextManagers.every((id) => m.participants.some((p) => p.memberId === id)),
      'পরের মাসের দুইজন ভিন্ন অংশগ্রহণকারী ম্যানেজার নির্বাচন করুন।',
    );
    const calendar = nextCalendar(m.calendar);
    const existing = this.state.months.find(
      (x) => x.messId === c.messId && x.calendar === calendar,
    );
    ensure(!existing, 'পরের মাস ইতিমধ্যে আছে। বিদ্যমান মাস ওভাররাইট করা যাবে না।');
    m.snapshot = {
      rules: structuredClone(m.rules),
      participants: structuredClone(m.participants),
      summary,
      statements,
      closedAt: new Date().toISOString(),
      closedBy: c.userId,
    };
    m.status = statements.every((s) => s.balance === 0) ? 'SETTLED' : 'CLOSED_PENDING_SETTLEMENT';
    const next: Month = {
      id: `${c.messId}-${calendar}`,
      messId: c.messId,
      calendar,
      status: 'OPEN',
      managers: r.nextManagers,
      participants: m.participants.map((p) => ({ ...p, joinedOn: `${calendar}-01` })),
      rules: structuredClone(m.rules),
      meals: [],
      cooks: [],
      deposits: [],
      expenses: [],
      settlements: [],
      audit: [],
      revision: 1,
      usedKeys: [],
    };
    this.state.months.push(next);
    return this.commit(
      c,
      m,
      'মাস বন্ধ ও দায়িত্ব হস্তান্তর',
      `${calendar}: ${r.nextManagers.join(', ')}`,
      undefined,
      m.snapshot,
      r.idempotencyKey,
    );
  }
  // Eikhane POST /messes/{messId}/months/{monthId}/settlement-transactions endpoint-er API use hobe.
  // Request: SettlementRequest (direction, paisa, original-month date, revision, idempotency key).
  // Response: MutationResponse; ErrorDTO VALIDATION/CONFLICT/DUPLICATE/FORBIDDEN. Authorization: active POST_MANAGER.
  // Future integration: replace this mock operation inside the HTTP repository; atomically update remaining amounts and role expiry.
  async settle(c: Context, r: SettlementRequest) {
    await this.pause();
    const m = this.begin(c, r.expectedRevision, 'settle', r.idempotencyKey);
    this.amount(r.amount);
    ensure(
      /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        !Number.isNaN(Date.parse(`${r.date}T00:00:00Z`)) &&
        new Date(`${r.date}T00:00:00Z`).toISOString().slice(0, 10) === r.date &&
        r.date >= `${m.calendar}-01`,
      'নিষ্পত্তির সঠিক তারিখ দিন।',
    );
    ensure(r.method.trim(), 'মাধ্যম নির্বাচন করুন।');
    const mess = this.state.mess;
    const account = accountsFor(m, mess.people).find((a) => a.person.id === r.memberId);
    ensure(account, 'সদস্য পাওয়া যায়নি।', 'NOT_FOUND');
    ensure(account.direction === r.direction, 'পেমেন্ট বা ফেরতের দিক সঠিক নয়।');
    ensure(
      r.amount <= account.remaining && account.remaining > 0,
      'পরিমাণ বকেয়ার চেয়ে বেশি হতে পারে না।',
    );
    const at = new Date().toISOString();
    m.settlements.push({
      id: `settlement-${++this.serial}`,
      memberId: r.memberId,
      amount: r.amount,
      direction: r.direction,
      date: r.date,
      method: r.method,
      note: r.note,
      recordedBy: c.userId,
      createdAt: at,
      updatedAt: at,
    });
    if (accountsFor(m, mess.people).every((a) => a.remaining === 0)) m.status = 'SETTLED';
    return this.commit(
      c,
      m,
      'নিষ্পত্তি রেকর্ড',
      r.memberId,
      { remaining: account.remaining },
      { amount: r.amount, remaining: account.remaining - r.amount },
      r.idempotencyKey,
    );
  }
  // Eikhane GET /profile endpoint-er API use hobe.
  // Request/query: ProfileQuery. Response: MemberProfile, excluding all credentials.
  // Authorization: own mess profile, independent of month role. Errors: ErrorDTO FORBIDDEN.
  // Future integration: replace this mock operation inside the HTTP repository; derive user from session.
  async profile(query: ProfileQuery): Promise<MemberProfile> {
    await this.pause();
    return this.profileResponse(query);
  }
  // Eikhane PATCH /profile/photo endpoint-er API use hobe.
  // Request body: PhotoRequest (expectedRevision, local photo data URL or null to remove).
  // Response: MemberProfile. Errors: ErrorDTO VALIDATION/CONFLICT/FORBIDDEN.
  // Authorization: own profile only, even for managers. Future integration: replace this mock operation inside the HTTP repository with authorized attachment storage.
  async updatePhoto(query: ProfileQuery, request: PhotoRequest): Promise<MemberProfile> {
    await this.pause();
    const { person, metadata } = this.ownProfile(query);
    this.profileRevision(metadata.revision, request.expectedRevision);
    validatePhoto(request.photo);
    if (request.photo === null) delete person.photo;
    else person.photo = request.photo;
    metadata.revision++;
    metadata.updatedAt = new Date().toISOString();
    return this.profileResponse(query);
  }
  // Eikhane POST /profile/password endpoint-er API use hobe.
  // Request body: PasswordRequest (revision, currentPassword, newPassword, confirmPassword).
  // Response: MemberProfile with changed timestamp, never passwords. Errors: ErrorDTO VALIDATION/CONFLICT/FORBIDDEN.
  // Authorization: own profile, verify current password. Future integration: replace this mock operation inside the HTTP repository; HTTPS, credential hashing, rate limiting and session revocation belong to the backend.
  async changePassword(query: ProfileQuery, request: PasswordRequest): Promise<MemberProfile> {
    await this.pause();
    const { metadata } = this.ownProfile(query);
    this.profileRevision(metadata.revision, request.expectedRevision);
    ensure(request.currentPassword === metadata.password, 'বর্তমান পাসওয়ার্ড সঠিক নয়।');
    validatePassword(request.currentPassword, request.newPassword, request.confirmPassword);
    metadata.password = request.newPassword;
    metadata.revision++;
    metadata.updatedAt = metadata.passwordChangedAt = new Date().toISOString();
    return this.profileResponse(query);
  }
  // Demo only. No production reset endpoint. Request: none; Response: void.
  // Authorization: explicitly visible demo controls. Future integration: remove this mock operation from production.
  async reset() {
    await this.pause();
    this.state = seed();
    this.serial = 0;
    this.profiles.clear();
  }
}
export const repository: MessRepository = new InMemoryRepository();
