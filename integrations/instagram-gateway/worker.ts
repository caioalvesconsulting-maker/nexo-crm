import {readInstagramBody,verifyMetaSignature} from '../../lib/instagram-webhook';

type Env={INSTAGRAM_APP_SECRET?:string;INSTAGRAM_VERIFY_TOKEN?:string;CRM_ORIGIN?:string;CRM_SERVICE_TOKEN?:string};
const reply=(text:string,status=200)=>new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
async function equal(a:string,b:string){
  const digest=(s:string)=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  const [x,y]=await Promise.all([digest(a),digest(b)]);let difference=0;
  const aa=new Uint8Array(x),bb=new Uint8Array(y);for(let i=0;i<aa.length;i++)difference|=aa[i]^bb[i];return difference===0;
}
// Deploy separately on an authorized HTTPS host. This gateway exposes no CRM
// pages, records or arbitrary proxy: the upstream destination is fixed server-side.
export async function handleInstagramGateway(request:Request,env:Env,send:typeof fetch=fetch){
  const url=new URL(request.url);if(url.pathname!=='/instagram/webhook')return reply('Not found',404);
  if(!['GET','POST'].includes(request.method))return reply('Method not allowed',405);
  if(!env.INSTAGRAM_APP_SECRET||!env.INSTAGRAM_VERIFY_TOKEN||!env.CRM_ORIGIN||!env.CRM_SERVICE_TOKEN)return reply('Not configured',503);
  let origin:URL;try{origin=new URL(env.CRM_ORIGIN);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error();}catch{return reply('Not configured',503);}
  if(request.method==='GET'){
    const token=url.searchParams.get('hub.verify_token')||'',challenge=url.searchParams.get('hub.challenge')||'';
    if(url.searchParams.get('hub.mode')!=='subscribe'||!/^\d{1,100}$/.test(challenge)||!await equal(token,env.INSTAGRAM_VERIFY_TOKEN))return reply('Forbidden',403);
    return reply(challenge);
  }
  let body:Uint8Array;try{body=await readInstagramBody(request);}catch{return reply('Payload too large',413);}
  const signature=request.headers.get('x-hub-signature-256');
  if(!await verifyMetaSignature(env.INSTAGRAM_APP_SECRET,body,signature))return reply('Forbidden',403);
  try{
    const upstream=await send(new URL('/api/integrations/instagram/webhook',origin),{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','X-Hub-Signature-256':signature!,'OAI-Sites-Authorization':`Bearer ${env.CRM_SERVICE_TOKEN}`},body:new Uint8Array(body)});
    // Acknowledge only durable acceptance. Failure asks Meta to retry; the CRM
    // deduplicates by professional account + original message ID.
    if(!upstream.ok)return reply('Temporary delivery failure',503);
    const result=await upstream.json() as {accepted?:unknown};
    if(typeof result.accepted!=='number')return reply('Temporary delivery failure',503);
    return reply('EVENT_RECEIVED');
  }catch{return reply('Temporary delivery failure',503);}
}
export default {fetch:(request:Request,env:Env)=>handleInstagramGateway(request,env)};
