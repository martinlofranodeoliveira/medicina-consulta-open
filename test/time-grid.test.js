import test from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentService } from '../src/appointments.js';
import { AppointmentStore } from '../src/store.js';

const input = (startsAt) => ({
  practitionerId: 'demo-clinica-geral', patientRef: 'exemplo_grade',
  startsAt, durationMinutes: 30,
});

test('arbitrary offset minutes cannot store appointments outside the UTC quarter-hour grid', async () => {
  const service = new AppointmentService(new AppointmentStore());
  for (const startsAt of ['2030-04-08T09:00:00+03:07', '2030-04-08T09:00:00-00:01']) {
    await assert.rejects(async () => service.create(input(startsAt)), { code: 'validation_error' });
  }
  assert.deepEqual(await service.list(), []);
  const original = await service.create(input('2030-04-08T09:00:00Z'));
  await assert.rejects(service.reschedule(original.id, {
    startsAt: '2030-04-08T10:00:00+03:07', durationMinutes: 30,
  }), { code: 'validation_error' });
  assert.deepEqual(await service.list(), [original]);
});

test('whole, half and quarter-hour offsets preserve the grid and canonical timestamps can be reused', async () => {
  for (const offset of ['+01:00', '+05:30', '+05:45', '-03:30', '-12:00', '+14:00']) {
    const service = new AppointmentService(new AppointmentStore());
    const original = await service.create(input(`2030-04-08T09:00:00${offset}`));
    assert.equal(Date.parse(original.startsAt) % 900_000, 0);
    assert.deepEqual(await service.reschedule(original.id, {
      startsAt: original.startsAt, durationMinutes: original.durationMinutes,
    }), original);
  }
});
