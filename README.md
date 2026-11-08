# Nexo CRM

CRM em português do Brasil, com tema escuro/claro, pipeline arrastável e registros persistentes em Cloudflare D1. Arquivos ficam no R2; preferências de tema e ambiente ficam apenas no navegador.

## Baixar e rodar no computador

No GitHub, use **Code → Download ZIP**, extraia a pasta e abra um terminal nela. Também é possível clonar o repositório com Git. É necessário Node.js 22.13 ou superior, com npm.

Na primeira instalação:

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_brief_reptil.sql
npm run dev -- --hostname 127.0.0.1
```

Abra `http://127.0.0.1:5173` e use **Entrar no meu CRM**. O login local é simulado para desenvolvimento. O comando SQL acima inicializa um banco local vazio; não o repita em um banco já inicializado. Nas próximas vezes, basta executar `npm run dev -- --hostname 127.0.0.1`.

O download contém código, testes, configuração e exemplos fictícios. Não inclui os registros do CRM publicado, anexos de clientes, credenciais ou dependências instaladas. Os dados criados localmente ficam em `.wrangler/`, fora do Git. Para verificar o código, execute `npm run typecheck` e `npm test`.

Este projeto foi preparado para a hospedagem Sites com Cloudflare D1/R2. Hospedar em outro serviço exige configurar banco, armazenamento e autenticação confiável no servidor. O login de produção depende dos cabeçalhos autenticados fornecidos pela hospedagem; eles não devem ser aceitos diretamente de visitantes em uma instalação independente. A publicação no GitHub não conecta automaticamente Instagram, WhatsApp ou os demais serviços.

## O que funciona

- Dashboard calculado por período, projeto, responsável, origem, SDR e closer; receita, recebimentos, taxas, caixa líquido e gráficos.
- Kanban com Leads em conversa, Marcando call, Call agendada, FUP, WIN e LOSS. Regras de transição validadas no servidor.
- Contatos e oportunidades separados; detecção de duplicidade, notas, etiquetas, campos personalizados, arquivos e histórico.
- Agenda interna com validação de conflitos/expediente, cancelamento, conclusão e exportação de eventos `.ics`.
- Tarefas com prazo, prioridade, responsável, conclusão e alertas.
- Financeiro em centavos, desconto, parcelas de cartão, taxas congeladas por venda, pagamentos parciais e estorno integral registrado.
- Administração de taxas por plataforma, forma de pagamento e número de parcelas, com simulação do valor líquido.
- Múltiplas operações com isolamento no servidor. Apenas o proprietário tem acesso global; os demais membros recebem concessões explícitas por operação, independentemente do cargo.
- Equipe com permissão de financeiro, exportação e acesso aos leads da operação; novos projetos começam privados para o proprietário.
- Origens separadas dos canais: YouTube, story com isca para página de vendas, story com formulário, networking, tráfego pago e entrada direta. Descrições de entrada, qualificação e próximo passo editáveis, além de um guia das seis etapas comerciais.
- Testes A/B de SDR e closer, com sorteio 50/50 por lead elegível, versão estável, público por origem, pausa e métricas por lead. Atribuições manuais ficam fora da comparação aleatória; intervalos de Wilson mostram a incerteza.
- Registro de abordagem/pitch, resultado, motivo e objeções. SDR informa ação de consciência, material e avaliação antes/depois. Concluir uma call exige registro de closer.
- Automações imediatas ao cadastrar/mover um lead; verificação de prazos e SLAs ao abrir, a cada minuto enquanto a aba está visível e por rotina horária na nuvem quando ativada. A aba Automações mostra a última confirmação.
- Sincronização da equipe a cada 15 segundos, com pausa durante formulários e arrastes; respostas antigas não sobrescrevem salvamentos ou trocas de ambiente.
- Recepção de eventos normalizados com assinatura HMAC e deduplicação; mensagens entram no histórico e novos contatos vão para Leads em conversa.
- Ambiente demonstrativo por usuário e workspace real separado. Dados de exemplo não contaminam a operação real.

## Ativação externa pendente

O Instagram possui agora um adaptador de recebimento oficial com verificação da assinatura Meta, prevenção de duplicidade, roteamento por conta/operação e painel de status. **Ainda não está conectado**: faltam a autorização da conta, configuração do aplicativo Meta, segredos e publicação do gateway HTTPS separado. Consulte [ativação do Instagram](docs/instagram-activation.md). O envio de mensagens continua desativado. Nenhum segredo de produção foi configurado nesta preparação.

Instagram, WhatsApp, TikTok, e-mail e Google Agenda não estão conectados. Os formulários de Integrações guardam somente a identificação da conta e observações. A interface declara o estado pendente e impede envio real. O teste de conversa é local ao ambiente demonstrativo; na operação real, é possível salvar rascunhos e notas.

