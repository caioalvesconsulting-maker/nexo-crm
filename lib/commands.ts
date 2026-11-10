import {applyLifecycle} from './lifecycle-commands';
import {blankFollowup,canFollowup,ensureLifecycle,runFollowupAutomation,syncFollowupSale} from './lifecycle';
import {upgradeState,ensureProject,defaultFunnels,assignExperiment,autoAssign} from './operations';
import {AWARENESS,canProject,STAGES,uid,money,stamp,stageName,estimate,assert,clean,validDate,amount,accessible} from './crm';
import type {State,Actor,Deal,Stage,Task,Meeting,Fee,Member,Rule,Feedback,Experiment,Funnel} from './crm';
export type Command={type:string;payload:Record<string,any>};
export function mutateState(input:State,command:Command,actor:Actor,demo=false):State{
  const s=upgradeState(input,input.ownerId||input.members[0].id),p=command.payload||{},type=command.type,now=new Date().toISOString();
  const admin=actor.isOwner,manager=admin||actor.role==='Gestor'||actor.role==='Administrador';
  if(['fee.save','fee.toggle','member.save','settings.save','project.add','project.save','integration.save'].includes(type))assert(admin,'Apenas o proprietário pode realizar esta ação.');
  if(['rule.save','rule.toggle','automation.run'].includes(type))assert(manager,'Acesso restrito à gestão.');
  if(['sale.receive','sale.status'].includes(type))assert(admin||actor.finance,'Você não tem acesso ao financeiro.');
  function deal(id=p.dealId):Deal{const d=s.deals.find(d=>d.id===id);assert(d&&accessible(d,actor),'Oportunidade não encontrada ou sem permissão.');return d;}
  function project(name:string){assert(s.projects.includes(name)&&canProject(name,actor),'Operação não encontrada ou não autorizada.');return name;}
  function member(id:string,operation?:string){assert(s.members.some(m=>m.id===id&&m.active&&(!operation||m.id===s.ownerId||(m.projects||[]).includes(operation))),'Selecione um responsável ativo com acesso a esta operação.');return id;}
  function history(d:Deal,text:string){const a={id:uid(),at:now,actor:actor.name,text,project:d.project};d.history.unshift(a);d.history=d.history.slice(0,200);d.updatedAt=now;s.audit.unshift(a);}
  function task(d:Deal,title:string,due:string,key?:string){if(key&&s.tasks.some(t=>t.automationKey===key))return;s.tasks.unshift({id:uid(),project:d.project,title,dealId:d.id,ownerId:d.ownerId,due,priority:'Média',done:false,createdAt:now,automationKey:key});}
  function rules(event:string,d:Deal){for(const r of s.rules.filter(r=>r.enabled&&r.project===d.project&&r.event===event&&(!r.stage||r.stage===d.stage))){const due=new Date(Date.now()+r.hours*3600000).toISOString();if(r.action==='followup'&&!['won','lost','scheduled'].includes(d.stage)){d.stage='followup';d.followupAt=due;}task(d,r.name,due);r.runs++;s.logs.unshift({id:uid(),at:now,ruleId:r.id,dealId:d.id,text:`${r.name}: tarefa criada.`});}}
  if(type==='followup.win'){
    const f=s.followups.find(f=>f.id===p.id);assert(f&&canFollowup(f,actor)&&f.status==='active','Lead de follow-up indisponível.');assert(admin||actor.finance||actor.role==='Closer','Peça ao gestor ou closer para registrar a venda.');
    let prepared=s,linked=f.dealId?s.deals.find(d=>d.id===f.dealId):undefined;if(linked)assert(accessible(linked,actor),'Sem acesso à oportunidade.');
    if(!linked){prepared=mutateState(s,{type:'lead.save',payload:{project:f.project,name:f.name,phone:f.phone,source:f.stop==='dm'?'Instagram':'WhatsApp',ownerId:f.ownerId,reuseContact:true}},actor,demo);linked=prepared.deals.find(d=>!s.deals.some(old=>old.id===d.id))!;assert(linked,'Não foi possível preparar a venda.');prepared.followups.find(x=>x.id===f.id)!.dealId=linked.id;}
    return mutateState(prepared,{type:'lead.move',payload:{...p,id:undefined,dealId:linked.id,stage:'won'}},actor,demo);
  }
  if(applyLifecycle(s,type,p,actor,now)){}else if(type==='lead.save'){
    const old=p.id?deal(p.id):null;const operation=project(p.project||old?.project||s.projects.find(x=>canProject(x,actor))||'');if(old)assert(operation===old.project,'A operação de uma oportunidade é fixa. Crie uma nova oportunidade no projeto de destino.');assert(clean(p.name).length>=2,'Informe o nome do lead.');
    let c=old?s.contacts.find(c=>c.id===old.contactId):p.contactId?s.contacts.find(c=>c.id===p.contactId):null;
    if(!c){const phone=clean(p.phone).replace(/\D/g,''),email=clean(p.email).toLowerCase(),ig=clean(p.instagram).replace(/^@/,'').toLowerCase();c=s.contacts.find(x=>x.project===operation&&((phone&&x.phone.replace(/\D/g,'')===phone)||(email&&x.email.toLowerCase()===email)||(ig&&x.instagram.replace(/^@/,'').toLowerCase()===ig)));if(c&&!p.reuseContact)throw new Error('Já existe um contato com esse telefone, e-mail ou Instagram. Marque “Usar contato existente” para criar outra oportunidade vinculada.');}
    if(c)assert(c.project===operation,'O contato pertence a outra operação.');
    if(c&&!old)assert(s.deals.some(d=>d.contactId===c!.id&&accessible(d,actor)),'Contato sem permissão de acesso.');
    if(!c){c={id:uid(),project:operation,name:'',company:'',email:'',phone:'',instagram:''};s.contacts.push(c);}
    if(old||!s.deals.some(d=>d.contactId===c!.id))Object.assign(c,{name:clean(p.name),company:clean(p.company),phone:clean(p.phone,30),email:clean(p.email),instagram:clean(p.instagram,100)});
    const stage=(p.stage||'conversation') as Stage;assert(STAGES.some(x=>x.id===stage),'Etapa inválida.');if(!old)assert(['conversation','booking'].includes(stage),'Cadastre o lead e complete os dados ao mover para esta etapa.');
    const owner=member(p.ownerId||actor.id,operation);assert(manager||actor.allLeads||owner===actor.id,'Você só pode cadastrar oportunidades sob sua responsabilidade.');
    const d:Deal=old||{id:uid(),contactId:c.id,stage,source:'Instagram',project:operation,product:'',campaign:'',ownerId:owner,sdrId:'',closerId:'',value:0,tags:[],notes:'',createdAt:now,updatedAt:now,history:[],attachments:[],fields:{}};
    assert(['Instagram','WhatsApp','E-mail','TikTok','Indicação','Site'].includes(p.source||'Instagram'),'Origem inválida.');
    Object.assign(d,{source:p.source||'Instagram',project:operation,product:clean(p.product),campaign:clean(p.campaign),ownerId:owner,sdrId:p.sdrId?member(p.sdrId,operation):'',closerId:p.closerId?member(p.closerId,operation):'',value:amount(p.value??0),tags:Array.isArray(p.tags)?p.tags.slice(0,10).map((t:unknown)=>clean(t,40)):[],notes:clean(p.notes,5000)});
    if(p.funnelId)assert(s.funnels.some(f=>f.id===p.funnelId&&f.project===operation&&(f.active||old?.funnelId===f.id)),'Funil de origem inválido.');d.funnelId=p.funnelId||d.funnelId||s.funnels.find(f=>f.project===operation&&f.name==='Direto / indicação / outros')?.id;if(p.awareness)assert(AWARENESS.includes(p.awareness),'Nível de consciência inválido.');d.awareness=p.awareness||d.awareness||'Não identificado';
    if(!old){autoAssign(s,d);s.deals.unshift(d);history(d,'Oportunidade criada.');rules('lead_created',d);}else history(d,'Cadastro atualizado.');
  }else if(type==='lead.move'){
    const d=deal(),to=p.stage as Stage;assert(STAGES.some(x=>x.id===to),'Etapa inválida.');if(d.stage===to)return s;
    if(['won','lost'].includes(to))assert(clean(p.reason||p.notes)||s.feedback.some(f=>f.dealId===d.id&&f.kind==='Closer'&&f.outcome===to),'Registre por que fechou ou não fechou antes de encerrar a oportunidade.');
    if(to==='lost'){assert(s.lossReasons.includes(p.lossReason),'Selecione o motivo da perda.');d.lossReason=p.lossReason;}
    if(to==='followup'){assert(validDate(p.followupAt)&&new Date(p.followupAt).getTime()>Date.now(),'Defina uma data futura para o follow-up.');d.followupAt=p.followupAt;task(d,'Retomar contato',p.followupAt);}
    if(to==='scheduled')assert(s.meetings.some(m=>m.dealId===d.id&&m.status==='Agendada'&&new Date(m.start).getTime()>Date.now()),'Agende uma reunião antes de mover para Call agendada.');
    if(to==='won'){
      assert(admin||actor.finance||actor.role==='Closer','Você não tem permissão para registrar vendas.');
      if(!s.sales.some(x=>x.dealId===d.id&&x.status==='Ativa')){
        const gross=amount(p.gross??d.value,1),discount=amount(p.discount||0);assert(discount<gross,'O desconto deve ser menor que a venda.');const total=gross-discount;
        assert(['Pix','Boleto','Cartão'].includes(p.method),'Escolha uma forma de pagamento.');assert(validDate(p.due),'Defina o vencimento.');const installments=amount(p.installments||1,1,48);assert(p.method==='Cartão'||installments===1,'Parcelamento disponível para cartão nesta versão.');
        const fee=p.feeId?s.fees.find(f=>f.id===p.feeId&&f.active&&f.project===d.project):null;if(p.feeId)assert(fee&&fee.method===p.method&&fee.installments===installments&&fee.effectiveAt<=now.slice(0,10),'A taxa não corresponde à forma de pagamento, parcelas ou vigência.');
        const costs=estimate(total,fee||null);s.sales.unshift({id:uid(),dealId:d.id,gross,discount,amount:total,installments,method:p.method,platform:fee?.platform||clean(p.platform)||'Sem plataforma',feeSnapshot:fee?{...fee}:null,estimatedFee:costs.fee,estimatedNet:costs.net,due:p.due,createdAt:now,receipts:[],status:'Ativa'});d.value=total;
      }
    }
    if(to==='lost'){
      const c=s.contacts.find(c=>c.id===d.contactId)!;let f=s.followups.find(f=>f.dealId===d.id&&f.status==='active');if(!f){f={...blankFollowup(d.project,d.ownerId,now),dealId:d.id,name:c.name,phone:c.phone};s.followups.unshift(f);}
      if(p.followupStop||p.followupObjection||p.lastContact)applyLifecycle(s,'followup.save',{...f,stop:p.followupStop,objection:p.followupObjection,otherObjection:p.followupOther||'',lastContact:p.lastContact},actor,now);
    }
    if(to==='won')syncFollowupSale(s,d);
    const from=d.stage;d.stage=to;history(d,`Movido de ${stageName(from)} para ${stageName(to)}.${p.lossReason?` Motivo: ${p.lossReason}.`:''}${p.reason||p.notes?` ${clean(p.reason||p.notes,2000)}`:''}`);rules('stage_changed',d);
  }else if(type==='lead.note'){
    const d=deal();assert(clean(p.text),'Escreva uma anotação.');history(d,clean(p.text,5000));
  }else if(type==='lead.field'){
    const d=deal(),key=clean(p.key,60);assert(key&&!['__proto__','constructor','prototype'].includes(key),'Nome de campo inválido.');d.fields[key]=clean(p.value,1000);history(d,`Campo ${key} atualizado.`);
  }else if(type==='task.save'){
    const d=p.dealId?deal():null;assert(clean(p.title),'Informe o título.');assert(validDate(p.due),'Informe um prazo válido.');
    const operation=project(d?.project||p.project||s.projects.find(x=>canProject(x,actor))||'');
    assert(!d||!p.project||d.project===p.project,'O lead pertence a outra operação.');
    const old=p.id?s.tasks.find(x=>x.id===p.id):undefined;if(p.id)assert(old,'Tarefa não encontrada.');
    if(old){project(old.project||'');assert(old.project===operation,'A operação da tarefa não pode ser alterada.');assert(manager||old.ownerId===actor.id,'Tarefa sem permissão.');if(old.dealId)deal(old.dealId);}
    const owners=p.ownerIds!==undefined?(Array.isArray(p.ownerIds)?[...new Set(p.ownerIds)] as string[]:[]):[p.ownerId||d?.ownerId||actor.id];
    assert(owners.length>0&&owners.length<=100,'Selecione de 1 a 100 responsáveis.');assert(!old||owners.length===1,'Edite uma tarefa individual por vez.');
    for(const id of owners){member(id,operation);assert(manager||id===actor.id,'Apenas a gestão pode atribuir tarefas a outras pessoas.');
      if(d){const m=s.members.find(m=>m.id===id)!;assert(accessible(d,{...m,projects:m.projects||[],isOwner:id===s.ownerId}),`${m.name} não tem acesso a este lead.`);}}
    const batchId=old?.batchId||(owners.length>1?uid():undefined);
    for(const ownerId of owners){const t:Task={id:old?.id||uid(),project:operation,title:clean(p.title),description:clean(p.description,4000),dealId:d?.id||'',ownerId,due:p.due,priority:['Alta','Média','Baixa'].includes(p.priority)?p.priority:'Média',done:old?.done||false,createdAt:old?.createdAt||now,batchId};
      if(old){if(old.ownerId!==ownerId){t.done=false;old.completedAt=undefined;}Object.assign(old,t);}else s.tasks.unshift(t);}
    if(d)history(d,`Tarefa ${old?'atualizada':'criada'}: ${clean(p.title)}. ${owners.length} responsável(is).`);
  }else if(type==='task.toggle'){
    const t=s.tasks.find(t=>t.id===p.id);assert(t,'Tarefa não encontrada.');project(t.project||'');if(t.dealId)deal(t.dealId);
    assert(t.ownerId===actor.id,'Somente o responsável pode concluir ou reabrir esta tarefa.');assert(typeof p.done==='boolean','Conclusão inválida.');t.done=p.done;t.completedAt=p.done?now:undefined;
  }else if(type==='team.save'){
    assert(manager,'Apenas a gestão pode organizar equipes.');const operation=project(p.project);assert(clean(p.name),'Dê um nome à equipe.');
    const old=p.id?s.teams.find(t=>t.id===p.id):undefined;if(p.id)assert(old,'Equipe não encontrada.');if(old)assert(old.project===operation,'A equipe pertence a outra operação.');
    const memberIds=Array.isArray(p.memberIds)?[...new Set(p.memberIds)] as string[]:[];assert(memberIds.length>0&&memberIds.length<=100,'Selecione de 1 a 100 pessoas para a equipe.');for(const id of memberIds)member(id,operation);
    assert(!s.teams.some(t=>t.project===operation&&t.id!==old?.id&&t.name.toLocaleLowerCase('pt-BR')===clean(p.name).toLocaleLowerCase('pt-BR')),'Já existe uma equipe com este nome nesta operação.');
    const team={id:old?.id||uid(),project:operation,name:clean(p.name),description:clean(p.description,1000),memberIds,active:p.active!==false};if(old)Object.assign(old,team);else s.teams.push(team);
  }else if(type==='meeting.save'){
    const d=deal();assert(validDate(p.start)&&new Date(p.start).getTime()>Date.now(),'Escolha um horário futuro.');const duration=amount(p.duration||30,15,240),owner=member(p.ownerId||d.ownerId,d.project),start=new Date(p.start).getTime();
    assert(!s.meetings.some(m=>m.id!==p.id&&m.ownerId===owner&&m.status==='Agendada'&&start<new Date(m.start).getTime()+m.duration*60000&&start+duration*60000>new Date(m.start).getTime()),'Este responsável já tem uma reunião nesse horário.');
    const format=new Intl.DateTimeFormat('en-GB',{timeZone:s.settings.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),begin=format.format(new Date(start)),end=format.format(new Date(start+duration*60000));assert(begin>=s.settings.workingStart&&end<=s.settings.workingEnd&&end>begin,'Horário fora do expediente configurado.');
    const link=clean(p.link,1000);assert(!link||/^https:\/\//i.test(link),'O link da reunião deve começar com https://.');const old=s.meetings.find(m=>m.id===p.id);if(old)deal(old.dealId);const m:Meeting={id:old?.id||uid(),createdAt:old?.createdAt||now,title:clean(p.title)||'Call de diagnóstico',dealId:d.id,ownerId:owner,start:p.start,duration,notes:clean(p.notes,2000),status:'Agendada',link};if(old)Object.assign(old,m);else s.meetings.push(m);if(!['won','lost'].includes(d.stage))d.stage='scheduled';history(d,`Call agendada para ${stamp(p.start,true)}.`);rules('stage_changed',d);
  }else if(type==='meeting.status'){
    const m=s.meetings.find(m=>m.id===p.id);assert(m,'Reunião não encontrada.');const d=deal(m.dealId);assert(['Realizada','Cancelada'].includes(p.status),'Status inválido.');if(p.status==='Realizada')assert(s.feedback.some(f=>f.meetingId===m.id&&f.kind==='Closer'),'Registre o pitch e o resultado da call antes de concluí-la.');m.status=p.status;if(p.status==='Cancelada'&&d.stage==='scheduled'&&!s.meetings.some(x=>x.dealId===d.id&&x.status==='Agendada'))d.stage='booking';history(d,`Reunião ${p.status.toLowerCase()}.`);
  }else if(type==='fee.save'){
    const operation=project(p.project||s.projects.find(x=>canProject(x,actor))||'');assert(clean(p.platform),'Informe a plataforma.');assert(['Pix','Boleto','Cartão'].includes(p.method),'Forma de pagamento inválida.');const percent=Number(p.percent),anticipation=Number(p.anticipation||0);assert(Number.isFinite(percent)&&percent>=0&&Number.isFinite(anticipation)&&anticipation>=0&&percent+anticipation<=100,'As taxas percentuais devem somar no máximo 100%.');assert(validDate(p.effectiveAt),'Informe o início da vigência.');const installments=amount(p.installments||1,1,48);assert(p.method==='Cartão'||installments===1,'Pix e boleto usam uma transação.');
    const f:Fee={id:p.id||uid(),project:operation,platform:clean(p.platform),method:p.method,percent,fixed:amount(p.fixed||0),installments,anticipation,days:amount(p.days||0,0,365),effectiveAt:p.effectiveAt,active:true};const old=s.fees.find(x=>x.id===p.id);if(old)Object.assign(old,f);else s.fees.push(f);
  }else if(type==='fee.toggle'){
    const f=s.fees.find(f=>f.id===p.id);assert(f,'Taxa não encontrada.');project(f.project||'');f.active=!!p.active;
  }else if(type==='sale.receive'){
    const sale=s.sales.find(x=>x.id===p.id);assert(sale,'Venda não encontrada.');const d=deal(sale.dealId);assert(sale.status==='Ativa','A venda está encerrada.');const paid=sale.receipts.reduce((v,r)=>v+r.gross,0),gross=amount(p.gross,1),fee=amount(p.fee||0);assert(gross<=sale.amount-paid,'O recebimento ultrapassa o saldo da venda.');assert(fee<=gross,'A taxa não pode ser maior que o recebimento.');assert(validDate(p.at)&&new Date(p.at).getTime()<=Date.now()+60000,'Informe uma data de recebimento até hoje.');sale.receipts.push({id:uid(),gross,fee,net:gross-fee,at:p.at,note:clean(p.note)});history(d,`Recebimento registrado: ${money(gross)}; líquido ${money(gross-fee)}.`);
  }else if(type==='sale.status'){
    const sale=s.sales.find(x=>x.id===p.id);assert(sale,'Venda não encontrada.');const d=deal(sale.dealId);assert(['Cancelada','Estornada'].includes(p.status),'Status inválido.');assert(p.status!=='Cancelada'||sale.receipts.length===0,'Use estorno para uma venda com recebimentos.');sale.status=p.status;history(d,`Venda ${p.status.toLowerCase()}: ${clean(p.note)}.`);
  }else if(type==='message.send'){
    const d=deal();assert(clean(p.text),'Escreva uma mensagem.');assert(demo||p.note||p.draft,'Conecte uma conta oficial antes de enviar mensagens. Você pode salvar um rascunho.');s.messages.push({id:uid(),dealId:d.id,channel:d.source,text:clean(p.text,5000),at:now,direction:p.note?'note':'out',status:p.note?'note':p.draft?'draft':'demo'});if(!p.draft)history(d,p.note?'Nota interna adicionada à conversa.':'Mensagem de demonstração adicionada.');
  }else if(type==='member.save'){
    assert(clean(p.name)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email),'Informe nome e e-mail válidos.');assert(['Administrador','Gestor','SDR','Closer','Suporte/CS'].includes(p.role),'Perfil inválido.');const old=s.members.find(x=>x.id===p.id);assert(!old||old.id!==s.ownerId||p.role==='Administrador','O proprietário mantém o acesso de administrador.');assert(!s.members.some(x=>x.email.toLowerCase()===p.email.toLowerCase()&&x.id!==p.id),'Este e-mail já está na equipe.');if(old?.id===actor.id)assert(p.role==='Administrador'&&p.active!==false,'Você não pode remover seu próprio acesso de administrador.');
    const grants=Array.isArray(p.projects)?[...new Set(p.projects.map((v:unknown)=>clean(v)).filter(Boolean))] as string[]:[];assert(grants.every(x=>s.projects.includes(x)),'Operação inválida nas permissões.');assert(old?.id===s.ownerId||grants.length>0||p.active===false,'Libere ao menos uma operação para ativar esta pessoa.');const m:Member={id:old?.id||uid(),projects:old?.id===s.ownerId?[...s.projects]:grants,name:clean(p.name),email:clean(p.email).toLowerCase(),role:p.role,active:p.active!==false,allLeads:!!p.allLeads,finance:!!p.finance,export:!!p.export};if(old)Object.assign(old,m);else s.members.push(m);for(const t of s.teams)t.memberIds=t.memberIds.filter(id=>id!==m.id||(m.active&&(m.id===s.ownerId||m.projects?.includes(t.project))));
  }else if(type==='settings.save'){
    assert(clean(p.name),'Informe o nome do workspace.');assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(p.workingStart)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(p.workingEnd)&&p.workingStart<p.workingEnd,'Expediente inválido.');s.settings={...s.settings,name:clean(p.name),workingStart:p.workingStart,workingEnd:p.workingEnd,slaHours:amount(p.slaHours,1,168)};if(Array.isArray(p.lossReasons)){const reasons=[...new Set(p.lossReasons.map((x:unknown)=>clean(x,100)).filter(Boolean))] as string[];assert(reasons.length>0,'Mantenha ao menos um motivo de perda.');s.lossReasons=reasons;}
  }else if(type==='project.add'){
    const name=clean(p.name);assert(name&&!s.projects.includes(name),'Informe um novo nome de projeto.');assert(!['__proto__','constructor','prototype'].includes(name),'Nome de operação inválido.');s.projects.push(name);ensureProject(s,name);s.projectDetails[name].description=clean(p.description,2000)||s.projectDetails[name].description;s.members.find(m=>m.id===s.ownerId)!.projects=[...s.projects];
  }else if(type==='rule.toggle'){
    const r=s.rules.find(x=>x.id===p.id);assert(r,'Automação não encontrada.');project(r.project||'');r.enabled=!!p.enabled;
  }else if(type==='rule.save'){
    assert(clean(p.name),'Informe o nome da automação.');assert(['lead_created','stage_changed','no_reply','sla'].includes(p.event),'Gatilho inválido.');assert(['task','followup'].includes(p.action),'Ação inválida.');assert(!p.stage||STAGES.some(x=>x.id===p.stage),'Etapa inválida.');const r:Rule={id:uid(),project:project(p.project||s.projects.find(x=>canProject(x,actor))||''),name:clean(p.name),description:clean(p.description),event:p.event,stage:p.stage||'',action:p.action,hours:amount(p.hours||1,1,720),enabled:true,runs:0};s.rules.push(r);
  }else if(type==='automation.run'){
    for(const r of s.rules.filter(r=>r.enabled&&canProject(r.project||'',actor)&&['no_reply','sla'].includes(r.event))){for(const d of s.deals.filter(d=>d.project===r.project&&!['won','lost'].includes(d.stage)&&(!r.stage||r.stage===d.stage))){
      if(r.event==='no_reply'&&Date.now()-new Date(d.updatedAt).getTime()>=r.hours*3600000){const key=`${r.id}:${d.id}:${d.updatedAt}`;if(s.tasks.some(t=>t.automationKey===key))continue;task(d,r.name,new Date(Date.now()+3600000).toISOString(),key);if(r.action==='followup'&&d.stage!=='scheduled'){const from=d.stage;d.stage='followup';d.followupAt=new Date(Date.now()+3600000).toISOString();d.history.unshift({id:uid(),at:now,actor:actor.name,project:d.project,text:`${r.name}: movido de ${stageName(from)} para FUP.`});d.history=d.history.slice(0,200);}r.runs++;s.logs.unshift({id:key,at:now,ruleId:r.id,dealId:d.id,text:`${r.name}: tarefa criada.`});}
      if(r.event==='sla'){for(const t of s.tasks.filter(t=>t.dealId===d.id&&!t.done&&new Date(t.due).getTime()<Date.now())){const key=`${r.id}:${t.id}:${t.due}`;if(t.slaNotified?.[r.id]===t.due)continue;t.slaNotified||={};t.slaNotified[r.id]=t.due;if(s.logs.some(l=>l.id===key))continue;r.runs++;s.logs.unshift({id:key,at:now,ruleId:r.id,dealId:d.id,text:`Prazo excedido: ${t.title}.`});}}
    }}
  }else if(type==='integration.save'){
    assert(['Instagram','WhatsApp','E-mail','TikTok','Google Agenda'].includes(p.channel),'Canal inválido.');const operation=project(p.project||s.projects.find(x=>canProject(x,actor))||'');s.integrations[`${operation}::${p.channel}`]={account:clean(p.account),notes:clean(p.notes,1000),project:operation,channel:p.channel};
  }else if(type==='project.save'){
    const operation=project(p.project);s.projectDetails[operation].description=clean(p.description,2000);if(p.stageNotes){for(const st of STAGES){const entry=p.stageNotes[st.id];assert(entry&&clean(entry.description)&&clean(entry.exit),'Descreva o objetivo e o critério de saída de cada etapa.');s.projectDetails[operation].stageNotes[st.id]={description:clean(entry.description,1000),exit:clean(entry.exit,1000)};}}
  }else if(type==='funnel.save'){
    assert(manager,'Apenas a gestão pode editar funis.');const operation=project(p.project);assert(clean(p.name)&&clean(p.description),'Informe nome e descrição do funil.');const old=s.funnels.find(f=>f.id===p.id);if(p.id)assert(old,'Funil não encontrado.');assert(!s.funnels.some(f=>f.project===operation&&f.id!==old?.id&&f.name.toLocaleLowerCase('pt-BR')===clean(p.name).toLocaleLowerCase('pt-BR')),'Já existe um funil com este nome nesta operação.');if(old)assert(old.project===operation,'O funil pertence a outra operação.');const f:Funnel={id:old?.id||uid(),project:operation,name:clean(p.name),description:clean(p.description,1500),entry:clean(p.entry,1000),qualification:clean(p.qualification,1000),nextStep:clean(p.nextStep,1000),active:p.active===undefined?(old?.active??true):p.active!==false};if(old)Object.assign(old,f);else s.funnels.push(f);
  }else if(type==='funnel.defaults'){
    assert(manager,'Apenas a gestão pode editar funis.');const operation=project(p.project);
    for(const f of defaultFunnels(operation))if(!s.funnels.some(x=>x.id===f.id||(x.project===operation&&x.name.toLocaleLowerCase('pt-BR')===f.name.toLocaleLowerCase('pt-BR'))))s.funnels.push(f);
  }else if(type==='funnel.toggle'){
    assert(manager,'Apenas a gestão pode editar funis.');const f=s.funnels.find(f=>f.id===p.id);assert(f,'Funil não encontrado.');project(f.project);assert(typeof p.active==='boolean','Status inválido.');f.active=p.active;
  }else if(type==='experiment.save'){
    assert(manager,'Apenas a gestão pode criar testes.');const operation=project(p.project);assert(['SDR','Closer'].includes(p.kind),'Escolha SDR ou Closer.');assert(clean(p.name)&&clean(p.hypothesis)&&clean(p.variantA)&&clean(p.variantB),'Descreva hipótese e duas versões do teste.');assert(clean(p.variantA)!==clean(p.variantB),'As versões A e B devem ser diferentes.');if(p.funnelId)assert(s.funnels.some(f=>f.id===p.funnelId&&f.project===operation),'Funil inválido.');assert(!s.experiments.some(e=>e.project===operation&&e.kind===p.kind&&e.status==='Ativo'&&(!e.funnelId||!p.funnelId||e.funnelId===p.funnelId)),'Já existe um teste ativo desse perfil para este público. Pause-o antes de iniciar outro.');s.experiments.push({id:uid(),project:operation,name:clean(p.name),kind:p.kind,hypothesis:clean(p.hypothesis,2000),variantA:clean(p.variantA,4000),variantB:clean(p.variantB,4000),status:'Ativo',createdAt:now,funnelId:p.funnelId||'',metric:p.kind==='Closer'?'won':'scheduled',assignOnCreate:true});
  }else if(type==='experiment.status'){
    assert(manager,'Apenas a gestão pode alterar testes.');const e=s.experiments.find(e=>e.id===p.id);assert(e,'Teste não encontrado.');project(e.project);assert(['Ativo','Pausado','Encerrado'].includes(p.status),'Status inválido.');if(p.status==='Ativo')assert(!s.experiments.some(other=>other.id!==e.id&&other.project===e.project&&other.kind===e.kind&&other.status==='Ativo'&&(!other.funnelId||!e.funnelId||other.funnelId===e.funnelId)),'Existe outro teste ativo para o mesmo público.');e.status=p.status;
  }else if(type==='experiment.assign'){
    const d=deal(),e=s.experiments.find(e=>e.id===p.experimentId);assert(e&&e.project===d.project&&e.status==='Ativo','Teste indisponível nesta operação.');assert(!e.funnelId||e.funnelId===d.funnelId,'O lead não pertence ao funil do teste.');assert(!['won','lost'].includes(d.stage),'Inclua leads em aberto antes de observar o resultado.');assert(!d.experimentAssignments?.some(a=>a.experimentId===e.id),'O lead já participa deste teste.');if(p.variant)assert(['A','B'].includes(p.variant),'Versão inválida.');assert(!p.variant||manager,'A atribuição manual depende da gestão.');assignExperiment(d,e,p.variant?'manual':'random',p.variant);history(d,`Incluído no teste ${e.name}, versão ${d.experimentAssignments!.find(a=>a.experimentId===e.id)!.variant}.`);
  }else if(type==='feedback.save'){
    const d=deal();assert(['SDR','Closer'].includes(p.kind),'Perfil de atividade inválido.');assert(manager||actor.role===p.kind,'Registre atividades do seu próprio perfil.');assert(['won','lost','followup','qualified'].includes(p.outcome),'Resultado inválido.');assert(clean(p.pitch,4000).length>=5&&clean(p.reason,2000).length>=5,'Descreva o pitch/abordagem e o motivo do resultado.');assert(AWARENESS.includes(p.awarenessBefore)&&AWARENESS.includes(p.awarenessAfter),'Informe o nível de consciência antes e depois.');const url=clean(p.resourceUrl,1500);assert(!url||/^https:\/\//i.test(url),'Use um link https:// para o material.');if(p.kind==='SDR')assert(clean(p.action),'Descreva a ação de qualificação ou aquecimento.');
    let variant:''|'A'|'B'='';if(p.experimentId){const e=s.experiments.find(e=>e.id===p.experimentId&&e.project===d.project&&e.kind===p.kind),a=d.experimentAssignments?.find(a=>a.experimentId===p.experimentId);assert(e&&a,'O lead precisa estar atribuído ao teste antes do registro.');variant=a.variant;}
    const meeting=p.meetingId?s.meetings.find(m=>m.id===p.meetingId&&m.dealId===d.id):undefined;if(p.meetingId)assert(meeting&&meeting.status!=='Cancelada','Reunião inválida.');
    const feedback:Feedback={id:uid(),project:d.project,dealId:d.id,meetingId:meeting?.id,actorId:actor.id,actorName:actor.name,kind:p.kind,at:now,pitch:clean(p.pitch,4000),reason:clean(p.reason,2000),outcome:p.outcome,awarenessBefore:p.awarenessBefore,awarenessAfter:p.awarenessAfter,action:clean(p.action,1000),resourceUrl:url,objections:clean(p.objections,2000),experimentId:p.experimentId||'',variant};s.feedback.unshift(feedback);d.awareness=p.awarenessAfter;if(meeting&&p.kind==='Closer')meeting.status='Realizada';history(d,`${p.kind}: ${clean(p.action)||'Pitch registrado'}. Resultado: ${p.outcome}. Motivo: ${clean(p.reason,500)}`);
  }else if(type==='attachment.add'){
    const d=deal();assert(p.attachment&&clean(p.attachment.id),'Anexo inválido.');d.attachments.push(p.attachment);history(d,`Arquivo anexado: ${p.attachment.name}.`);
  }else throw new Error('Ação desconhecida.');
  if(type==='project.add')ensureLifecycle(s);
  if(type==='automation.run')runFollowupAutomation(s,now,s.projects.filter(p=>canProject(p,actor)));
  if(!['automation.run','lead.note','message.send'].includes(type))s.audit.unshift({id:uid(),at:now,actor:actor.name,project:p.project||s.deals.find(d=>d.id===p.dealId)?.project,text:`${type}: ${clean(p.name||p.title||p.dealId||p.id||'Configuração atualizada')}`});
  s.audit=s.audit.slice(0,500);s.logs=s.logs.slice(0,500);assert(s.deals.length<=5000&&JSON.stringify(s).length<4500000,'Limite deste workspace atingido. Exporte os dados e solicite expansão.');return s;
}
