import test from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentService } from '../src/appointments.js';
import { AppointmentStore } from '../src/store.js';

const input = (changes = {}) => ({
  practitionerId: 'demo-clinica-geral', patientRef: 'exemplo_001',
  startsAt: '2030-04-08T09:00:00-03:00', durationMinutes: 30, ...changes,
});

test('normalizes explicit time zones and returns a sorted UTC day', async () => {
  const service = new AppointmentService(new AppointmentStore());
  await service.create(input({ startsAt: '2030-04-08T10:00:00-03:00' }));
  await service.create(input());
  assert.deepEqual((await service.list({ date: '2030-04-08' })).map((item) => item.startsAt),
    ['2030-04-08T12:00:00.000Z', '2030-04-08T13:00:00.000Z']);
  assert.deepEqual(await service.list({ date: '2030-04-09' }), []);
});

test('prevents overlapping appointments and allows adjacent slots', async () => {
  const service = new AppointmentService(new AppointmentStore());
  await service.create(input());
  await assert.rejects(service.create(input({ startsAt: '2030-04-08T09:15:00-03:00' })), { code: 'schedule_conflict' });
  await assert.rejects(service.create(input({ startsAt: '2030-04-08T08:45:00-03:00' })), { code: 'schedule_conflict' });
  await service.create(input({ startsAt: '2030-04-08T09:30:00-03:00' }));
  await service.create(input({ practitionerId: 'demo-pediatria' }));
  assert.equal((await service.list()).length, 3);
});

test('parallel booking requests cannot take the same slot', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () => service.create(input())));
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((result) => result.status === 'rejected' && result.reason.code === 'schedule_conflict').length, 11);
});

test('cancellation releases a slot; completed appointments keep their time', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const first = await service.create(input());
  await service.status(first.id, { status: 'cancelled' });
  const second = await service.create(input());
  await service.status(second.id, { status: 'completed' });
  await assert.rejects(service.create(input()), { code: 'schedule_conflict' });
  await assert.rejects(service.status(first.id, { status: 'completed' }), { code: 'invalid_transition' });
  await service.remove(second.id);
  assert.equal((await service.list()).length, 1);
  await assert.rejects(service.remove(second.id), { code: 'appointment_not_found' });
});

test('failed persistence does not mutate memory or poison the write queue', async () => {
  let writes = 0;
  const store = new AppointmentStore([], async () => {
    writes++;
    if (writes === 1) throw new Error('Disk unavailable');
  });
  const service = new AppointmentService(store);
  await assert.rejects(service.create(input()), /Disk unavailable/);
  assert.deepEqual(await service.list(), []);
  await service.create(input());
  assert.equal((await service.list()).length, 1);
});

test('read results cannot mutate the store', async () => {
  const service = new AppointmentService(new AppointmentStore());
  await service.create(input());
  const result = await service.list();
  result[0].status = 'cancelled';
  assert.equal((await service.list())[0].status, 'scheduled');
});

test('invalid dates, unknown practitioners, extra fields and personal text are rejected', async () => {
  const service = new AppointmentService(new AppointmentStore());
  const invalid = [
    { startsAt: '2030-02-30T09:00:00Z' }, { startsAt: '2030-04-08T24:00:00Z' },
    { startsAt: '2030-04-08T09:00:00' }, { startsAt: '2030-04-08T09:07:00Z' },
    { durationMinutes: 0 }, { durationMinutes: 135 }, { durationMinutes: '30' },
    { patientRef: 'nome pessoal completo' }, { patientRef: 'exemplo@example.invalid' },
    { practitionerId: 'demo-unknown' }, { notes: 'Campo não suportado' },
  ];
  for (const changes of invalid) await assert.rejects(async () => service.create(input(changes)));
  await assert.rejects(service.list({ date: '2030-02-30' }), { code: 'validation_error' });
  await assert.rejects(service.list({ practitionerId: 'missing' }), { code: 'practitioner_not_found' });
  assert.deepEqual(await service.list(), []);
});
