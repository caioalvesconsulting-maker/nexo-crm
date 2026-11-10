import type {Deal,Funnel} from './crm';
export type AcquisitionRow={name:string;count:number;won:number;percent:number};
export function acquisitionMetrics(deals:Deal[],funnels:Funnel[]){
 const origins=new Map<string,{count:number;won:number}>(),channels=new Map<string,{count:number;won:number}>();let unspecified=0;
 for(const d of deals){const funnel=funnels.find(f=>f.id===d.funnelId&&f.project===d.project),name=funnel?.name||'Origem não informada';
  if(!funnel||name==='Direto / indicação / outros')unspecified++;
  for(const [map,key] of [[origins,name],[channels,d.source||'Canal não informado']] as const){const row=map.get(key)||{count:0,won:0};row.count++;if(d.stage==='won')row.won++;map.set(key,row);}
 }
 const rows=(map:Map<string,{count:number;won:number}>):AcquisitionRow[]=>[...map].map(([name,v])=>({name,...v,percent:deals.length?v.count/deals.length*100:0})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));
 return {total:deals.length,unspecified,origins:rows(origins),channels:rows(channels)};
}
