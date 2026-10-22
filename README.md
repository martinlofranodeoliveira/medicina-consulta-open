# Medicina Consulta Open

Uma API local para estudar e prototipar **agendamento de consultas**: catálogo de profissionais fictícios, criação e reagendamento de horários, prevenção de conflitos, conclusão, cancelamento e exclusão. Código aberto sob a licença ISC.

Esta versão reorganiza a ideia do projeto educacional Medicina Consulta em uma base pequena e executável. O servidor usa apenas módulos nativos do Node.js; não exige banco externo, conta em nuvem nem `npm install`.

**Use somente dados sintéticos.** É um protótipo local sem autenticação, autorização, criptografia de dados, trilha de auditoria ou prontuário. Não é um sistema pronto para atender pacientes. O servidor escuta exclusivamente em `127.0.0.1`; não o exponha por proxy ou túnel.

## Começar

Requisitos: Node.js 22.22 ou superior, npm e Git. Use uma versão do Node ainda suportada e atualizada.

```sh
git clone https://github.com/martinlofranodeoliveira/medicina-consulta-open.git
cd medicina-consulta-open
npm test
npm run demo
npm start
```

O endereço padrão é `http://127.0.0.1:3334`. `npm run demo` executa um exemplo em memória, encerra sozinho e não escreve na sua agenda. Para alterar a porta ou pasta de dados, copie `.env.example` para `.env`. Não há senha de demonstração nem credencial embutida.

## Um agendamento completo

Liste o catálogo:

```sh
curl http://127.0.0.1:3334/api/practitioners
```

Crie uma consulta fictícia. `patientRef` aceita apenas letras, números, `_` e `-`, até 48 caracteres; não coloque nome, documento, e-mail, telefone ou informações de saúde.

```sh
curl -X POST http://127.0.0.1:3334/api/appointments \
  -H 'Content-Type: application/json' \
  -d '{"practitionerId":"demo-clinica-geral","patientRef":"exemplo_001","startsAt":"2030-04-08T09:00:00-03:00","durationMinutes":30}'
```

A resposta `201` contém `data.id`, usado nas próximas chamadas. O horário é salvo em UTC: nesse exemplo, `2030-04-08T12:00:00.000Z`. Um segundo agendamento sobreposto para o mesmo profissional retorna `409 schedule_conflict`. Horários adjacentes são permitidos. As requisições concorrentes passam pela mesma fila de gravação.

```sh
curl 'http://127.0.0.1:3334/api/appointments?date=2030-04-08&practitionerId=demo-clinica-geral'
curl -X POST http://127.0.0.1:3334/api/appointments/ID_DA_RESPOSTA/reschedule \
  -H 'Content-Type: application/json' \
  -d '{"startsAt":"2030-04-08T10:00:00-03:00","durationMinutes":45}'
curl -X PATCH http://127.0.0.1:3334/api/appointments/ID_DA_RESPOSTA \
  -H 'Content-Type: application/json' -d '{"status":"cancelled"}'
curl -X DELETE http://127.0.0.1:3334/api/appointments/ID_DA_RESPOSTA
```

O reagendamento retorna `200` com a consulta atualizada e aceita somente `startsAt` e `durationMinutes`, ambos obrigatórios. Mantém o mesmo ID, profissional, referência fictícia, estado e data de criação. Somente consultas `scheduled` podem ser reagendadas. A própria consulta não conflita com seu horário anterior: é possível mover ou ampliar um intervalo que ainda se sobreponha a ele. Conflitos com outras consultas retornam `409 schedule_conflict`; entrada inválida ou falha de gravação também preserva o horário anterior. Criação e reagendamento usam a mesma fila para impedir que requisições concorrentes ocupem o mesmo intervalo.

O cancelamento libera o intervalo. `completed` mantém o horário ocupado. Somente consultas `scheduled` podem mudar de estado; reagendar uma consulta concluída ou cancelada retorna `409 invalid_transition`. A exclusão remove o registro por completo, sem trilha de auditoria.

## Rotas e validação

| Método | Caminho | Resultado |
| --- | --- | --- |
| GET | `/` | Versão, modo e rotas |
| GET | `/health` | Estado do servidor |
| GET | `/api/practitioners` | Catálogo fictício |
| GET | `/api/appointments` | Agenda ordenada; filtros `date` e `practitionerId` |
| POST | `/api/appointments` | Cria um agendamento |
| POST | `/api/appointments/:id/reschedule` | Reagenda uma consulta `scheduled`, preservando sua identidade |
| PATCH | `/api/appointments/:id` | Conclui ou cancela |
| DELETE | `/api/appointments/:id` | Remove um agendamento |

- `startsAt` exige fuso explícito (`Z` ou `±HH:MM`), segundos iguais a zero e horários em intervalos de 15 minutos, tanto no horário informado quanto após normalização em UTC. Fusos de meia hora e 45 minutos são aceitos; offsets como `+03:07` são recusados, pois deslocariam o horário salvo para fora da grade.
- A data informada e o início normalizado em UTC devem manter o ano entre `0000` e `9999`. Um fuso que mova o início para fora desse intervalo retorna `400 validation_error`, tanto na criação quanto no reagendamento, sem alterar a agenda. Isso garante que o horário salvo possa ser lido novamente após reiniciar.
- `durationMinutes`: inteiro, múltiplo de 15, de 15 a 120.
- `date` filtra o **dia UTC**, não o dia no fuso do computador. Ex.: `23:00-03:00` pertence ao dia seguinte em UTC.
- Erros: `400` entrada inválida, `403` origem/host recusado, `404` recurso não encontrado, `409` conflito, `413` corpo acima de 8 KiB, `415` tipo de conteúdo incorreto e `500` falha interna.
- Formato de erro: `{"error":{"code":"schedule_conflict","message":"…"}}`.
- Não há agenda de disponibilidade no servidor, horários de expediente, feriados, lembretes ou cobrança. Agendamentos em datas passadas são aceitos para facilitar exemplos.
- Enumeração em memória: `availableSlots({ windowStart, windowEnd, durationMinutes, appointments })` (em `src/availability.js`) lista inícios UTC livres em grade de 15 minutos a partir de uma lista sintética já filtrada pelo chamador para o profissional certo. Não consulta o servidor, não persiste dados e ignora `cancelled`, mantendo `scheduled`/`completed` como ocupados; adjacência é permitida.

