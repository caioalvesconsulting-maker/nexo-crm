import {emptySuccess} from './success';
import type {SuccessState} from './success';
import {canFollowup,canManageLearning} from './lifecycle';
import type {Followup,Learning,OperationMap,AppNotice} from './lifecycle';
export const STAGES = [
  { id: 'conversation', name: 'Leads em conversa', short: 'Em conversa', color: '#6695ff' },
  { id: 'booking', name: 'Marcando call', short: 'Marcando call', color: '#bc91ff' },
  { id: 'scheduled', name: 'Call agendada', short: 'Call agendada', color: '#f0bd65' },
  { id: 'followup', name: 'FUP', short: 'Follow-up', color: '#f48f6c' },
  { id: 'won', name: 'WIN', short: 'Venda ganha', color: '#58caa1' },
  { id: 'lost', name: 'LOSS', short: 'Venda perdida', color: '#ec7d91' },
] as const;

export type Assignment={experimentId:string;variant:'A'|'B';at:string;method:'random'|'manual'};
export type Funnel={id:string;project:string;name:string;description:string;entry:string;qualification:string;nextStep:string;active:boolean};
export type ProjectDetails={description:string;stageNotes:Record<string,{description:string;exit:string}>};
export type Experiment={id:string;project:string;name:string;kind:'SDR'|'Closer';hypothesis:string;variantA:string;variantB:string;status:'Ativo'|'Pausado'|'Encerrado';createdAt:string;funnelId:string;metric:'scheduled'|'won';assignOnCreate:boolean};
export type Feedback={id:string;project:string;dealId:string;meetingId?:string;actorId:string;actorName:string;kind:'SDR'|'Closer';at:string;pitch:string;reason:string;outcome:'won'|'lost'|'followup'|'qualified';awarenessBefore:string;awarenessAfter:string;action:string;resourceUrl:string;objections:string;experimentId:string;variant:''|'A'|'B'};
export const AWARENESS=['Não identificado','Não reconhece o problema','Reconhece o problema','Conhece soluções','Conhece a oferta','Pronto para decidir'];

