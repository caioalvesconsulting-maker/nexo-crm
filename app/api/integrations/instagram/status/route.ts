import {env} from 'cloudflare:workers';
import {context,json,failure} from '@/lib/server';
import {canProject,assert} from '@/lib/crm';
import {instagramBindings} from '@/lib/instagram-webhook';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const c=await context(request),project=new URL(request.url).searchParams.get('project')||'';
    assert(c.state.projects.includes(project)&&canProject(project,c.actor),'Operação não autorizada.');
    if(c.demo)return json({mode:'demo',configured:false,receiving:false,lastWebhookAt:null});
    let bindings;try{bindings=instagramBindings(env.INSTAGRAM_ACCOUNTS_JSON);}catch{return json({mode:'live',configured:false,receiving:false,lastWebhookAt:null,configurationError:true});}
    const current=c.state.integrations[`${project}::Instagram`],binding=bindings.find(b=>b.project===project);
    const configured=!!env.INSTAGRAM_APP_SECRET&&!!binding;
    const lastWebhookAt=configured&&current?.instagramAccountId===binding?.accountId?current?.lastWebhookAt||null:null;
    return json({mode:'live',configured,receiving:!!lastWebhookAt,lastWebhookAt,account:binding?.username||null});
  }catch(error){return failure(error);}
}
