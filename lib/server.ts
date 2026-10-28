import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {emptyState,demoState,visibleState,assert} from '@/lib/crm';
import type {State,Actor} from '@/lib/crm';
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});}
export async function context(request:Request){
  const user=await getChatGPTUser();if(!user)throw new Error('AUTH_REQUIRED');assert(env.DB,'Banco de dados indisponível.');const demo=new URL(request.url).searchParams.get('demo')==='1';
  const key=demo?`demo:${user.userId}`:'main';let row=await env.DB.prepare('SELECT * FROM crm_workspaces WHERE id = ?').bind(key).first<{id:string;owner_id:string;data:string;revision:number}>();
  if(!row){const state=demo?demoState(user):emptyState(user);await env.DB.prepare('INSERT OR IGNORE INTO crm_workspaces (id,owner_id,data,revision,updated_at) VALUES (?,?,?,0,?)').bind(key,user.userId,JSON.stringify(state),new Date().toISOString()).run();row=await env.DB.prepare('SELECT * FROM crm_workspaces WHERE id = ?').bind(key).first();}
  assert(row,'Não foi possível abrir o workspace.');const state=JSON.parse(row.data) as State;
  const member=state.members.find(m=>m.active&&(m.id===user.userId||m.email.toLowerCase()===user.email.toLowerCase()));assert(member,'Você não tem acesso a este workspace.');
  const isOwner=row.owner_id===user.userId;const actor:Actor={id:member.id,name:member.name,role:isOwner?'Administrador':member.role,allLeads:isOwner||member.allLeads,finance:isOwner||member.finance,export:isOwner||member.export};
  return {key,demo,state,actor,revision:row.revision,db:env.DB,user};
}
export function verifyOrigin(request:Request){const origin=request.headers.get('origin');assert(origin&&origin===new URL(request.url).origin,'Origem da solicitação inválida.');}
export async function save(ctx:Awaited<ReturnType<typeof context>>,state:State){const r=await ctx.db.prepare('UPDATE crm_workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(state),new Date().toISOString(),ctx.key,ctx.revision).run();assert(r.meta.changes===1,'CONFLICT');return {state:visibleState(state,ctx.actor),actor:ctx.actor,revision:ctx.revision+1,demo:ctx.demo};}
export function failure(error:unknown){const message=error instanceof Error?error.message:'Erro inesperado.';return json({error:message==='AUTH_REQUIRED'?'Entre para acessar seu CRM.':message==='CONFLICT'?'Os dados foram atualizados em outra sessão. Atualize e tente novamente.':message},message==='AUTH_REQUIRED'?401:message==='CONFLICT'?409:400);}
