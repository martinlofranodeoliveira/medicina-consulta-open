# Próximos passos úteis

O foco atual é uma API de agendamento reproduzível, com dados sintéticos. Cada item deve virar uma alteração completa com testes e documentação; a lista não é uma meta de quantidade de commits.

- [ ] Especificação OpenAPI compatível com os exemplos e testes de contrato.
- [ ] Cadastro configurável de profissionais fictícios, validado e separado dos agendamentos.
- [ ] Intervalos de disponibilidade e bloqueios de agenda, com testes de conflito.
- [ ] Filtro por dia no fuso IANA solicitado, inclusive em mudanças de horário de verão.
- [ ] Reagendamento atômico que preserve o horário anterior quando houver conflito.
- [ ] Exportação de eventos iCalendar sem dados identificáveis.
- [ ] Interface acessível para operar a agenda de demonstração.
- [ ] Avaliar SQLite e migrações para substituir o armazenamento JSON.

Antes de qualquer uso com dados reais: autenticação e autorização, isolamento entre organizações, auditoria, consentimento e retenção, proteção criptográfica, backup e restauração testados, revisão de privacidade e segurança. Esses recursos não estão implementados nesta versão.
