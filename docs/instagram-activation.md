# Instagram oficial — preparação de recebimento

Status desta entrega: adaptador, validação e tela de acompanhamento implementados; nenhuma conta Meta autorizada, nenhum segredo de produção configurado e gateway externo ainda não publicado. Não há envio real de mensagens, OAuth implementado no CRM nem confirmação de revisão do aplicativo pela Meta.

## Conexão a concluir com o proprietário

1. Confirmar o @, tipo profissional (Empresa ou Criador) e operação de destino. Nesta primeira versão, uma conta por operação e cada conta vinculada a uma única operação.
2. Criar ou selecionar um aplicativo próprio no Meta for Developers e habilitar **Instagram API with Instagram Login**. Conferir no painel o nível de acesso aplicável à conta própria e eventual revisão/verificação necessária antes de atender contas externas. Esta etapa não equivale a uma aprovação da Meta.
3. Autorizar a conta pela interface oficial da Meta. As permissões de identidade e mensagens desta modalidade são `instagram_business_basic` e `instagram_business_manage_messages`. Nunca usar senha, cookie de sessão, QR code de sessão ou automação de navegador do Instagram. O token de acesso não é armazenado pelo adaptador de entrada desta entrega; a autorização e a assinatura de eventos da conta precisam ser concluídas no provedor.
4. Publicar o gateway em uma hospedagem HTTPS autorizada pelo proprietário. O código está em `integrations/instagram-gateway/worker.ts`, com configuração separada para Cloudflare Workers. A publicação do CRM não publica esse gateway. Revisar privacidade e retenção de logs no provedor escolhido. A configuração incluída desativa observabilidade do Worker para evitar captura inadvertida de dados; não registrar corpo, tokens ou query strings do desafio.
5. Configurar segredos de runtime pelos controles da hospedagem (nunca pelo chat, código, URL, frontend ou campo de observações). No CRM: `INSTAGRAM_APP_SECRET` e `INSTAGRAM_ACCOUNTS_JSON`. No gateway: `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN`, `CRM_ORIGIN` e `CRM_SERVICE_TOKEN`.
6. Registrar na Meta a URL HTTPS do gateway terminada em `/instagram/webhook`, concluir o desafio com o token de verificação e habilitar a assinatura do evento `messages` para a conta profissional. A assinatura da conta e a autorização do aplicativo são passos distintos. Seguir o painel/documentação oficial atual para a modalidade Instagram Login; não misturar token de Página da modalidade Facebook Login.
7. Inicializar o ambiente **Meu CRM**, confirmar a operação real, receber um direct de uma conta de teste autorizada e verificar: um contato, uma oportunidade em Leads em conversa, uma mensagem e uma tarefa. Repetir o mesmo evento não pode duplicar esses registros. A interface mostra a data do último recebimento confirmado, não uma garantia contínua de conexão.

Formato de `INSTAGRAM_ACCOUNTS_JSON` (IDs exemplificativos; não copiar como conta real):

```json
[{"accountId":"178400000000001","project":"Nome exato da operação","username":"@sua_conta"}]
```

`accountId` deve ser o ID numérico da conta profissional destinatária que aparece em `entry.id` e `recipient.id` no webhook da modalidade configurada. O mapa fica no servidor; o corpo da mensagem não decide a operação.

## Privacidade da hospedagem

O CRM continua owner-private. A Meta não envia o cabeçalho de autenticação de serviço exigido pelo Sites. Por isso o gateway público só expõe o desafio e a recepção de webhooks, valida HMAC-SHA256 sobre os bytes originais e encaminha esses mesmos bytes para uma única rota privada. `CRM_SERVICE_TOKEN` é a credencial de serviço existente do Site, configurada como segredo no gateway. Ela só vai ao domínio definido em `CRM_ORIGIN`, via `OAI-Sites-Authorization`, sem seguir redirecionamentos. Não mudar a audiência do CRM para contornar isso.

A rota privada `/api/integrations/instagram/webhook` verifica novamente a assinatura original da Meta. Só aceita contas mapeadas e operações existentes. Responde sucesso após persistência; em conflito, relê a revisão até três vezes e depois retorna 503 para nova tentativa. O gateway devolve apenas confirmação genérica, nunca registros do CRM ou respostas contendo dados internos.

## Limites desta etapa

- Só recebe mensagens novas. Não consulta perfil, nome completo, histórico antigo, anúncios ou métricas de seguidores. O contato começa identificado pelo ID e pode ser completado pela equipe.
- Não envia respostas, follow-ups, mensagens em massa ou mensagens para seguidores que não iniciaram conversa. A regra existente continua bloqueando envio real no CRM.
- Mídias aparecem como aviso para abrir no Instagram; não são baixadas nem exibidas a partir de URLs recebidas.
- Eventos de eco, leitura, reação, exclusão e formatos não suportados não criam oportunidades. Sincronização de exclusões e histórico permanece pendente antes de uma sincronização completa.
- A autorização OAuth no CRM, renovação de token, gestão de revogação e envio pela Send API serão uma etapa separada após a ativação e teste da entrada. Na etapa de envio, aplicar a janela e os limites atuais da Meta no servidor; não usar exceções de atendimento humano para disparos automáticos.
- Para uso com contas externas/revisão Meta, preparar as informações reais de privacidade e exclusão de dados e os recursos exigidos no painel. Não inventar política legal ou declarar aprovação inexistente.
- API oficial não garante risco zero de restrição: conteúdo, comportamento, autorização e políticas da conta continuam relevantes.

## Referências oficiais consultadas

- [Coleção oficial Instagram API da Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7): contas profissionais, permissões e conversa iniciada pelo usuário.
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/): revisar no painel antes da ativação. O acesso direto às páginas Meta retornou HTTP 429 durante esta preparação; requisitos específicos de aprovação e limites de envio não foram validados ao vivo.
- [Exemplo oficial da Meta](https://github.com/fbsamples/original-coast-clothing-ig): estrutura de eventos e fluxo de teste; o exemplo usa Facebook Login e não deve ser copiado como configuração da modalidade Instagram Login.
