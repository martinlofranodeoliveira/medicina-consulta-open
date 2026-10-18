import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openFileStore } from '../src/store.js';
import { AppointmentService } from '../src/appointments.js';

test('persists after restart and excludes concurrent processes from the same data directory', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'medicina-open-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const first = await openFileStore(directory);
  await assert.rejects(openFileStore(directory), /DATA_DIR/);
  const item = await new AppointmentService(first.store).create({
    practitionerId: 'demo-pediatria', patientRef: 'exemplo_002',
    startsAt: '2030-04-08T14:00:00Z', durationMinutes: 45,
  });
  const disk = JSON.parse(await readFile(join(directory, 'appointments.json'), 'utf8'));
  assert.equal(disk.version, 1);
  assert.equal(disk.appointments[0].id, item.id);
  await first.close();
  const reopened = await openFileStore(directory);
  assert.equal((await reopened.store.read())[0].patientRef, 'exemplo_002');
  await reopened.close();
});

test('does not overwrite corrupt data and releases its lock on startup failure', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'medicina-open-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'appointments.json'), '{broken');
  await assert.rejects(openFileStore(directory));
  assert.equal(await readFile(join(directory, 'appointments.json'), 'utf8'), '{broken');
  await writeFile(join(directory, 'appointments.json'), '{"version":2,"appointments":[]}');
  await assert.rejects(openFileStore(directory), /inválido/);
  await writeFile(join(directory, 'appointments.json'), '{"version":1,"appointments":[{"id":"bad"}]}');
  await assert.rejects(openFileStore(directory));
  await rm(join(directory, 'appointments.json'));
  const result = await openFileStore(directory);
  await result.close();
});
