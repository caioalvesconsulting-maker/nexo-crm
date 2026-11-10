import {env} from 'cloudflare:workers';
import {context,json,verifyOrigin,failure} from '@/lib/server';
import {assert} from '@/lib/crm';
import {canFollowup,brazilDate} from '@/lib/lifecycle';
import {messageContext,messageDraft,followupInstructions} from '@/lib/followup-message';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{verifyOrigin(request);const raw=await request.text();assert(raw.length<=2000,'Solicitação muito grande.');const {id}=JSON.parse(raw),c=await context(request),f=c.state.followups.find(f=>f.id===id);assert(f&&canFollowup(f,c.actor),'Lead sem acesso.');
 if(!env.OPENAI_API_KEY||!env.OPENAI_MODEL)return json({text:messageDraft(f),mode:'template',connected:false});
 await c.db.prepare('CREATE TABLE IF NOT EXISTS crm_ai_limits (id TEXT PRIMARY KEY, requests INTEGER NOT NULL)').run();const key=`${c.key}:${c.actor.id}:${brazilDate()}`;const result=await c.db.prepare('INSERT INTO crm_ai_limits (id,requests) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET requests=requests+1 WHERE requests<100').bind(key).run();if(result.meta.changes!==1)return json({error:'Você atingiu 100 sugestões hoje. Tente amanhã.'},429);
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL,store:false,instructions:followupInstructions,input:JSON.stringify(messageContext(f)),max_output_tokens:600}),signal:AbortSignal.timeout(25000)});if(!response.ok)return json({error:'A IA não respondeu. Confira a conexão e tente novamente.'},502);const body=await response.json() as {output?:{type:string;content?:{type:string;text?:string}[]}[]};const text=(body.output||[]).flatMap(o=>o.type==='message'?(o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||''):[]).join('\n').trim();if(!text)return json({error:'A IA não retornou uma mensagem. Tente novamente.'},502);return json({text:text.slice(0,1500),mode:'ai',connected:true});
 }catch(e){if(e instanceof Error&&e.name==='TimeoutError')return json({error:'A IA demorou para responder. Tente novamente.'},504);return failure(e);}}
