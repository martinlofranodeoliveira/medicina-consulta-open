import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createApplication } from '../src/server.js';
import { AppointmentStore } from '../src/store.js';

async function application(t, store = new AppointmentStore()) {
  const server = createApplication(store);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const input = {
  practitionerId: 'demo-clinica-geral', patientRef: 'exemplo_001',
  startsAt: '2030-04-08T09:00:00-03:00', durationMinutes: 30,
};
const post = (body = input, headers = {}) => ({
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('HTTP workflow: health, catalog, book, filter, cancel and delete', async (t) => {
  const base = await application(t);
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal((await (await fetch(`${base}/api/practitioners`)).json()).data.length, 2);
  const created = await fetch(`${base}/api/appointments`, post());
  assert.equal(created.status, 201);
  const { data } = await created.json();
  const listed = await (await fetch(`${base}/api/appointments?date=2030-04-08`)).json();
  assert.equal(listed.data[0].id, data.id);
  const cancelled = await fetch(`${base}/api/appointments/${data.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"status":"cancelled"}',
  });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).data.status, 'cancelled');
  const removed = await fetch(`${base}/api/appointments/${data.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  assert.equal((await fetch(`${base}/api/appointments/${data.id}`, { method: 'DELETE' })).status, 404);
});

test('HTTP rejects cross-origin writes, DNS-rebinding hosts and malformed input', async (t) => {
  const base = await application(t);
  assert.equal((await fetch(`${base}/api/appointments`, post(input, { Origin: 'https://example.invalid' }))).status, 403);
  assert.equal((await fetch(`${base}/api/appointments`, post(input, { 'Sec-Fetch-Site': 'cross-site' }))).status, 403);
  const badHostStatus = await new Promise((resolve, reject) => {
    const req = request(`${base}/health`, { headers: { Host: 'example.invalid' } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(badHostStatus, 403);
  assert.equal((await fetch(`${base}/api/appointments`, { method: 'POST', body: 'form=text' })).status, 415);
  assert.equal((await fetch(`${base}/api/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(`${base}/api/appointments`, post({ unexpected: true }))).status, 400);
  assert.equal((await fetch(`${base}/api/appointments?date=2030-02-30`)).status, 400);
  assert.equal((await fetch(`${base}/api/appointments?unexpected=1`)).status, 400);
  assert.equal((await fetch(`${base}/does-not-exist`)).status, 404);
  assert.equal((await fetch(`${base}/api/appointments`, post({ patientRef: 'x'.repeat(9000) }))).status, 413);
  assert.deepEqual((await (await fetch(`${base}/api/appointments`)).json()).data, []);
});

test('HTTP conflict returns a useful error without leaking input', async (t) => {
  const base = await application(t);
  await fetch(`${base}/api/appointments`, post());
  const response = await fetch(`${base}/api/appointments`, post());
  assert.equal(response.status, 409);
  const body = await response.text();
  assert.match(body, /schedule_conflict/);
  assert.doesNotMatch(body, /exemplo_001|stack|\/home\//);
});

test('HTTP disk errors do not leak internal details', async (t) => {
  const store = new AppointmentStore([], async () => { throw new Error('sensitive-local-path'); });
  const base = await application(t, store);
  const response = await fetch(`${base}/api/appointments`, post());
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.match(body, /internal_error/);
  assert.doesNotMatch(body, /sensitive-local-path|exemplo_001/);
});
