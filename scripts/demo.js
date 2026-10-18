// Runs an isolated example against a temporary local server. Does not touch DATA_DIR.
import { once } from 'node:events';
import { createApplication } from '../src/server.js';
import { AppointmentStore } from '../src/store.js';

const server = createApplication(new AppointmentStore());
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const response = await fetch(`${base}/api/appointments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      practitionerId: 'demo-clinica-geral', patientRef: 'exemplo_001',
      startsAt: '2030-04-08T09:00:00-03:00', durationMinutes: 30,
    }),
  });
  if (response.status !== 201) throw new Error('Falha na demonstração.');
  console.log(JSON.stringify(await response.json(), null, 2));
  const list = await fetch(`${base}/api/appointments?date=2030-04-08`);
  console.log(JSON.stringify(await list.json(), null, 2));
} finally { await new Promise((resolve) => server.close(resolve)); }
