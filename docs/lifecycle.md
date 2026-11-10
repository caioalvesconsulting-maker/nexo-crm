# Follow-up, treinamento e mapa

As três abas usam o workspace persistido no D1, com controle de revisão e isolamento por operação. Os novos registros ficam nas coleções `followups`, `learning`, `operationMaps`, `followupNotices` e `followupDaily` do JSON existente. Não foram criadas tabelas paralelas de leads nem dados de exemplo no workspace real. Tipos e campos estão em `lib/lifecycle.ts`; notas com autor e data ficam dentro de cada acompanhamento. Consciência é calculada a partir dos cinco indicadores, nunca aceita do cliente.

## Acesso

O proprietário mantém acesso a todas as operações. Administradores e gestores só veem operações liberadas. SDR, Closer e Suporte/CS veem somente seus próprios acompanhamentos; permissão genérica de ver leads não amplia esse acesso. Todos os membros autorizados veem os treinamentos publicados e o mapa da sua operação. Só o proprietário e administradores editam conteúdos/mapas; progresso e notas do quiz são individuais, com correção no servidor. Administradores acompanham o progresso das pessoas autorizadas. A alteração de aula ou PDF incrementa a versão, exigindo nova conclusão.

## Uso

- Follow-up: cadastro manual ou vínculo com oportunidade existente, três colunas, consciência, dias corridos de Brasília, notas, retorno, filtros e pizzas. Perdas antigas entram para completar os campos ausentes, sem estimar data ou objeção. Novas perdas pedem esses campos no formulário. “Comprou!” abre o registro financeiro existente e encerra o acompanhamento somente após a venda válida.
- Treinamento: trilhas SDR, Closer e Suporte/CS; módulos organizados dentro da trilha; texto, vídeo, PDF privado de até 10 MB e quiz opcional de 3–5 questões. Há conteúdo inicial editável, respostas por objeção, calls modelo e checklist de integração da equipe. Gravações devem ser adicionadas pelo administrador.
- Mapa: caixas e conexões em JSON por operação, com arraste, teclas de seta, zoom, edição, criação, remoção e gravação explícita. Conflitos com outra sessão impedem sobrescrita silenciosa. Números vêm do CRM e respeitam o acesso do visitante. Etapas sem integração exibem “Sem contagem conectada”; desenhar uma seta não ativa automações externas.

## Sugestão de mensagem

`POST /api/followup/suggest` exige login, mesma origem e acesso ao lead. Sem `OPENAI_API_KEY` e `OPENAI_MODEL`, retorna um modelo local explicitamente identificado como não conectado à IA. Nada é enviado ao lead.

Para ativar a geração real, conectar OpenAI Developers e seguir o fluxo aprovado de credenciais do Sites; definir a chave como segredo do servidor e escolher o modelo em `OPENAI_MODEL`. A implementação usa a [Responses API](https://developers.openai.com/api/docs/guides/text), com `store:false`, timeout e até 100 solicitações por pessoa/workspace/dia. Envia apenas primeiro nome, objeção, nível, etapa e tempo sem contato. Não envia telefone, histórico completo nem dados financeiros. O texto gerado precisa ser revisado e copiado pela equipe; não há disparo automático.

A geração real não foi ativada nem testada com um provedor: faltam a conexão e o modelo. O modo local foi testado por HTTP. As notificações diárias usam a rotina existente documentada em `docs/cloud-automations.md`.

## Validação

Testes de domínio cobrem acesso por operação e pessoa, datas de Brasília, consciência, gargalo combinado, venda atômica, perda e migração, rotina sem duplicação, quiz calculado no servidor, mapas e conflito de versão. Testes HTTP cobrem autenticação, origem, persistência, rascunho local e upload/download privado de PDF. Conferência visual nas três telas em desktop e celular, incluindo modo claro/escuro e arraste real das caixas.

## Entrada automática a partir de FUP

Arrastar ou escolher FUP no pipeline grava a etapa e inclui o lead no Follow-up Infinito na mesma transação. Não exige um formulário nem uma data de retorno para entrar; o contexto pode ser completado depois. Uma data de retorno enviada explicitamente ainda precisa ser futura e gera a tarefa existente.

O cadastro conserva operação, responsável do lead, nome, telefone e contexto. Reentradas reutilizam o acompanhamento existente e reativam cadastros encerrados sem apagar notas, qualificação ou atribuição já ajustada. Apenas uma oportunidade vinculada é acompanhada; não há fusão de pessoas entre operações. Sair de FUP não apaga o acompanhamento, e registrar a venda continua encerrando-o como comprado.

Leads que já estavam em FUP são incluídos ao carregar a versão atual, somente se ainda não tiverem acompanhamento. Recarregar não reabre um acompanhamento encerrado. Regras que movem para FUP também fazem a inclusão. O canal conhecido ou uma call realizada ajudam a indicar onde parou; outros canais ficam para completar. A última mensagem recebida fornece a data do último contato quando disponível. Sem evidência, a data e a objeção ficam vazias: arrastar um card não significa ter falado com o lead.

A inclusão não envia mensagens externas nem altera os processos personalizados da equipe. Testes cobrem entrada sem data, prazo opcional, reentrada, migração, autor, permissões, preservação de qualificação e disparos internos.
