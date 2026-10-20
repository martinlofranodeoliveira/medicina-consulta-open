/**
 * Enumera horarios livres em memoria a partir de uma janela UTC e de compromissos ja filtrados.
 *
 * Uso sintentico (nao consulta servidor, nao persiste, nao cria consultas):
 * ```js
 * import { availableSlots } from './src/availability.js';
 * availableSlots({
 *   windowStart: '2030-04-08T12:00:00.000Z',
 *   windowEnd: '2030-04-08T13:00:00.000Z',
 *   durationMinutes: 30,
 *   appointments: [
 *     { startsAt: '2030-04-08T12:00:00.000Z', durationMinutes: 30, status: 'scheduled' },
 *   ],
 * });
 * ```
 *
 * A lista `appointments` ja deve vir filtrada pelo chamador para o profissional
 * correto (`practitionerId`). Este helper nao filtra por profissional, nao busca
 * dados reais e nao acessa rede ou disco.
 *
 * Regras:
 * - Retorna inicios UTC ISO canonicos (`toISOString`, `.000Z`) em grade de 15 minutos.
 * - Inclui apenas inicios cujo `inicio + durationMinutes` cabe na janela (`<= windowEnd`).
 * - `scheduled` e `completed` ocupam `[startsAt, startsAt + duration)`; `cancelled` e ignorado.
 * - Adjacencia e permitida: `[10:00,10:30)` nao bloqueia inicio em `10:30`.
 * - Nao modifica as entradas.
 *
 * @param {{windowStart:string, windowEnd:string, durationMinutes:number, appointments:Array}} input
 * @returns {string[]}
 * @throws {TypeError} com mensagem `INVALID_AVAILABILITY_INPUT` para entrada invalida.
 */
const INVALID = 'INVALID_AVAILABILITY_INPUT';
const STEP_MS = 15 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;

function invalid() {
  throw new TypeError(INVALID);
}

function parseCanonicalWindow(value) {
  if (typeof value !== 'string' || !CANONICAL_UTC.test(value)) invalid();
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) invalid();
  // Garante data valida e forma canonica (ex.: recusa 2030-02-30).
  if (new Date(ms).toISOString() !== value) invalid();
  if (ms % STEP_MS !== 0) invalid();
  return ms;
}

export function availableSlots(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid();
  const { windowStart, windowEnd, durationMinutes, appointments } = input;

  const startMs = parseCanonicalWindow(windowStart);
  const endMs = parseCanonicalWindow(windowEnd);
  if (!(startMs < endMs)) invalid();
  if (endMs - startMs > DAY_MS) invalid();

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 120 ||
    durationMinutes % 15 !== 0
  ) {
    invalid();
  }

  if (!Array.isArray(appointments)) invalid();

  const busy = [];
  for (const item of appointments) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) invalid();
    if (item.status === 'cancelled') continue;
    if (item.status !== 'scheduled' && item.status !== 'completed') invalid();
    if (typeof item.startsAt !== 'string') invalid();
    const busyStart = Date.parse(item.startsAt);
    if (Number.isNaN(busyStart)) invalid();
    if (
      !Number.isInteger(item.durationMinutes) ||
      item.durationMinutes < 15 ||
      item.durationMinutes > 120 ||
      item.durationMinutes % 15 !== 0
    ) {
      invalid();
    }
    busy.push({ start: busyStart, end: busyStart + item.durationMinutes * 60_000 });
  }

  const durationMs = durationMinutes * 60_000;
  const result = [];
  for (let t = startMs; t + durationMs <= endMs; t += STEP_MS) {
    const slotEnd = t + durationMs;
    let overlaps = false;
    for (const interval of busy) {
      if (t < interval.end && interval.start < slotEnd) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) result.push(new Date(t).toISOString());
  }
  return result;
}

export default availableSlots;
