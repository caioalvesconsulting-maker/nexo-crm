import {env} from 'cloudflare:workers';
import {json} from '@/lib/server';
import {instagramBindings,readInstagramBody,verifyMetaSignature} from '@/lib/instagram-webhook';
import {ingestInstagramWebhook} from '@/lib/instagram-ingest';
import type {State} from '@/lib/crm';
export const dynamic='force-dynamic';

// Private Site endpoint: the external gateway supplies Sites service access.
// Even with that access, every byte must carry a valid original Meta signature.
export async function POST(request:Request){
  if(!env.DB||!env.INSTAGRAM_APP_SECRET||!env.INSTAGRAM_ACCOUNTS_JSON)return json({error:'Instagram ainda não ativado.'},503);
  let bindings;
  try{bindings=instagramBindings(env.INSTAGRAM_ACCOUNTS_JSON);if(!bindings.length)throw new Error();}catch{return json({error:'Configuração do Instagram pendente.'},503);}
  let body:Uint8Array;
  try{body=await readInstagramBody(request);}catch{return json({error:'Evento muito grande.'},413);}
  if(!await verifyMetaSignature(env.INSTAGRAM_APP_SECRET,body,request.headers.get('x-hub-signature-256')))return json({error:'Assinatura inválida.'},401);
  let payload:unknown;
  try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}catch{return json({error:'Evento inválido.'},400);}
  try{
    for(let attempt=0;attempt<3;attempt++){
      const row=await env.DB.prepare('SELECT data,revision FROM crm_workspaces WHERE id = ?').bind('main').first<{data:string;revision:number}>();
      if(!row)return json({error:'Inicialize o ambiente real antes de ativar o Instagram.'},503);
      const result=await ingestInstagramWebhook(JSON.parse(row.data) as State,payload,bindings);
      if(!result.accepted)return json({accepted:0,duplicates:result.duplicates,ignored:result.ignored});
      if(JSON.stringify(result.state).length>=4500000)return json({error:'Limite da operação atingido.'},503);
      const updated=await env.DB.prepare('UPDATE crm_workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(result.state),new Date().toISOString(),'main',row.revision).run();
      if(updated.meta.changes===1)return json({accepted:result.accepted,duplicates:result.duplicates,ignored:result.ignored});
    }
    return json({error:'Conflito temporário. Reenvie o mesmo evento.'},503);
  }catch{return json({error:'Não foi possível registrar o evento. Verifique a configuração da operação.'},503);}
}
