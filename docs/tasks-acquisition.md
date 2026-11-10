# Tarefas, equipes e origens

Tarefas aceitam múltiplos destinatários no cadastro. O servidor valida o lote inteiro e cria uma tarefa por pessoa, com IDs distintos e um `batchId` comum. A edição atua em uma tarefa individual. Só o `ownerId` da tarefa pode concluir ou reabrir; nem o proprietário nem gestores têm exceção. A conclusão registra `completedAt`.

Proprietário, Gestor e Administrador acompanham tarefas nas operações autorizadas e podem distribuí-las. SDRs e closers veem suas próprias tarefas. Uma tarefa ligada a um lead exige acesso ao lead para todos os destinatários. A seleção permite equipe, função e nome, preserva os nomes já selecionados ao filtrar e limpa destinatários ao trocar a operação.

Equipes são grupos por operação, sem concessão de permissões. Apenas membros ativos com acesso prévio entram no grupo; revogar acesso remove a pessoa dos grupos afetados. Só o proprietário libera operações no cadastro de pessoas. Sócios podem ser cadastrados como Gestor com as operações explicitamente liberadas. Nenhuma permissão real existente é ampliada automaticamente.

Origens e funis mostra uma operação por vez, com cadastro, edição, arquivo e reativação. Os seis modelos incluem YouTube, story/isca/página de vendas, story/formulário, networking, tráfego pago e direto/indicação/outros. Adicionar padrões ausentes é idempotente e preserva edições e arquivo. Funis arquivados permanecem nos leads e indicadores anteriores; não entram em novos cadastros.

Visão geral e a aba Gráficos de origem mostram distribuições distintas por funil (`funnelId`) e canal (`source`), quantidades, participação e ganhos. Identificadores ausentes ou de outra operação entram em Origem não informada. Origens genéricas ficam sinalizadas para qualificação. Não se deduz YouTube a partir de WhatsApp ou Instagram. O detalhamento depende do cadastro dos leads; esta entrega não ativa rastreamento externo nem muda o MVP de formulários/cursos.

Dados novos usam o estado versionado já persistido no servidor. A migração inicializa `teams` sem alterar permissões, tarefas ou origens existentes. Testes cobrem lotes, conclusão exclusiva, isolamento entre operações, grupos, edição individual, conservação de SLA, arquivo de funis e reconciliação dos gráficos.
