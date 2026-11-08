import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,visibleState} from '../lib/crm';
import {mutateState} from '../lib/commands';
import {ingestInstagramWebhook} from '../lib/instagram-ingest';
import {instagramBindings,normalizeInstagramWebhook,verifyMetaSignature,readInstagramBody,INSTAGRAM_MAX_BODY} from '../lib/instagram-webhook';
import {handleInstagramGateway} from '../integrations/instagram-gateway/worker';
const now=Date.now(),user={userId:'owner',displayName:'Owner',email:'owner@example.com'};
const bindings=[{accountId:'178400000000001',project:'Meu projeto',username:'@teste'}];
const payload=(message:Record<string,unknown>={mid:'message-1',text:'Quero saber mais'})=>({object:'instagram',entry:[{id:bindings[0].accountId,messaging:[{sender:{id:'900000000001'},recipient:{id:bindings[0].accountId},timestamp:now-1000,message}]}]});
const secret='test-only-not-a-production-secret';
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
async function sign(body:Uint8Array){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return 'sha256='+Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new Uint8Array(body))),x=>x.toString(16).padStart(2,'0')).join('');}

test('Meta signature binds exact bytes; missing, malformed and forged signatures fail closed',async()=>{
  const raw=bytes(payload()),signature=await sign(raw);
  assert.equal(await verifyMetaSignature(secret,raw,signature),true);
  for(const value of [null,'',signature.slice(7),'sha256='+'0'.repeat(64)])assert.equal(await verifyMetaSignature(secret,raw,value),false);
  assert.equal(await verifyMetaSignature(secret,bytes({...payload(),extra:true}),signature),false);
});
test('Instagram routing accepts only configured IDs and rejects ambiguous destinations',()=>{
  assert.deepEqual(instagramBindings(JSON.stringify(bindings)),bindings);
  assert.deepEqual(instagramBindings(),[]);
  for(const raw of ['{}','[{}]',JSON.stringify([...bindings,...bindings]),JSON.stringify([...bindings,{...bindings[0],accountId:'178400000000002'}])])assert.throws(()=>instagramBindings(raw));
});
test('Direct creates exactly one lead and one task, preserves provider time and scopes contact to account',async()=>{
  const result=await ingestInstagramWebhook(emptyState(user),payload(),bindings,now);
  assert.equal(result.accepted,1);assert.equal(result.state.deals.length,1);assert.equal(result.state.tasks.length,1);
  assert.equal(result.state.deals[0].stage,'conversation');assert.equal(result.state.deals[0].project,'Meu projeto');
  assert.equal(result.state.messages[0].at,new Date(now-1000).toISOString());
  assert.equal(result.state.contacts[0].externalIds?.Instagram,'178400000000001:900000000001');
  assert.equal(result.state.integrations['Meu projeto::Instagram'].lastWebhookAt,new Date(now).toISOString());
  const retry=await ingestInstagramWebhook(result.state,payload(),bindings,now);
  assert.equal(retry.accepted,0);assert.equal(retry.duplicates,1);assert.equal(retry.state.messages.length,1);assert.equal(retry.state.tasks.length,1);
});
test('Echoes, unsupported messages, deleted messages, receipts and foreign accounts never create leads',async()=>{
  for(const field of ['is_echo','is_self','is_deleted','is_unsupported'])assert.equal((await normalizeInstagramWebhook(payload({mid:'x',text:'ignore',[field]:true}),bindings,now)).events.length,0);
  const foreign=payload();foreign.entry[0].id='178400000000002';assert.equal((await normalizeInstagramWebhook(foreign,bindings,now)).events.length,0);
  const recipient=payload();recipient.entry[0].messaging[0].recipient.id='178400000000002';assert.equal((await normalizeInstagramWebhook(recipient,bindings,now)).events.length,0);
  assert.equal((await normalizeInstagramWebhook(payload({}),bindings,now)).events.length,0);
  const future=payload();future.entry[0].messaging[0].timestamp=now+3600000;assert.equal((await normalizeInstagramWebhook(future,bindings,now)).events.length,0);
});
test('Multiple operations remain isolated; same sender and message ID from another account are independent',async()=>{
  const owner={id:'owner',isOwner:true,projects:['Meu projeto'],name:'Owner',role:'Administrador' as const,allLeads:true,finance:true,export:true};
  const initial=mutateState(emptyState(user),{type:'project.add',payload:{name:'Outra operação'}},owner);
  const config=[...bindings,{accountId:'178400000000002',project:'Outra operação'}];
  const first=await ingestInstagramWebhook(initial,payload(),config,now),other=payload();other.entry[0].id=config[1].accountId;other.entry[0].messaging[0].recipient.id=config[1].accountId;
  const second=await ingestInstagramWebhook(first.state,other,config,now);assert.equal(second.state.contacts.length,2);assert.equal(second.state.deals.length,2);
  const visible=visibleState(second.state,{...owner,isOwner:false});assert.deepEqual(visible.projects,['Meu projeto']);assert.equal(visible.messages.length,1);
});
test('Attachments produce a neutral placeholder without requesting or storing arbitrary media URLs',async()=>{
  const result=await normalizeInstagramWebhook(payload({mid:'media-1',attachments:[{type:'image',payload:{url:'http://internal.invalid/private'}}]}),bindings,now);
  assert.equal(result.events.length,1);assert.match(result.events[0].message,/Mídia recebida/);assert.equal(JSON.stringify(result).includes('internal.invalid'),false);
});
test('Body limit applies even without a Content-Length header',async()=>{
  const body=new Uint8Array(INSTAGRAM_MAX_BODY+1);await assert.rejects(()=>readInstagramBody(new Request('https://example.invalid',{method:'POST',body})),/BODY_TOO_LARGE/);
});
const env={INSTAGRAM_APP_SECRET:secret,INSTAGRAM_VERIFY_TOKEN:'test-verification-only',CRM_ORIGIN:'https://crm.example.invalid',CRM_SERVICE_TOKEN:'test-service-token'};
test('Gateway challenge is returned only with the configured verification token',async()=>{
  assert.equal((await handleInstagramGateway(new Request('https://gateway.example.invalid/instagram/webhook?hub.mode=subscribe&hub.challenge=123&hub.verify_token=wrong'),env)).status,403);
  const ok=await handleInstagramGateway(new Request('https://gateway.example.invalid/instagram/webhook?hub.mode=subscribe&hub.challenge=123&hub.verify_token=test-verification-only'),env);assert.equal(ok.status,200);assert.equal(await ok.text(),'123');
});
test('Gateway forwards only signed raw payload to one fixed route; no credentials or records leak in response',async()=>{
  const body=bytes(payload()),signature=await sign(body);let called=0;
  const send:typeof fetch=async(input,init)=>{called++;assert.equal(String(input),'https://crm.example.invalid/api/integrations/instagram/webhook');assert.equal(new Headers(init?.headers).get('OAI-Sites-Authorization'),'Bearer test-service-token');assert.equal(init?.redirect,'error');assert.deepEqual(init?.body,body);return Response.json({accepted:1,private:'Never expose'});};
  const request=()=>new Request('https://gateway.example.invalid/instagram/webhook?target=https://evil.invalid',{method:'POST',body,headers:{'X-Hub-Signature-256':signature}});
  const good=await handleInstagramGateway(request(),env,send);assert.equal(good.status,200);assert.equal(await good.text(),'EVENT_RECEIVED');assert.equal(called,1);
  const bad=await handleInstagramGateway(new Request('https://gateway.example.invalid/instagram/webhook',{method:'POST',body}),env,send);assert.equal(bad.status,403);assert.equal(called,1);
  assert.equal((await handleInstagramGateway(request(),env,async()=>Response.json({error:'conflict'},{status:503}))).status,503);
  assert.equal((await handleInstagramGateway(request(),env,async()=>new Response('<html>sign in</html>'))).status,503);
});
