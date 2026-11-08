import {upgradeState} from './operations';
import {assert,clean,uid} from './crm';
import type {State,Actor,Channel} from './crm';
import {mutateState} from './commands';
export type IncomingEvent={eventId:string;channel:'Instagram'|'WhatsApp'|'E-mail'|'TikTok'|'Site';externalContactId:string;name?:string;phone?:string;email?:string;instagram?:string;message:string;project?:string;funnelId?:string;occurredAt?:string};
// Normalized connector boundary. Provider-specific adapters verify their webhook
// signatures, map events to this contract and authenticate to the private Site.
export function ingestEvent(input:State,event:IncomingEvent):{state:State;duplicate:boolean;dealId?:string}{
  assert(event&&['Instagram','WhatsApp','E-mail','TikTok','Site'].includes(event.channel),'Canal inválido.');assert(clean(event.eventId,250)&&event.eventId.length<=250,'ID do evento inválido.');assert(clean(event.externalContactId,250)&&event.externalContactId.length<=250,'ID do contato inválido.');assert(clean(event.message,5000),'Mensagem vazia.');
  const receivedAt=new Date().toISOString();assert(!event.occurredAt||(Number.isFinite(Date.parse(event.occurredAt))&&Date.parse(event.occurredAt)<=Date.now()+300000),'Data da mensagem inválida.');
  const messageAt=event.occurredAt?new Date(event.occurredAt).toISOString():receivedAt;
  let s=upgradeState(input,input.ownerId||input.members[0].id);assert(event.project||s.projects.length===1,'Informe a operação de destino do evento.');const operation=event.project||s.projects[0];assert(s.projects.includes(operation),'Operação de destino inválida.');const key=operation+':'+event.channel+':'+event.eventId;if(s.inboundIds?.includes(key))return{state:s,duplicate:true};
  const owner=s.members.find(m=>m.active&&m.id===s.ownerId);assert(owner,'Configure um administrador antes de receber eventos.');
  const actor:Actor={isOwner:true,projects:s.projects,id:owner.id,name:`Integração ${event.channel}`,role:'Administrador',allLeads:true,finance:true,export:true};
  let contact=s.contacts.find(c=>c.project===operation&&c.externalIds?.[event.channel]===event.externalContactId);
  if(!contact){const phone=clean(event.phone).replace(/\D/g,''),email=clean(event.email).toLowerCase(),ig=clean(event.instagram).replace(/^@/,'').toLowerCase();contact=s.contacts.find(c=>c.project===operation&&((phone&&c.phone.replace(/\D/g,'')===phone)||(email&&c.email.toLowerCase()===email)||(ig&&c.instagram.replace(/^@/,'').toLowerCase()===ig)));}
  let deal=contact?s.deals.find(d=>d.contactId===contact!.id&&!['won','lost'].includes(d.stage)&&(!event.project||d.project===event.project)):undefined;
  if(!deal){s=mutateState(s,{type:'lead.save',payload:{name:contact?.name||clean(event.name)||`${event.channel} ${clean(event.externalContactId,40)}`,phone:contact?.phone||event.phone,email:contact?.email||event.email,instagram:contact?.instagram||event.instagram,contactId:contact?.id,reuseContact:true,value:0,ownerId:owner.id,source:event.channel,project:operation,funnelId:event.funnelId,stage:'conversation'}},actor);deal=s.deals[0];contact=s.contacts.find(c=>c.id===deal!.contactId);}
  assert(contact&&deal,'Não foi possível associar o contato.');contact.externalIds={...contact.externalIds,[event.channel]:clean(event.externalContactId,250)};
  deal.updatedAt=deal.updatedAt>messageAt?deal.updatedAt:messageAt;deal.history.unshift({id:uid(),at:receivedAt,actor:actor.name,text:`Mensagem recebida via ${event.channel}.`});deal.history=deal.history.slice(0,200);
  s.messages.push({id:uid(),dealId:deal.id,channel:event.channel,text:clean(event.message,5000),at:messageAt,direction:'in',status:'received'});s.inboundIds=[...(s.inboundIds||[]),key];assert(JSON.stringify(s).length<4500000,'Limite do workspace atingido.');return{state:s,duplicate:false,dealId:deal.id};
}
