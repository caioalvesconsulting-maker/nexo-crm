# Nexo CRM

CRM em português do Brasil, com tema escuro/claro, pipeline arrastável e registros persistentes em Cloudflare D1. Arquivos ficam no R2; preferências de tema e ambiente ficam apenas no navegador.

## O que funciona

- Dashboard calculado por período, projeto, responsável, origem, SDR e closer; receita, recebimentos, taxas, caixa líquido e gráficos.
- Kanban com Leads em conversa, Marcando call, Call agendada, FUP, WIN e LOSS. Regras de transição validadas no servidor.
- Contatos e oportunidades separados; detecção de duplicidade, notas, etiquetas, campos personalizados, arquivos e histórico.
- Agenda interna com validação de conflitos/expediente, cancelamento, conclusão e exportação de eventos `.ics`.
- Tarefas com prazo, prioridade, responsável, conclusão e alertas.
- Financeiro em centavos, desconto, parcelas de cartão, taxas congeladas por venda, pagamentos parciais e estorno integral registrado.
- Administração de taxas por plataforma, forma de pagamento e número de parcelas, com simulação do valor líquido.
- Equipe e autorização no servidor; permissão de financeiro, exportação e acesso a leads.
- Automações imediatas ao cadastrar/mover um lead; verificação de prazos e SLAs quando o CRM é aberto e a cada minuto enquanto a aba está visível.
- Recepção de eventos normalizados com assinatura HMAC e deduplicação; mensagens entram no histórico e novos contatos vão para Leads em conversa.
- Ambiente demonstrativo por usuário e workspace real separado. Dados de exemplo não contaminam a operação real.

## Ativação externa pendente

Instagram, WhatsApp, TikTok, e-mail e Google Agenda não estão conectados. Os formulários de Integrações guardam somente a identificação da conta e observações. A interface declara o estado pendente e impede envio real. O teste de conversa é local ao ambiente demonstrativo; na operação real, é possível salvar rascunhos e notas.

Para receber eventos reais, configure um adaptador oficial do provedor que valide a assinatura original, normalize o evento e envie à rota `POST /api/integrations/events`. O corpo é JSON:

```json
{
  "eventId": "identificador-unico-do-evento",
  "channel": "Instagram",
  "externalContactId": "id-do-contato-no-provedor",
  "name": "Nome do contato",
  "instagram": "perfil",
  "message": "Olá! Quero saber mais."
}
```

Canais aceitos: Instagram, WhatsApp, E-mail, TikTok e Site. Campos opcionais: name, phone, email, instagram e project. O adaptador assina os bytes exatos do JSON com HMAC-SHA256 usando `CRM_EVENT_SECRET` e envia o hexadecimal no cabeçalho `x-nexo-signature`. O segredo deve ser configurado como segredo de ambiente no Sites, nunca no frontend, repositório ou campo de observações. Sem segredo, a rota responde 503.

O site permanece privado. Além da assinatura do CRM, um adaptador externo precisa de acesso de serviço autorizado pela plataforma de hospedagem; um webhook comum de provedor não atravessa a autenticação privada sozinho. A ativação de adaptadores, autorização das contas, envio externo, sincronização de calendário e agendamento independente do navegador permanecem pendentes. Não foi realizada nenhuma mensagem ou cobrança real.

O financeiro registra vendas e recebimentos; não emite boletos, QR Codes de Pix nem realiza cobrança ou estorno externo. Os percentuais são definidos pelo administrador e podem ser editados livremente. WIN não significa recebido. O estorno atual é integral e preserva o histórico; estorno parcial ainda não é suportado.

## Desenvolvimento

Requer Node.js >=22.13.0. Use o instalador e o builder da skill Sites para manter o perfil portátil configurado. O starter preserva sua integração Vinext/Cloudflare/Sites.

```sh
npm run dev -- --hostname 127.0.0.1
npm run typecheck
npm test
```

O preview usa `http://127.0.0.1:5173`. A autenticação local simulada é acessada pelo botão Entrar no meu CRM; ela não faz parte da produção. A autenticação publicada é da plataforma Sites. Novos visitantes só têm acesso se o site for compartilhado e o e-mail constar como membro ativo da equipe.

Após gerar migrations com `npm run db:generate` e construir uma vez, aplique apenas as migrations pendentes ao banco local:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_brief_reptil.sql
```

Com o preview ativo, `npm run test:http` verifica identidade, origem, persistência, conflito de revisão e upload/download de anexos no ambiente demonstrativo local. O teste não altera o workspace real.

## Modelo e limites

`lib/crm.ts` define os tipos e os exemplos; `lib/commands.ts` aplica regras e permissões; `lib/inbound.ts` recebe eventos normalizados; `lib/server.ts` controla autenticação e persistência; `components/crm.tsx` contém as telas.

Cada workspace é armazenado como um documento versionado em D1. Atualizações usam comparação atômica de revisão para evitar perda de dados simultâneos. O limite configurado é 5.000 oportunidades e aproximadamente 4,5 MB por workspace. Essa estrutura é adequada para o início da operação; grandes volumes exigem migração para tabelas normalizadas, paginação e processamento de mensagens independente. O histórico de auditoria mantém as últimas 500 ações e cada oportunidade, as últimas 200 atividades.

Arquivos de até 10 MB são armazenados no R2, com acesso autenticado e download forçado. O frontend não recebe segredos. Exportações CSV neutralizam fórmulas. Conflitos de edição retornam 409 e pedem revisão da ação.

## Verificações realizadas

- Compilação TypeScript e build de produção.
- 12 testes de regras: cadastro, deduplicação de contatos, perda/follow-up, conflito de agenda, taxas históricas, pagamentos parciais, reabertura, permissões, envio bloqueado, automações idempotentes e entrada de mensagens.
- Testes HTTP locais: autenticação, origem, persistência, concorrência, R2 e integração inativa.
- Teste visual no navegador: cadastro, arrastar card, venda ganha e recebimento parcial.
