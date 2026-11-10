# Success: fila um por um

Persistência no D1 do CRM, no campo `success` do workspace. Casos, ordem manual, provas, histórico, responsáveis, configurações e avisos são isolados por operação. Fotos e arquivos privados ficam no R2; não são acessíveis sem login e acesso à operação.

## Regras da fila

- Novos cases entram pela data do resultado; admin pode arrastar, mover pelas setas ou restaurar a ordem cronológica. Quem volta da espera tem prioridade sobre alunos ainda não iniciados.
- Uma única execução `active` por operação. Até três vagas ao todo: `active`, `waiting` e `ready`. Um quarto aluno não inicia. Retomar um case `ready` não consome uma nova vaga.
- Espera guarda nome, motivo e data. Só o responsável registra a prova para resolver a pendência. O case volta ao topo; se o cartão AGORA estiver livre, retoma imediatamente. Não interrompe outro aluno em execução.
- Ao concluir as oito etapas, o case vai para Concluídos. O próximo elegível inicia automaticamente se não houver outro case ativo. Se o responsável perdeu acesso ou está inativo, admin precisa reatribuir antes de iniciar.
- A execução e conclusão exigem a etapa atual; a API bloqueia saltos, repetição e provas de arquivo de outro case/etapa. O controle de revisão existente protege a concorrência entre pessoas.

## Provas e responsabilidade

As oito etapas pedem, respectivamente: resultado e evidência; aplicação e termo assinado com pessoa/data/conferência; horário e confirmação da call; gravação e plano de escala; vídeo final com duração declarada de até 120 segundos e aprovação conferida; evidência dos seis destinos; cinco indicações com contatos diferentes; comprovação da liberação do bônus. Rascunhos permitem progresso parcial sem destravar etapas. Links precisam ser HTTPS. Arquivos de até 10 MB são privados; para vídeos maiores use um link.

O CRM guarda a prova e a conferência humana: não assina documentos pelo aluno, não examina o conteúdo dos links externos, não mede automaticamente um vídeo hospedado em outro serviço e não publica/libera bônus em plataformas não conectadas. Os botões orientam a execução e exigem registrar sua confirmação.

Cada etapa tem um responsável explícito. Somente ele pode concluir ou colocar em espera, inclusive quando o visitante é o proprietário. Admin pode editar a atribuição, com histórico. Membros veem apenas operações liberadas. O perfil Editor está disponível na equipe. “Minha vez” apresenta uma etapa por vez para a pessoa, seguindo prioridade e ordem de liberação.

## Avisos e métricas

Ao iniciar ou destravar uma etapa, um aviso persistido aparece no sino do responsável. O CRM sincroniza a cada 15 segundos enquanto a tela está aberta. O WhatsApp abre apenas o rascunho da aplicação para a pessoa revisar e enviar; avisos automáticos externos não estão conectados. Não há novo agendamento em nuvem.

Indicadores: fila inclui alunos novos e retomadas; em andamento inclui execução e esperas; concluídos do mês usam Brasília; média vai do início à conclusão, em dias corridos; gargalo é a etapa aberta com maior soma de dias, desempatada por quantidade. Provas concluídas mantêm autor e data. Concluídos apresentam histórico e comemoração breve, respeitando redução de movimento.

## Verificação

Testes de domínio cobrem as transições, limite de três, prioridade de retorno, início automático do próximo, provas de todas as etapas, permissões, isolamento, rascunhos, avisos e métricas. Testes HTTP verificam persistência, upload/download privado, tipo da foto e rejeição de anexos forjados e saltos. QA visual inclui fila arrastável, estado AGORA, pendências, notificações e telas pequenas nos dois temas.
