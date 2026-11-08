import {money} from '@/lib/crm';

export type ProjectSlice={name:string;value:number;color:string};
export function ProjectDonut({data,label}:{data:ProjectSlice[];label:string}){
 const total=data.reduce((sum,d)=>sum+d.value,0);
 let position=0;
 const gradient=data.filter(d=>d.value>0).map(d=>{const from=position;position+=d.value/total*100;return `${d.color} ${from}% ${position}%`;}).join(',');
 return <div className="project-distribution">
  <div className={`project-ring ${total?'':'no-values'}`} role="img" aria-label={`${label}: ${money(total)}. ${data.map(d=>`${d.name}: ${money(d.value)}`).join('; ')}`} style={{background:total?`conic-gradient(from -90deg, ${gradient})`:'var(--line)'}}><div className="project-ring-center"><small>{total?'TOTAL NO PERÍODO':'SEM MOVIMENTO'}</small><strong>{money(total)}</strong><span>{label}</span></div></div>
  <div className="project-legend"><table><thead><tr><th>Projeto</th><th>Valor</th></tr></thead><tbody>{data.map(d=><tr key={d.name}><td><span className="project-legend-name"><i style={{background:d.color}}/>{d.name}</span></td><td><strong>{money(d.value)}</strong><small>{total?(d.value/total*100).toLocaleString('pt-BR',{maximumFractionDigits:1}):'0'}%</small></td></tr>)}</tbody></table>{!data.length&&<p className="distribution-empty">Nenhum projeto neste filtro.</p>}{!total&&<p className="distribution-empty">Nenhum valor registrado no período selecionado.</p>}</div>
 </div>;
}
