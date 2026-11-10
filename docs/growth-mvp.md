# Formulários, cursos e nutrição — MVP navegável

Escopo confirmado pelo usuário: somente MVP, sem necessidade de integrar serviços externos nesta etapa.

## Onde encontrar

- `#forms`: formulários e bases de contatos.
- `#courses`: cursos, alunos, bônus e campanhas.

Os dois módulos usam dados de exemplo claramente identificados. As alterações ficam no armazenamento local do navegador, separado por usuário, modo do CRM e operação. Não são gravadas em D1, não alteram leads ou vendas reais e não criam oportunidades no pipeline. Apenas operações retornadas pelo controle de acesso existente ficam disponíveis no seletor. O protótipo não constitui uma implementação nova de autorização no servidor.

## Formulários

- Três modelos iniciais: isca gratuita, candidatura ao networking e aplicação para mentoria.
- Criador/editor com texto de apresentação, botão, campanha, origem, perguntas, obrigatoriedade e ordem. Duplicação de formulário e prévia para responder localmente.
- Cada formulário mantém sua própria lista de respostas; a visão reunida permite selecionar bases e apresenta uma pessoa por cadastro, preservando todas as entradas selecionadas.
- Na resposta de teste, o e-mail normalizado identifica um contato já existente na mesma operação. Não há fusão automática entre operações ou resolução completa de conflitos de identidade por telefone neste MVP.
- Busca, filtros de temperatura/origem, paginação e ficha com respostas, origem inicial e linha do tempo.
- Temperatura de interesse e compatibilidade são avaliações independentes. A sugestão é demonstrativa e tem evidências visíveis; revisão manual requer motivo. Não existe IA conectada.
- Preferências de comunicação opcionais por canal; a resposta de teste não reinscreve automaticamente um contato descadastrado.
- Não há publicação de formulários, URL pública de captação ou entrega real de iscas nesta etapa.

## Cursos e nutrição

- Cursos de entrada com preço de referência, ID externo planejado, módulos e aulas com duração.
- Alunos com percentual por tempo assistido, detalhamento por aula, último acesso informado e origem.
- Progresso desconhecido é `null`, distinto de zero. Médias excluem matrículas sem dados e reembolsadas; os indicadores explicam seus denominadores.
- Bônus com formato, link opcional, curso e regra planejada: dias após compra, percentual de consumo ou liberação manual. Exemplos de elegibilidade e resgate, sem publicação externa.
- Editor de campanhas de e-mail, WhatsApp e planejamento de grupos, com variáveis, público, segmento de progresso, bônus, prévia e revisão.
- A audiência individual simulada respeita o canal autorizado e exclui descadastrados e compradores da mentoria. Campanhas vinculadas a cursos exigem matrícula ativa; bônus exigem elegibilidade. Grupos são somente planejamento, com compatibilidade a validar.
- Salvar rascunho e simular disparo alteram apenas o MVP. Não enviam mensagens, não fazem cobrança, não agendam tarefas em segundo plano e não apresentam entrega real como confirmada.

## APIs e webhook

O painel APIs permite registrar nomes das plataformas planejadas, sem coletar credenciais. O simulador local de JSON aceita `course.progress`, `purchase.approved` e `bonus.redeemed` para contatos e cursos de exemplo existentes. Mostra o resultado e eventos recentes. Eventos repetidos são rejeitados dentro do histórico demonstrativo, limitado a 50 registros. Progresso é limitado à duração da aula e não retrocede por um evento menor.

Não há endpoint HTTP novo nem API externa conectada. Integração real exige escolha das plataformas, autenticação/verificação de eventos, armazenamento durável por operação, identidade consistente, consentimentos verificáveis, fila de envios, tratamento de erros, cancelamento e políticas do canal. O histórico limitado do simulador não é garantia de idempotência para produção.

## Verificação

- TypeScript e build de produção.
- Navegação e teste de criação/edição de formulário, resposta de teste, bases reunidas, filtro por temperatura e ficha do contato.
- Revisão de temperatura com motivo, criação de bônus, ficha do aluno e revisão/simulação de campanha individual.
- Compra via evento simulado e rejeição do mesmo `event_id`.
- Persistência do formulário e da resposta após navegação; armazenamento local independente das oportunidades do CRM.
- Layout responsivo, incluindo tabelas com rolagem interna e diálogos no celular. Detalhes das dimensões efetivamente conferidas constam no relato de entrega.
