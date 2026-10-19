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
- Não há agenda de disponibilidade, horários de expediente, feriados, lembretes ou cobrança. Agendamentos em datas passadas são aceitos para facilitar exemplos.

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
