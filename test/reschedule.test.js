import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppointmentService } from '../src/appointments.js';
import { AppointmentStore, openFileStore } from '../src/store.js';

const input = (changes = {}) => ({
  practitionerId: 'demo-clinica-geral', patientRef: 'exemplo_001',
  startsAt: '2030-04-08T09:00:00-03:00', durationMinutes: 30, ...changes,
});
const timing = (startsAt = '2030-04-08T10:00:00-03:00', durationMinutes = 30) => ({ startsAt, durationMinutes });
const missingId = '00000000-0000-0000-0000-000000000000';

test('reschedule preserves identity, normalizes UTC and ignores its own previous interval', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const original = await service.create(input());
  const moved = await service.reschedule(original.id, timing('2030-04-08T09:15:00-03:00', 45));
  const expected = { ...original, startsAt: '2030-04-08T12:15:00.000Z', durationMinutes: 45 };
  assert.deepEqual(moved, expected);
  assert.deepEqual(await service.list(), [expected]);
  assert.deepEqual(await service.reschedule(original.id, timing(expected.startsAt, 45)), expected);
  moved.status = 'cancelled';
  assert.deepEqual(await service.list(), [expected]);
});

test('reschedule rejects absent, completed and cancelled appointments without changing them', async () => {
  const service = new AppointmentService(new AppointmentStore());
  await assert.rejects(service.reschedule(missingId, timing()), { status: 404, code: 'appointment_not_found' });
  for (const status of ['completed', 'cancelled']) {
    const item = await service.create(input({ startsAt: status === 'completed' ? '2030-04-08T08:00:00Z' : '2030-04-08T09:00:00Z' }));
    await service.status(item.id, { status });
    const before = await service.list();
    await assert.rejects(service.reschedule(item.id, timing()), { status: 409, code: 'invalid_transition' });
    assert.deepEqual(await service.list(), before);
  }
});

test('other scheduled and completed appointments block rescheduling and keep the original slot occupied', async () => {
  for (const status of ['scheduled', 'completed']) {
    const service = new AppointmentService(new AppointmentStore());
    const original = await service.create(input());
    const blocker = await service.create(input({ startsAt: '2030-04-08T10:00:00-03:00' }));
    if (status === 'completed') await service.status(blocker.id, { status });
    const before = await service.list();
    await assert.rejects(service.reschedule(original.id, timing()), { status: 409, code: 'schedule_conflict' });
    await assert.rejects(service.create(input()), { code: 'schedule_conflict' });
    assert.deepEqual(await service.list(), before);
  }
});

test('reschedule permits cancelled slots, adjacent intervals and a different professional', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const original = await service.create(input());
  const cancelled = await service.create(input({ startsAt: '2030-04-08T10:00:00-03:00' }));
  await service.status(cancelled.id, { status: 'cancelled' });
  await service.create(input({ startsAt: '2030-04-08T10:00:00-03:00', practitionerId: 'demo-pediatria' }));
  const adjacent = await service.create(input({ startsAt: '2030-04-08T10:30:00-03:00' }));
  assert.equal((await service.reschedule(original.id, timing())).startsAt, '2030-04-08T13:00:00.000Z');
  assert.equal((await service.reschedule(original.id, timing('2030-04-08T11:00:00-03:00'))).startsAt, '2030-04-08T14:00:00.000Z');
  assert.equal((await service.list()).find((item) => item.id === adjacent.id).startsAt, adjacent.startsAt);
});