## Dados locais e recuperação

O arquivo `data/appointments.json` é criado após a primeira alteração. A pasta está no `.gitignore`. Cada mudança grava um arquivo temporário e o renomeia; uma falha de gravação não altera o estado em memória. Isso evita arquivos parcialmente escritos em uma interrupção comum, mas **não substitui backup** nem garante durabilidade contra perda de energia.

Execute apenas uma instância por `DATA_DIR`. Um lock exclusivo impede iniciar duas instâncias sobre a mesma pasta. `Ctrl+C` ou `SIGTERM` encerram o servidor e removem o lock. Se o processo for morto à força, pare todos os servidores que usam essa pasta, confira o PID em `data/.server.lock` e só então remova esse arquivo antes de reiniciar. Não apague `appointments.json` para resolver um problema de lock.

JSON corrompido ou com versão incompatível impede a inicialização e não é sobrescrito. Restaure uma cópia válida ou escolha uma pasta de dados nova para recomeçar o experimento.

## Desenvolvimento

```sh
npm run dev
npm run check
```

Os testes cobrem conflitos de intervalo e concorrência entre criação e reagendamento, preservação da identidade e do horário anterior, transições, persistência após reiniciar, falha de disco, JSON inválido, limite de corpo e proteção de host/origem. Usam somente referências fictícias e pastas temporárias. Não é necessário gerar um build.

Veja [CONTRIBUTING.md](CONTRIBUTING.md), [ROADMAP.md](ROADMAP.md), [SECURITY.md](SECURITY.md) e [NOTICE](NOTICE). Não inclua cadastros, segredos, bancos, avatares ou arquivos de produção em contribuições.

## Origem e licença

O repositório Node anterior declarava ISC. Esta edição preserva a licença e a autoria de Martin Lofrano de Oliveira. Código de contas, pagamentos, envio de e-mail, dados e imagens da versão antiga foi excluído; esta API é uma implementação nova do fluxo de agenda. O histórico antigo não é necessário para executar ou contribuir. A licença permite baixar, modificar e redistribuir o código, inclusive comercialmente, preservando os avisos.

