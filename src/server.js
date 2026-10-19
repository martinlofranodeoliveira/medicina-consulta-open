import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ApiError } from './errors.js';
import { AppointmentService } from './appointments.js';
import { openFileStore, practitioners } from './store.js';

const MAX_BODY_BYTES = 8192;

async function jsonBody(request) {
  if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers['content-type'] ?? '')) {
    throw new ApiError(415, 'json_required', 'Use Content-Type: application/json.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'body_too_large', 'O JSON deve ter no máximo 8 KiB.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'invalid_json', 'O corpo não é um JSON válido.'); }
}

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
  });
  response.end(status === 204 ? undefined : JSON.stringify(body) + '\n');
}

export function createApplication(store) {
  const appointments = new AppointmentService(store);
  const server = createServer(async (request, response) => {
    try {
      const port = server.address().port;
      const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!hosts.includes(request.headers.host)) {
        throw new ApiError(403, 'host_forbidden', 'A API aceita somente acesso local.');
      }
      if (request.headers.origin && !hosts.some((host) => request.headers.origin === `http://${host}`)) {
        throw new ApiError(403, 'origin_forbidden', 'Origem não permitida.');
      }
      if (request.headers['sec-fetch-site'] === 'cross-site') {
        throw new ApiError(403, 'origin_forbidden', 'Origem não permitida.');
      }
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      const path = url.pathname;
      if (request.method === 'GET' && path === '/health') return json(response, 200, { status: 'ok' });
      if (request.method === 'GET' && path === '/') {
        return json(response, 200, {
          name: 'Medicina Consulta Open', version: '0.1.0', mode: 'local-demo',
          warning: 'Somente dados sintéticos. Sem autenticação ou prontuário.',
          routes: ['/health', '/api/practitioners', '/api/appointments'],
        });
      }
      if (request.method === 'GET' && path === '/api/practitioners') return json(response, 200, { data: practitioners });
      if (path === '/api/appointments') {
        if (request.method === 'GET') {
          const query = Object.fromEntries(url.searchParams);
          if (Object.keys(query).some((key) => !['date', 'practitionerId'].includes(key))) {
            throw new ApiError(400, 'validation_error', 'Filtro desconhecido. Use date ou practitionerId.');
          }
          return json(response, 200, { data: await appointments.list(query) });
        }
        if (request.method === 'POST') return json(response, 201, { data: await appointments.create(await jsonBody(request)) });
      }
      const reschedule = path.match(/^\/api\/appointments\/([a-f0-9-]{36})\/reschedule$/);
      if (reschedule && request.method === 'POST') {
        return json(response, 200, { data: await appointments.reschedule(reschedule[1], await jsonBody(request)) });
      }
      const match = path.match(/^\/api\/appointments\/([a-f0-9-]{36})$/);
      if (match && request.method === 'PATCH') {
        return json(response, 200, { data: await appointments.status(match[1], await jsonBody(request)) });
      }
      if (match && request.method === 'DELETE') {
        await appointments.remove(match[1]);
        return json(response, 204);
      }
      throw new ApiError(404, 'not_found', 'Rota não encontrada. Consulte o README.');
    } catch (error) {
      if (response.destroyed) return;
      if (error instanceof ApiError) return json(response, error.status, { error: { code: error.code, message: error.message } });
      // Never include request bodies, patient references, local paths or stack traces.
      console.error('Falha interna ao processar a requisição.');
      json(response, 500, { error: { code: 'internal_error', message: 'Não foi possível salvar a operação.' } });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  return server;
}

export async function start() {
  const port = Number(process.env.PORT ?? 3334);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT deve estar entre 1024 e 65535.');
  const { store, close } = await openFileStore(resolve(process.env.DATA_DIR ?? './data'));
  const server = createApplication(store);
  try {
    await new Promise((success, reject) => {
      server.once('error', reject);
      // Deliberately never configurable to 0.0.0.0: this prototype has no auth.
      server.listen(port, '127.0.0.1', success);
    });
  } catch (error) { await close(); throw error; }
  console.log(`Medicina Consulta Open: http://127.0.0.1:${port} (somente dados sintéticos)`);
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => { await close(); });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  start().catch(() => {
    console.error('Não foi possível iniciar. Confira a porta, a pasta de dados e o lock descrito no README.');
    process.exitCode = 1;
  });
}
