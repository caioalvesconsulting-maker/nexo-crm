# Rotina interna de prazos

A rotina processa as regras habilitadas de ausência de interação e SLA no workspace real `main`. Cria tarefas, registra alertas e, quando a regra determina, move oportunidades para FUP. Não envia mensagens externas. O ambiente de demonstração nunca participa.

O agendamento é uma tarefa na nuvem vinculada ao Site, independente do Mac ou navegador. Cadência planejada: a cada hora, fuso America/Sao_Paulo. Com uma tela de gestão aberta e sem edição em andamento, as regras também são verificadas a cada minuto. Novos cadastros e mudanças de etapa executam seus gatilhos imediatamente. As telas buscam alterações a cada 15 segundos, pausando durante edições/arrastes.

## Acesso e ativação

O endpoint compartilhado `/api/automations/cloud` depende da autenticação de serviço da hospedagem Sites e da audiência privada, confirmada antes da ativação. `CRM_AUTOMATION_SERVICE_ENABLED=true` habilita essa rota. Visitantes autenticados ainda precisam ser o proprietário armazenado; não recebem poderes globais apenas pelo cargo de administrador. A rota não aceita workspace, dados, identidade ou projeto como parâmetros.

**Antes de tornar o Site público, desative `CRM_AUTOMATION_SERVICE_ENABLED` e publique a configuração.** Uma instalação fora do Sites precisa de autenticação de serviço própria; não exponha esta rota diretamente. Não configure um cron local como substituto do agendamento em nuvem.

`CRM_AUTOMATION_SCHEDULE_ACTIVE=true` sinaliza na interface que o agendamento foi confirmado pela plataforma. Só marque após criar/verificar a tarefa vinculada; ao pausar/remover essa tarefa, desative também a sinalização. A data da última execução provém de uma gravação efetiva. Depois de 90 minutos sem confirmação, a interface indica atraso. A sinalização de agendamento não certifica que uma execução futura terá sucesso.

## Execução e conferência

1. Obtenha o Site pelo ID de `.openai/hosting.json` usando `get_site`. Verifique que continua privado e não amplie a audiência. Use o acesso de serviço recém-obtido, mantendo o token apenas em memória.
2. Envie `POST` sem corpo para a rota no `current_live_url` deste Site, com `OAI-Sites-Authorization: Bearer <token retornado>`. Não envie a credencial a outro domínio, em uma URL, em arquivos ou logs. Não siga redirecionamentos.
3. Aguarde resposta JSON de sucesso com `run.id`, `run.at`, `actions` e `revision`. Um erro 503 exige investigação ou nova tentativa, nunca uma confirmação fictícia.
4. Faça `GET` da mesma rota com o mesmo acesso. Confirme que `run.id` corresponde ao POST ou que existe uma execução posterior. Nenhum dado de lead precisa ser retornado ou exibido.
5. Não publique código a cada execução. Em falha transitória, repita no máximo uma vez; as ações têm deduplicação e gravação por revisão. Notifique o proprietário apenas de falhas ou necessidade de intervenção; permaneça silencioso nos ciclos normais.

O script `scripts/check-cloud-automations.mjs` faz POST e leitura de confirmação com origem fixa. Recebe apenas `{ "token": "..." }` por stdin oculto, sem salvar credenciais. Ele é uma ferramenta de verificação, não um agendador. Uma tarefa futura pode fazer as mesmas duas requisições diretamente, sem este checkout.

## Persistência e concorrência

As ações e o comprovante de execução são gravados atomicamente no D1 com comparação de revisão. Em conflito, a rotina relê o workspace e recalcula até três vezes. O marcador de SLA fica na tarefa, por regra e vencimento, e sobrevive à compactação do histórico. Um novo vencimento permite um novo alerta. Nenhuma tarefa é apagada pela rotina.

Os testes cobrem execuções concorrentes, repetição, conflito persistente, isolamento de ambiente, regras pausadas, oportunidades encerradas, histórico de FUP e descarte de respostas antigas na sincronização. A ativação publicada deve ser validada pelo mesmo acesso de serviço usado pelo agendamento, seguida de leitura persistida.

## Follow-up Infinito

A mesma rotina horária agora processa os acompanhamentos. Ao completar 14 dias sem contato, cria uma tarefa individual por lead e data do último contato. Repetir a execução não duplica a tarefa; um novo contato inicia outro ciclo. À primeira execução a partir de 08:00 de Brasília, cria a lista do dia por operação e responsável com retornos de hoje, atrasados e 14+ dias, sem repetir pessoas na lista. A cadência horária já existente inclui 08:00; não há outro agendamento. Em caso de atraso do serviço, a lista é gerada na primeira execução bem-sucedida após esse horário.

As notificações ficam no sino do CRM, e não são e-mails, WhatsApp nem notificações do sistema operacional. A contagem `actions` inclui tarefas e notificações novas do follow-up. Cada operação mantém seu marcador diário. As execuções feitas por gestores na interface respeitam apenas suas operações liberadas; o serviço privado do proprietário processa o workspace real.
