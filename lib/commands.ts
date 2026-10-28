import {STAGES,uid,money,stamp,stageName,estimate,assert,clean,validDate,amount,accessible} from './crm';
import type {State,Actor,Deal,Stage,Task,Meeting,Fee,Member,Rule} from './crm';
export type Command={type:string;payload:Record<string,any>};
export function mutateState(input:State,command:Command,actor:Actor,demo=false):State{
  const s=structuredClone(input),p=command.payload||{},type=command.type,now=new Date().toISOString();
  const admin=actor.role==='Administrador',manager=admin||actor.role==='Gestor';
  if(['fee.save','fee.toggle','member.save','settings.save','project.add','integration.save'].includes(type))assert(admin,'Apenas administradores podem realizar esta ação.');
  if(['rule.save','rule.toggle','automation.run'].includes(type))assert(manager,'Acesso restrito à gestão.');
  if(['sale.receive','sale.status'].includes(type))assert(admin||actor.finance,'Você não tem acesso ao financeiro.');
  function deal(id=p.dealId):Deal{const d=s.deals.find(d=>d.id===id);assert(d&&accessible(d,actor),'Oportunidade não encontrada ou sem permissão.');return d;}
  function member(id:string){assert(s.members.some(m=>m.id===id&&m.active),'Selecione um responsável ativo.');return id;}
  function history(d:Deal,text:string){const a={id:uid(),at:now,actor:actor.name,text};d.history.unshift(a);d.history=d.history.slice(0,200);d.updatedAt=now;s.audit.unshift(a);}
  function task(d:Deal,title:string,due:string,key?:string){if(key&&s.tasks.some(t=>t.automationKey===key))return;s.tasks.unshift({id:uid(),title,dealId:d.id,ownerId:d.ownerId,due,priority:'Média',done:false,createdAt:now,automationKey:key});}
  function rules(event:string,d:Deal){for(const r of s.rules.filter(r=>r.enabled&&r.event===event&&(!r.stage||r.stage===d.stage))){const due=new Date(Date.now()+r.hours*3600000).toISOString();if(r.action==='followup'&&!['won','lost','scheduled'].includes(d.stage)){d.stage='followup';d.followupAt=due;}task(d,r.name,due);r.runs++;s.logs.unshift({id:uid(),at:now,ruleId:r.id,dealId:d.id,text:`${r.name}: tarefa criada.`});}}
  if(type==='lead.save'){
    const old=p.id?deal(p.id):null;assert(clean(p.name).length>=2,'Informe o nome do lead.');
    let c=old?s.contacts.find(c=>c.id===old.contactId):p.contactId?s.contacts.find(c=>c.id===p.contactId):null;
    if(!c){const phone=clean(p.phone).replace(/\D/g,''),email=clean(p.email).toLowerCase(),ig=clean(p.instagram).replace(/^@/,'').toLowerCase();c=s.contacts.find(x=>(phone&&x.phone.replace(/\D/g,'')===phone)||(email&&x.email.toLowerCase()===email)||(ig&&x.instagram.replace(/^@/,'').toLowerCase()===ig));if(c&&!p.reuseContact)throw new Error('Já existe um contato com esse telefone, e-mail ou Instagram. Marque “Usar contato existente” para criar outra oportunidade vinculada.');}
    if(c&&!old)assert(s.deals.some(d=>d.contactId===c!.id&&accessible(d,actor)),'Contato sem permissão de acesso.');
    if(!c){c={id:uid(),name:'',company:'',email:'',phone:'',instagram:''};s.contacts.push(c);}
    if(old||!s.deals.some(d=>d.contactId===c!.id))Object.assign(c,{name:clean(p.name),company:clean(p.company),phone:clean(p.phone,30),email:clean(p.email),instagram:clean(p.instagram,100)});
    const stage=(p.stage||'conversation') as Stage;assert(STAGES.some(x=>x.id===stage),'Etapa inválida.');if(!old)assert(['conversation','booking'].includes(stage),'Cadastre o lead e complete os dados ao mover para esta etapa.');
    const owner=member(p.ownerId||actor.id);assert(manager||actor.allLeads||owner===actor.id,'Você só pode cadastrar oportunidades sob sua responsabilidade.');
    const d:Deal=old||{id:uid(),contactId:c.id,stage,source:'Instagram',project:s.projects[0],product:'',campaign:'',ownerId:owner,sdrId:'',closerId:'',value:0,tags:[],notes:'',createdAt:now,updatedAt:now,history:[],attachments:[],fields:{}};
    assert(['Instagram','WhatsApp','E-mail','TikTok','Indicação','Site'].includes(p.source||'Instagram'),'Origem inválida.');
    Object.assign(d,{source:p.source||'Instagram',project:clean(p.project||s.projects[0]),product:clean(p.product),campaign:clean(p.campaign),ownerId:owner,sdrId:p.sdrId?member(p.sdrId):'',closerId:p.closerId?member(p.closerId):'',value:amount(p.value),tags:Array.isArray(p.tags)?p.tags.slice(0,10).map((t:unknown)=>clean(t,40)):[],notes:clean(p.notes,5000)});
    if(!old){s.deals.unshift(d);history(d,'Oportunidade criada.');rules('lead_created',d);}else history(d,'Cadastro atualizado.');
  }else if(type==='lead.move'){
    const d=deal(),to=p.stage as Stage;assert(STAGES.some(x=>x.id===to),'Etapa inválida.');if(d.stage===to)return s;
    if(to==='lost'){assert(s.lossReasons.includes(p.lossReason),'Selecione o motivo da perda.');d.lossReason=p.lossReason;}
    if(to==='followup'){assert(validDate(p.followupAt)&&new Date(p.followupAt).getTime()>Date.now(),'Defina uma data futura para o follow-up.');d.followupAt=p.followupAt;task(d,'Retomar contato',p.followupAt);}
    if(to==='scheduled')assert(s.meetings.some(m=>m.dealId===d.id&&m.status==='Agendada'&&new Date(m.start).getTime()>Date.now()),'Agende uma reunião antes de mover para Call agendada.');
    if(to==='won'){
      assert(admin||actor.finance||actor.role==='Closer','Você não tem permissão para registrar vendas.');
      if(!s.sales.some(x=>x.dealId===d.id&&x.status==='Ativa')){
        const gross=amount(p.gross??d.value,1),discount=amount(p.discount||0);assert(discount<gross,'O desconto deve ser menor que a venda.');const total=gross-discount;
        assert(['Pix','Boleto','Cartão'].includes(p.method),'Escolha uma forma de pagamento.');assert(validDate(p.due),'Defina o vencimento.');const installments=amount(p.installments||1,1,48);assert(p.method==='Cartão'||installments===1,'Parcelamento disponível para cartão nesta versão.');
        const fee=p.feeId?s.fees.find(f=>f.id===p.feeId&&f.active):null;if(p.feeId)assert(fee&&fee.method===p.method&&fee.installments===installments&&fee.effectiveAt<=now.slice(0,10),'A taxa não corresponde à forma de pagamento, parcelas ou vigência.');
        const costs=estimate(total,fee||null);s.sales.unshift({id:uid(),dealId:d.id,gross,discount,amount:total,installments,method:p.method,platform:fee?.platform||clean(p.platform)||'Sem plataforma',feeSnapshot:fee?{...fee}:null,estimatedFee:costs.fee,estimatedNet:costs.net,due:p.due,createdAt:now,receipts:[],status:'Ativa'});d.value=total;
      }
    }
    const from=d.stage;d.stage=to;history(d,`Movido de ${stageName(from)} para ${stageName(to)}.${p.lossReason?` Motivo: ${p.lossReason}.`:''}${p.notes?` ${clean(p.notes,1000)}`:''}`);rules('stage_changed',d);
  }else if(type==='lead.note'){
    const d=deal();assert(clean(p.text),'Escreva uma anotação.');history(d,clean(p.text,5000));
  }else if(type==='lead.field'){
    const d=deal(),key=clean(p.key,60);assert(key&&!['__proto__','constructor','prototype'].includes(key),'Nome de campo inválido.');d.fields[key]=clean(p.value,1000);history(d,`Campo ${key} atualizado.`);
  }else if(type==='task.save'){
    const d=p.dealId?deal():null;assert(clean(p.title),'Informe o título.');assert(validDate(p.due),'Informe um prazo válido.');const owner=member(p.ownerId||d?.ownerId||actor.id);assert(manager||actor.allLeads||owner===actor.id,'Sem permissão para atribuir esta tarefa.');
    const old=s.tasks.find(x=>x.id===p.id);if(old)assert(manager||old.ownerId===actor.id,'Tarefa sem permissão.');const t:Task={id:old?.id||uid(),title:clean(p.title),dealId:d?.id||'',ownerId:owner,due:p.due,priority:['Alta','Média','Baixa'].includes(p.priority)?p.priority:'Média',done:old?.done||false,createdAt:old?.createdAt||now};if(old)Object.assign(old,t);else s.tasks.unshift(t);if(d)history(d,`Tarefa criada: ${t.title}.`);
  }else if(type==='task.toggle'){
    const t=s.tasks.find(t=>t.id===p.id);assert(t,'Tarefa não encontrada.');assert(manager||t.ownerId===actor.id||(t.dealId&&accessible(deal(t.dealId),actor)),'Tarefa sem permissão.');t.done=!!p.done;
  }else if(type==='meeting.save'){
    const d=deal();assert(validDate(p.start)&&new Date(p.start).getTime()>Date.now(),'Escolha um horário futuro.');const duration=amount(p.duration||30,15,240),owner=member(p.ownerId||d.ownerId),start=new Date(p.start).getTime();
    assert(!s.meetings.some(m=>m.id!==p.id&&m.ownerId===owner&&m.status==='Agendada'&&start<new Date(m.start).getTime()+m.duration*60000&&start+duration*60000>new Date(m.start).getTime()),'Este responsável já tem uma reunião nesse horário.');
    const format=new Intl.DateTimeFormat('en-GB',{timeZone:s.settings.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),begin=format.format(new Date(start)),end=format.format(new Date(start+duration*60000));assert(begin>=s.settings.workingStart&&end<=s.settings.workingEnd&&end>begin,'Horário fora do expediente configurado.');
    const link=clean(p.link,1000);assert(!link||/^https:\/\//i.test(link),'O link da reunião deve começar com https://.');const old=s.meetings.find(m=>m.id===p.id);if(old)deal(old.dealId);const m:Meeting={id:old?.id||uid(),title:clean(p.title)||'Call de diagnóstico',dealId:d.id,ownerId:owner,start:p.start,duration,notes:clean(p.notes,2000),status:'Agendada',link};if(old)Object.assign(old,m);else s.meetings.push(m);if(!['won','lost'].includes(d.stage))d.stage='scheduled';history(d,`Call agendada para ${stamp(p.start,true)}.`);rules('stage_changed',d);
  }else if(type==='meeting.status'){
    const m=s.meetings.find(m=>m.id===p.id);assert(m,'Reunião não encontrada.');const d=deal(m.dealId);assert(['Realizada','Cancelada'].includes(p.status),'Status inválido.');m.status=p.status;if(p.status==='Cancelada'&&d.stage==='scheduled'&&!s.meetings.some(x=>x.dealId===d.id&&x.status==='Agendada'))d.stage='booking';history(d,`Reunião ${p.status.toLowerCase()}.`);
  }else if(type==='fee.save'){
    assert(clean(p.platform),'Informe a plataforma.');assert(['Pix','Boleto','Cartão'].includes(p.method),'Forma de pagamento inválida.');const percent=Number(p.percent),anticipation=Number(p.anticipation||0);assert(Number.isFinite(percent)&&percent>=0&&Number.isFinite(anticipation)&&anticipation>=0&&percent+anticipation<=100,'As taxas percentuais devem somar no máximo 100%.');assert(validDate(p.effectiveAt),'Informe o início da vigência.');const installments=amount(p.installments||1,1,48);assert(p.method==='Cartão'||installments===1,'Pix e boleto usam uma transação.');
    const f:Fee={id:p.id||uid(),platform:clean(p.platform),method:p.method,percent,fixed:amount(p.fixed||0),installments,anticipation,days:amount(p.days||0,0,365),effectiveAt:p.effectiveAt,active:true};const old=s.fees.find(x=>x.id===p.id);if(old)Object.assign(old,f);else s.fees.push(f);
  }else if(type==='fee.toggle'){
    const f=s.fees.find(f=>f.id===p.id);assert(f,'Taxa não encontrada.');f.active=!!p.active;
  }else if(type==='sale.receive'){
    const sale=s.sales.find(x=>x.id===p.id);assert(sale,'Venda não encontrada.');const d=deal(sale.dealId);assert(sale.status==='Ativa','A venda está encerrada.');const paid=sale.receipts.reduce((v,r)=>v+r.gross,0),gross=amount(p.gross,1),fee=amount(p.fee||0);assert(gross<=sale.amount-paid,'O recebimento ultrapassa o saldo da venda.');assert(fee<=gross,'A taxa não pode ser maior que o recebimento.');assert(validDate(p.at)&&new Date(p.at).getTime()<=Date.now()+60000,'Informe uma data de recebimento até hoje.');sale.receipts.push({id:uid(),gross,fee,net:gross-fee,at:p.at,note:clean(p.note)});history(d,`Recebimento registrado: ${money(gross)}; líquido ${money(gross-fee)}.`);
  }else if(type==='sale.status'){
    const sale=s.sales.find(x=>x.id===p.id);assert(sale,'Venda não encontrada.');const d=deal(sale.dealId);assert(['Cancelada','Estornada'].includes(p.status),'Status inválido.');assert(p.status!=='Cancelada'||sale.receipts.length===0,'Use estorno para uma venda com recebimentos.');sale.status=p.status;history(d,`Venda ${p.status.toLowerCase()}: ${clean(p.note)}.`);
  }else if(type==='message.send'){
    const d=deal();assert(clean(p.text),'Escreva uma mensagem.');assert(demo||p.note||p.draft,'Conecte uma conta oficial antes de enviar mensagens. Você pode salvar um rascunho.');s.messages.push({id:uid(),dealId:d.id,channel:d.source,text:clean(p.text,5000),at:now,direction:p.note?'note':'out',status:p.note?'note':p.draft?'draft':'demo'});if(!p.draft)history(d,p.note?'Nota interna adicionada à conversa.':'Mensagem de demonstração adicionada.');
  }else if(type==='member.save'){
    assert(clean(p.name)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email),'Informe nome e e-mail válidos.');assert(['Administrador','Gestor','SDR','Closer'].includes(p.role),'Perfil inválido.');const old=s.members.find(x=>x.id===p.id);assert(!s.members.some(x=>x.email.toLowerCase()===p.email.toLowerCase()&&x.id!==p.id),'Este e-mail já está na equipe.');if(old?.id===actor.id)assert(p.role==='Administrador'&&p.active!==false,'Você não pode remover seu próprio acesso de administrador.');
    const m:Member={id:old?.id||uid(),name:clean(p.name),email:clean(p.email).toLowerCase(),role:p.role,active:p.active!==false,allLeads:!!p.allLeads,finance:!!p.finance,export:!!p.export};if(old)Object.assign(old,m);else s.members.push(m);
  }else if(type==='settings.save'){
    assert(clean(p.name),'Informe o nome do workspace.');assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(p.workingStart)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(p.workingEnd)&&p.workingStart<p.workingEnd,'Expediente inválido.');s.settings={...s.settings,name:clean(p.name),workingStart:p.workingStart,workingEnd:p.workingEnd,slaHours:amount(p.slaHours,1,168)};if(Array.isArray(p.lossReasons)){const reasons=[...new Set(p.lossReasons.map((x:unknown)=>clean(x,100)).filter(Boolean))] as string[];assert(reasons.length>0,'Mantenha ao menos um motivo de perda.');s.lossReasons=reasons;}
  }else if(type==='project.add'){
    const name=clean(p.name);assert(name&&!s.projects.includes(name),'Informe um novo nome de projeto.');s.projects.push(name);
  }else if(type==='rule.toggle'){
    const r=s.rules.find(x=>x.id===p.id);assert(r,'Automação não encontrada.');r.enabled=!!p.enabled;
  }else if(type==='rule.save'){
    assert(clean(p.name),'Informe o nome da automação.');assert(['lead_created','stage_changed','no_reply','sla'].includes(p.event),'Gatilho inválido.');assert(['task','followup'].includes(p.action),'Ação inválida.');assert(!p.stage||STAGES.some(x=>x.id===p.stage),'Etapa inválida.');const r:Rule={id:uid(),name:clean(p.name),description:clean(p.description),event:p.event,stage:p.stage||'',action:p.action,hours:amount(p.hours||1,1,720),enabled:true,runs:0};s.rules.push(r);
  }else if(type==='automation.run'){
    for(const r of s.rules.filter(r=>r.enabled&&['no_reply','sla'].includes(r.event))){for(const d of s.deals.filter(d=>!['won','lost'].includes(d.stage)&&(!r.stage||r.stage===d.stage))){
      if(r.event==='no_reply'&&Date.now()-new Date(d.updatedAt).getTime()>=r.hours*3600000){const key=`${r.id}:${d.id}:${d.updatedAt}`;if(s.tasks.some(t=>t.automationKey===key))continue;task(d,r.name,new Date(Date.now()+3600000).toISOString(),key);if(r.action==='followup'&&d.stage!=='scheduled'){d.stage='followup';d.followupAt=new Date(Date.now()+3600000).toISOString();}r.runs++;s.logs.unshift({id:key,at:now,ruleId:r.id,dealId:d.id,text:`${r.name}: tarefa criada.`});}
      if(r.event==='sla'){for(const t of s.tasks.filter(t=>t.dealId===d.id&&!t.done&&new Date(t.due).getTime()<Date.now())){const key=`${r.id}:${t.id}:${t.due}`;if(s.logs.some(l=>l.id===key))continue;r.runs++;s.logs.unshift({id:key,at:now,ruleId:r.id,dealId:d.id,text:`Prazo excedido: ${t.title}.`});}}
    }}
  }else if(type==='integration.save'){
    assert(['Instagram','WhatsApp','E-mail','TikTok','Google Agenda'].includes(p.channel),'Canal inválido.');s.integrations[p.channel]={account:clean(p.account),notes:clean(p.notes,1000)};
  }else if(type==='attachment.add'){
    const d=deal();assert(p.attachment&&clean(p.attachment.id),'Anexo inválido.');d.attachments.push(p.attachment);history(d,`Arquivo anexado: ${p.attachment.name}.`);
  }else throw new Error('Ação desconhecida.');
  if(!['automation.run','lead.note','message.send'].includes(type))s.audit.unshift({id:uid(),at:now,actor:actor.name,text:`${type}: ${clean(p.name||p.title||p.dealId||p.id||'Configuração atualizada')}`});
  s.audit=s.audit.slice(0,500);s.logs=s.logs.slice(0,500);assert(s.deals.length<=5000&&JSON.stringify(s).length<4500000,'Limite deste workspace atingido. Exporte os dados e solicite expansão.');return s;
}
