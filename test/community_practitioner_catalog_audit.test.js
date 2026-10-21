import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runFeature } from '../src/community/practitioner_catalog_audit.mjs';

function assertInvalid(result) {
  assert.equal(result.ok, false);
  assert.deepEqual(result.error, { code: 'validation_error', message: 'invalid practitioner catalog.' });
  assert.equal(result.count, undefined);
  assert.equal(result.practitioners, undefined);
}

describe('practitioner catalog audit', () => {
  it('valid unordered catalog returns sorted count 2', () => {
    const input = { practitioners: [{ id: 'demo-clinica-geral', name: 'Geral' }, { id: 'demo-cardio', name: 'Cardio' }] };
    const out = runFeature(input);
    assert.equal(out.ok, true);
    assert.equal(out.count, 2);
    assert.deepEqual(out.practitioners, [{ id: 'demo-cardio', name: 'Cardio' }, { id: 'demo-clinica-geral', name: 'Geral' }]);
  });

  it('lexicographic sort places demo-cardio before demo-clinica-geral', () => {
    const out = runFeature({ practitioners: [{ id: 'demo-clinica-geral' }, { id: 'demo-cardio' }] });
    assert.equal(out.ok, true);
    assert.equal(out.practitioners[0].id, 'demo-cardio');
    assert.equal(out.practitioners[1].id, 'demo-clinica-geral');
    assert.equal(out.count, 2);
  });

  it('preserves only allowed keys', () => {
    const out = runFeature({ practitioners: [{ id: 'demo-cardio', name: 'C', specialty: 'S' }] });
    assert.deepEqual(out.practitioners, [{ id: 'demo-cardio', name: 'C', specialty: 'S' }]);
    const out2 = runFeature({ practitioners: [{ id: 'demo-cardio' }] });
    assert.deepEqual(out2.practitioners, [{ id: 'demo-cardio' }]);
  });

  it('rejects null, array, extra key, missing, empty and over 100', () => {
    assertInvalid(runFeature(null));
    assertInvalid(runFeature([]));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio' }], extra: 1 }));
    assertInvalid(runFeature({}));
    assertInvalid(runFeature({ practitioners: [] }));
    const many = [];
    for (let i = 0; i < 101; i++) many.push({ id: 'demo-id-' + i });
    assertInvalid(runFeature({ practitioners: many }));
  });

  it('accepts exactly 100 entries', () => {
    const many = [];
    for (let i = 0; i < 100; i++) many.push({ id: 'demo-id-' + i });
    const out = runFeature({ practitioners: many });
    assert.equal(out.ok, true);
    assert.equal(out.count, 100);
    assert.equal(out.practitioners.length, 100);
  });

  it('rejects bad ids', () => {
    assertInvalid(runFeature({ practitioners: [{ id: 'prod-cardio' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio!' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio x' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-' + 'a'.repeat(60) }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-a' }, { id: 'demo-a' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', foo: 'x' }] }));
    assertInvalid(runFeature({ practitioners: [null] }));
    assertInvalid(runFeature({ practitioners: ['demo-cardio'] }));
    assertInvalid(runFeature({ practitioners: [{ name: 'NoId' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 123 }] }));
  });

  it('rejects bad name and specialty', () => {
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: '' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', specialty: '' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: 'a'.repeat(81) }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', specialty: 'a'.repeat(81) }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: ' Name' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: 'Name ' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: '\tName' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: 'Name\n' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', specialty: '\rSpec' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', specialty: 'Spec\t' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: 'a\u0001b' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', specialty: 'a\u0007b' }] }));
    assertInvalid(runFeature({ practitioners: [{ id: 'demo-cardio', name: 123 }] }));
  });

  it('never mutates input and is deterministic', () => {
    const input = { practitioners: [{ id: 'demo-clinica-geral', name: 'Geral' }, { id: 'demo-cardio' }] };
    const before = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature(JSON.parse(before));
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(a, b);
    assert.notEqual(a.practitioners, input.practitioners);
  });

  it('uses pure implementation without Date, IO or imports', () => {
    const src = runFeature.toString();
    assert.equal(src.includes('Date'), false);
    assert.equal(src.includes('process'), false);
    assert.equal(src.includes('fetch'), false);
    assert.equal(src.includes('require'), false);
    assert.equal(src.includes('Object.entries'), true);
    assert.equal(src.includes('push'), true);
    assert.equal(src.includes('.get('), true);
    assert.equal(src.includes('.set('), true);
  });

  it('count always equals input length on success', () => {
    const out = runFeature({ practitioners: [{ id: 'demo-c' }, { id: 'demo-a' }, { id: 'demo-b' }] });
    assert.equal(out.ok, true);
    assert.equal(out.count, 3);
    assert.deepEqual(out.practitioners.map((p) => p.id), ['demo-a', 'demo-b', 'demo-c']);
  });
});
