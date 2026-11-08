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
