import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { availableSlots } from '../src/availability.js';

const W = {
  windowStart: '2030-04-08T12:00:00.000Z',
  windowEnd: '2030-04-08T13:00:00.000Z',
};

describe('availableSlots (sintetico, em memoria)', () => {
  it('retorna grade de 15min quando nao ha compromissos', () => {
    assert.deepEqual(
      availableSlots({ ...W, durationMinutes: 30, appointments: [] }),
      [
        '2030-04-08T12:00:00.000Z',
        '2030-04-08T12:15:00.000Z',
        '2030-04-08T12:30:00.000Z',
      ]
    );
  });

  it('inclui apenas duracoes que cabem na janela', () => {
    assert.deepEqual(
      availableSlots({ ...W, durationMinutes: 60, appointments: [] }),
      ['2030-04-08T12:00:00.000Z']
    );
    assert.deepEqual(
      availableSlots({
        windowStart: '2030-04-08T12:00:00.000Z',
        windowEnd: '2030-04-08T12:30:00.000Z',
        durationMinutes: 60,
        appointments: [],
      }),
      []
    );
  });

  it('scheduled ocupa intervalo e cancelled e ignorado; completed ocupa', () => {
    const busy = [{ startsAt: '2030-04-08T12:00:00.000Z', durationMinutes: 30, status: 'scheduled' }];
    assert.deepEqual(availableSlots({ ...W, durationMinutes: 30, appointments: busy }), [
      '2030-04-08T12:30:00.000Z',
    ]);
    const cancelled = [{ startsAt: '2030-04-08T12:00:00.000Z', durationMinutes: 30, status: 'cancelled' }];
    assert.equal(availableSlots({ ...W, durationMinutes: 30, appointments: cancelled }).length, 3);
    const completed = [{ startsAt: '2030-04-08T12:00:00.000Z', durationMinutes: 30, status: 'completed' }];
    assert.deepEqual(availableSlots({ ...W, durationMinutes: 30, appointments: completed }), [
      '2030-04-08T12:30:00.000Z',
    ]);
  });

  it('permite adjacencia e bloqueia sobreposicao parcial', () => {
    const appointments = [
      { startsAt: '2030-04-08T12:15:00.000Z', durationMinutes: 30, status: 'scheduled' },
    ];
    // 12:00-12:30 sobrepoe 12:15-12:45; 12:15 e 12:30 tambem sobrepoem.
    assert.deepEqual(availableSlots({ ...W, durationMinutes: 30, appointments }), []);
    const adjacent = [{ startsAt: '2030-04-08T12:00:00.000Z', durationMinutes: 30, status: 'scheduled' }];
    assert.deepEqual(availableSlots({ ...W, durationMinutes: 30, appointments: adjacent }), [
      '2030-04-08T12:30:00.000Z',
    ]);
  });

  it('considera bloqueio parcial vindo de fora da janela', () => {
    const appointments = [
      { startsAt: '2030-04-08T11:45:00.000Z', durationMinutes: 30, status: 'scheduled' },
    ];
    assert.deepEqual(availableSlots({ ...W, durationMinutes: 15, appointments }), [
      '2030-04-08T12:15:00.000Z',
      '2030-04-08T12:30:00.000Z',
      '2030-04-08T12:45:00.000Z',
    ]);
  });

  it('nao modifica as entradas', () => {
    const appointments = [
      { startsAt: '2030-04-08T12:00:00.000Z', durationMinutes: 30, status: 'scheduled' },
    ];
    const frozen = structuredClone(appointments);
    Object.freeze(appointments);
    Object.freeze(appointments[0]);
    const out = availableSlots({ ...W, durationMinutes: 30, appointments });
    assert.deepEqual(appointments, frozen);
    assert.deepEqual(out, ['2030-04-08T12:30:00.000Z']);
  });

  it('rejeita janela e duracao invalidas com TypeError', () => {
    const badCalls = [
      () => availableSlots({ ...W, durationMinutes: 30, appointments: [], windowStart: '2030-04-08T12:00:00Z' }),
      () => availableSlots({ ...W, durationMinutes: 30, appointments: [], windowStart: '2030-04-08T12:07:00.000Z' }),
      () => availableSlots({ ...W, durationMinutes: 30, appointments: [], windowStart: W.windowEnd }),
      () =>
        availableSlots({
          windowStart: '2030-04-08T12:00:00.000Z',
          windowEnd: '2030-04-09T12:00:01.000Z',
          durationMinutes: 15,
          appointments: [],
        }),
      () => availableSlots({ ...W, durationMinutes: 20, appointments: [] }),
      () => availableSlots({ ...W, durationMinutes: 0, appointments: [] }),
      () => availableSlots({ ...W, durationMinutes: 30 }),
      () => availableSlots({ ...W, durationMinutes: 30, appointments: 'nao-lista' }),
      () =>
        availableSlots({
          ...W,
          durationMinutes: 30,
          appointments: [{ startsAt: 'invalido', durationMinutes: 30, status: 'scheduled' }],
        }),
    ];
    for (const call of badCalls) {
      assert.throws(call, (err) => err instanceof TypeError && err.message === 'INVALID_AVAILABILITY_INPUT');
    }
  });

  it('aceita janela de exatamente 24h', () => {
    const out = availableSlots({
      windowStart: '2030-04-08T00:00:00.000Z',
      windowEnd: '2030-04-09T00:00:00.000Z',
      durationMinutes: 120,
      appointments: [],
    });
    assert.equal(out[0], '2030-04-08T00:00:00.000Z');
    assert.equal(out[out.length - 1], '2030-04-08T22:00:00.000Z');
    assert.equal(out.length, 89);
  });
});