Documentação do runtime: [HTTP](https://nodejs.org/docs/latest-v22.x/api/http.html), [test runner](https://nodejs.org/docs/latest-v22.x/api/test.html), [filesystem](https://nodejs.org/docs/latest-v22.x/api/fs.html).

## Descrição OpenAPI da agenda local

A descrição OpenAPI é apenas descritiva e não cria rota HTTP nem valida sozinha. Ela espelha as oito operações atuais: `GET /`, `GET /health`, `GET /api/practitioners`, `GET /api/appointments`, `POST /api/appointments`, `PATCH /api/appointments/:id`, `DELETE /api/appointments/:id` e `POST /api/appointments/:id/reschedule`. Não há rota HTTP de disponibilidade.

Exporte o documento sintético para a saída padrão:

```sh
node --input-type=module -e "import { createOpenApiDocument } from './src/openapi.js'; console.log(JSON.stringify(createOpenApiDocument(), null, 2))" > openapi.json
```

Ou em código:

```js
import { createOpenApiDocument } from './src/openapi.js';
console.log(JSON.stringify(createOpenApiDocument(), null, 2));
```

O endereço padrão é o loopback `http://127.0.0.1:3334`. O servidor escuta exclusivamente em `127.0.0.1` na porta local padrão `3334`; não o exponha por proxy ou túnel.

- Corpos são somente JSON (`Content-Type: application/json`) com limite de 8 KiB (8192 bytes, `x-body-limit-bytes: 8192`). Acima disso retorna `413 body_too_large`; tipo incorreto retorna `415 json_required`.
- O filtro `date=AAAA-MM-DD` filtra o dia UTC (`startsAt` normalizado em UTC), não o dia no fuso do computador. `practitionerId` filtra pelo ID do catálogo (`demo-*`). Filtros desconhecidos retornam `400 validation_error`.
- `startsAt` exige data de calendário válida, fuso explícito (`Z` ou `±HH:MM`), segundos zero e grade de 15 minutos tanto no horário informado quanto após normalização em UTC. Fusos como `+03:07` são recusados por deslocarem o horário salvo para fora da grade. A data informada e o início normalizado em UTC devem manter o ano entre `0000` e `9999`. A regex sozinha não garante essas regras semânticas.
- `durationMinutes` é inteiro múltiplo de 15, de 15 a 120.
- Intervalos adjacentes são permitidos; sobreposição para o mesmo profissional retorna `409 schedule_conflict`.
- `completed` mantém o horário ocupado; `cancelled` libera o intervalo para novo agendamento.
- Somente consultas `scheduled` podem ser reagendadas ou ter o estado alterado para `completed`/`cancelled`; caso contrário retorna `409 invalid_transition`.
- O reagendamento aceita somente `startsAt` e `durationMinutes`, preserva a identidade (mesmo `id`, profissional, referência fictícia, estado e data de criação) e preserva o intervalo antigo em caso de conflito, entrada inválida ou falha de gravação.

Os testes descritivos de esquema/contrato em `test/openapi.test.js` verificam apenas um subconjunto da estrutura, referências locais, esquemas e ilustrações sintéticas. Eles não são um validador completo de conformidade OAS, nem segurança automática, nem prontidão real de disponibilidade/clínica, nem permissão para expor o servidor. Use somente dados sintéticos (ex.: `synthetic_001`).


<!-- community-core:practitioner-catalog-audit -->
### Validate synthetic practitioner catalog offline

Helps local synthetic scheduling study by validating a configurable fictional practitioner catalog offline without server or storage. It supports the roadmap item for validated catalog separation, complements UTC free-slot enumeration and appointment conflict checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/practitioner_catalog_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. Input payload must be a plain object with only key practitioners as array of 1..100 entries. Each entry must be a plain object with required id string and only optional keys name and specialty. id must be string length 6..64 starting with demo-, containing only ASCII letters, digits, hyphen and underscore. Optional name and specialty when present must be strings length 1..80 without leading/trailing space, TAB, LF or CR and without other C0 controls. Extra keys, missing id, wrong types, empty array, over 100 entries, duplicate ids, or any id/name/specialty rule violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid practitioner catalog."}} with no partial list. Otherwise it returns {ok:true,count,practitioners} where count equals input length and practitioners is a new array sorted lexicographically by id containing copies with only supplied allowed keys, preserving input without mutation. Ordering is canonical sorted. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "practitioners": [
      {
        "id": "demo-clinica-geral",
        "name": "Geral"
      },
      {
        "id": "demo-cardio",
        "name": "Cardio"
      }
    ]
  },
  "output": {
    "count": 2,
    "ok": true,
    "practitioners": [
      {
        "id": "demo-cardio",
        "name": "Cardio"
      },
      {
        "id": "demo-clinica-geral",
        "name": "Geral"
      }
    ]
  }
}
```

```json
{
  "input": {
    "practitioners": [
      {
        "id": "prod-cardio"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid practitioner catalog."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "practitioners": [
      {
        "id": "demo-a"
      },
      {
        "id": "demo-a"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid practitioner catalog."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_practitioner_catalog_audit.test.js`.


<!-- community-core:utc-day-agenda-filter -->
### Filter synthetic day agenda offline by UTC date

Helps local synthetic scheduling study by reproducing UTC-day filtering and ordering offline without server or storage. It supports agenda listing demos and tests, complements UTC free-slot enumeration and conflict checks without duplicating them, and gives a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/utc_day_agenda_filter.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. Input payload must be a plain object with only keys date, practitionerId optional, and appointments required. Null, array, or non-object payload is invalid. Extra payload keys make payload invalid. date must be a string length 10 of form YYYY-MM-DD with literal hyphens at fixed positions, year 0000 to 9999, month 01 to 12, day valid for month including leap-year February where February has 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, other months 30 or 31 days as per calendar. practitionerId when present must be a string length 6 to 64 starting with demo- containing only ASCII letters, digits, hyphen and underscore. appointments must be an array of 0 to 200 entries. Each entry must be a plain object with only keys id, practitionerId and startsAt. id must be a string length 1 to 64 containing only ASCII letters, digits, hyphen and underscore. practitionerId entry rule same as filter rule. startsAt must be a string length 24 of exact form YYYY-MM-DDTHH:MM:00.000Z with literal T, colons, dot and Z at fixed positions, year 0000 to 9999, month 01 to 12, day valid for month with same leap rule, hour 00 to 23, minute 00 or 15 or 30 or 45, seconds 00 and millis 000. Missing keys, extra keys, wrong types, or any field rule violation makes payload invalid. On any invalid payload it returns ok false with error code validation_error and message invalid day agenda filter with no partial list. Otherwise it keeps entries where first 10 characters of startsAt equal date and where practitionerId filter when present equals entry practitionerId, sorts kept entries lexicographically by startsAt then id, and returns ok true with date echoing input date, count equal to kept length, and appointments as new array of copies with only allowed keys. It preserves input without mutation. Ordering is canonical sorted. It builds results with object literals, arrays with push and Map get and set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "id": "appt-002",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:30:00.000Z"
      },
      {
        "id": "appt-001",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:00:00.000Z"
      }
    ],
    "date": "2030-04-08"
  },
  "output": {
    "appointments": [
      {
        "id": "appt-001",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:00:00.000Z"
      },
      {
        "id": "appt-002",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:30:00.000Z"
      }
    ],
    "count": 2,
    "date": "2030-04-08",
    "ok": true
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "id": "appt-010",
        "practitionerId": "demo-cardio",
        "startsAt": "2030-04-08T09:00:00.000Z"
      },
      {
        "id": "appt-011",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T09:00:00.000Z"
      },
      {
        "id": "appt-012",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-09T09:00:00.000Z"
      }
    ],
    "date": "2030-04-08",
    "practitionerId": "demo-clinica-geral"
  },
  "output": {
    "appointments": [
      {
        "id": "appt-011",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T09:00:00.000Z"
      }
    ],
    "count": 1,
    "date": "2030-04-08",
    "ok": true
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "id": "appt-001",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:00:00.000Z"
      }
    ],
    "date": "2030-13-08"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid day agenda filter."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_utc_day_agenda_filter.test.js`.


<!-- community-core:appointment-status-audit -->
### Validate synthetic appointment status transition offline

