import {env} from 'cloudflare:workers';
import {json} from '@/lib/server';
import {ingestEvent} from '@/lib/inbound';
import type {State} from '@/lib/crm';
export const dynamic='force-dynamic';
async function validSignature(secret:string,body:string,signature:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!/^[a-f0-9]{64}$/i.test(signature))return false;const bytes=Uint8Array.from(signature.match(/.{2}/g)!,p=>parseInt(p,16));return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(body));}
export async function POST(request:Request){
  if(!env.CRM_EVENT_SECRET)return json({error:'A recepção de eventos ainda não foi ativada pelo administrador.'},503);
  try{if(Number(request.headers.get('content-length')||0)>40000)return json({error:'Evento muito grande.'},413);const raw=await request.text();if(raw.length>40000)return json({error:'Evento muito grande.'},413);
    const signature=request.headers.get('x-nexo-signature')||'';if(!await validSignature(env.CRM_EVENT_SECRET,raw,signature))return json({error:'Assinatura inválida.'},401);
    if(!env.DB)return json({error:'Banco indisponível.'},503);const row=await env.DB.prepare('SELECT data,revision FROM crm_workspaces WHERE id = ?').bind('main').first<{data:string;revision:number}>();if(!row)return json({error:'Abra o CRM real para inicializar o workspace.'},409);
    const result=ingestEvent(JSON.parse(row.data) as State,JSON.parse(raw));if(result.duplicate)return json({accepted:true,duplicate:true});
    const updated=await env.DB.prepare('UPDATE crm_workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(result.state),new Date().toISOString(),'main',row.revision).run();if(updated.meta.changes!==1)return json({error:'Conflito temporário. Reenvie o mesmo evento e eventId.'},409);
    return json({accepted:true,duplicate:false,dealId:result.dealId});
  }catch(error){return json({error:error instanceof Error?error.message:'Evento inválido.'},400);}
}
