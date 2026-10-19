import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppointmentService } from '../src/appointments.js';
import { AppointmentStore, openFileStore } from '../src/store.js';
import { createApplication } from '../src/server.js';

const outsideUtcYears = [
  '0000-01-01T00:00:00+01:00',
  '9999-12-31T23:45:00-01:00',
];
const input = (startsAt) => ({
  practitionerId: 'demo-clinica-geral', patientRef: 'synthetic_boundary',
  startsAt, durationMinutes: 15,
});
const validationError = { status: 400, code: 'validation_error' };

test('create rejects UTC year overflow and underflow before persistence', async () => {
  let writes = 0;
  const store = new AppointmentStore([], async () => { writes += 1; });
  const service = new AppointmentService(store);
  for (const startsAt of outsideUtcYears) {
    assert.throws(() => service.create(input(startsAt)), validationError);
  }
  assert.equal(writes, 0);
  assert.deepEqual(await store.read(), []);
});

test('reschedule rejects UTC year overflow and underflow without changing the appointment', async () => {
  let writes = 0;
  const store = new AppointmentStore([], async () => { writes += 1; });
  const service = new AppointmentService(store);
  const original = await service.create(input('2030-04-08T09:00:00Z'));
  for (const startsAt of outsideUtcYears) {
    await assert.rejects(service.reschedule(original.id, { startsAt, durationMinutes: 15 }), validationError);
    assert.deepEqual(await service.list(), [original]);
  }
  assert.equal(writes, 1);
});

test('UTC boundaries and offsets normalizing exactly to them round-trip through the file store', async () => {
  for (const [startsAt, canonical] of [
    ['0000-01-01T00:00:00Z', '0000-01-01T00:00:00.000Z'],
    ['0000-01-01T01:00:00+01:00', '0000-01-01T00:00:00.000Z'],
    ['9999-12-31T23:45:00Z', '9999-12-31T23:45:00.000Z'],
    ['9999-12-31T22:45:00-01:00', '9999-12-31T23:45:00.000Z'],
  ]) {
    const directory = await mkdtemp(join(tmpdir(), 'medicina-utc-boundary-'));
    let opened;
    try {
      opened = await openFileStore(directory);
      const service = new AppointmentService(opened.store);
      const original = await service.create(input(startsAt));
      assert.equal(original.startsAt, canonical);
      assert.deepEqual(await service.reschedule(original.id, {
        startsAt: canonical, durationMinutes: 15,
      }), original);
      await opened.close();
      opened = undefined;
      opened = await openFileStore(directory);
      const restored = new AppointmentService(opened.store);
      assert.deepEqual(await restored.list(), [original]);
      assert.deepEqual(await restored.list({ date: canonical.slice(0, 10) }), [original]);
    } finally {
      if (opened) await opened.close();
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('invalid UTC starts preserve persisted bytes and the store remains reopenable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'medicina-utc-rejection-'));
  let opened;
  try {
    opened = await openFileStore(directory);
    const service = new AppointmentService(opened.store);
    const original = await service.create(input('2030-04-08T09:00:00Z'));
    const file = join(directory, 'appointments.json');
    const before = await readFile(file);
    for (const startsAt of outsideUtcYears) {
      assert.throws(() => service.create(input(startsAt)), validationError);
      await assert.rejects(service.reschedule(original.id, { startsAt, durationMinutes: 15 }), validationError);
      assert.deepEqual(await readFile(file), before);
      assert.deepEqual(await service.list(), [original]);
    }
    await opened.close();
    opened = undefined;
    opened = await openFileStore(directory);
    assert.deepEqual(await opened.store.read(), [original]);
  } finally {
    if (opened) await opened.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('HTTP create and reschedule reject nonrepresentable UTC starts with safe validation errors', async (t) => {
  const store = new AppointmentStore();
  const original = await new AppointmentService(store).create(input('2030-04-08T09:00:00Z'));
  const server = createApplication(store);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const startsAt of outsideUtcYears) {
    for (const [path, body] of [
      ['/api/appointments', input(startsAt)],
      [`/api/appointments/${original.id}/reschedule`, { startsAt, durationMinutes: 15 }],
    ]) {
      const response = await fetch(`${base}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const text = await response.text();
      const result = JSON.parse(text);
      assert.deepEqual(Object.keys(result), ['error']);
      assert.deepEqual(Object.keys(result.error).sort(), ['code', 'message']);
      assert.equal(result.error.code, 'validation_error');
      assert.equal(typeof result.error.message, 'string');
      assert.doesNotMatch(text, /synthetic_boundary|stack|\/home\//);
      assert.deepEqual(await store.read(), [original]);
    }
  }
});