test('reschedule rejects unknown fields and incomplete or invalid timing without altering the appointment', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const original = await service.create(input());
  const invalid = [
    null, [], 'invalid', {}, { startsAt: timing().startsAt }, { durationMinutes: 30 },
    { ...timing(), startsAt: null }, { ...timing(), startsAt: 123 },
    { ...timing(), startsAt: '2030-02-30T10:00:00Z' },
    { ...timing(), startsAt: '2030-04-08T24:00:00Z' },
    { ...timing(), startsAt: '2030-04-08T10:07:00Z' },
    { ...timing(), startsAt: '2030-04-08T10:00:01Z' },
    { ...timing(), startsAt: '2030-04-08T10:00:00' },
    ...[null, '30', 0, 20, 135, 30.5].map((durationMinutes) => ({ ...timing(), durationMinutes })),
    ...['id', 'practitionerId', 'patientRef', 'status', 'createdAt', 'notes'].map((key) => ({ ...timing(), [key]: 'not-allowed' })),
  ];
  for (const body of invalid) {
    await assert.rejects(async () => service.reschedule(original.id, body), { status: 400, code: 'validation_error' });
    assert.deepEqual(await service.list(), [original]);
  }
  assert.equal((await service.reschedule(original.id, timing())).id, original.id);
});

test('a create and reschedule racing for one slot cannot both succeed in either queue order', async () => {
  for (const rescheduleFirst of [true, false]) {
    const service = new AppointmentService(new AppointmentStore());
    const original = await service.create(input());
    const operations = rescheduleFirst
      ? [service.reschedule(original.id, timing()), service.create(input(timing()))]
      : [service.create(input(timing())), service.reschedule(original.id, timing())];
    const outcomes = await Promise.allSettled(operations);
    assert.equal(outcomes[0].status, 'fulfilled');
    assert.equal(outcomes[1].status, 'rejected');
    assert.equal(outcomes[1].reason.code, 'schedule_conflict');
    const saved = await service.list();
    assert.equal(saved.filter((item) => item.startsAt === '2030-04-08T13:00:00.000Z').length, 1);
    assert.equal(saved.find((item) => item.id === original.id).startsAt,
      rescheduleFirst ? '2030-04-08T13:00:00.000Z' : original.startsAt);
  }
});

test('two reschedules racing for one slot preserve the losing appointment in its original interval', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const first = await service.create(input());
  const second = await service.create(input({ startsAt: '2030-04-08T11:00:00-03:00' }));
  const results = await Promise.allSettled([
    service.reschedule(first.id, timing()), service.reschedule(second.id, timing()),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[1].reason.code, 'schedule_conflict');
  assert.deepEqual((await service.list()).find((item) => item.id === second.id), second);
});

test('failed reschedule persistence preserves memory, saved data and original-slot exclusion; queue recovers', async () => {
  let writes = 0;
  let persisted = [];
  const store = new AppointmentStore([], async (next) => {
    if (++writes === 2) throw new Error('Disk unavailable');
    persisted = structuredClone(next);
  });
  const service = new AppointmentService(store);
  const original = await service.create(input());
  const failed = service.reschedule(original.id, timing());
  const oldSlot = service.create(input());
  const results = await Promise.allSettled([failed, oldSlot]);
  assert.equal(results[0].status, 'rejected');
  assert.match(results[0].reason.message, /Disk unavailable/);
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[1].reason.code, 'schedule_conflict');
  assert.deepEqual(await store.read(), [original]);
  assert.deepEqual(persisted, [original]);
  const moved = await service.reschedule(original.id, timing());
  assert.deepEqual(persisted, [moved]);
  await service.create(input());
  assert.equal((await service.list()).length, 2);
});

test('successful rescheduling survives reopening file storage with the same identity', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'medicina-open-reschedule-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const first = await openFileStore(directory);
  let reopened;
  try {
    const service = new AppointmentService(first.store);
    const original = await service.create(input());
    const moved = await service.reschedule(original.id, timing('2030-04-08T11:00:00+01:00', 60));
    await first.close();
    reopened = await openFileStore(directory);
    assert.deepEqual(await reopened.store.read(), [moved]);
    assert.equal(moved.id, original.id);
    assert.equal(moved.startsAt, '2030-04-08T10:00:00.000Z');
  } finally {
    if (reopened) await reopened.close();
  }
});