Para receber eventos reais, configure um adaptador oficial do provedor que valide a assinatura original, normalize o evento e envie à rota `POST /api/integrations/events`. O corpo é JSON:

```json
{
  "eventId": "identificador-unico-do-evento",
  "channel": "Instagram",
  "externalContactId": "id-do-contato-no-provedor",
  "name": "Nome do contato",
  "instagram": "perfil",
  "message": "Olá! Quero saber mais.",
  "project": "Nome da operação"
}
```

Canais aceitos: Instagram, WhatsApp, E-mail, TikTok e Site. Campos opcionais: name, phone, email, instagram e funnelId. project é obrigatório quando há mais de uma operação. Eventos e contatos são deduplicados dentro da operação, nunca entre operações. O adaptador assina os bytes exatos do JSON com HMAC-SHA256 usando `CRM_EVENT_SECRET` e envia o hexadecimal no cabeçalho `x-nexo-signature`. O segredo deve ser configurado como segredo de ambiente no Sites, nunca no frontend, repositório ou campo de observações. Sem segredo, a rota responde 503.

O site permanece privado. Além da assinatura do CRM, um adaptador externo precisa de acesso de serviço autorizado pela plataforma de hospedagem; um webhook comum de provedor não atravessa a autenticação privada sozinho. A ativação de adaptadores, autorização das contas, envio externo, sincronização de calendário permanecem pendentes. A rotina interna independente do navegador está descrita em [Automações na nuvem](docs/cloud-automations.md). Não foi realizada nenhuma mensagem ou cobrança real.

O financeiro registra vendas e recebimentos; não emite boletos, QR Codes de Pix nem realiza cobrança ou estorno externo. Os percentuais são definidos pelo proprietário e podem ser editados livremente. WIN não significa recebido. O estorno atual é integral e preserva o histórico; estorno parcial ainda não é suportado.

## Desenvolvimento

Requer Node.js >=22.13.0. Use o instalador e o builder da skill Sites para manter o perfil portátil configurado. O starter preserva sua integração Vinext/Cloudflare/Sites.

```sh
npm run dev -- --hostname 127.0.0.1
npm run typecheck
npm test
```

O preview usa `http://127.0.0.1:5173`. A autenticação local simulada é acessada pelo botão Entrar no meu CRM; ela não faz parte da produção. A autenticação publicada é da plataforma Sites. Novos visitantes só têm acesso se o site for compartilhado e o e-mail constar como membro ativo da equipe. Antes de compartilhar, o proprietário deve entrar no workspace real e cadastrar a equipe com as operações liberadas. O dono é identificado pelo ID autenticado, não pelo nome do cargo. Uma concessão de editor na hospedagem autoriza alteração do código; colegas comerciais devem receber acesso de visitante, não de editor.

Após gerar migrations com `npm run db:generate` e construir uma vez, aplique apenas as migrations pendentes ao banco local:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_brief_reptil.sql
```

Com o preview ativo, `npm run test:http` verifica identidade, origem, persistência, conflito de revisão e upload/download de anexos no ambiente demonstrativo local. O teste não altera o workspace real.

## Modelo e limites

`lib/crm.ts` define os tipos e os exemplos; `lib/commands.ts` aplica regras e permissões; `lib/operations.ts` migra o modelo, define funis e calcula A/B; `lib/inbound.ts` recebe eventos normalizados; `lib/server.ts` controla autenticação e persistência; `components/crm.tsx` contém as telas.

Cada workspace é armazenado como um documento versionado em D1. Atualizações usam comparação atômica de revisão para evitar perda de dados simultâneos. O limite configurado é 5.000 oportunidades e aproximadamente 4,5 MB por workspace. Essa estrutura é adequada para o início da operação; grandes volumes exigem migração para tabelas normalizadas, paginação e processamento de mensagens independente. O histórico de auditoria mantém as últimas 500 ações e cada oportunidade, as últimas 200 atividades.

Arquivos de até 10 MB são armazenados no R2, com acesso autenticado e download forçado. O frontend não recebe segredos. Exportações CSV neutralizam fórmulas. Conflitos de edição retornam 409 e pedem revisão da ação.

## Verificações realizadas

- Compilação TypeScript e build de produção.
- 38 testes de regras, incluindo isolamento por operação, migração de permissões, A/B, feedback e motivos de resultado, além de: cadastro, deduplicação de contatos, perda/follow-up, conflito de agenda, taxas históricas, pagamentos parciais, reabertura, permissões, envio bloqueado, automações idempotentes, gráficos, métricas e assinatura/roteamento/deduplicação do adaptador Instagram.
- Testes HTTP locais: autenticação, origem, persistência, concorrência, R2 e integração inativa.
- Teste visual no navegador: cadastro, arrastar card, venda ganha, recebimento parcial, seleção de operação, criação de experimento, atribuição automática e registro de abordagem/consciência.
