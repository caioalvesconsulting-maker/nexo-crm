import type {IncomingEvent} from './inbound';

// Only the Instagram Login webhook contract is accepted. No browser sessions,
// scraping, profile passwords, outbound messages or client-selected destinations.
export type InstagramBinding={accountId:string;project:string;username?:string};
export const INSTAGRAM_MAX_BODY=128*1024;
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const identifier=(value:unknown):value is string=>typeof value==='string'&&/^\d{5,40}$/.test(value);

export function instagramBindings(raw?:string):InstagramBinding[]{
  if(!raw)return [];
  const list:unknown=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>50)throw new Error('Configuração do Instagram inválida.');
  const ids=new Set<string>(),projects=new Set<string>();
  return list.map((item:unknown)=>{
    if(!record(item)||!identifier(item.accountId)||typeof item.project!=='string'||!item.project.trim()||item.project.length>300||ids.has(item.accountId)||projects.has(item.project))throw new Error('Configuração do Instagram inválida.');
    if(item.username!==undefined&&(typeof item.username!=='string'||!/^@?[a-zA-Z0-9._]{1,30}$/.test(item.username)))throw new Error('Configuração do Instagram inválida.');
    ids.add(item.accountId);projects.add(item.project);
    return {accountId:item.accountId,project:item.project,username:item.username};
  });
}

export async function verifyMetaSignature(secret:string,body:Uint8Array,signature:string|null){
  if(!secret||!signature||!/^sha256=[a-f0-9]{64}$/i.test(signature))return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(signature.slice(7).match(/.{2}/g)!,part=>parseInt(part,16));
  return crypto.subtle.verify('HMAC',key,bytes,new Uint8Array(body));
}

export async function readInstagramBody(request:Request){
  if(Number(request.headers.get('content-length'))>INSTAGRAM_MAX_BODY)throw new Error('BODY_TOO_LARGE');
  if(!request.body)return new Uint8Array();
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>INSTAGRAM_MAX_BODY){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}

async function eventKey(accountId:string,mid:string){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(mid));
  return `ig:${accountId}:${Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}`;
}

export async function normalizeInstagramWebhook(body:unknown,bindings:InstagramBinding[],now=Date.now()){
  if(!record(body)||body.object!=='instagram'||!Array.isArray(body.entry)||body.entry.length>100)throw new Error('Evento Instagram inválido.');
  const events:(IncomingEvent&{instagramAccountId:string})[]=[];let ignored=0,total=0;
  for(const entry of body.entry){
    if(!record(entry)||!Array.isArray(entry.messaging)){ignored++;continue;}
    const binding=bindings.find(b=>b.accountId===entry.id);
    for(const item of entry.messaging){
      if(++total>100)throw new Error('Lote Instagram muito grande.');
      if(!binding||!record(item)){ignored++;continue;}
      const msg=item.message;
      // Echoes (our own replies), reactions, receipts and deleted/unsupported
      // messages must never create prospects or trigger automatic replies.
      if(!record(msg)||msg.is_echo||msg.is_self||msg.is_deleted||msg.is_unsupported||!identifier(item.sender?.id)||item.recipient?.id!==binding.accountId||item.sender.id===binding.accountId||typeof msg.mid!=='string'||!msg.mid||msg.mid.length>2000){ignored++;continue;}
      const timestamp=item.timestamp;
      if(typeof timestamp!=='number'||!Number.isSafeInteger(timestamp)||timestamp<=0||timestamp>now+300000){ignored++;continue;}
      let message=typeof msg.text==='string'?msg.text.trim():'';
      if(!message&&Array.isArray(msg.attachments)&&msg.attachments.length)message='[Mídia recebida no Instagram. Abra o Instagram para visualizar.]';
      if(!message){ignored++;continue;}
      events.push({eventId:await eventKey(binding.accountId,msg.mid),channel:'Instagram',externalContactId:`${binding.accountId}:${item.sender.id}`,name:`Contato Instagram · ${item.sender.id.slice(-6)}`,message:message.slice(0,5000),project:binding.project,occurredAt:new Date(timestamp).toISOString(),instagramAccountId:binding.accountId});
    }
  }
  return {events,ignored};
}
