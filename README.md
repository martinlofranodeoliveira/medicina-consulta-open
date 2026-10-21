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
