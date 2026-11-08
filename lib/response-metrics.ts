import type {Message} from './crm';

// Count contact/channel conversations, excluding drafts and internal notes.
// The first response is the first outgoing message after the first inbound one.
export function responseMetrics(messages:Message[],dealIds:Set<string>){
 const threads=new Map<string,Message[]>();
 for(const m of messages){
  if(!dealIds.has(m.dealId)||m.direction==='note'||m.status==='draft'||m.status==='note')continue;
  const key=JSON.stringify([m.dealId,m.channel]);threads.set(key,[...(threads.get(key)||[]),m]);
 }
 let total=0,answered=0;const times:number[]=[];
 for(const thread of threads.values()){
  const sorted=[...thread].sort((a,b)=>a.at.localeCompare(b.at));
  const incoming=sorted.find(m=>m.direction==='in');if(!incoming)continue;total++;
  const reply=sorted.find(m=>m.direction==='out'&&m.at>=incoming.at);
  if(reply){answered++;times.push((Date.parse(reply.at)-Date.parse(incoming.at))/60000);}
 }
 times.sort((a,b)=>a-b);const mid=Math.floor(times.length/2);
 return {total,answered,rate:total?Math.round(answered/total*100):null,medianMinutes:times.length?(times.length%2?times[mid]:(times[mid-1]+times[mid])/2):null};
}