Helps local synthetic scheduling study by validating fictional appointment status changes offline without server or storage. It mirrors PATCH rules where only scheduled can move to completed or cancelled, complements UTC-day filtering, free-slot enumeration and catalog audit without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/appointment_status_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. Input payload must be a plain object with only keys currentStatus and nextStatus, both required. Null, array, or non-object payload is invalid. Extra payload keys, missing keys, or wrong types make payload invalid. currentStatus must be a string equal to scheduled, completed or cancelled. nextStatus must be a string equal to completed or cancelled. Any enum violation makes payload invalid. On any invalid payload it returns {error:{code:"validation_error",message:"invalid status transition."},ok:false} with no partial result. Otherwise when currentStatus is not scheduled it returns {allowed:false,code:"invalid_transition",currentStatus,error:{code:"invalid_transition",message:"appointment already finalized."},nextStatus,ok:false} echoing inputs. Otherwise when currentStatus is scheduled and nextStatus is completed or cancelled it returns {allowed:true,code:"ok",currentStatus,nextStatus,ok:true} echoing inputs. It preserves input without mutation. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "currentStatus": "scheduled",
    "nextStatus": "completed"
  },
  "output": {
    "allowed": true,
    "code": "ok",
    "currentStatus": "scheduled",
    "nextStatus": "completed",
    "ok": true
  }
}
```

```json
{
  "input": {
    "currentStatus": "completed",
    "nextStatus": "cancelled"
  },
  "output": {
    "allowed": false,
    "code": "invalid_transition",
    "currentStatus": "completed",
    "error": {
      "code": "invalid_transition",
      "message": "appointment already finalized."
    },
    "nextStatus": "cancelled",
    "ok": false
  }
}
```

```json
{
  "input": {
    "currentStatus": "scheduled",
    "nextStatus": "scheduled"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid status transition."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_status_audit.test.js`.


<!-- community-core:schedule-conflict-audit -->
### Check synthetic scheduling conflict offline

Helps local synthetic scheduling study by checking a single fictional interval against stored synthetic appointments offline without server or storage. It mirrors creation and reschedule conflict rules where cancelled frees the interval and adjacency is allowed, complements UTC free-slot enumeration, catalog audit and status checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/schedule_conflict_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. Input payload must be a plain object with only keys practitionerId, candidate and appointments. Null, array or non-object payload is invalid. Extra payload keys make payload invalid. practitionerId must be a string length 6..64 starting with demo- containing only ASCII letters, digits, hyphen and underscore. candidate must be a plain object with only keys startsAt and durationMinutes, both required. startsAt must be a string length 24 of exact form YYYY-MM-DDTHH:MM:00.000Z with literal hyphens, T, colons, dot and Z at fixed positions; year 0000..9999, month 01..12, day valid for month including leap-year February with 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, hour 00..23, minute 00 or 15 or 30 or 45, seconds 00 and millis 000. durationMinutes must be an integer number 15..120 multiple of 15. appointments must be an array of 0..200 entries. Each entry must be a plain object with only keys id, practitionerId, startsAt, durationMinutes and status, all required. id must be a string length 1..64 containing only ASCII letters, digits, hyphen and underscore. Entry practitionerId follows the same demo- rule. Entry startsAt and durationMinutes follow the same candidate rules. status must be a string equal to scheduled, completed or cancelled. Missing keys, extra keys, wrong types or any field rule violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid schedule conflict check."}} with no partial result. Otherwise it considers only entries where entry practitionerId equals payload practitionerId and status is scheduled or completed, ignoring cancelled and other practitioners. It converts each UTC start to an absolute minute count using calendar arithmetic with month lengths and leap-year rule and computes end as start plus durationMinutes. Candidate conflicts when candidateStart < entryEnd and entryStart < candidateEnd; adjacency where end equals start is not a conflict. When any considered entry conflicts it returns {ok:true,conflict:true,code:"schedule_conflict",practitionerId} echoing payload practitionerId. Otherwise it returns {ok:true,conflict:false,code:"ok",practitionerId}. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "durationMinutes": 30,
        "id": "a1",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:30:00.000Z",
        "status": "scheduled"
      }
    ],
    "candidate": {
      "durationMinutes": 30,
      "startsAt": "2030-04-08T12:00:00.000Z"
    },
    "practitionerId": "demo-clinica-geral"
  },
  "output": {
    "code": "ok",
    "conflict": false,
    "ok": true,
    "practitionerId": "demo-clinica-geral"
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "durationMinutes": 30,
        "id": "a1",
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:15:00.000Z",
        "status": "scheduled"
      }
    ],
    "candidate": {
      "durationMinutes": 30,
      "startsAt": "2030-04-08T12:00:00.000Z"
    },
    "practitionerId": "demo-clinica-geral"
  },
  "output": {
    "code": "schedule_conflict",
    "conflict": true,
    "ok": true,
    "practitionerId": "demo-clinica-geral"
  }
}
```

```json
{
  "input": {
    "appointments": [],
    "candidate": {
      "durationMinutes": 30,
      "startsAt": "2030-04-08T12:00:00.000Z"
    },
    "practitionerId": "prod-cardio"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid schedule conflict check."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_schedule_conflict_audit.test.js`.


<!-- community-core:appointment-draft-audit -->
### Validate synthetic appointment draft offline with UTC normalization

Helps local synthetic scheduling study by validating a fictional appointment draft offline without server or storage. It mirrors creation rules for practitioner, patient reference, timezone-aware start and duration plus UTC normalization, complements free-slot enumeration, conflict checks, day filtering, catalog and status audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/appointment_draft_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys practitionerId, patientRef, startsAt and durationMinutes, all required. Null, array, or non-object payload is invalid. Extra payload keys, missing keys, or wrong types make payload invalid. practitionerId must be a string length 6 to 64 starting with demo- containing only ASCII letters, digits, hyphen and underscore. patientRef must be a string length 1 to 48 containing only ASCII letters, digits, hyphen and underscore. durationMinutes must be an integer number 15 to 120 multiple of 15. startsAt must be a string length 20 or 25 with explicit timezone, either form YYYY-MM-DDTHH colon MM colon 00Z with length 20 or form YYYY-MM-DDTHH colon MM colon 00 plus or minus HH colon MM with length 25, with literal hyphens, T, colons and Z or sign at fixed positions and ASCII digits elsewhere; year 0000 to 9999, month 01 to 12, day valid for month including leap-year February with 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, hour 00 to 23, minute 00 or 15 or 30 or 45, seconds 00; offset when present must have sign plus or minus, hour 00 to 14, minute 00 or 15 or 30 or 45, with hour 14 requiring minute 00. Local grid violations make payload invalid. On any invalid payload it returns ok false with error code validation_error and message invalid appointment draft with trailing period and no partial result. Otherwise it computes startsAtUtc as UTC-normalized string of exact form YYYY-MM-DDTHH colon MM colon 00 dot 000Z with length 24 via calendar arithmetic where UTC equals local minus signed offset, carrying across days, months and years with month lengths and leap rule, without Date; if normalized year falls outside 0000 to 9999 or normalized minute is not 00 or 15 or 30 or 45 it returns the same validation_error. Otherwise it returns ok true with practitionerId, patientRef, startsAt, startsAtUtc and durationMinutes echoing inputs plus computed UTC. It never mutates input. It builds results with object literals, arrays with push and Map get and set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "durationMinutes": 30,
    "patientRef": "exemplo_001",
    "practitionerId": "demo-clinica-geral",
    "startsAt": "2030-04-08T09:00:00-03:00"
  },
  "output": {
    "durationMinutes": 30,
    "ok": true,
    "patientRef": "exemplo_001",
    "practitionerId": "demo-clinica-geral",
    "startsAt": "2030-04-08T09:00:00-03:00",
    "startsAtUtc": "2030-04-08T12:00:00.000Z"
  }
}
```

```json
{
  "input": {
    "durationMinutes": 15,
    "patientRef": "synthetic_001",
    "practitionerId": "demo-cardio",
    "startsAt": "2030-04-08T12:00:00Z"
  },
  "output": {
    "durationMinutes": 15,
    "ok": true,
    "patientRef": "synthetic_001",
    "practitionerId": "demo-cardio",
    "startsAt": "2030-04-08T12:00:00Z",
    "startsAtUtc": "2030-04-08T12:00:00.000Z"
  }
}
```

```json
{
  "input": {
    "durationMinutes": 30,
    "patientRef": "synthetic_001",
    "practitionerId": "demo-cardio",
    "startsAt": "2030-04-08T09:00:00+03:07"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid appointment draft."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_draft_audit.test.js`.


<!-- community-core:availability-window-audit -->
### Validate synthetic availability window offline

Helps local synthetic scheduling study by validating a fictional free-slot query window offline without server or storage. It supports the roadmap item for availability intervals, complements UTC free-slot enumeration and conflict checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/availability_window_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys windowStart, windowEnd and durationMinutes, all required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. windowStart and windowEnd must each be a string length 24 of exact form YYYY-MM-DDTHH:MM:00.000Z with literal hyphens, T, colons, dot and Z at fixed positions; year 0000 to 9999, month 01 to 12, day valid for month including leap-year February with 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, hour 00 to 23, minute 00 or 15 or 30 or 45, seconds 00 and millis 000. durationMinutes must be an integer number 15 to 120 multiple of 15. windowEnd must be lexicographically greater than windowStart as canonical UTC chronological order. Any missing key, extra key, wrong type or field, grid, calendar or ordering violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid availability window."}} with no partial result. Otherwise it returns {ok:true,windowStart,windowEnd,durationMinutes} with new string copies and same number. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "durationMinutes": 30,
    "windowEnd": "2030-04-08T14:00:00.000Z",
    "windowStart": "2030-04-08T12:00:00.000Z"
  },
  "output": {
    "durationMinutes": 30,
    "ok": true,
    "windowEnd": "2030-04-08T14:00:00.000Z",
    "windowStart": "2030-04-08T12:00:00.000Z"
  }
}
```

```json
{
  "input": {
    "durationMinutes": 30,
    "windowEnd": "2030-04-08T12:00:00.000Z",
    "windowStart": "2030-04-08T14:00:00.000Z"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid availability window."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "durationMinutes": 30,
    "windowEnd": "2030-04-08T14:00:00.000Z",
    "windowStart": "2030-04-08T12:07:00.000Z"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid availability window."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_availability_window_audit.test.js`.


<!-- community-core:reschedule-request-audit -->
### Validate synthetic reschedule request offline

Helps local synthetic scheduling study by validating a fictional reschedule payload offline without server or storage. It supports the roadmap item for atomic reschedule with identity preservation, complements UTC free-slot enumeration, draft validation, conflict checks, catalog and status audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/reschedule_request_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys startsAt and durationMinutes, both required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. startsAt must be a string length 24 of exact form YYYY-MM-DDTHH:MM:00.000Z with literal hyphens, T, colons, dot and Z at fixed positions and ASCII digits elsewhere; year 0000 to 9999, month 01 to 12, day valid for month including leap-year February with 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, hour 00 to 23, minute 00 or 15 or 30 or 45, seconds 00 and millis 000. durationMinutes must be an integer number 15 to 120 multiple of 15. Any missing key, extra key, wrong type or field, calendar or grid violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid reschedule request."}} with no partial result. Otherwise it returns {ok:true,startsAt,durationMinutes} with new string copies and same number. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "durationMinutes": 45,
    "startsAt": "2030-04-08T12:00:00.000Z"
  },
  "output": {
    "durationMinutes": 45,
    "ok": true,
    "startsAt": "2030-04-08T12:00:00.000Z"
  }
}
```

```json
{
  "input": {
    "durationMinutes": 30,
    "startsAt": "2030-04-08T12:07:00.000Z"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid reschedule request."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "startsAt": "2030-04-08T12:00:00.000Z"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid reschedule request."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_reschedule_request_audit.test.js`.


<!-- community-core:day-capacity-audit -->
### Audit synthetic UTC day capacity offline

Helps local synthetic scheduling study by auditing fictional UTC day load against a configurable capacity offline without server or storage. It supports roadmap agenda filtering and availability work, complements UTC free-slot enumeration, draft validation, conflict checks, catalog, status, window and day-filter audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/day_capacity_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys date, practitionerId, capacity and appointments, all required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. date must be a string length 10 of exact form YYYY-MM-DD with literal hyphens at fixed positions and ASCII digits elsewhere; year 0000 to 9999, month 01 to 12, day valid for month including leap-year February with 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, April June September November 30 days, others 31 days. practitionerId must be a string length 6..64 starting with demo- containing only ASCII letters, digits, hyphen and underscore. capacity must be an integer number 1 to 32. appointments must be an array of 0..100 entries. Each entry must be a plain object with only keys startsAt, practitionerId and status, all required. startsAt must be a string length 24 of exact form YYYY-MM-DDTHH:MM:00.000Z with literal hyphens, T, colons, dot and Z at fixed positions and ASCII digits elsewhere; month 01 to 12, day valid for month including leap-year February as above, hour 00 to 23, minute 00 or 15 or 30 or 45, seconds 00 and millis 000. Entry practitionerId follows same demo- rule. status must be exactly scheduled or completed or cancelled. Any missing key, extra key, wrong type or field rule violation or over 100 entries makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid day capacity request."}} with no partial result. Otherwise booked counts entries where entry practitionerId equals request practitionerId and entry status is scheduled or completed and entry startsAt slice 0..10 equals date; cancelled, other practitioners and other UTC days are ignored and adjacency needs no check. It returns {ok:true,date,practitionerId,capacity,booked,remaining,isFull} where date and practitionerId are new string copies, booked is counted matches, remaining is capacity minus booked when booked below capacity else 0, isFull is true when booked equals or exceeds capacity else false. Empty matches yield booked 0, remaining capacity and isFull false. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:00:00.000Z",
        "status": "scheduled"
      },
      {
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:30:00.000Z",
        "status": "completed"
      },
      {
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T13:00:00.000Z",
        "status": "cancelled"
      }
    ],
    "capacity": 2,
    "date": "2030-04-08",
    "practitionerId": "demo-clinica-geral"
  },
  "output": {
    "booked": 2,
    "capacity": 2,
    "date": "2030-04-08",
    "isFull": true,
    "ok": true,
    "practitionerId": "demo-clinica-geral",
    "remaining": 0
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "practitionerId": "demo-cardio",
        "startsAt": "2030-04-08T12:00:00.000Z",
        "status": "scheduled"
      },
      {
        "practitionerId": "demo-cardio",
        "startsAt": "2030-04-09T12:00:00.000Z",
        "status": "scheduled"
      },
      {
        "practitionerId": "demo-clinica-geral",
        "startsAt": "2030-04-08T12:15:00.000Z",
        "status": "scheduled"
      }
    ],
    "capacity": 3,
    "date": "2030-04-08",
    "practitionerId": "demo-cardio"
  },
  "output": {
    "booked": 1,
    "capacity": 3,
    "date": "2030-04-08",
    "isFull": false,
    "ok": true,
    "practitionerId": "demo-cardio",
    "remaining": 2
  }
}
```

```json
{
  "input": {
    "appointments": [],
    "capacity": 2,
    "date": "2030-02-30",
    "practitionerId": "demo-cardio"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid day capacity request."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_day_capacity_audit.test.js`.


<!-- community-core:appointment-deletion-audit -->
### Preview synthetic appointment deletion offline

Helps local synthetic scheduling study by previewing fictional appointment deletion offline without server or storage. It supports the roadmap deletion flow, complements UTC free-slot enumeration, conflict checks, draft, catalog, status, window, day-filter, reschedule and capacity audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application/UI integration is outside this change.

Reusable deterministic JSON core: `src/community/appointment_deletion_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys appointments and id, both required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. appointments must be an array of 0..50 entries. id must be a string length 1..64 containing only ASCII letters, digits, hyphen and underscore. Each appointment entry must be a plain object with only keys id, practitionerId and status, all required. Entry id follows same 1..64 rule. practitionerId must be a string length 6..64 starting with demo- containing only ASCII letters, digits, hyphen and underscore. status must be exactly scheduled or completed or cancelled. Any missing key, extra key, wrong type, field rule violation, duplicate entry ids, or over 50 entries makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid deletion request."}} with no partial result. Otherwise if no entry id equals request id it returns {ok:false,error:{code:"appointment_not_found",message:"appointment not found."}}. Otherwise it returns {ok:true,id,practitionerId,status,remainingCount,remaining} where id, practitionerId and status are new string copies from the matched entry, remaining is a new array containing new copies with only allowed keys for all non-matching entries preserving input order, and remainingCount equals remaining length. Empty appointments with valid id yields not-found. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "id": "apt-001",
        "practitionerId": "demo-clinica-geral",
        "status": "scheduled"
      },
      {
        "id": "apt-002",
        "practitionerId": "demo-clinica-geral",
        "status": "completed"
      }
    ],
    "id": "apt-001"
  },
  "output": {
    "id": "apt-001",
    "ok": true,
    "practitionerId": "demo-clinica-geral",
    "remaining": [
      {
        "id": "apt-002",
        "practitionerId": "demo-clinica-geral",
        "status": "completed"
      }
    ],
    "remainingCount": 1,
    "status": "scheduled"
  }
}
```

```json
{
  "input": {
    "appointments": [],
    "extra": 1,
    "id": "apt-001"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid deletion request."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "id": "apt-001",
        "practitionerId": "demo-cardio",
        "status": "cancelled"
      }
    ],
    "id": "apt-999"
  },
  "output": {
    "error": {
      "code": "appointment_not_found",
      "message": "appointment not found."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_deletion_audit.test.js`.


<!-- community-core:reschedule-identity-audit -->
### Audit synthetic reschedule identity preservation offline

Helps local synthetic scheduling study by checking fictional reschedule identity preservation offline without server or storage. It supports the roadmap atomic reschedule item, complements UTC free-slot enumeration, conflict checks, draft, catalog, status, window, day-filter, reschedule request, agenda query and capacity audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application/UI integration is outside this change.

Reusable deterministic JSON core: `src/community/reschedule_identity_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys before and after, both required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. before and after must each be plain objects with only keys id, practitionerId, patientRef, startsAt, durationMinutes, status, createdAt, all required. Extra or missing keys make payload invalid. id must be a string length 1..64 containing only ASCII letters, digits, hyphen and underscore. practitionerId must be a string length 6..64 starting with demo- containing only ASCII letters, digits, hyphen and underscore. patientRef must be a string length 1..48 containing only ASCII letters, digits, hyphen and underscore. startsAt and createdAt must each be a string length 24 of exact form YYYY-MM-DDTHH:MM:00.000Z with literal hyphens, T, colons, dot and Z at fixed positions and ASCII digits elsewhere; year 0000 to 9999, month 01 to 12, day valid for month including leap-year February with 29 days when year divisible by 400 or divisible by 4 and not by 100 else 28 days, April June September November 30 days, others 31 days, hour 00 to 23, minute for startsAt 00 or 15 or 30 or 45, minute for createdAt 00 to 59, seconds 00 and millis 000. durationMinutes must be an integer number 15 to 120 and multiple of 15. status must be exactly scheduled. Any missing key, extra key, wrong type or field rule violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid reschedule identity."}} with no partial result. Otherwise it returns {ok:true,preserved,timeChanged,beforeId,afterId} where beforeId and afterId are new string copies of before.id and after.id, preserved is true when id, practitionerId, patientRef, status and createdAt are all equal else false, timeChanged is true when startsAt or durationMinutes differ else false. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "after": {
      "createdAt": "2030-04-01T12:00:00.000Z",
      "durationMinutes": 45,
      "id": "appt_01",
      "patientRef": "exemplo_001",
      "practitionerId": "demo-clinica-geral",
      "startsAt": "2030-04-08T13:00:00.000Z",
      "status": "scheduled"
    },
    "before": {
      "createdAt": "2030-04-01T12:00:00.000Z",
      "durationMinutes": 30,
      "id": "appt_01",
      "patientRef": "exemplo_001",
      "practitionerId": "demo-clinica-geral",
      "startsAt": "2030-04-08T12:00:00.000Z",
      "status": "scheduled"
    }
  },
  "output": {
    "afterId": "appt_01",
    "beforeId": "appt_01",
    "ok": true,
    "preserved": true,
    "timeChanged": true
  }
}
```

```json
{
  "input": {
    "after": {
      "createdAt": "2030-04-01T12:00:00.000Z",
      "durationMinutes": 30,
      "id": "appt_02",
      "patientRef": "exemplo_001",
      "practitionerId": "demo-clinica-geral",
      "startsAt": "2030-04-08T12:00:00.000Z",
      "status": "scheduled"
    },
    "before": {
      "createdAt": "2030-04-01T12:00:00.000Z",
      "durationMinutes": 30,
      "id": "appt_01",
      "patientRef": "exemplo_001",
      "practitionerId": "demo-clinica-geral",
      "startsAt": "2030-04-08T12:00:00.000Z",
      "status": "scheduled"
    }
  },
  "output": {
    "afterId": "appt_02",
    "beforeId": "appt_01",
    "ok": true,
    "preserved": false,
    "timeChanged": false
  }
}
```

```json
{
  "input": {
    "after": {
      "createdAt": "2030-04-01T12:00:00.000Z",
      "durationMinutes": 30,
      "id": "appt_01",
      "patientRef": "exemplo_001",
      "practitionerId": "prod-cardio",
      "startsAt": "2030-04-08T13:00:00.000Z",
      "status": "scheduled"
    },
    "before": {
      "createdAt": "2030-04-01T12:00:00.000Z",
      "durationMinutes": 30,
      "id": "appt_01",
      "patientRef": "exemplo_001",
      "practitionerId": "prod-cardio",
      "startsAt": "2030-04-08T12:00:00.000Z",
      "status": "scheduled"
    }
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid reschedule identity."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_reschedule_identity_audit.test.js`.


<!-- community-core:json-body-gate-audit -->
### Validate synthetic JSON body gate offline

Helps local synthetic scheduling study by previewing fictional JSON body gate offline without server or storage. It supports the roadmap body-limit and content-type rules, complements UTC free-slot enumeration, conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity and deletion audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application/UI integration is outside this change.

Reusable deterministic JSON core: `src/community/json_body_gate_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys contentType and bodyByteLength, both required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. contentType must be a string length 1..128. bodyByteLength must be an integer number 0..65535. Any missing key, extra key, wrong type, or range violation makes payload invalid. On any invalid payload it returns ok false with error code validation_error and message invalid body gate request with no partial result. Otherwise if contentType is not exactly application/json it returns ok false with error code json_required and message json required. Otherwise if bodyByteLength is greater than 8192 it returns ok false with error code body_too_large and message body too large. Otherwise it returns ok true with accepted true, contentType application/json, echoed bodyByteLength and limit 8192. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "bodyByteLength": 123,
    "contentType": "application/json"
  },
  "output": {
    "accepted": true,
    "bodyByteLength": 123,
    "contentType": "application/json",
    "limit": 8192,
    "ok": true
  }
}
```

```json
{
  "input": {
    "bodyByteLength": 100,
    "contentType": "text/plain"
  },
  "output": {
    "error": {
      "code": "json_required",
      "message": "json required."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "bodyByteLength": 8193,
    "contentType": "application/json"
  },
  "output": {
    "error": {
      "code": "body_too_large",
      "message": "body too large."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_json_body_gate_audit.test.js`.


<!-- community-core:host-origin-gate-audit -->
### Audit synthetic host and origin gate offline

Helps local synthetic scheduling study by checking fictional loopback host and origin gating offline without server or storage. It supports the loopback-only and 403 host and origin rules, complements UTC free-slot enumeration, conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity and deletion audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/host_origin_gate_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys host and origin, both required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. host must be a string length 1..128. origin must be a string length 0..256 with empty meaning absent. Any missing key, extra key, wrong type or length violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid host gate request."}} with no partial result. Otherwise it checks loopback allowlists using Map get/set: allowed hosts are exactly "127.0.0.1:3334" and "localhost:3334"; allowed origins are exactly "", "http://127.0.0.1:3334" and "http://localhost:3334". If host is not allowed it returns {ok:true,allowed:false,reason:"host_rejected",host,origin}. Else if origin is not allowed it returns {ok:true,allowed:false,reason:"origin_rejected",host,origin}. Else it returns {ok:true,allowed:true,reason:"loopback",host,origin}, where host and origin are new string copies. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "host": "127.0.0.1:3334",
    "origin": ""
  },
  "output": {
    "allowed": true,
    "host": "127.0.0.1:3334",
    "ok": true,
    "origin": "",
    "reason": "loopback"
  }
}
```

```json
{
  "input": {
    "host": "example.com",
    "origin": ""
  },
  "output": {
    "allowed": false,
    "host": "example.com",
    "ok": true,
    "origin": "",
    "reason": "host_rejected"
  }
}
```

```json
{
  "input": {
    "host": "127.0.0.1:3334",
    "origin": "http://evil.example"
  },
  "output": {
    "allowed": false,
    "host": "127.0.0.1:3334",
    "ok": true,
    "origin": "http://evil.example",
    "reason": "origin_rejected"
  }
}
```

```json
{
  "input": {
    "host": "127.0.0.1:3334"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid host gate request."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_host_origin_gate_audit.test.js`.


<!-- community-core:error-envelope-audit -->
### Validate synthetic error envelope offline

Helps local synthetic scheduling study by validating fictional error envelopes offline without server or storage. It supports the documented error format and status mapping, complements UTC free-slot enumeration, draft validation, conflict checks, catalog, status, window, day-filter, reschedule, capacity, deletion, body-gate and host-gate audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/error_envelope_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key error as a plain object. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. The error object must be a plain object with only keys code and message, both required. code must be a string exactly one of validation_error, schedule_conflict, invalid_transition, practitioner_not_found, appointment_not_found, body_too_large, json_required, checked with Map get/set. message must be a string length 1..200 without leading/trailing space, TAB, LF or CR and without other C0 controls. Any missing key, extra key, wrong type, unknown code, or message rule violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:'validation_error',message:'invalid error envelope.'}} with no partial result. Otherwise it returns {ok:true,valid:true,code,message} where code and message are new string copies of the input error fields. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access.