export type Stage = typeof STAGES[number]['id'];
export type Role = 'Administrador' | 'Gestor' | 'SDR' | 'Closer' | 'Suporte/CS' | 'Editor';
export type Channel = 'Instagram' | 'WhatsApp' | 'E-mail' | 'TikTok' | 'Indicação' | 'Site';
export type Member = { projects?: string[]; id: string; name: string; email: string; role: Role; active: boolean; allLeads: boolean; finance: boolean; export: boolean };
export type Contact = { project?: string; id: string; name: string; company: string; email: string; phone: string; instagram: string; externalIds?: Record<string,string> };
export type Activity = { project?: string; id: string; at: string; actor: string; text: string };
export type Attachment = { id: string; name: string; size: number; type: string };
export type Deal = { funnelId?: string; awareness?: string; wonAt?: string; experimentAssignments?: Assignment[]; id: string; contactId: string; stage: Stage; source: Channel; project: string; product: string; campaign: string; ownerId: string; sdrId: string; closerId: string; value: number; tags: string[]; notes: string; createdAt: string; updatedAt: string; followupAt?: string; lossReason?: string; history: Activity[]; attachments: Attachment[]; fields: Record<string,string> };
export type SalesTeam = {id:string;project:string;name:string;description:string;memberIds:string[];active:boolean};
export type Task = { followupId?:string; description?:string; batchId?:string; completedAt?:string; project?: string; id: string; title: string; dealId: string; ownerId: string; due: string; priority: 'Alta' | 'Média' | 'Baixa'; done: boolean; createdAt: string; automationKey?: string; slaNotified?: Record<string,string> };
export type Meeting = { createdAt?: string; id: string; title: string; dealId: string; ownerId: string; start: string; duration: number; notes: string; status: 'Agendada' | 'Realizada' | 'Cancelada'; link: string };
export type Fee = { project?: string; id: string; platform: string; method: 'Pix' | 'Boleto' | 'Cartão'; percent: number; fixed: number; installments: number; anticipation: number; days: number; effectiveAt: string; active: boolean };
export type Receipt = { id: string; gross: number; fee: number; net: number; at: string; note: string };
export type Sale = { id: string; dealId: string; gross: number; discount: number; amount: number; installments: number; method: string; platform: string; feeSnapshot: Fee | null; estimatedFee: number; estimatedNet: number; due: string; createdAt: string; receipts: Receipt[]; status: 'Ativa' | 'Cancelada' | 'Estornada' };
export type Message = { id: string; dealId: string; channel: string; text: string; at: string; direction: 'in' | 'out' | 'note'; status: 'received' | 'demo' | 'note' | 'draft' };
export type Rule = { project?: string; id: string; name: string; description: string; event: 'lead_created' | 'stage_changed' | 'sla' | 'no_reply'; stage: string; action: 'task' | 'followup'; hours: number; enabled: boolean; runs: number };
export type AutomationLog = { id: string; at: string; ruleId: string; dealId: string; text: string };
export type State = { success:SuccessState; followups:Followup[]; learning:Learning; operationMaps:Record<string,OperationMap>; followupNotices:AppNotice[]; followupDaily:Record<string,string>; teams:SalesTeam[]; cloudAutomation?: {id:string;at:string}; schemaVersion: number; ownerId: string; projectDetails: Record<string,ProjectDetails>; funnels: Funnel[]; experiments: Experiment[]; feedback: Feedback[]; inboundIds?: string[]; contacts: Contact[]; deals: Deal[]; tasks: Task[]; meetings: Meeting[]; sales: Sale[]; fees: Fee[]; members: Member[]; messages: Message[]; rules: Rule[]; logs: AutomationLog[]; projects: string[]; lossReasons: string[]; audit: Activity[]; settings: { name: string; timezone: string; workingStart: string; workingEnd: string; slaHours: number }; integrations: Record<string, { account: string; notes: string; project?: string; channel?: string; instagramAccountId?: string; lastWebhookAt?: string }> };
export type Actor = { isOwner: boolean; projects: string[]; id: string; name: string; role: Role; allLeads: boolean; finance: boolean; export: boolean };
export const uid = () => crypto.randomUUID();
export const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const roundMoney = (n: number) => Math.round(n * 100);
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const stamp = (date: string, time = false) => date ? new Date(date).toLocaleString('pt-BR', time ? { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' } : { day:'2-digit', month:'short', timeZone:'America/Sao_Paulo' }) : '—';
export const stageName = (id: string) => STAGES.find(s => s.id === id)?.name || id;
export const contactOf = (state: State, deal: Deal) => state.contacts.find(c => c.id === deal.contactId)!;
export function saleStatus(sale: Sale) {
  if (sale.status !== 'Ativa') return sale.status;
  const paid = sale.receipts.reduce((n,r) => n+r.gross,0);
  if (paid >= sale.amount) return 'Pago'; if (paid > 0) return 'Parcial';
  if (new Date(`${sale.due}T23:59:59-03:00`).getTime() < Date.now()) return 'Vencido'; return 'Pendente';
}
export function estimate(amount: number, fee: Fee | null) {
  const cost = fee ? Math.min(amount, Math.round(amount * (fee.percent + fee.anticipation) / 100) + fee.fixed) : 0;
  return { fee: cost, net: amount - cost };
}
export function emptyState(user: {userId:string; displayName:string; email:string}): State {
  return {
    schemaVersion:2,success:emptySuccess(),followups:[],learning:{tracks:[],lessons:[],progress:[],scripts:[],calls:[],onboarding:[],onboarded:[]},operationMaps:{},followupNotices:[],followupDaily:{},teams:[],ownerId:user.userId,projectDetails:{},funnels:[],experiments:[],feedback:[],contacts:[], deals:[], tasks:[], meetings:[], sales:[], fees:[], messages:[], logs:[], audit:[],
    members:[{ id:user.userId, name:user.displayName, email:user.email, role:'Administrador', active:true, allLeads:true, finance:true, export:true,projects:['Meu projeto'] }],
    projects:['Meu projeto'], lossReasons:['Preço', 'Momento inadequado', 'Sem resposta', 'Concorrente', 'Falta de interesse', 'Outro'],
    settings:{ name:'Meu workspace', timezone:'America/Sao_Paulo', workingStart:'09:00', workingEnd:'18:00', slaHours:4 }, integrations:{},
    rules:[
      {id:'rule-new',name:'Todo lead merece atenção',description:'Criar tarefa de primeiro contato ao cadastrar um lead.',event:'lead_created',stage:'',action:'task',hours:2,enabled:true,runs:0},
      {id:'rule-fup',name:'Não deixe a conversa esfriar',description:'Criar tarefa de follow-up para oportunidades sem interação.',event:'no_reply',stage:'conversation',action:'task',hours:24,enabled:true,runs:0},
      {id:'rule-sla',name:'Acompanhar tarefas atrasadas',description:'Registrar um alerta quando uma tarefa ultrapassar o prazo.',event:'sla',stage:'',action:'task',hours:4,enabled:true,runs:0},
    ],
  };
}
export function demoState(user: {userId:string; displayName:string; email:string}): State {
  const s = emptyState(user); s.settings.name='Nexo · Comercial'; s.projects=['Mentoria Scale', 'Consultoria Growth', 'Programa Essencial']; s.members[0].name='Você';
  s.members.push({id:'ana',projects:['Mentoria Scale'],name:'Ana Costa',email:'ana@example.com',role:'SDR',active:true,allLeads:false,finance:false,export:false},{id:'lucas',projects:['Mentoria Scale','Consultoria Growth'],name:'Lucas Martins',email:'lucas@example.com',role:'Closer',active:true,allLeads:true,finance:true,export:true});
  const at = (days:number,h=10) => {const base=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(base+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return new Date(d.toISOString().slice(0,10)+'T'+String(h).padStart(2,'0')+':00:00-03:00').toISOString();};
  s.fees=[{id:'fee-pix',platform:'Minha plataforma',method:'Pix',percent:0.99,fixed:0,installments:1,anticipation:0,days:0,effectiveAt:'2026-01-01',active:true},{id:'fee-card',platform:'Minha plataforma',method:'Cartão',percent:3.49,fixed:49,installments:1,anticipation:0,days:30,effectiveAt:'2026-01-01',active:true},{id:'fee-boleto',platform:'Minha plataforma',method:'Boleto',percent:0,fixed:249,installments:1,anticipation:0,days:2,effectiveAt:'2026-01-01',active:true}];
  const names=['Mariana Oliveira','Rafael Santos','Beatriz Almeida','Pedro Henrique','Juliana Rocha','Gabriel Lima','Camila Ferreira','Thiago Costa','Larissa Mendes','Bruno Ribeiro','Fernanda Souza','Diego Alves','Isabela Martins','Felipe Carvalho','Amanda Silva','Gustavo Pereira','Luana Barros','André Nascimento','Carolina Dias','Matheus Cardoso','Renata Azevedo','Vinícius Lopes','Sofia Moreira','Eduardo Freitas'];
  const companies=['Studio Aurora','RS Consultoria','Essência Design','PH Digital','Rocha & Co.','Lima Tech','Flora Studio','Costa Growth'];
  names.forEach((name,i)=>{
    const id=`deal-${i}`, cid=`contact-${i}`; const stage:Stage=i<5?'conversation':i<9?'booking':i<12?'scheduled':i<15?'followup':i<21?'won':'lost';
    const source:Channel=(['Instagram','WhatsApp','Instagram','Site','Indicação','E-mail'] as Channel[])[i%6];
    const owner=s.members[i%3].id, value=[490000,790000,250000,1200000,390000][i%5], createdAt=at(-(i%20));
    s.contacts.push({id:cid,name,company:companies[i%8],email:`contato${i+1}@example.com`,phone:`1190000${String(i+1).padStart(4,'0')}`,instagram:name.split(' ')[0].toLowerCase()+'.demo'});
    const deal:Deal={id,contactId:cid,stage,source,project:s.projects[i%3],product:i%3===0?'Mentoria 12 semanas':i%3===1?'Consultoria estratégica':'Programa de aceleração',campaign:'Orgânico',ownerId:owner,sdrId:'ana',closerId:'lucas',value,tags:[i%3===0?'Alta intenção':i%3===1?'Novo contato':'Qualificado'],notes:'Interessado em estruturar o processo comercial e aumentar as vendas. Retomar os objetivos na próxima conversa.',createdAt,updatedAt:at(-(i%4)),history:[{id:uid(),at:createdAt,actor:'Sistema',text:`Lead criado via ${source}.`},{id:uid(),at:at(-(i%3)),actor:'Ana Costa',text:`Movido para ${stageName(stage)}.`}],attachments:[],fields:{}};
    if(stage==='lost')deal.lossReason=s.lossReasons[(i-21)%3];if(stage==='followup')deal.followupAt=at(1);s.deals.push(deal);
    if(i<15)s.tasks.push({id:`task-${i}`,title:i<5?'Fazer primeiro contato':i<9?'Confirmar melhor horário':i<12?'Preparar call de diagnóstico':'Retomar proposta comercial',dealId:id,ownerId:owner,due:at(i%3-1,10+i%7),priority:i%3===0?'Alta':'Média',done:false,createdAt});
    if(stage==='scheduled')s.meetings.push({id:`meeting-${i}`,createdAt,title:'Call de diagnóstico',dealId:id,ownerId:owner,start:at(i-9,10+(i%3)*2),duration:45,notes:'Entender o momento e apresentar a proposta.',status:'Agendada',link:''});
    if(stage==='won'){const f=s.fees[i%3], costs=estimate(value,f), paid=i%3!==1;s.sales.push({id:`sale-${i}`,dealId:id,gross:value,discount:0,amount:value,installments:1,method:f.method,platform:f.platform,feeSnapshot:{...f},estimatedFee:costs.fee,estimatedNet:costs.net,due:at(i%3===1?7:-1).slice(0,10),createdAt:at(-(i%15)),receipts:paid?[{id:uid(),gross:value,fee:costs.fee,net:costs.net,at:at(-(i%12)),note:'Recebimento demonstrativo'}]:[],status:'Ativa'});}
    if(i<12)s.messages.push({id:`msg-${i}-1`,dealId:id,channel:source,text:'Olá! Vi o conteúdo de vocês e queria saber mais sobre a mentoria.',at:at(-(i%3),9),direction:'in',status:'received'},{id:`msg-${i}-2`,dealId:id,channel:source,text:`Olá, ${name.split(' ')[0]}! Que bom ter você por aqui. Me conta um pouco sobre o seu negócio?`,at:at(-(i%3),10),direction:'out',status:'demo'},{id:`msg-${i}-3`,dealId:id,channel:source,text:'Quero organizar melhor meu comercial e escalar as vendas. Podemos conversar?',at:at(-(i%3),11),direction:'in',status:'received'});
  });return s;
}
export function assert(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
export function clean(v:unknown,max=300){return String(v??'').trim().slice(0,max);}
export function validDate(v:unknown){return typeof v==='string'&&Number.isFinite(new Date(v).getTime());}
export function amount(v:unknown,min=0,max=100000000000){const n=Number(v);assert(Number.isSafeInteger(n)&&n>=min&&n<=max,'Valor numérico inválido.');return n;}
export function canProject(project:string,a:Actor){return a.isOwner||a.projects.includes(project);}
export function accessible(d:Deal,a:Actor){return canProject(d.project,a)&&(a.isOwner||a.allLeads||a.role==='Gestor'||a.role==='Administrador'||d.ownerId===a.id||d.sdrId===a.id||d.closerId===a.id);}
export function visibleState(s:State,a:Actor):State {
  const data=structuredClone(s),allowed=new Set(s.projects.filter(p=>canProject(p,a)));
  data.projects=data.projects.filter(p=>allowed.has(p));data.projectDetails=Object.fromEntries(Object.entries(data.projectDetails).filter(([p])=>allowed.has(p)));
  data.deals=data.deals.filter(d=>accessible(d,a)).map(d=>({...d,wonAt:s.sales.find(x=>x.dealId===d.id&&x.status==='Ativa')?.createdAt}));const ids=new Set(data.deals.map(d=>d.id)), contacts=new Set(data.deals.map(d=>d.contactId));
  data.contacts=data.contacts.filter(c=>contacts.has(c.id));data.tasks=data.tasks.filter(t=>allowed.has(t.project||'')&&(!t.dealId||ids.has(t.dealId))&&(a.isOwner||['Gestor','Administrador'].includes(a.role)||t.ownerId===a.id));data.meetings=data.meetings.filter(m=>ids.has(m.dealId));data.messages=data.messages.filter(m=>ids.has(m.dealId));
  data.fees=data.fees.filter(f=>allowed.has(f.project||''));if(!a.finance&&!a.isOwner){data.sales=[];data.fees=[];}else data.sales=data.sales.filter(x=>ids.has(x.dealId));
  data.rules=data.rules.filter(r=>allowed.has(r.project||''));data.funnels=data.funnels.filter(f=>allowed.has(f.project));data.experiments=data.experiments.filter(e=>allowed.has(e.project));data.feedback=data.feedback.filter(f=>ids.has(f.dealId));
  data.members=data.members.filter(m=>a.isOwner||m.id===s.ownerId||m.id===a.id||(m.projects||[]).some(p=>allowed.has(p))).map(m=>({...m,projects:(m.projects||[]).filter(p=>allowed.has(p))}));
  data.teams=(data.teams||[]).filter(t=>allowed.has(t.project)).map(t=>({...t,memberIds:t.memberIds.filter(id=>data.members.some(m=>m.id===id&&m.active&&(m.id===s.ownerId||m.projects?.includes(t.project))))}));
  data.followups=data.followups.filter(f=>canFollowup(f,a));const followupIds=new Set(data.followups.map(f=>f.id));
  for(const key of ['tracks','lessons','scripts','calls','onboarding'] as const)data.learning[key]=(data.learning[key] as any[]).filter(x=>allowed.has(x.project)) as any;
  if(!canManageLearning(a))data.learning.lessons=data.learning.lessons.filter(l=>l.published).map(l=>({...l,questions:l.questions.map(q=>({id:q.id,question:q.question,options:q.options}))}));
  data.learning.progress=data.learning.progress.filter(p=>allowed.has(p.project)&&(canManageLearning(a)||p.memberId===a.id));data.learning.onboarded=data.learning.onboarded.filter(p=>allowed.has(p.project)&&(canManageLearning(a)||p.memberId===a.id));
  data.operationMaps=Object.fromEntries(Object.entries(data.operationMaps).filter(([p])=>allowed.has(p)));
  data.followupNotices=data.followupNotices.filter(n=>allowed.has(n.project)&&n.ownerId===a.id).map(n=>({...n,leadIds:n.leadIds.filter(id=>followupIds.has(id))}));data.followupDaily=Object.fromEntries(Object.entries(data.followupDaily).filter(([p])=>allowed.has(p)));
  data.success.cases=data.success.cases.filter(c=>allowed.has(c.project));data.success.notices=data.success.notices.filter(n=>allowed.has(n.project)&&n.ownerId===a.id);data.success.order=Object.fromEntries(Object.entries(data.success.order).filter(([p])=>allowed.has(p)));data.success.settings=Object.fromEntries(Object.entries(data.success.settings).filter(([p])=>allowed.has(p)));
  data.integrations=Object.fromEntries(Object.entries(data.integrations).filter(([,v])=>allowed.has(v.project||'')));
  if(!a.isOwner){data.audit=[];data.logs=data.logs.filter(x=>ids.has(x.dealId));data.inboundIds=[];}
  return data;
}
