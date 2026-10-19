import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../src/server.js';
import { AppointmentStore } from '../src/store.js';

const input = {
  practitionerId: 'demo-clinica-geral', patientRef: 'exemplo_001',
  startsAt: '2030-04-08T09:00:00-03:00', durationMinutes: 30,
};
const timing = { startsAt: '2030-04-08T10:00:00-03:00', durationMinutes: 45 };
const jsonRequest = (body, method = 'POST', headers = {}) => ({
  method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

async function application(t, store = new AppointmentStore()) {
  const server = createApplication(store);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function create(base, changes = {}) {
  const response = await fetch(`${base}/api/appointments`, jsonRequest({ ...input, ...changes }));
  assert.equal(response.status, 201);
  return (await response.json()).data;
}

test('HTTP reschedule retains identity and existing PATCH still only accepts status', async (t) => {
  const base = await application(t);
  const original = await create(base);
  const endpoint = `${base}/api/appointments/${original.id}`;
  const moved = await fetch(`${endpoint}/reschedule`, jsonRequest(timing));
  assert.equal(moved.status, 200);
  assert.equal(moved.headers.get('cache-control'), 'no-store');
  const expected = { ...original, startsAt: '2030-04-08T13:00:00.000Z', durationMinutes: 45 };
  assert.deepEqual((await moved.json()).data, expected);
  const invalidPatch = await fetch(endpoint, jsonRequest(timing, 'PATCH'));
  assert.equal(invalidPatch.status, 400);
  assert.equal((await invalidPatch.json()).error.code, 'validation_error');
  assert.equal((await fetch(`${endpoint}/reschedule`)).status, 404);
  await create(base);
  assert.equal((await fetch(endpoint, jsonRequest({ status: 'completed' }, 'PATCH'))).status, 200);
  const finalized = await fetch(`${endpoint}/reschedule`, jsonRequest(timing));
  assert.equal(finalized.status, 409);
  assert.equal((await finalized.json()).error.code, 'invalid_transition');
  const missing = await fetch(`${base}/api/appointments/00000000-0000-0000-0000-000000000000/reschedule`, jsonRequest(timing));
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'appointment_not_found');
});

test('HTTP reschedule rejects invalid bodies and foreign origins and preserves the original record', async (t) => {
  const base = await application(t);
  const original = await create(base);
  const endpoint = `${base}/api/appointments/${original.id}/reschedule`;
  for (const body of [null, [], {}, { startsAt: timing.startsAt }, { durationMinutes: 30 },
    { ...timing, patientRef: 'other' }, { ...timing, status: 'cancelled' },
    { ...timing, durationMinutes: '45' }, { ...timing, startsAt: '2030-04-08T10:03:00Z' }]) {
    const response = await fetch(endpoint, jsonRequest(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'validation_error');
  }
  assert.equal((await fetch(endpoint, jsonRequest(timing, 'POST', { Origin: 'https://example.invalid' }))).status, 403);
  assert.equal((await fetch(endpoint, jsonRequest(timing, 'POST', { 'Sec-Fetch-Site': 'cross-site' }))).status, 403);
  assert.equal((await fetch(endpoint, { method: 'POST', body: 'form=text' })).status, 415);
  assert.equal((await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  })).status, 400);
  const listed = await (await fetch(`${base}/api/appointments`)).json();
  assert.deepEqual(listed.data, [original]);
});

test('HTTP reschedule conflict keeps the old slot and returns no patient reference or internal detail', async (t) => {
  const base = await application(t);
  const original = await create(base);
  await create(base, { ...timing, patientRef: 'exemplo_002' });
  const response = await fetch(`${base}/api/appointments/${original.id}/reschedule`, jsonRequest(timing));
  assert.equal(response.status, 409);
  const body = await response.text();
  assert.match(body, /schedule_conflict/);
  assert.doesNotMatch(body, /exemplo_00[12]|stack|\/home\//);
  const duplicate = await fetch(`${base}/api/appointments`, jsonRequest(input));
  assert.equal(duplicate.status, 409);
  const listed = (await (await fetch(`${base}/api/appointments`)).json()).data;
  assert.deepEqual(listed.find((item) => item.id === original.id), original);
});

test('HTTP reschedule persistence failure returns generic error and leaves the queue usable', async (t) => {
  let writes = 0;
  const store = new AppointmentStore([], async () => {
    if (++writes === 2) throw new Error('sensitive-local-path');
  });
  const base = await application(t, store);
  const original = await create(base);
  const endpoint = `${base}/api/appointments/${original.id}/reschedule`;
  const failed = await fetch(endpoint, jsonRequest(timing));
  assert.equal(failed.status, 500);
  const body = await failed.text();
  assert.match(body, /internal_error/);
  assert.doesNotMatch(body, /sensitive-local-path|exemplo_001|stack|\/home\//);
  assert.deepEqual(await store.read(), [original]);
  const recovered = await fetch(endpoint, jsonRequest(timing));
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).data.id, original.id);
});