Examples (JSON input and expected output):

```json
{
  "input": {
    "error": {
      "code": "schedule_conflict",
      "message": "Busy interval."
    }
  },
  "output": {
    "code": "schedule_conflict",
    "message": "Busy interval.",
    "ok": true,
    "valid": true
  }
}
```

```json
{
  "input": {
    "error": {
      "code": "validation_error",
      "message": "Bad input."
    }
  },
  "output": {
    "code": "validation_error",
    "message": "Bad input.",
    "ok": true,
    "valid": true
  }
}
```

```json
{
  "input": {
    "error": {
      "code": "unknown_code",
      "message": "Hello."
    }
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid error envelope."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_error_envelope_audit.test.js`.


<!-- community-core:patient-reference-audit -->
### Validate synthetic patient reference offline

Helps local synthetic scheduling study by validating fictional patient references offline without server or storage. It supports the documented patientRef charset and length rule, complements UTC free-slot enumeration, draft validation, conflict checks, catalog, status, window, day-filter, reschedule, capacity, deletion, body-gate, host-gate and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/patient_reference_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key patientRef required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. patientRef must be a string length 1..48 containing only ASCII letters A-Z a-z, digits 0-9, hyphen - and underscore _, checked character by character with for-of and Map get/set without indexed access. Any missing key, extra key, wrong type, length violation, or disallowed character makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid patient reference."}} with no partial result. Otherwise it returns {ok:true,valid:true,patientRef} where patientRef is a new string copy built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "patientRef": "exemplo_001"
  },
  "output": {
    "ok": true,
    "patientRef": "exemplo_001",
    "valid": true
  }
}
```

```json
{
  "input": {
    "patientRef": "bad ref!"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid patient reference."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "patientRef": ""
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid patient reference."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_patient_reference_audit.test.js`.


<!-- community-core:duration-minutes-audit -->
### Audit synthetic duration minutes offline

Helps local synthetic scheduling study by validating fictional durationMinutes offline without server or storage. It supports the documented 15-to-120 quarter-hour grid, complements UTC free-slot enumeration, conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, body-gate, host-gate and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/duration_minutes_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key durationMinutes required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. durationMinutes must be a number that is an integer. Any missing key, extra key, wrong type or non-integer number makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid duration request."}} with no partial result. Otherwise it checks the allowed synthetic grid with Map get/set: value must be one of 15,30,45,60,75,90,105,120. If integer value is below 15 or above 120 it returns {ok:true,valid:false,reason:"range_error",durationMinutes}; if inside 15..120 but not a multiple of 15 it returns {ok:true,valid:false,reason:"grid_error",durationMinutes}. Otherwise it returns {ok:true,valid:true,durationMinutes} with the same numeric value. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "durationMinutes": 45
  },
  "output": {
    "durationMinutes": 45,
    "ok": true,
    "valid": true
  }
}
```

```json
{
  "input": {
    "durationMinutes": 20
  },
  "output": {
    "durationMinutes": 20,
    "ok": true,
    "reason": "grid_error",
    "valid": false
  }
}
```

```json
{
  "input": {
    "durationMinutes": 200
  },
  "output": {
    "durationMinutes": 200,
    "ok": true,
    "reason": "range_error",
    "valid": false
  }
}
```

```json
{
  "input": {
    "durationMinutes": "30"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid duration request."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_duration_minutes_audit.test.js`.
