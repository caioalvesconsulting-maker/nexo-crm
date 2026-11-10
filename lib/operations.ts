import {ensureLifecycle} from './lifecycle';
import {canProject,uid} from './crm';
import type {State,Actor,Funnel,ProjectDetails,Experiment,Deal,Assignment} from './crm';
export const DEFAULT_STAGES:ProjectDetails['stageNotes']={
 conversation:{description:'Primeiro contato recebido. Entender a origem, o perfil e o contexto do lead.',exit:'Necessidade identificada, responsável atribuído e próximo passo registrado.'},
 booking:{description:'Lead demonstrou interesse. O SDR qualifica o cenário e combina o melhor horário.',exit:'Horário confirmado, responsável definido e reunião registrada na agenda.'},
 scheduled:{description:'Call confirmada. Preparar diagnóstico, revisar ações do SDR e executar o pitch atribuído.',exit:'Registrar pitch, objeções, resultado e motivo ao concluir a reunião.'},
 followup:{description:'A decisão ainda está em aberto. Retomar com contexto, conteúdo e um prazo claro.',exit:'Registrar próxima ação e data; avançar quando houver decisão ou nova reunião.'},
 won:{description:'Proposta aceita e venda registrada com valor, condições e forma de pagamento.',exit:'Explicar o motivo do fechamento e acompanhar o recebimento no financeiro.'},
 lost:{description:'Oportunidade encerrada sem venda. O aprendizado permanece no histórico.',exit:'Motivo de perda obrigatório; registrar objeções e contexto para análises futuras.'},
};
const templates=[
 ['YouTube','O lead chegou por um vídeo, descrição ou chamada para ação no YouTube.','Vídeo ou link na descrição.','Registrar vídeo/campanha, principal interesse e nível de consciência.','Continuar a conversa e oferecer uma call quando houver contexto.'],
 ['Story · isca → página de vendas','O lead viu uma isca em um story e seguiu para a página de vendas.','Story com isca e link para a página.','Identificar isca, oferta vista e objeções sobre a página.','Validar intenção e encaminhar para diagnóstico ou fechamento.'],
 ['Story · formulário','O lead respondeu ao formulário divulgado em um story.','Formulário com respostas de qualificação.','Conferir respostas, necessidade, momento e adequação à oferta.','Fazer primeiro contato e combinar a próxima ação.'],
 ['Grupo de networking','Contato iniciado em um grupo, comunidade ou evento de networking.','Conversa no grupo, indicação ou contato direto.','Registrar grupo e contexto da conexão; evitar abordagem sem contexto.','Estabelecer relacionamento e avaliar interesse em uma conversa.'],
 ['Tráfego pago','O lead veio de uma campanha de anúncios.','Anúncio → mensagem, formulário ou página.','Registrar campanha, criativo, promessa e necessidade declarada.','Qualificar e conduzir ao próximo passo do funil comercial.'],
 ['Direto / indicação / outros','Entrada direta, indicação de cliente ou origem ainda não identificada.','Contato recebido ou cadastro manual.','Identificar a origem com o lead e registrar quem indicou, se aplicável.','Atribuir responsável e definir o primeiro contato.'],
];
export function defaultFunnels(project:string):Funnel[]{return templates.map(([name,description,entry,qualification,nextStep],i)=>({id:`funnel:${encodeURIComponent(project)}:${i}`,project,name,description,entry,qualification,nextStep,active:true}));}
export function ensureProject(s:State,project:string){s.projectDetails[project]||={description:'Operação comercial independente, com equipe e indicadores próprios.',stageNotes:structuredClone(DEFAULT_STAGES)};if(!s.funnels.some(f=>f.project===project))s.funnels.push(...defaultFunnels(project));}
export function upgradeState(input:State,ownerId:string):State{
 const s=structuredClone(input);s.ownerId=ownerId;s.projectDetails||={};s.funnels||=[];s.experiments||=[];s.feedback||=[];s.teams||=[];
 for(const p of s.projects)ensureProject(s,p);
 for(const m of s.members){m.projects=m.id===ownerId?[...s.projects]:(m.projects||[]).filter(p=>s.projects.includes(p));}
 for(const t of s.teams)t.memberIds=t.memberIds.filter(id=>s.members.some(m=>m.id===id&&m.active&&(m.id===ownerId||m.projects?.includes(t.project))));
 for(const d of s.deals){d.awareness||='Não identificado';d.experimentAssignments||=[];d.funnelId||=s.funnels.find(f=>f.project===d.project&&f.name==='Direto / indicação / outros')?.id;
   const c=s.contacts.find(c=>c.id===d.contactId);if(c){if(c.project&&c.project!==d.project){const existing=s.contacts.find(x=>x.id===`${c.id}::${d.project}`);const copy=existing||{...c,id:`${c.id}::${d.project}`,project:d.project};if(!existing)s.contacts.push(copy);d.contactId=copy.id;}else c.project=d.project;}
 }
 for(const t of s.tasks)t.project||=s.deals.find(d=>d.id===t.dealId)?.project||s.projects[0];
 s.fees=s.fees.flatMap(f=>f.project?[f]:s.projects.map((project,i)=>({...f,project,id:i===0?f.id:`${f.id}::${project}`})));
 s.rules=s.rules.flatMap(r=>r.project?[r]:s.projects.map((project,i)=>({...r,project,id:i===0?r.id:`${r.id}::${project}`,runs:i===0?r.runs:0})));
 s.integrations=Object.fromEntries(Object.entries(s.integrations).map(([key,v])=>{const project=v.project||s.projects[0],channel=v.channel||key;return[`${project}::${channel}`,{...v,project,channel}];}));
 ensureLifecycle(s);s.schemaVersion=2;return s;
}
export function assignExperiment(deal:Deal,experiment:Experiment,method:'random'|'manual'='random',variant?:'A'|'B'){
 deal.experimentAssignments||=[];if(deal.experimentAssignments.some(a=>a.experimentId===experiment.id))return;
 const choice=variant||(crypto.getRandomValues(new Uint8Array(1))[0]<128?'A':'B');deal.experimentAssignments.push({experimentId:experiment.id,variant:choice,method,at:new Date().toISOString()});
}
export function autoAssign(s:State,d:Deal){for(const e of s.experiments.filter(e=>e.project===d.project&&e.status==='Ativo'&&e.assignOnCreate&&(!e.funnelId||e.funnelId===d.funnelId)))assignExperiment(d,e);}
export function experimentStats(s:State,e:Experiment){
 const metric=e.metric;return(['A','B'] as const).map(variant=>{
 const assigned=s.deals.filter(d=>d.project===e.project&&d.experimentAssignments?.some(a=>a.experimentId===e.id&&a.variant===variant&&a.method==='random'));
 const success=assigned.filter(d=>{const a=d.experimentAssignments!.find(a=>a.experimentId===e.id)!;return metric==='won'?(d.wonAt?d.wonAt>=a.at:s.sales.some(sale=>sale.dealId===d.id&&sale.status==='Ativa'&&sale.createdAt>=a.at)):s.meetings.some(m=>m.dealId===d.id&&m.status!=='Cancelada'&&(m.createdAt||'')>=a.at);}).length;
 const n=assigned.length,p=n?success/n:0,z=1.96,denom=1+z*z/(n||1),center=(p+z*z/(2*(n||1)))/denom,margin=z*Math.sqrt(p*(1-p)/(n||1)+z*z/(4*(n||1)**2))/denom;
 return{variant,total:n,success,rate:p,low:n?Math.max(0,center-margin):0,high:n?Math.min(1,center+margin):1,open:assigned.filter(d=>!['won','lost'].includes(d.stage)).length,manual:s.deals.filter(d=>d.experimentAssignments?.some(a=>a.experimentId===e.id&&a.variant===variant&&a.method==='manual')).length};
 });
}
// UI scoping is additional to server authorization. The server already removes
// every record outside the visitor's explicit project memberships.
export function scopeOperation(input:State,project:string):State{
 if(!project)return input;const s=structuredClone(input),ids=new Set(s.deals.filter(d=>d.project===project).map(d=>d.id));
 s.deals=s.deals.filter(d=>ids.has(d.id));s.contacts=s.contacts.filter(c=>s.deals.some(d=>d.contactId===c.id));s.tasks=s.tasks.filter(t=>t.project===project);s.meetings=s.meetings.filter(m=>ids.has(m.dealId));s.sales=s.sales.filter(x=>ids.has(x.dealId));s.messages=s.messages.filter(m=>ids.has(m.dealId));s.fees=s.fees.filter(f=>f.project===project);s.rules=s.rules.filter(r=>r.project===project);s.logs=s.logs.filter(l=>ids.has(l.dealId));s.funnels=s.funnels.filter(f=>f.project===project);s.experiments=s.experiments.filter(e=>e.project===project);s.feedback=s.feedback.filter(f=>f.project===project);s.audit=s.audit.filter(a=>a.project===project);s.teams=(s.teams||[]).filter(t=>t.project===project);s.followups=s.followups.filter(f=>f.project===project);s.followupNotices=s.followupNotices.filter(n=>n.project===project);for(const key of Object.keys(s.learning) as (keyof State['learning'])[])s.learning[key]=(s.learning[key] as any[]).filter(x=>x.project===project) as any;s.operationMaps=Object.fromEntries(Object.entries(s.operationMaps).filter(([p])=>p===project));return s;
}
