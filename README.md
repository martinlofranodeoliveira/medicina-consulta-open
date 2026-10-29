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


<!-- community-core:start-instant-grid-audit -->
### Audit synthetic start instant grid offline

Helps local synthetic scheduling study by validating fictional startsAt instants for quarter-hour grid and explicit zone offline without server or storage. It supports the documented startsAt grid and explicit-timezone rule, complements UTC free-slot enumeration, conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, body-gate, host-gate and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/start_instant_grid_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key startsAt required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. startsAt must be a string either YYYY-MM-DDTHH:MM:SS shape with Z (length 20) or with signed offset HH:MM (length 25), checked character by character with for-of and Map get-set without indexed variable access. Date part must have year 0000-9999, month 01-12, day valid for month including leap-year February 29 rule, with separators dash and T and colon in fixed positions. Time part must have hour 00-23, minute one of 00,15,30,45, second 00. Zone must be Z or sign plus or minus with offset hour 00-14 and offset minute one of 00,15,30,45 with 14:00 only, so offsets like +03:07 are rejected. Any missing key, extra key, wrong type, length, separator, calendar, time-grid, seconds, or zone-grid violation makes payload invalid. On any invalid payload it returns ok false with validation_error invalid start instant and no partial result. Otherwise it returns ok true valid true with equal startsAt as a new string copy built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get-set, using for-of and Object entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "startsAt": "2030-04-08T09:00:00-03:00"
  },
  "output": {
    "ok": true,
    "startsAt": "2030-04-08T09:00:00-03:00",
    "valid": true
  }
}
```

```json
{
  "input": {
    "startsAt": "2030-04-08T12:00:00Z"
  },
  "output": {
    "ok": true,
    "startsAt": "2030-04-08T12:00:00Z",
    "valid": true
  }
}
```

```json
{
  "input": {
    "startsAt": "2030-04-08T09:07:00-03:00"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid start instant."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_start_instant_grid_audit.test.js`.


<!-- community-core:appointment-identifier-audit -->
### Validate synthetic appointment identifier offline

Helps local synthetic scheduling study by validating fictional appointment identifiers offline without server or storage. It supports the documented :id routes for lookup, reschedule, status change and deletion, complements UTC free-slot enumeration, draft validation, conflict checks, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, body-gate, host-gate and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/appointment_identifier_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key id required. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. id must be a string length 36 with hyphens at positions 8, 13, 18 and 23 and all other characters lowercase hexadecimal 0-9 or a-f, checked character by character with for-of and Map get/set without indexed variable access. Any missing key, extra key, wrong type, length violation, misplaced hyphen, or non-hex character makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid appointment identifier."}} with no partial result. Otherwise it returns {ok:true,valid:true,id} where id is a new string copy built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "output": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "ok": true,
    "valid": true
  }
}
```

```json
{
  "input": {
    "id": "123E4567-E89B-12D3-A456-426614174000"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid appointment identifier."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "extra": 1,
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid appointment identifier."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_identifier_audit.test.js`.


<!-- community-core:agenda-query-gate-audit -->
### Audit synthetic agenda query filters offline

Helps local synthetic scheduling study by validating fictional GET /api/appointments query filters offline without server or storage. It supports the documented UTC-day date filter, demo-* practitionerId filter, and unknown-filter 400 rule, complements UTC free-slot enumeration, appointment conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, body-gate, host-gate and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/agenda_query_gate_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only allowed keys date and practitionerId, zero to two entries. Null, array or non-object payload is invalid. Extra keys make payload invalid. date when present must be a string length 10 shaped YYYY-MM-DD, checked character by character with for-of and Map get/set without indexed variable access. Year 0000-9999, month 01-12, day valid for month including leap-year February 29 rule, with dashes in fixed positions and all other characters ASCII digits. practitionerId when present must be a string length 6..64 starting with demo-, containing only ASCII letters, digits, hyphen and underscore, checked character by character with for-of and Map get/set without indexed variable access. Any wrong type, length, separator, calendar, prefix or character violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid appointment query."}} with no partial result. Otherwise it returns {ok:true,valid:true,query} where query is a new object containing only supplied allowed keys with new string copies built by concatenation. Empty input returns empty query object. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "date": "2030-04-08",
    "practitionerId": "demo-clinica-geral"
  },
  "output": {
    "ok": true,
    "query": {
      "date": "2030-04-08",
      "practitionerId": "demo-clinica-geral"
    },
    "valid": true
  }
}
```

```json
{
  "input": {},
  "output": {
    "ok": true,
    "query": {},
    "valid": true
  }
}
```

```json
{
  "input": {
    "date": "2030-04-08",
    "unknown": "x"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid appointment query."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "date": "2030-02-30"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid appointment query."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_agenda_query_gate_audit.test.js`.


<!-- community-core:openapi-inventory-audit -->
### Audit synthetic OpenAPI operation inventory offline

Helps local synthetic scheduling study by validating the fictional eight-operation OpenAPI inventory offline without server or storage. It supports the roadmap item for OpenAPI specification compatibility, complements UTC free-slot enumeration, appointment conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/openapi_inventory_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key operations as array of exactly 8 entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. Each entry must be a plain object with required method and path strings and no other keys. method must be exactly one of GET, POST, PATCH, DELETE. path must be exactly one of /, /health, /api/practitioners, /api/appointments, /api/appointments/:id, /api/appointments/:id/reschedule, checked character by character with for-of and Map get/set without indexed variable access. The multiset of method+path pairs must equal exactly the eight documented operations: GET /, GET /health, GET /api/practitioners, GET /api/appointments, POST /api/appointments, PATCH /api/appointments/:id, DELETE /api/appointments/:id, POST /api/appointments/:id/reschedule; missing, extra, duplicate or mismatched pairs make payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid openapi inventory."}} with no partial list. Otherwise it returns {ok:true,count:8,operations} where operations is a new array sorted lexicographically by method then path containing copies with only method and path as new string copies built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "operations": [
      {
        "method": "POST",
        "path": "/api/appointments"
      },
      {
        "method": "GET",
        "path": "/health"
      },
      {
        "method": "DELETE",
        "path": "/api/appointments/:id"
      },
      {
        "method": "GET",
        "path": "/"
      },
      {
        "method": "POST",
        "path": "/api/appointments/:id/reschedule"
      },
      {
        "method": "GET",
        "path": "/api/practitioners"
      },
      {
        "method": "PATCH",
        "path": "/api/appointments/:id"
      },
      {
        "method": "GET",
        "path": "/api/appointments"
      }
    ]
  },
  "output": {
    "count": 8,
    "ok": true,
    "operations": [
      {
        "method": "DELETE",
        "path": "/api/appointments/:id"
      },
      {
        "method": "GET",
        "path": "/"
      },
      {
        "method": "GET",
        "path": "/api/appointments"
      },
      {
        "method": "GET",
        "path": "/api/practitioners"
      },
      {
        "method": "GET",
        "path": "/health"
      },
      {
        "method": "PATCH",
        "path": "/api/appointments/:id"
      },
      {
        "method": "POST",
        "path": "/api/appointments"
      },
      {
        "method": "POST",
        "path": "/api/appointments/:id/reschedule"
      }
    ]
  }
}
```

```json
{
  "input": {
    "operations": [
      {
        "method": "GET",
        "path": "/"
      },
      {
        "method": "GET",
        "path": "/health"
      },
      {
        "method": "GET",
        "path": "/api/practitioners"
      },
      {
        "method": "GET",
        "path": "/api/appointments"
      },
      {
        "method": "POST",
        "path": "/api/appointments"
      },
      {
        "method": "PATCH",
        "path": "/api/appointments/:id"
      },
      {
        "method": "DELETE",
        "path": "/api/appointments/:id"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid openapi inventory."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "operations": [
      {
        "method": "GET",
        "path": "/"
      },
      {
        "method": "GET",
        "path": "/health"
      },
      {
        "method": "GET",
        "path": "/api/practitioners"
      },
      {
        "method": "GET",
        "path": "/api/appointments"
      },
      {
        "method": "POST",
        "path": "/api/appointments"
      },
      {
        "method": "PATCH",
        "path": "/api/appointments/:id"
      },
      {
        "method": "DELETE",
        "path": "/api/appointments/:id"
      },
      {
        "method": "GET",
        "path": "/api/availability"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid openapi inventory."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_openapi_inventory_audit.test.js`.


<!-- community-core:ordered-agenda-audit -->
### Validate synthetic ordered agenda offline

Helps local synthetic scheduling study by validating fictional agenda ordering offline without server or storage. It supports the documented ordered agenda sorted by startsAt, complements UTC-day filtering, free-slot enumeration, draft validation, conflict checks, catalog, status, deletion and other audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/ordered_agenda_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key appointments as array of 0..200 entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. Each entry must be a plain object with required keys id and startsAt and no other keys. id must be a string length 1..64. startsAt must be a string length 1..64. Any missing key, extra key, wrong type, or length violation makes payload invalid. Entries must already be in non-decreasing lexicographic order by startsAt using < comparison with no Date use; equal startsAt values are allowed; any decreasing startsAt pair makes payload invalid. It does not check UUID shape, 15-minute grid, timezone semantics, catalog membership, or overlap conflicts. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid ordered agenda."}} with no partial list. Otherwise it returns {ok:true,count,appointments} where count equals input length and appointments is a new array preserving input order containing copies with only id and startsAt as new string copies built by concatenation. Empty array returns count 0 and empty appointments. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "id": "a1",
        "startsAt": "2030-04-08T12:00:00.000Z"
      },
      {
        "id": "a2",
        "startsAt": "2030-04-08T12:15:00.000Z"
      }
    ]
  },
  "output": {
    "appointments": [
      {
        "id": "a1",
        "startsAt": "2030-04-08T12:00:00.000Z"
      },
      {
        "id": "a2",
        "startsAt": "2030-04-08T12:15:00.000Z"
      }
    ],
    "count": 2,
    "ok": true
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "id": "a2",
        "startsAt": "2030-04-08T12:15:00.000Z"
      },
      {
        "id": "a1",
        "startsAt": "2030-04-08T12:00:00.000Z"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid ordered agenda."
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
        "id": "a1",
        "practitionerId": "demo-cardio",
        "startsAt": "2030-04-08T12:00:00.000Z"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid ordered agenda."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_ordered_agenda_audit.test.js`.


<!-- community-core:utc-year-bounds-audit -->
### Audit synthetic UTC year bounds offline

Helps local synthetic scheduling study by validating fictional reported and UTC-normalized calendar years offline without server or storage. It supports the documented 0000-9999 persistable-year rule for creation and reschedule, complements UTC free-slot enumeration, appointment conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/utc_year_bounds_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys localYear and utcYear, exactly two entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. Each value must be a string length 4 containing only ASCII digits 0-9, checked character by character with for-of and Map get/set without indexed variable access, representing years 0000-9999. Any wrong type, length, or non-digit character makes payload invalid, including 5-character 10000, negative, empty, or non-string years that would move persisted UTC instants outside the readable range. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid year bounds."}} with no partial result. Otherwise it returns {ok:true,valid:true,years:{localYear,utcYear}} where years is a new object containing new string copies built by concatenation for each year. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "localYear": "2030",
    "utcYear": "2030"
  },
  "output": {
    "ok": true,
    "valid": true,
    "years": {
      "localYear": "2030",
      "utcYear": "2030"
    }
  }
}
```

```json
{
  "input": {
    "localYear": "0000",
    "utcYear": "9999"
  },
  "output": {
    "ok": true,
    "valid": true,
    "years": {
      "localYear": "0000",
      "utcYear": "9999"
    }
  }
}
```

```json
{
  "input": {
    "localYear": "9999",
    "utcYear": "10000"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid year bounds."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_utc_year_bounds_audit.test.js`.


<!-- community-core:icalendar-export-audit -->
### Audit synthetic iCalendar export list offline

Helps local synthetic scheduling study by validating a fictional iCalendar export list offline without server or storage. It supports the roadmap item for identifiable-free iCalendar export, complements UTC free-slot enumeration, appointment conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory, year-bounds and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/icalendar_export_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key events as array of 1..50 entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. Each entry must be a plain object with required keys uid, dtstart, durationMinutes and status and no other keys, preventing identifiable fields such as patientRef, summary or description. uid must be string length 8..64 starting with synthetic- prefix and containing only ASCII letters, digits, hyphen and underscore after the prefix, checked character by character with for-of and Map get/set without indexed variable access. dtstart must be string length 16 exactly matching basic UTC form YYYYMMDDTHHMMSSZ with T and Z in fixed positions and digits elsewhere, month 01-12, day 01-31, hour 00-23, minute 00/15/30/45 and second 00, checked character by character without Date or indexed access. durationMinutes must be a finite safe integer 15..120 multiple of 15. status must be exactly CONFIRMED or CANCELLED. Any wrong type, length, character, range, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid icalendar export."}} with no partial list. Otherwise it returns {ok:true,count,events} where count equals input length and events is a new array sorted lexicographically by dtstart then uid containing copies with only uid, dtstart, durationMinutes and status, with strings as new copies built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "events": [
      {
        "dtstart": "20300408T121500Z",
        "durationMinutes": 30,
        "status": "CONFIRMED",
        "uid": "synthetic-002"
      },
      {
        "dtstart": "20300408T120000Z",
        "durationMinutes": 15,
        "status": "CONFIRMED",
        "uid": "synthetic-001"
      }
    ]
  },
  "output": {
    "count": 2,
    "events": [
      {
        "dtstart": "20300408T120000Z",
        "durationMinutes": 15,
        "status": "CONFIRMED",
        "uid": "synthetic-001"
      },
      {
        "dtstart": "20300408T121500Z",
        "durationMinutes": 30,
        "status": "CONFIRMED",
        "uid": "synthetic-002"
      }
    ],
    "ok": true
  }
}
```

```json
{
  "input": {
    "events": [
      {
        "dtstart": "20300408T120000Z",
        "durationMinutes": 15,
        "patientRef": "exemplo_001",
        "status": "CONFIRMED",
        "uid": "synthetic-001"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid icalendar export."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "events": [
      {
        "dtstart": "20300408T120700Z",
        "durationMinutes": 15,
        "status": "CONFIRMED",
        "uid": "synthetic-001"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid icalendar export."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_icalendar_export_audit.test.js`.


<!-- community-core:iana-day-query-audit -->
### Validate synthetic IANA day query offline

Helps local synthetic scheduling study by validating fictional day-filter requests for a requested IANA time zone offline without server or storage. It supports the roadmap item for day filtering in the requested IANA zone including daylight changes, complements UTC-day filtering and agenda query validation without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence.

Reusable deterministic JSON core: `src/community/iana_day_query_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys date and timeZone, exactly two entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. date must be a string length 10 exactly matching YYYY-MM-DD with hyphens in fixed positions and digits elsewhere, month 01-12, day 01-31 with month lengths January March May July August October December 01-31, April June September November 01-30, February 01-29 without leap-year Date check, checked character by character with for-of and Map get/set without indexed variable access. timeZone must be a string length 3..64 containing only ASCII letters, digits, hyphen, underscore and slash, containing at least one slash, with no leading slash, trailing slash or double slash, each slash-separated component length 1..32 starting with an ASCII letter and containing only letters, digits, hyphen and underscore, checked character by character with for-of and Map get/set without indexed variable access. Any wrong type, length, character, structure, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid IANA day query."}} with no partial result. Otherwise it returns {ok:true,valid:true,query:{date,timeZone}} where query is a new object containing new string copies built by concatenation for each field. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "date": "2030-04-08",
    "timeZone": "America/Sao_Paulo"
  },
  "output": {
    "ok": true,
    "query": {
      "date": "2030-04-08",
      "timeZone": "America/Sao_Paulo"
    },
    "valid": true
  }
}
```

```json
{
  "input": {
    "date": "2030-13-08",
    "timeZone": "America/Sao_Paulo"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid IANA day query."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "date": "2030-04-08",
    "timeZone": "Invalid_Zone!"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid IANA day query."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_iana_day_query_audit.test.js`.


<!-- community-core:creation-instant-audit -->
### Audit synthetic creation instants offline

Helps local synthetic scheduling study by validating fictional server-generated creation timestamps offline without server or storage. It supports the documented persistence-after-restart rule, complements UTC free-slot enumeration, appointment conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory, year-bounds, icalendar-export, IANA-day and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/creation_instant_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key createdAt, exactly one entry. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. createdAt must be a string length 24 exactly matching YYYY-MM-DDTHH:MM:SS.sssZ with T and Z and separators in fixed positions, checked character by character with for-of and Map get/set without indexed variable access, representing years 0000-9999, months 01-12, days 01-31 with month lengths January March May July August October December 01-31, April June September November 01-30, February 01-29 without leap-year Date check, hours 00-23, minutes 00-59, seconds 00-59 and millis 000-999. Any wrong type, length, character, range, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid creation instant."}} with no partial result. Otherwise it returns {ok:true,valid:true,instant:{createdAt}} where instant is a new object containing a new string copy built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "createdAt": "2030-04-08T12:00:00.000Z"
  },
  "output": {
    "instant": {
      "createdAt": "2030-04-08T12:00:00.000Z"
    },
    "ok": true,
    "valid": true
  }
}
```

```json
{
  "input": {
    "createdAt": "2030-04-08T12:00:00.000"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid creation instant."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "createdAt": "2030-04-08T12:00:00.000Z",
    "extra": 1
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid creation instant."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_creation_instant_audit.test.js`.


<!-- community-core:storage-snapshot-audit -->
### Audit synthetic storage snapshot offline

Helps local synthetic scheduling study by validating a fictional storage snapshot envelope offline without server or storage. It supports the documented versioned JSON recovery contract, complements UTC free-slot enumeration, appointment conflict checks, draft, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory, year-bounds, error-envelope, icalendar-export, IANA-day and creation-instant audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/storage_snapshot_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys version and appointments, exactly two entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. version must be a number that is a safe integer exactly 1 with no type coercion. appointments must be an array of 0..200 entries. Each entry must be a plain object with only keys id, practitionerId and status, exactly three entries. Null, array or non-object entry is invalid. Extra or missing keys make payload invalid. id must be a string length 1..64 containing only ASCII letters, digits, hyphen and underscore, checked character by character with for-of and Map get/set without indexed variable access. practitionerId must be a string length 6..64 starting with demo-, containing only ASCII letters, digits, hyphen and underscore, checked character by character with for-of and Map get/set without indexed variable access. status must be exactly scheduled, completed or cancelled, checked character by character with for-of and Map get/set without indexed variable access. Duplicate id values make payload invalid, tracked with Map get/set. Any wrong type, length, character, structure, duplicate, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid storage snapshot."}} with no partial result. Otherwise it returns {ok:true,count,snapshot} where count equals appointments length and snapshot is a new object with version number copy and appointments new array sorted lexicographically by id via deterministic comparison loop containing new objects with only id, practitionerId and status as new string copies built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "id": "b-001",
        "practitionerId": "demo-cardio",
        "status": "scheduled"
      },
      {
        "id": "a-001",
        "practitionerId": "demo-clinica-geral",
        "status": "completed"
      }
    ],
    "version": 1
  },
  "output": {
    "count": 2,
    "ok": true,
    "snapshot": {
      "appointments": [
        {
          "id": "a-001",
          "practitionerId": "demo-clinica-geral",
          "status": "completed"
        },
        {
          "id": "b-001",
          "practitionerId": "demo-cardio",
          "status": "scheduled"
        }
      ],
      "version": 1
    }
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "id": "x-1",
        "practitionerId": "demo-cardio",
        "status": "scheduled"
      },
      {
        "id": "x-1",
        "practitionerId": "demo-cardio",
        "status": "scheduled"
      }
    ],
    "version": 1
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid storage snapshot."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "appointments": [],
    "version": 2
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid storage snapshot."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_storage_snapshot_audit.test.js`.


<!-- community-core:server-info-envelope-audit -->
### Audit synthetic server info envelope offline

Helps local synthetic scheduling study by validating fictional root/health version envelopes offline without server or storage. It supports reproducible demos and learning contracts for local mode and version display, complements UTC free-slot enumeration, appointment conflict checks, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory, year-bounds, error-envelope, icalendar-export, IANA-day, creation-instant and storage-snapshot audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/server_info_envelope_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys version, mode and status, exactly three entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. version must be a string length 1..32 containing only ASCII digits, ASCII letters, dot and hyphen, starting with an ASCII digit, checked character by character with for-of and Map get/set without indexed variable access. mode must be exactly local, demo or test, checked character by character with for-of and Map get/set without indexed variable access. status must be exactly ok, checked character by character with for-of and Map get/set without indexed variable access. Any wrong type, length, character, structure, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid server info envelope."}} with no partial result. Otherwise it returns {ok:true,info} where info is a new object with version, mode and status as new string copies built by concatenation. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "mode": "local",
    "status": "ok",
    "version": "1.0.0"
  },
  "output": {
    "info": {
      "mode": "local",
      "status": "ok",
      "version": "1.0.0"
    },
    "ok": true
  }
}
```

```json
{
  "input": {
    "mode": "local",
    "status": "ok",
    "version": "v!"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid server info envelope."
    },
    "ok": false
  }
}
```

```json
{
  "input": {
    "mode": "prod",
    "status": "ok",
    "version": "1.0.0"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid server info envelope."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_server_info_envelope_audit.test.js`.


<!-- community-core:agenda-totals-audit -->
### Audit synthetic agenda totals offline

Helps local synthetic scheduling study by totalling a fictional agenda list offline without server or storage. It supports the documented cancelled-frees versus completed-holds rule, complements UTC free-slot enumeration, appointment conflict checks, catalog, status, window, day-filter, reschedule, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory, year-bounds, icalendar-export, IANA-day, creation-instant, storage-snapshot and error-envelope audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/agenda_totals_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key appointments, exactly one entry. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. appointments must be an array of 0..200 entries. Each entry must be a plain object with only keys practitionerId, status and durationMinutes, exactly three entries. Null, array or non-object entry is invalid. Extra or missing keys make payload invalid. practitionerId must be string length 6..64 starting with demo-, containing only ASCII letters, digits, hyphen and underscore, checked character by character with for-of and Map get/set without indexed variable access. status must be exactly scheduled, completed or cancelled, checked character by character with for-of and Map get/set without indexed variable access. durationMinutes must be a number that is a safe integer 15 to 120 multiple of 15 with no type coercion. Any wrong type, length, prefix, character, range, grid, structure, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid agenda totals request."}} with no partial result. Otherwise it returns {ok:true,total,scheduled,completed,cancelled,occupiedMinutes} where total equals appointments length and scheduled/completed/cancelled count entries by status and occupiedMinutes is the sum of durationMinutes for scheduled plus completed entries only, with cancelled freeing the interval. Empty array yields all zeros. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "appointments": [
      {
        "durationMinutes": 30,
        "practitionerId": "demo-cardio",
        "status": "scheduled"
      },
      {
        "durationMinutes": 15,
        "practitionerId": "demo-cardio",
        "status": "completed"
      },
      {
        "durationMinutes": 30,
        "practitionerId": "demo-geral",
        "status": "cancelled"
      }
    ]
  },
  "output": {
    "cancelled": 1,
    "completed": 1,
    "occupiedMinutes": 45,
    "ok": true,
    "scheduled": 1,
    "total": 3
  }
}
```

```json
{
  "input": {
    "appointments": []
  },
  "output": {
    "cancelled": 0,
    "completed": 0,
    "occupiedMinutes": 0,
    "ok": true,
    "scheduled": 0,
    "total": 0
  }
}
```

```json
{
  "input": {
    "appointments": [
      {
        "durationMinutes": 20,
        "practitionerId": "demo-cardio",
        "status": "scheduled"
      }
    ]
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid agenda totals request."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_agenda_totals_audit.test.js`.


<!-- community-core:appointment-transition-gate-audit -->
### Audit synthetic appointment status transition offline

Helps local synthetic scheduling study by gating fictional appointment status moves offline without server or storage. It encodes the documented only-scheduled-may-complete-or-cancel rule, complements UTC free-slot enumeration, appointment conflict checks, catalog, status value, window, day-filter, reschedule identity/request, capacity, deletion, duration, patient-reference, start-grid, identifier, query-gate, body-gate, host-gate, ordered-agenda, openapi-inventory, year-bounds, error-envelope, icalendar-export, IANA-day, creation-instant, storage-snapshot, agenda-totals and server-info audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/appointment_transition_gate_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys from and to, exactly two entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. from must be exactly scheduled, completed or cancelled, checked character by character with for-of and Map get/set without indexed variable access. to must be exactly completed or cancelled, checked character by character with for-of and Map get/set without indexed variable access. Any wrong type, structure, extra key, missing key or value makes payload invalid. On any invalid payload it returns {ok:false,error:{code:"validation_error",message:"invalid status transition request."}} with no partial result. Otherwise it returns {ok:true,allowed,from,to} where allowed is true only when from is scheduled, otherwise false, and from/to are new string copies built by concatenation, reflecting the documented rule that only scheduled appointments may move to completed/cancelled. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "from": "scheduled",
    "to": "completed"
  },
  "output": {
    "allowed": true,
    "from": "scheduled",
    "ok": true,
    "to": "completed"
  }
}
```

```json
{
  "input": {
    "from": "scheduled",
    "to": "cancelled"
  },
  "output": {
    "allowed": true,
    "from": "scheduled",
    "ok": true,
    "to": "cancelled"
  }
}
```

```json
{
  "input": {
    "from": "completed",
    "to": "cancelled"
  },
  "output": {
    "allowed": false,
    "from": "completed",
    "ok": true,
    "to": "cancelled"
  }
}
```

```json
{
  "input": {
    "from": "scheduled",
    "to": "scheduled"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid status transition request."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_transition_gate_audit.test.js`.


<!-- community-core:loopback-bind-audit -->
### Audit synthetic loopback bind config offline

Helps local synthetic scheduling study by validating fictional server bind config offline without server or storage. It enforces the documented loopback-only '127.0.0.1' rule with configurable port, complements host-origin gate, server-info, health, openapi-inventory and storage-snapshot audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/loopback_bind_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys host and port, exactly two entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. host must be string length 1..253 containing only ASCII letters, digits, dot and hyphen, without leading/trailing space, TAB, LF or CR and without other C0 controls, checked character by character with for-of and Map get/set without indexed variable access. port must be a number that is a safe integer 1..65535 with no type coercion. Any wrong type, length, character, range, structure, extra key or missing key makes payload invalid. On any invalid payload it returns {ok:false,error:{code:'validation_error',message:'invalid loopback bind config.'}} with no partial result. Otherwise it returns {ok:true,safe,host,port} where safe is true only when host is exactly '127.0.0.1' checked character by character, otherwise false, host is a new string copy built by concatenation and port is the same number, reflecting the documented rule that the demo server listens exclusively on '127.0.0.1' with default port 3334 and must not be exposed via proxy or tunnel. It never mutates input. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype/constructor access. Preserve input.

Examples (JSON input and expected output):

```json
{
  "input": {
    "host": "127.0.0.1",
    "port": 3334
  },
  "output": {
    "host": "127.0.0.1",
    "ok": true,
    "port": 3334,
    "safe": true
  }
}
```

```json
{
  "input": {
    "host": "0.0.0.0",
    "port": 3334
  },
  "output": {
    "host": "0.0.0.0",
    "ok": true,
    "port": 3334,
    "safe": false
  }
}
```

```json
{
  "input": {
    "host": "0.0.0.0",
    "port": 99999
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid loopback bind config."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_loopback_bind_audit.test.js`.


<!-- community-core:appointment-catalog-membership-audit -->
### Audit appointment catalog membership offline

Helps local synthetic scheduling study by checking fictional practitioner membership offline without server or storage. It encodes the documented demo- catalog reference and practitioner_not_found rule for clear learning material, complements UTC free-slot enumeration, conflict checks, catalog validation, draft, identifier and ordered agenda audits without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Application integration is outside this change.

Reusable deterministic JSON core: `src/community/appointment_catalog_membership_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys catalog and practitionerId, exactly two entries. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. catalog must be an array of 1..50 entries. Each entry must be a string length 6..64 starting with demo-, containing only ASCII letters, digits, hyphen and underscore, checked character by character with for-of and Map get/set without callbacks. practitionerId must be a string length 6..64 starting with demo-, containing only ASCII letters, digits, hyphen and underscore, checked character by character with for-of. Duplicate catalog ids by exact character-by-character comparison via Map, wrong types, or any id rule violation makes payload invalid. On any invalid payload it returns {ok:false,error:{code:validation_error,message:invalid catalog membership check.}} with no partial result. Otherwise it returns {ok:true,member,count} where member is true when practitionerId exactly equals one catalog entry and false otherwise, and count equals catalog length, preserving input without mutation. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input without reassignment of function or builtin identifiers and without mutating input properties.

Examples (JSON input and expected output):

```json
{
  "input": {
    "catalog": [
      "demo-cardio",
      "demo-clinica-geral"
    ],
    "practitionerId": "demo-cardio"
  },
  "output": {
    "count": 2,
    "member": true,
    "ok": true
  }
}
```

```json
{
  "input": {
    "catalog": [
      "demo-cardio",
      "demo-clinica-geral"
    ],
    "practitionerId": "demo-dieta"
  },
  "output": {
    "count": 2,
    "member": false,
    "ok": true
  }
}
```

```json
{
  "input": {
    "catalog": [
      "prod-cardio"
    ],
    "practitionerId": "prod-cardio"
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid catalog membership check."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_catalog_membership_audit.test.js`.


<!-- community-core:server-lock-gate-audit -->
### Validate synthetic local server lock contention offline

Helps local synthetic scheduling study by validating fictional exclusive single-instance lock contention offline without server or storage. It supports the README single instance per DATA_DIR rule with PID check in .server.lock, complements storage snapshot and loopback bind checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Synthetic data only with no medical authority.

Reusable deterministic JSON core: `src/community/server_lock_gate_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys currentPid and requestPid. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. currentPid and requestPid must each be a finite safe number integer exactly in range 1..2147483647 with no fraction, NaN, Infinity, zero, negative or over-max allowed, checked without Date and without callbacks. Wrong types, non-integers or out-of-range make payload invalid. This check validates only synthetic exclusive single-instance lock contention for one local data folder; it does not check practitioner catalog, patientRef, duration grid, start grid, UTC year bounds, ordering, filtering, overlap, OpenAPI structure, server binding, storage snapshot content or body limits, leaving those to specialized checks. On any invalid payload it returns {ok:false,error:{code:validation_error,message:invalid server lock.}} with no partial data. Otherwise it compares the two pids with strict equality without callbacks: equal pids mean same holder may retain the folder, different pids mean another holder blocks start. It returns {ok:true,canStart,currentPid,requestPid} where canStart is true when equal and false otherwise, with canonical sorted keys, preserving input without mutation. Ordering is canonical sorted. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access except literal nonnegative indices. No reassignment of function or builtin identifiers, no property assignment or update or delete and no Object assign or create. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input without mutating input properties. This module is independently tested; application and UI integration is outside this change. Synthetic data only with no medical authority.

Examples (JSON input and expected output):

```json
{
  "input": {
    "currentPid": 1234,
    "requestPid": 1234
  },
  "output": {
    "canStart": true,
    "currentPid": 1234,
    "ok": true,
    "requestPid": 1234
  }
}
```

```json
{
  "input": {
    "currentPid": 1234,
    "requestPid": 5678
  },
  "output": {
    "canStart": false,
    "currentPid": 1234,
    "ok": true,
    "requestPid": 5678
  }
}
```

```json
{
  "input": {
    "currentPid": 0,
    "requestPid": 1234
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid server lock."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_server_lock_gate_audit.test.js`.


<!-- community-core:error-status-mapping-audit -->
### Validate synthetic error code to HTTP status mapping offline

Helps local synthetic scheduling study by validating fictional error code to HTTP status pairing offline without server or storage. It clarifies the documented 400/404/409/413/415 mapping, complements envelope-shape and host/body gate checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Synthetic data only with no medical authority.

Reusable deterministic JSON core: `src/community/error_status_mapping_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys code and status. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. code must be a string exactly one of validation_error, practitioner_not_found, appointment_not_found, schedule_conflict, invalid_transition, body_too_large, json_required, checked with for-of and Map get and set without callbacks. status must be a finite safe integer exactly one of 400, 404, 409, 413, 415 with no fraction. Wrong types or unknown values make payload invalid. This check validates only synthetic code to status pairing for seven documented pairs validation_error to 400, practitioner_not_found to 404, appointment_not_found to 404, schedule_conflict to 409, invalid_transition to 409, body_too_large to 413, json_required to 415. It does not check message text, envelope shape, practitioner catalog, patientRef, duration grid, start grid, year bounds, ordering, filtering, overlap, OpenAPI structure, server binding or storage, leaving those to specialized checks. Pairing is resolved with Map get and set without callbacks and mismatched code and status makes payload invalid. On any invalid payload it returns ok false with error code validation_error and message invalid error status mapping. with no partial data. Otherwise it returns ok true with code and status with canonical sorted keys, preserving input without mutation. Ordering is canonical sorted. It builds results with object literals, arrays with push and Map get and set, using for-of and Object entries without indexed variable access except literal nonnegative indices. No reassignment of function or builtin identifiers, no property assignment or update or delete and no Object assign or create. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input without mutating input properties. This module is independently tested, application and UI integration is outside this change. Synthetic data only with no medical authority.

Examples (JSON input and expected output):

```json
{
  "input": {
    "code": "schedule_conflict",
    "status": 409
  },
  "output": {
    "code": "schedule_conflict",
    "ok": true,
    "status": 409
  }
}
```

```json
{
  "input": {
    "code": "validation_error",
    "status": 400
  },
  "output": {
    "code": "validation_error",
    "ok": true,
    "status": 400
  }
}
```

```json
{
  "input": {
    "code": "schedule_conflict",
    "status": 400
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid error status mapping."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_error_status_mapping_audit.test.js`.


<!-- community-core:appointment-success-envelope-audit -->
### Validate synthetic appointment success envelope offline

Helps local synthetic scheduling study by validating fictional appointment success envelopes offline without server or storage. It clarifies the documented 201 data.id chaining contract versus error envelopes, complements envelope-shape and identifier checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Synthetic data only with no medical authority.

Reusable deterministic JSON core: `src/community/appointment_success_envelope_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only key data. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. data must be a plain object; null, array or non-object data is invalid. data must contain required key id checked with for-of and Object.entries and Map get and set without callbacks. id must be a string length 1..128 with no LF, CR or TAB and no leading or trailing ASCII space. Empty, overlong, wrong-type or missing id makes payload invalid. Other keys inside data are allowed without validation to avoid duplicating appointment semantics. This check validates only synthetic success-envelope shape for data.id chaining; it does not check error envelope shape, error code to status pairing, strict identifier pattern, practitioner catalog, patientRef, duration grid, start grid, year bounds, ordering, filtering, overlap, OpenAPI structure, server binding or storage, leaving those to specialized checks. On any invalid payload it returns ok false with error code validation_error and message invalid success envelope. with no partial data. Otherwise it returns ok true with id with canonical sorted keys, preserving input without mutation. Ordering is canonical sorted. It builds results with object literals, arrays with push and Map get and set, using for-of and Object entries without indexed variable access except literal nonnegative indices. No reassignment of function or builtin identifiers, no property assignment or update or delete and no Object assign or create. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input without mutating input properties. This module is independently tested, application and UI integration is outside this change. Synthetic data only with no medical authority.

Examples (JSON input and expected output):

```json
{
  "input": {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "output": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ok": true
  }
}
```

```json
{
  "input": {
    "data": {
      "extra": 12,
      "id": "synthetic_001",
      "status": "scheduled"
    }
  },
  "output": {
    "id": "synthetic_001",
    "ok": true
  }
}
```

```json
{
  "input": {
    "data": {}
  },
  "output": {
    "error": {
      "code": "validation_error",
      "message": "invalid success envelope."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_success_envelope_audit.test.js`.


<!-- community-core:appointment-end-instant-audit -->
### Validate synthetic appointment end instant offline

Helps local synthetic scheduling study by computing fictional appointment end instant offline without server or storage. It supports src/appointments.js interval end logic and UTC free-slot enumeration for a caller-filtered professional, complements start grid, duration grid, UTC year bounds, window validation and single-pair conflict checks without duplicating them, and gives demos and tests a deterministic pure JSON core with no network or persistence. Synthetic data only with no medical authority.

Reusable deterministic JSON core: `src/community/appointment_end_instant_audit.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

runFeature(payload) is a pure deterministic synchronous JSON-to-JSON function with no IO, env, clock, randomness, callbacks, or dependencies and no Date use. It is a pure ES module exporting function runFeature(payload) without imports, classes, async, this, reflection, or mutable module variables. Input payload must be a plain object with only keys startsAt and durationMinutes. Null, array or non-object payload is invalid. Extra or missing keys make payload invalid. startsAt must be a string length 24 of exact form YYYY-MM-DDTHH:MM:SS.sssZ with literal separators, checked character by character with for-of and Map get/set without callbacks. Year 0000 to 9999, month 01 to 12, day valid for month including leap year divisible by 400 or by 4 except 100 including year 0000 as leap, hour 00 to 23, minute exactly 00 or 15 or 30 or 45, second 00 and millisecond 000. durationMinutes must be a finite safe integer 15 to 120 step 15 with no fraction. Wrong types or out-of-range values make payload invalid. This check computes only the synthetic appointment end instant for offline study; it does not check practitioner catalog, patientRef, ordering, filtering, overlap messaging, reschedule identity, status transitions, OpenAPI structure, server binding, storage snapshot or body limits, leaving those to specialized checks. Manual calendar arithmetic without Date adds durationMinutes to startsAt across minute, hour, day, month and year with leap handling; any end that overflows year beyond 9999 makes payload invalid. On any invalid payload it returns {ok:false,error:{code:validation_error,message:invalid appointment interval.}} with no partial data. Otherwise it returns {ok:true,startsAt,durationMinutes,endsAt} with canonical sorted keys, where endsAt is a new UTC grid string length 24 in the same exact form, preserving input without mutation. Ordering is canonical sorted. It builds results with object literals, arrays with push and Map get/set, using for-of and Object.entries without indexed variable access except literal nonnegative indices. No reassignment of function or builtin identifiers, no property assignment or update or delete and no Object assign or create. Builtins are not aliased or passed as callbacks and computed access uses only literal nonnegative indices. No prototype or constructor access. Preserve input without mutating input properties. This module is independently tested; application and UI integration is outside this change. Synthetic data only with no medical authority.

Examples (JSON input and expected output):

```json
{
  "input": {
    "durationMinutes": 30,
    "startsAt": "2030-04-08T12:00:00.000Z"
  },
  "output": {
    "durationMinutes": 30,
    "endsAt": "2030-04-08T12:30:00.000Z",
    "ok": true,
    "startsAt": "2030-04-08T12:00:00.000Z"
  }
}
```

```json
{
  "input": {
    "durationMinutes": 30,
    "startsAt": "2030-01-31T23:45:00.000Z"
  },
  "output": {
    "durationMinutes": 30,
    "endsAt": "2030-02-01T00:15:00.000Z",
    "ok": true,
    "startsAt": "2030-01-31T23:45:00.000Z"
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
      "message": "invalid appointment interval."
    },
    "ok": false
  }
}
```

Public regression tests: `test/community_appointment_end_instant_audit.test.js`.
