import { mkdir, readFile, rename, rm, writeFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { appointmentInput, objectWithFields } from './validation.js';

export const practitioners = Object.freeze([
  Object.freeze({ id: 'demo-clinica-geral', name: 'Profissional de exemplo A', specialty: 'Clínica geral' }),
  Object.freeze({ id: 'demo-pediatria', name: 'Profissional de exemplo B', specialty: 'Pediatria' }),
]);

function validateSaved(saved) {
  objectWithFields(saved, ['version', 'appointments']);
  if (saved.version !== 1 || !Array.isArray(saved.appointments)) throw new Error('Arquivo de agenda inválido.');
  const ids = new Set();
  for (const item of saved.appointments) {
    objectWithFields(item, ['id', 'practitionerId', 'patientRef', 'startsAt', 'durationMinutes', 'status', 'createdAt']);
    appointmentInput({
      practitionerId: item.practitionerId, patientRef: item.patientRef,
      startsAt: item.startsAt, durationMinutes: item.durationMinutes,
    });
    if (typeof item.id !== 'string' || !/^[a-f0-9-]{36}$/.test(item.id) || ids.has(item.id) ||
        !practitioners.some((entry) => entry.id === item.practitionerId) ||
        !['scheduled', 'completed', 'cancelled'].includes(item.status) ||
        typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) {
      throw new Error('Arquivo de agenda inválido.');
    }
    ids.add(item.id);
  }
  return saved.appointments;
}

// A store serializes read-modify-write operations, including overlapping HTTP requests.
export class AppointmentStore {
  #appointments;
  #queue = Promise.resolve();
  #persist;

  constructor(appointments = [], persist = async () => {}) {
    this.#appointments = structuredClone(appointments);
    this.#persist = persist;
  }

  async read() {
    await this.#queue;
    return structuredClone(this.#appointments);
  }

  mutate(operation) {
    const task = this.#queue.then(async () => {
      const next = structuredClone(this.#appointments);
      const result = operation(next);
      await this.#persist(next);
      this.#appointments = next;
      return structuredClone(result);
    });
    this.#queue = task.catch(() => {});
    return task;
  }
}

export async function openFileStore(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, '.server.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
    await lock.writeFile(String(process.pid));
  } catch (error) {
    if (lock) {
      await lock.close();
      await rm(lockPath, { force: true });
    }
    if (error.code === 'EEXIST') throw new Error('DATA_DIR já está em uso ou contém um lock antigo. Consulte README.');
    throw error;
  }
  const close = async () => { await lock.close(); await rm(lockPath, { force: true }); };
  const file = join(directory, 'appointments.json');
  try {
    let appointments = [];
    try {
      const saved = JSON.parse(await readFile(file, 'utf8'));
      appointments = validateSaved(saved);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const store = new AppointmentStore(appointments, async (next) => {
      const temporary = join(directory, `.appointments-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify({ version: 1, appointments: next }, null, 2) + '\n', { mode: 0o600 });
        await rename(temporary, file);
      } finally {
        await rm(temporary, { force: true });
      }
    });
    return { store, close };
  } catch (error) {
    await close();
    throw error;
  }
}
