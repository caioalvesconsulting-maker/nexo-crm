import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {json} from '@/lib/server';
import {automationStore,runCloudAutomations} from '@/lib/cloud-automations';
import type {State} from '@/lib/crm';
export const dynamic='force-dynamic';

// This shared service endpoint relies on Sites' OWNER-PRIVATE access boundary.
// Dispatch authenticates service access before invoking this handler. Disable
// CRM_AUTOMATION_SERVICE_ENABLED before making the Site public. Browser users
// must additionally be the stored owner; demo workspaces are never processed.
async function authorized(request:Request) {
  if(env.CRM_AUTOMATION_SERVICE_ENABLED!=='true'||!env.DB)return {response:json({error:'Verificação na nuvem desativada.'},503)};
  if(request.headers.has('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return {response:json({error:'Origem inválida.'},403)};
  const store=automationStore(env.DB),row=await store.read();
  if(!row)return {response:json({error:'Abra Meu CRM para inicializar o ambiente real.'},503)};
  const user=await getChatGPTUser();
  if(user&&user.userId!==row.owner_id)return {response:json({error:'Acesso restrito ao proprietário.'},403)};
  return {store,row};
}
export async function POST(request:Request) {
  try {
    const access=await authorized(request);if(access.response)return access.response;
    if(new URL(request.url).search)return json({error:'A rotina usa apenas o ambiente real.'},400);
    // No parameters or lead data may be supplied by the cloud task.
    if(request.body)return json({error:'Envie a solicitação sem conteúdo.'},400);
    return json(await runCloudAutomations(access.store!));
  } catch {return json({error:'Não foi possível concluir. Tente novamente; ações já salvas não serão duplicadas.'},503);}
}
export async function GET(request:Request) {
  try {const access=await authorized(request);if(access.response)return access.response;return json({run:(JSON.parse(access.row!.data) as State).cloudAutomation||null,revision:access.row!.revision});}
  catch {return json({error:'Não foi possível consultar a última execução.'},503);}
}
