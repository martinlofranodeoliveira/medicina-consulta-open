# Segurança e privacidade

Este é um protótipo **local e com dados sintéticos**. Não armazene informações pessoais ou de saúde e não o publique na internet. Ele não oferece autenticação, autorização, prontuário, trilha de auditoria, criptografia de armazenamento ou isolamento entre usuários.

A API liga apenas em `127.0.0.1`, valida `Host` e `Origin`, recusa requisições cross-site, limita os corpos JSON e não inclui detalhes internos nos erros HTTP. Essas medidas não protegem contra outros programas executados na mesma conta do computador e não tornam o protótipo adequado para uma clínica real.

Não publique valores de credenciais, dados de pacientes ou dumps de banco em issues ou pull requests. Ao relatar um problema, descreva o comportamento com um exemplo sintético. Credenciais eventualmente expostas em versões antigas precisam ser revogadas no serviço emissor; remover o arquivo de uma edição nova não revoga nem apaga o histórico anterior.
