# Validação da interface Nexo Orbital

Data: 08/11/2026.

## Alterações

- Tema original inspirado na referência visual Nimbra: azul profundo, painéis translúcidos, luzes suaves, contornos e menu flutuante. Marca Nexo preservada.
- Temas claro e escuro, intensidade de transparência e menu compacto. Preferências persistidas neste navegador.
- Português do Brasil como idioma inicial, valores em BRL e horário de Brasília.
- Áudio sintetizado original, curto, com volume, silenciamento e prévias de salvamento, atenção e venda ganha. Sem downloads de áudio da referência.
- Arraste por eventos de ponteiro, inclusive a partir do botão principal do card; indicador de destino, rolagem lateral nas bordas e cancelamento por Escape. Em telas de toque o arraste inicia pelo ícone de pontos para preservar a rolagem da página.
- Seletor Mover para em cada card. Agendamento, FUP, WIN e LOSS preservam seus formulários obrigatórios.
- Taxa de resposta calculada por lead e canal: conversa com ao menos uma saída após a primeira entrada. Notas internas e rascunhos excluídos. Mediana do tempo da primeira resposta. Sem conversas, o indicador exibe ausência de dados.

## Evidências

- Testes de domínio: 20 aprovados, incluindo isolamento de operações, taxas, etapas obrigatórias, integrações inativas e cálculo da taxa de resposta.
- TypeScript: sem erros.
- HTTP local: autenticação, origem da requisição, persistência, controle de concorrência, anexos R2 e eventos externos desativados aprovados.
- Navegador: card demonstrativo arrastado de Em conversa para Marcando call; etapa preservada após recarga. Estado original restaurado. Formulários de reunião, acompanhamento, venda ganha e venda perdida verificados sem gravar esses desfechos.
- Reprodução do arquivo win.wav confirmada pelo elemento de áudio: prévia reproduzida, duração 0,56 s, sem erro de decodificação. Sons configuráveis; não foi feita comparação auditiva com o áudio da referência.
- Largura de 390 px: 15 telas sem transbordamento horizontal da página. Kanban e tabelas mantêm rolagem interna intencional.
- Larguras de 320, 768 e 1024 px: navegação e ausência de transbordamento verificadas em Visão geral, Pipeline, Conversas, Agenda e Administração. Inspeção visual adicional em desktop de 1440 px, celular de 390 px, temas claro e escuro e formulário de venda móvel.
- API de leitura em desenvolvimento local, após uma requisição de aquecimento: 10 requisições, mediana 11 ms, mínimo 9 ms, máximo/p95 da amostra 79 ms. Estes números não representam latência de produção nem teste de carga.

## Limites

Validação responsiva feita com tamanhos de viewport no navegador; não é teste em hardware móvel. A reprodução técnica de áudio foi validada no navegador. WhatsApp, Instagram e outros provedores continuam dependendo da configuração das integrações; métricas demonstrativas estão identificadas na interface.


## Atualização da Visão geral — 08/11/2026

- Cinco indicadores: receita total, ticket médio, caixa líquido recebido, leads cadastrados no período e conversão entre oportunidades encerradas. Formatação monetária em reais com duas casas e conversão com uma casa decimal.
- Filtros de período, projeto, SDR e closer expostos no topo; intervalo personalizado com aplicação explícita. Atalhos Criar tarefa e Agendar chamada.
- Gráficos de rosca de receita e caixa por projeto logo abaixo dos indicadores, com valores, participação e total. Projetos sem movimentação aparecem sem fatia; ausência completa de movimento apresenta anel neutro.
- Receita usa a data da venda ativa. Caixa usa a data de cada recebimento confirmado, inclusive de vendas anteriores. Vendas canceladas não entram. Um teste adicional valida conciliação por projeto, recebimentos parciais e isolamento do projeto selecionado: 21 testes aprovados no total.
- Testes de navegador: filtro por projeto, período personalizado sem registros, limpeza dos filtros e tamanhos de 320, 390, 768, 1024 e 1440 px. Valores da operação mantidos, sem números fictícios inseridos em dados reais.


## Visão geral compacta — 11/11/2026

O título e as ações do dashboard agora ficam no cabeçalho. Filtros, aviso demonstrativo e cinco indicadores usam menos altura; os dois gráficos por projeto mantêm as legendas ao lado no desktop. Alteração apenas de apresentação, sem mudança nos cálculos, dados ou permissões.

Conferência visual em 1275×718 e 1410×740: os cinco indicadores e os dois painéis de pizza completos aparecem sem rolagem vertical inicial, com os filtros adicionais recolhidos e três projetos de exemplo. Em 1410×740, os painéis terminam em aproximadamente 701 px. Mais projetos ou filtros expandidos podem aumentar a altura de conteúdo.

Revisão em 390×844 nos temas claro/escuro, sem transbordamento horizontal. Testados abrir/recolher Mais filtros e abrir/cancelar Criar tarefa no novo cabeçalho. Preferência de tema e tamanho de viewport restaurados após QA. TypeScript e build de produção verificados no fluxo de publicação.

## Calendário de período — 12/11/2026

O campo exibe `dd/mm/aa - dd/mm/aa`. O calendário flutua sobre o conteúdo, com dois meses consecutivos no desktop, semanas iniciando no domingo e nomes em português. A primeira data inicia uma seleção; a segunda aplica o intervalo. Datas em ordem inversa são normalizadas e dois cliques no mesmo dia selecionam um único dia. Escape, clique fora e saída por teclado descartam uma seleção incompleta. Atalhos de 7, 30, 90 dias e todo o período ficam dentro do calendário.

Os indicadores e o gráfico de evolução usam os mesmos dias completos no horário de Brasília; o gráfico acompanha o intervalo selecionado, agrupando períodos acima de 90 dias por mês. Três testes cobrem os limites UTC/Brasília, milissegundos finais, virada de ano, dia único e extremidades dos agrupamentos. Suíte: 81 testes aprovados.

Navegador local: seleção entre meses, ordem invertida, dia único, navegação, Escape, cancelamento por clique fora e atalho de 30 dias verificados. Desktop 1275×718 preserva o layout compacto; 390×844 e 360×800 mostram um mês sem corte horizontal. Viewport restaurado após a conferência.
