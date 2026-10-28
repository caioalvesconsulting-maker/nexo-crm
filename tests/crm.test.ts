import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,demoState,estimate,visibleState,saleStatus} from '../lib/crm';
import type {Actor,State} from '../lib/crm';
import {upgradeState,experimentStats} from '../lib/operations';
import {mutateState} from '../lib/commands';
const user={userId:'owner',displayName:'Caio',email:'owner@example.com'};
const actor:Actor={id:'owner',isOwner:true,projects:['Meu projeto'],name:'Caio',role:'Administrador',allLeads:true,finance:true,export:true};
const apply=(s:State,type:string,payload:Record<string,unknown>,a=actor)=>mutateState(s,{type,payload:{...payload,...(type==='lead.move'&&['won','lost'].includes(String(payload.stage))?{reason:'Motivo de teste registrado'}:{})}},a,false);
function lead(){return apply(emptyState(user),'lead.save',{name:'Lead real',value:100000,phone:'11999998888',email:'lead@example.com',ownerId:'owner',source:'Instagram'});}
const future=(days:number,hour=10)=>{const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)+`T${String(hour).padStart(2,'0')}:00:00-03:00`;};
test('cadastro cria lead, histórico e tarefa automática sem modificar o estado original',()=>{const before=emptyState(user),after=apply(before,'lead.save',{name:'Maria',value:100000});assert.equal(before.deals.length,0);assert.equal(after.deals.length,1);assert.equal(after.tasks.length,1);assert.ok(after.deals[0].history.length);});
test('duplicidade exige confirmação e reutiliza contato entre oportunidades',()=>{let s=lead();assert.throws(()=>apply(s,'lead.save',{name:'Outra oportunidade',phone:'(11) 99999-8888',value:50000}),/Já existe/);s=apply(s,'lead.save',{name:'Outra oportunidade',phone:'(11) 99999-8888',value:50000,reuseContact:true});assert.equal(s.contacts.length,1);assert.equal(s.deals.length,2);assert.equal(s.deals[0].contactId,s.deals[1].contactId);});
test('LOSS exige motivo e FUP exige data futura',()=>{const s=lead(),dealId=s.deals[0].id;assert.throws(()=>apply(s,'lead.move',{dealId,stage:'lost'}),/motivo/);assert.throws(()=>apply(s,'lead.move',{dealId,stage:'followup',followupAt:'2000-01-01'}),/futura/);const lost=apply(s,'lead.move',{dealId,stage:'lost',lossReason:'Preço'});assert.equal(lost.deals[0].lossReason,'Preço');const fup=apply(s,'lead.move',{dealId,stage:'followup',followupAt:future(2)});assert.equal(fup.tasks.length,s.tasks.length+1);});
test('agenda bloqueia conflito, limita expediente e avança o funil',()=>{let s=lead();const dealId=s.deals[0].id;s=apply(s,'meeting.save',{dealId,start:future(2),ownerId:'owner',duration:45});assert.equal(s.deals[0].stage,'scheduled');assert.throws(()=>apply(s,'meeting.save',{dealId,start:future(2),ownerId:'owner',duration:30}),/já tem/);assert.throws(()=>apply(s,'meeting.save',{dealId,start:future(3,23),ownerId:'owner',duration:30}),/expediente/);s=apply(s,'meeting.status',{id:s.meetings[0].id,status:'Cancelada'});assert.equal(s.deals[0].stage,'booking');});
test('WIN gera pendência, preserva taxa histórica e suporta recebimentos parciais',()=>{let s=lead();s=apply(s,'fee.save',{platform:'Minha plataforma',method:'Pix',percent:2,fixed:100,effectiveAt:'2020-01-01'});const feeId=s.fees[0].id,dealId=s.deals[0].id;s=apply(s,'lead.move',{dealId,stage:'won',gross:100000,discount:10000,method:'Pix',feeId,installments:1,due:future(2).slice(0,10)});const sale=s.sales[0];assert.equal(sale.amount,90000);assert.equal(sale.estimatedFee,1900);assert.equal(sale.estimatedNet,88100);assert.equal(saleStatus(sale),'Pendente');assert.equal(sale.receipts.length,0);s=apply(s,'fee.save',{...s.fees[0],percent:5});assert.equal(s.sales[0].feeSnapshot?.percent,2);assert.equal(s.sales[0].estimatedFee,1900);s=apply(s,'sale.receive',{id:sale.id,gross:45000,fee:950,at:new Date().toISOString()});assert.equal(saleStatus(s.sales[0]),'Parcial');assert.throws(()=>apply(s,'sale.receive',{id:sale.id,gross:50000,fee:0,at:new Date().toISOString()}),/ultrapassa/);s=apply(s,'sale.receive',{id:sale.id,gross:45000,fee:950,at:new Date().toISOString()});assert.equal(saleStatus(s.sales[0]),'Pago');assert.equal(s.sales[0].receipts.reduce((n,r)=>n+r.net,0),88100);});
test('reabrir e ganhar novamente não duplica a venda ativa',()=>{let s=lead();const dealId=s.deals[0].id;s=apply(s,'lead.move',{dealId,stage:'won',gross:100000,method:'Pix',due:future(2).slice(0,10)});s=apply(s,'lead.move',{dealId,stage:'conversation'});s=apply(s,'lead.move',{dealId,stage:'won'});assert.equal(s.sales.length,1);});
test('perfis não autorizados não editam taxas nem veem financeiro ou leads alheios',()=>{const s=upgradeState(demoState(user),user.userId),sdr:Actor={id:'ana',isOwner:false,projects:['Mentoria Scale'],name:'Ana',role:'SDR',allLeads:false,finance:false,export:false};assert.throws(()=>apply(s,'fee.save',{},sdr),/proprietário/);assert.throws(()=>apply(s,'sale.receive',{},sdr),/financeiro/);const visible=visibleState(s,sdr);assert.equal(visible.sales.length,0);assert.equal(visible.fees.length,0);assert.ok(visible.deals.every(d=>d.ownerId==='ana'||d.sdrId==='ana'||d.closerId==='ana'));});
test('nenhuma mensagem real é enviada sem integração',()=>{const s=lead(),dealId=s.deals[0].id;assert.throws(()=>apply(s,'message.send',{dealId,text:'Olá'}),/Conecte/);const draft=apply(s,'message.send',{dealId,text:'Olá',draft:true});assert.equal(draft.messages[0].status,'draft');});
test('automações por prazo não duplicam tarefas em execuções consecutivas',()=>{let s=lead();s.deals[0].updatedAt='2020-01-01T10:00:00Z';s=apply(s,'automation.run',{});const n=s.tasks.length;s=apply(s,'automation.run',{});assert.equal(s.tasks.length,n);});
test('dinheiro usa centavos, rejeita negativos e taxas acima de 100%',()=>{const s=lead();assert.throws(()=>apply(s,'fee.save',{platform:'X',method:'Pix',percent:80,anticipation:30,effectiveAt:'2020-01-01'}),/100%/);assert.throws(()=>apply(s,'lead.save',{name:'Inválido',value:-1}),/inválido/);assert.deepEqual(estimate(999,null),{fee:0,net:999});});
import {ingestEvent} from '../lib/inbound';
test('mensagens recebidas criam lead uma vez, atualizam conversa e ignoram retransmissão',()=>{const start=emptyState(user),event={eventId:'event-1',channel:'Instagram' as const,externalContactId:'ig-person-123',name:'Joana',message:'Quero saber mais'};const first=ingestEvent(start,event);assert.equal(first.state.deals.length,1);assert.equal(first.state.deals[0].stage,'conversation');assert.equal(first.state.messages.length,1);assert.equal(first.state.tasks.length,1);const repeat=ingestEvent(first.state,event);assert.equal(repeat.duplicate,true);assert.equal(repeat.state.messages.length,1);const second=ingestEvent(first.state,{...event,eventId:'event-2',message:'Podemos marcar uma call?'});assert.equal(second.state.deals.length,1);assert.equal(second.state.messages.length,2);assert.equal(second.dealId,first.dealId);});
test('mensagem após encerramento mantém contato e cria nova oportunidade',()=>{const event={eventId:'event-1',channel:'WhatsApp' as const,externalContactId:'5511999998888',name:'Joana',message:'Olá'};let s=ingestEvent(emptyState(user),event).state;s=apply(s,'lead.move',{dealId:s.deals[0].id,stage:'lost',lossReason:'Preço'});const next=ingestEvent(s,{...event,eventId:'event-2'});assert.equal(next.state.contacts.length,1);assert.equal(next.state.deals.length,2);assert.equal(next.state.deals[0].stage,'conversation');});
const limited:Actor={id:'ana',name:'Ana',role:'Administrador',isOwner:false,projects:['Mentoria Scale'],allLeads:true,finance:true,export:true};
test('cargo de administrador nunca ultrapassa as operações explicitamente liberadas',()=>{
 const s=upgradeState(demoState(user),'owner'),v=visibleState(s,limited),other=s.deals.find(d=>d.project!=='Mentoria Scale')!;
 assert.deepEqual(v.projects,['Mentoria Scale']);assert.deepEqual(Object.keys(v.projectDetails),v.projects);
 assert.ok(v.deals.length>0&&v.deals.every(d=>d.project==='Mentoria Scale'));
 assert.ok(v.contacts.every(c=>c.project==='Mentoria Scale'));
 for(const rows of [v.fees,v.rules,v.funnels,v.experiments,v.feedback,v.tasks])assert.ok(rows.every(r=>r.project==='Mentoria Scale'));
 assert.ok(v.messages.every(m=>v.deals.some(d=>d.id===m.dealId)));assert.ok(v.sales.every(m=>v.deals.some(d=>d.id===m.dealId)));
 assert.equal(v.audit.length,0);assert.ok(v.members.every(m=>m.projects?.every(p=>p==='Mentoria Scale')));
 assert.throws(()=>apply(s,'lead.note',{dealId:other.id,text:'Acesso indevido'},limited),/permissão/);
 assert.throws(()=>apply(s,'lead.save',{project:other.project,name:'Acesso indevido'},limited),/autorizada/);
 assert.throws(()=>apply(s,'member.save',{...s.members[1],projects:s.projects},limited),/proprietário/);
 assert.throws(()=>apply(s,'project.add',{name:'Nova'},limited),/proprietário/);
});
test('novos projetos pertencem só ao dono até concessão explícita; migração antiga falha fechada',()=>{
 let s=upgradeState(demoState(user),'owner');const before=[...s.members[1].projects!];s=apply(s,'project.add',{name:'Operação privada'});
 assert.deepEqual(s.members[1].projects,before);assert.ok(s.members[0].projects?.includes('Operação privada'));assert.equal(s.funnels.filter(f=>f.project==='Operação privada').length,6);
 const old=structuredClone(s);delete old.members[1].projects;assert.deepEqual(upgradeState(old,'owner').members[1].projects,[]);
 assert.throws(()=>apply(s,'member.save',{...s.members[1],projects:['Inexistente']}),/Operação inválida/);
 s=apply(s,'member.save',{...s.members[1],projects:['Operação privada']});assert.deepEqual(s.members[1].projects,['Operação privada']);
});
test('contatos iguais e eventos de canais são isolados por operação',()=>{
 let s=lead();s=apply(s,'project.add',{name:'Outra operação'});s=apply(s,'lead.save',{name:'Lead em outra operação',project:'Outra operação',email:'lead@example.com'});
 assert.equal(s.contacts.length,2);assert.notEqual(s.deals[0].contactId,s.deals[1].contactId);
 const e={eventId:'same',channel:'Instagram' as const,externalContactId:'person',message:'Olá'};
 assert.throws(()=>ingestEvent(s,e),/operação de destino/);s=ingestEvent(s,{...e,project:'Meu projeto'}).state;s=ingestEvent(s,{...e,project:'Outra operação'}).state;
 assert.equal(s.inboundIds?.length,2);
 const foreign=s.funnels.find(f=>f.project==='Outra operação')!;assert.throws(()=>apply(s,'lead.save',{name:'Inválido',project:'Meu projeto',funnelId:foreign.id}),/Funil de origem inválido/);
});
function experiment(s=lead(),kind='SDR'){return apply(s,'experiment.save',{project:'Meu projeto',name:'Vídeo antes da call',kind,hypothesis:'Vídeo aumenta agendamentos',variantA:'Conversa sem vídeo',variantB:'Vídeo do YouTube antes da conversa'});}
test('A/B sorteia novos leads elegíveis uma vez e impede testes simultâneos contaminando o público',()=>{
 let s=experiment();const e=s.experiments[0];s=apply(s,'lead.save',{name:'Novo elegível'});const d=s.deals[0],a=d.experimentAssignments![0];assert.equal(a.experimentId,e.id);assert.equal(a.method,'random');assert.ok(['A','B'].includes(a.variant));
 assert.throws(()=>apply(s,'experiment.assign',{dealId:d.id,experimentId:e.id}),/já participa/);
 assert.throws(()=>experiment(s),/Já existe um teste ativo/);s=apply(s,'experiment.status',{id:e.id,status:'Pausado'});s=apply(s,'lead.save',{name:'Sem teste pausado'});assert.equal(s.deals[0].experimentAssignments?.length||0,0);
 assert.equal(s.deals.find(x=>x.id===d.id)!.experimentAssignments![0].variant,a.variant);
});
test('métricas A/B excluem atribuições manuais e resultados anteriores; abertos continuam na amostra',()=>{
 let s=experiment(),e=s.experiments[0];s=apply(s,'lead.save',{name:'Amostra aleatória'});const d=s.deals[0];d.experimentAssignments![0]={experimentId:e.id,variant:'A',method:'random',at:'2026-01-02T00:00:00Z'};
 s=apply(s,'experiment.assign',{dealId:s.deals[1].id,experimentId:e.id,variant:'B'});
 s.meetings.push({id:'old-call',dealId:d.id,ownerId:'owner',title:'Antiga',createdAt:'2026-01-01T00:00:00Z',start:future(1),duration:30,status:'Agendada',notes:'',link:''});
 let [a,b]=experimentStats(s,e);assert.equal(a.total,1);assert.equal(a.open,1);assert.equal(a.success,0);assert.equal(b.total,0);assert.equal(b.manual,1);
 s.meetings[0].createdAt='2026-01-03T00:00:00Z';[a,b]=experimentStats(s,e);assert.equal(a.success,1);assert.equal(a.rate,1);assert.ok(a.low<1&&a.high<=1);
 s.meetings[0].status='Cancelada';assert.equal(experimentStats(s,e)[0].success,0);
});
test('conclusão de call exige relato do closer e SDR registra ação, material e consciência',()=>{
 let s=lead(),dealId=s.deals[0].id;s=apply(s,'meeting.save',{dealId,start:future(2),ownerId:'owner',duration:30});const meetingId=s.meetings[0].id;
 assert.throws(()=>apply(s,'meeting.status',{id:meetingId,status:'Realizada'}),/pitch/);
 const feedback={dealId,kind:'Closer',meetingId,pitch:'Apresentei o plano de execução',reason:'Precisa alinhar com o sócio',outcome:'followup',awarenessBefore:'Reconhece o problema',awarenessAfter:'Conhece a oferta'};
 s=apply(s,'feedback.save',feedback);assert.equal(s.meetings[0].status,'Realizada');assert.equal(s.feedback[0].pitch,feedback.pitch);assert.equal(s.deals[0].awareness,'Conhece a oferta');
 assert.throws(()=>apply(s,'feedback.save',{...feedback,kind:'SDR',meetingId:undefined}),/ação de qualificação/);
 s=apply(s,'feedback.save',{...feedback,kind:'SDR',meetingId:undefined,action:'Elevei o nível de consciência com vídeo no YouTube',resourceUrl:'https://www.youtube.com/watch?v=example'});assert.equal(s.feedback.length,2);
 const closer={...actor,isOwner:false,role:'Closer' as const,projects:['Meu projeto']};assert.throws(()=>apply(s,'feedback.save',{...feedback,kind:'SDR'},closer),/próprio perfil/);
});
test('motivo de fechamento persiste no histórico e estorno preserva o registro',()=>{
 let s=lead();const dealId=s.deals[0].id;assert.throws(()=>mutateState(s,{type:'lead.move',payload:{dealId,stage:'won'}},actor),/por que fechou/);
 s=mutateState(s,{type:'lead.move',payload:{dealId,stage:'won',reason:'Confiança no diagnóstico apresentado',gross:100000,method:'Pix',due:future(2).slice(0,10)}},actor);
 assert.ok(s.deals[0].history.some(h=>h.text.includes('Confiança no diagnóstico')));
 s=apply(s,'sale.status',{id:s.sales[0].id,status:'Cancelada',note:'Cliente desistiu'});assert.equal(s.sales[0].status,'Cancelada');
});
