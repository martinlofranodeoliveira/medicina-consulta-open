import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenApiDocument } from '../src/openapi.js';

function collectRefs(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, out);
    return out;
  }
  if (value !== null && typeof value === 'object') {
    if (typeof value.$ref === 'string') out.push(value.$ref);
    for (const key of Object.keys(value)) collectRefs(value[key], out);
  }
  return out;
}

function resolvePointer(doc, pointer) {
  assert.match(pointer, /^#\//);
  const parts = pointer.slice(2).split('/');
  let current = doc;
  for (const part of parts) {
    assert.ok(current !== null && typeof current === 'object' && part in current);
    current = current[part];
  }
  return current;
}

describe('openapi document structure', () => {
  it('returns fresh deterministic mutable JSON', () => {
    const first = createOpenApiDocument();
    const second = createOpenApiDocument();
    assert.strictEqual(typeof first, 'object');
    assert.strictEqual(JSON.stringify(first), JSON.stringify(second));
    assert.notStrictEqual(first, second);
    assert.notStrictEqual(first.paths, second.paths);
    assert.notStrictEqual(first.components, second.components);
    first.info.title = 'changed';
    first.paths['/health'].get.operationId = 'changed';
    const third = createOpenApiDocument();
    assert.strictEqual(third.info.title, 'Medicina Consulta Open');
    assert.strictEqual(third.paths['/health'].get.operationId, 'getHealth');
    assert.strictEqual(JSON.stringify(second), JSON.stringify(createOpenApiDocument()));
  });

  it('has top-level openapi, info, loopback port and empty protection', () => {
    const doc = createOpenApiDocument();
    assert.strictEqual(doc.openapi, '3.1.1');
    assert.strictEqual(doc.info.title, 'Medicina Consulta Open');
    assert.strictEqual(doc.info.version, '0.1.0');
    assert.strictEqual(doc.info.license.name, 'ISC');
    assert.match(doc.info.description, /local prototype/i);
    assert.match(doc.info.description, /synthetic data only/i);
    assert.match(doc.info.description, /authentication/i);
    assert.match(doc.info.description, /authorization/i);
    assert.match(doc.info.description, /production/i);
    assert.deepStrictEqual(doc.servers, [{ url: 'http://127.0.0.1:3334', description: doc.servers[0].description }]);
    assert.ok(String(doc.servers[0].description).length > 0);
    assert.match(String(doc.servers[0].description), /3334|port|loopback|127\.0\.0\.1/i);
    assert.deepStrictEqual(doc.security, []);
    assert.ok(!doc.components.securitySchemes || Object.keys(doc.components.securitySchemes).length === 0);
    assert.ok(!('webhooks' in doc));
    assert.ok(!('callbacks' in doc));
  });

  it('exposes exactly six paths and eight actions with ids', () => {
    const doc = createOpenApiDocument();
    const keys = Object.keys(doc.paths).sort();
    assert.deepStrictEqual(keys, ['/', '/api/appointments', '/api/appointments/{id}', '/api/appointments/{id}/reschedule', '/api/practitioners', '/health']);
    const actions = [];
    for (const [path, item] of Object.entries(doc.paths)) {
      assert.ok(!('servers' in item));
      for (const [method, op] of Object.entries(item)) {
        assert.ok(['get', 'post', 'patch', 'delete', 'put', 'head', 'options'].includes(method));
        assert.ok(op && typeof op === 'object');
        assert.ok(!('servers' in op));
        assert.strictEqual(typeof op.operationId, 'string');
        assert.ok(op.operationId.length > 0);
        assert.ok(op.responses && typeof op.responses === 'object');
        actions.push(`${method} ${path} ${op.operationId}`);
      }
    }
    assert.strictEqual(actions.length, 8);
    const ids = actions.map((a) => a.split(' ').slice(2).join(' '));
    assert.strictEqual(new Set(ids).size, 8);
    assert.ok(doc.paths['/'].get);
    assert.ok(doc.paths['/health'].get);
    assert.ok(doc.paths['/api/practitioners'].get);
    assert.ok(doc.paths['/api/appointments'].get);
    assert.ok(doc.paths['/api/appointments'].post);
    assert.ok(doc.paths['/api/appointments/{id}'].patch);
    assert.ok(doc.paths['/api/appointments/{id}'].delete);
    assert.ok(doc.paths['/api/appointments/{id}/reschedule'].post);
  });

  it('documents id path item and UTC-day query items', () => {
    const doc = createOpenApiDocument();
    for (const path of ['/api/appointments/{id}', '/api/appointments/{id}/reschedule']) {
      const item = doc.paths[path];
      for (const op of Object.values(item)) {
        const param = op.parameters.find((p) => p.in === 'path' && p.name === 'id');
        assert.ok(param);
        assert.strictEqual(param.required, true);
        assert.strictEqual(param.schema.type, 'string');
        assert.strictEqual(param.schema.pattern, '^[a-f0-9-]{36}$');
      }
    }
    const list = doc.paths['/api/appointments'].get;
    assert.strictEqual(list.parameters.length, 2);
    const date = list.parameters.find((p) => p.name === 'date');
    const practitionerId = list.parameters.find((p) => p.name === 'practitionerId');
    assert.strictEqual(date.in, 'query');
    assert.strictEqual(date.required, false);
    assert.match(date.description, /UTC/i);
    assert.strictEqual(practitionerId.in, 'query');
    assert.strictEqual(practitionerId.required, false);
    assert.strictEqual(practitionerId.schema.pattern, '^demo-[a-z0-9-]{1,40}$');
  });

  it('all local refs resolve and no remote refs', () => {
    const doc = createOpenApiDocument();
    const refs = collectRefs(doc, []);
    assert.ok(refs.length > 0);
    for (const ref of refs) {
      assert.match(ref, /^#\//);
      const target = resolvePointer(doc, ref);
      assert.ok(target && typeof target === 'object');
    }
    assert.ok(!JSON.stringify(doc).includes('$ref: "http'));
    assert.ok(!JSON.stringify(doc).includes('$ref:"http'));
  });

  it('schemas are closed with required fields and patterns', () => {
    const doc = createOpenApiDocument();
    const schemas = doc.components.schemas;
    for (const name of ['AppointmentInput', 'RescheduleInput', 'StatusInput', 'Appointment', 'Practitioner', 'Error']) {
      assert.ok(schemas[name], name);
      assert.strictEqual(schemas[name].type, 'object');
      assert.strictEqual(schemas[name].additionalProperties, false);
      assert.ok(Array.isArray(schemas[name].required));
    }
    assert.deepStrictEqual([...schemas.AppointmentInput.required].sort(), ['durationMinutes', 'patientRef', 'practitionerId', 'startsAt'].sort());
    assert.deepStrictEqual([...schemas.RescheduleInput.required].sort(), ['durationMinutes', 'startsAt'].sort());
    assert.deepStrictEqual(schemas.StatusInput.required, ['status']);
    assert.deepStrictEqual([...schemas.Appointment.required].sort(), ['createdAt', 'durationMinutes', 'id', 'patientRef', 'practitionerId', 'startsAt', 'status'].sort());
    assert.deepStrictEqual([...schemas.Practitioner.required].sort(), ['id', 'name', 'specialty'].sort());
    assert.strictEqual(schemas.AppointmentInput.properties.practitionerId.pattern, '^demo-[a-z0-9-]{1,40}$');
    assert.strictEqual(schemas.AppointmentInput.properties.patientRef.pattern, '^[a-zA-Z0-9_-]{1,48}$');
    assert.strictEqual(schemas.AppointmentInput.properties.startsAt.format, 'date-time');
    assert.strictEqual(schemas.AppointmentInput.properties.startsAt.pattern, '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:00(?:\\.000)?(?:Z|[+-]\\d{2}:\\d{2})$');
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /valid calendar date/i);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /explicit timezone/i);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /15-minute/i);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /local/i);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /UTC/i);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /0000/);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /9999/);
    assert.match(schemas.AppointmentInput.properties.startsAt.description, /regex alone does not enforce/i);
    assert.strictEqual(schemas.AppointmentInput.properties.durationMinutes.type, 'integer');
    assert.strictEqual(schemas.AppointmentInput.properties.durationMinutes.minimum, 15);
    assert.strictEqual(schemas.AppointmentInput.properties.durationMinutes.maximum, 120);
    assert.strictEqual(schemas.AppointmentInput.properties.durationMinutes.multipleOf, 15);
    assert.deepStrictEqual(schemas.StatusInput.properties.status.enum, ['completed', 'cancelled']);
    assert.deepStrictEqual(schemas.Appointment.properties.status.enum, ['scheduled', 'completed', 'cancelled']);
    assert.strictEqual(schemas.Appointment.properties.startsAt.format, 'date-time');
    assert.match(schemas.Appointment.properties.startsAt.pattern, /\.000Z/);
    assert.strictEqual(schemas.Appointment.properties.createdAt.format, 'date-time');
    assert.ok(!('pattern' in schemas.Appointment.properties.createdAt));
    assert.deepStrictEqual(schemas.Error.required, ['error']);
    assert.deepStrictEqual(schemas.Error.properties.error.required, ['code', 'message']);
    assert.strictEqual(schemas.Error.properties.error.additionalProperties, false);
    assert.deepStrictEqual(schemas.Error.properties.error.properties.code.enum, ['validation_error', 'invalid_json', 'json_required', 'host_forbidden', 'origin_forbidden', 'not_found', 'practitioner_not_found', 'appointment_not_found', 'schedule_conflict', 'invalid_transition', 'body_too_large', 'internal_error']);
  });

  it('write actions have required JSON bodies with synthetic illustrations', () => {
    const doc = createOpenApiDocument();
    const create = doc.paths['/api/appointments'].post;
    assert.strictEqual(create.requestBody.required, true);
    assert.deepStrictEqual(create.requestBody.content['application/json'].schema, { $ref: '#/components/schemas/AppointmentInput' });
    assert.deepStrictEqual(create.requestBody.content['application/json'].example, {
      practitionerId: 'demo-clinica-geral',
      patientRef: 'synthetic_001',
      startsAt: '2030-04-08T09:00:00-03:00',
      durationMinutes: 30
    });
    const reschedule = doc.paths['/api/appointments/{id}/reschedule'].post;
    assert.strictEqual(reschedule.requestBody.required, true);
    assert.deepStrictEqual(reschedule.requestBody.content['application/json'].schema, { $ref: '#/components/schemas/RescheduleInput' });
    assert.deepStrictEqual(reschedule.requestBody.content['application/json'].example, {
      startsAt: '2030-04-08T10:00:00-03:00',
      durationMinutes: 45
    });
    const patch = doc.paths['/api/appointments/{id}'].patch;
    assert.strictEqual(patch.requestBody.required, true);
    assert.deepStrictEqual(patch.requestBody.content['application/json'].schema, { $ref: '#/components/schemas/StatusInput' });
    assert.deepStrictEqual(patch.requestBody.content['application/json'].example, { status: 'cancelled' });
    for (const op of [doc.paths['/'].get, doc.paths['/health'].get, doc.paths['/api/practitioners'].get, doc.paths['/api/appointments'].get, doc.paths['/api/appointments/{id}'].delete]) {
      assert.ok(!('requestBody' in op));
    }
    for (const item of Object.values(doc.paths)) {
      for (const op of Object.values(item)) {
        assert.strictEqual(op['x-body-limit-bytes'], 8192);
      }
    }
  });

  it('responses cover success and JSON Error cases', () => {
    const doc = createOpenApiDocument();
    const get = (path, method) => doc.paths[path][method];
    assert.strictEqual(get('/api/appointments', 'post').responses['201'].content['application/json'].schema.properties.data.$ref, '#/components/schemas/Appointment');
    assert.strictEqual(get('/health', 'get').responses['200'].content['application/json'].schema.required[0], 'status');
    const del = get('/api/appointments/{id}', 'delete');
    assert.strictEqual(del.responses['204'].description.length > 0, true);
    assert.ok(!('content' in del.responses['204']));
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item)) {
        assert.ok(op.responses['403'], `${method} ${path} 403`);
        assert.ok(op.responses['500'], `${method} ${path} 500`);
        for (const [code, resp] of Object.entries(op.responses)) {
          if (['400', '403', '404', '409', '413', '415', '500'].includes(String(code))) {
            assert.ok(String(resp.description).length > 0);
            assert.deepStrictEqual(resp.content['application/json'].schema, { $ref: '#/components/schemas/Error' });
          }
        }
      }
    }
    assert.ok(get('/api/appointments', 'get').responses['400']);
    assert.ok(get('/api/appointments', 'get').responses['404']);
    for (const [path, method] of [['/api/appointments', 'post'], ['/api/appointments/{id}', 'patch'], ['/api/appointments/{id}/reschedule', 'post']]) {
      const op = get(path, method);
      for (const code of ['400', '404', '409', '413', '415']) assert.ok(op.responses[code], `${method} ${path} ${code}`);
    }
    assert.ok(get('/api/appointments/{id}', 'delete').responses['404']);
  });
});
