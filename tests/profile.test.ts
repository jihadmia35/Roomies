import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryRepository } from '@/data/mock/repository';
import { DEMO_PASSWORD, PHOTO_MAX_BYTES } from '@/domain/profile';
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ozkAAAAASUVORK5CYII=';
const self = { messId: 'a', userId: 'a3', memberId: 'a3' };
const month = { messId: 'a', userId: 'a3', monthId: 'a-2026-08' };
const password = {
  expectedRevision: 1,
  currentPassword: DEMO_PASSWORD,
  newPassword: 'PracticeOnly456!',
  confirmPassword: 'PracticeOnly456!',
};
let repo: InMemoryRepository;
beforeEach(() => {
  repo = new InMemoryRepository();
});
describe('own profile and single-mess scope', () => {
  it('returns one mess directory and rejects unsupported messes', async () => {
    const session = await repo.session(self);
    expect(session.mess.id).toBe('a');
    expect(session.mess.people).toHaveLength(7);
    expect(session).not.toHaveProperty('messes');
    await expect(repo.session({ messId: 'b', userId: 'b1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
  it('blocks reading or changing someone else’s profile, including a manager', async () => {
    const other = { ...self, userId: 'a1' };
    await expect(repo.profile(other)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      repo.updatePhoto(other, { expectedRevision: 1, photo: png }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(repo.changePassword(other, password)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(repo.profile({ ...self, messId: 'b' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('allows roster members without month participation to manage their profile', async () => {
    const candidate = { ...self, userId: 'a7', memberId: 'a7' };
    expect((await repo.profile(candidate)).person.name).toBe('ইমরান হোসেন');
    expect(
      (await repo.updatePhoto(candidate, { expectedRevision: 1, photo: png })).person.photo,
    ).toBe(png);
    await expect(repo.view({ ...month, userId: 'a7' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('propagates an own photo across session and monthly views without changing closed finances', async () => {
    const before = await repo.view(month);
    const response = await repo.updatePhoto(self, { expectedRevision: 1, photo: png });
    expect(response.revision).toBe(2);
    const after = await repo.view(month);
    expect(after.people.find((p) => p.id === 'a3')?.photo).toBe(png);
    expect((await repo.session(self)).mess.people.find((p) => p.id === 'a3')?.photo).toBe(png);
    expect(after.summary).toEqual(before.summary);
    expect(after.statements).toEqual(before.statements);
    expect(after.revision).toBe(before.revision);
    response.person.name = 'mutated';
    expect((await repo.profile(self)).person.name).toBe('রাফি ইসলাম');
    await repo.updatePhoto(self, { expectedRevision: 2, photo: null });
    expect((await repo.profile(self)).person.photo).toBeUndefined();
  });
  it('rejects invalid types, malformed image bytes, oversized files and stale photo writes', async () => {
    for (const photo of [
      'https://example.com/photo.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,AAAA',
      'data:image/png;base64,' + btoa('\x89PNG\r\n\x1a\n' + 'x'.repeat(PHOTO_MAX_BYTES)),
    ]) {
      await expect(repo.updatePhoto(self, { expectedRevision: 1, photo })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    }
    await repo.updatePhoto(self, { expectedRevision: 1, photo: png });
    await expect(
      repo.updatePhoto(self, { expectedRevision: 1, photo: null }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('validates current password, confirmation, length and unchanged passwords', async () => {
    for (const invalid of [
      { ...password, currentPassword: 'WrongPassword' },
      { ...password, confirmPassword: 'DoesNotMatch' },
      { ...password, newPassword: 'short', confirmPassword: 'short' },
      { ...password, newPassword: '        ', confirmPassword: '        ' },
      { ...password, newPassword: DEMO_PASSWORD, confirmPassword: DEMO_PASSWORD },
    ])
      await expect(repo.changePassword(self, invalid)).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    expect((await repo.profile(self)).revision).toBe(1);
  });
  it('uses changed password for subsequent changes and never returns credentials', async () => {
    const changed = await repo.changePassword(self, password);
    expect(changed.passwordChangedAt).toBeDefined();
    expect(changed).not.toHaveProperty('password');
    expect(changed).not.toHaveProperty('newPassword');
    await expect(
      repo.changePassword(self, { ...password, expectedRevision: 2 }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await repo.changePassword(self, {
      ...password,
      expectedRevision: 2,
      currentPassword: password.newPassword,
      newPassword: 'AnotherPractice789!',
      confirmPassword: 'AnotherPractice789!',
    });
    const other = { ...self, userId: 'a4', memberId: 'a4' };
    await repo.changePassword(other, password);
    expect(
      (await repo.view(month)).audit.some((a) => JSON.stringify(a).includes(password.newPassword)),
    ).toBe(false);
    expect(JSON.stringify(await repo.session(self))).not.toContain(password.newPassword);
  });
  it('reset clears photos and restores every identity’s initial demo password', async () => {
    await repo.changePassword(self, password);
    await repo.updatePhoto(self, { expectedRevision: 2, photo: png });
    await repo.reset();
    expect((await repo.profile(self)).person.photo).toBeUndefined();
    expect((await repo.profile(self)).revision).toBe(1);
    await repo.changePassword(self, password);
  });
});
