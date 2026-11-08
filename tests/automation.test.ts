import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/crm';
import type {Actor,State} from '../lib/crm';
import {mutateState} from '../lib/commands';
import {runCloudAutomations,hasRequestContent} from '../lib/cloud-automations';
import type {WorkspaceRow,AutomationStore} from '../lib/cloud-automations';
import {SyncGuard} from '../lib/sync-guard';
const actor:Actor={id:'owner',isOwner:true,projects:['Meu projeto'],name:'Caio',role:'Administrador',allLeads:true,finance:true,export:true};
const apply=(s:State,type:string,payload={})=>mutateState(s,{type,payload},actor);
test('POST vazio atravessa proxies com stream vazio e rejeita conteúdo no primeiro byte',async()=>{
  assert.equal(await hasRequestContent(new Request('https://example.test',{method:'POST'})),false);
  assert.equal(await hasRequestContent(new Request('https://example.test',{method:'POST',body:''})),false);
  assert.equal(await hasRequestContent(new Request('https://example.test',{method:'POST',body:'{}'})),true);
});
function overdue(){const s=apply(emptyState({userId:'owner',displayName:'Caio',email:'owner@example.com'}),'lead.save',{name:'Lead de teste'});s.deals[0].updatedAt='2020-01-01T00:00:00Z';s.tasks[0].due='2020-01-02T00:00:00Z';s.logs=[];return s;}
function memory(state=overdue()){
  let row:WorkspaceRow={owner_id:'owner',data:JSON.stringify(state),revision:0};
  const store:AutomationStore={read:async()=>({...row}),write:async(revision,state)=>{if(revision!==row.revision)return false;row={...row,revision:revision+1,data:JSON.stringify(state)};return true;}};
  return {store,state:()=>JSON.parse(row.data) as State,row:()=>row};
}
test('rotina persiste tarefas, alertas e confirmação; repetir não duplica ações',async()=>{
  const db=memory();const first=await runCloudAutomations(db.store);assert.equal(first.actions,2);assert.equal(db.state().cloudAutomation?.id,first.run.id);assert.equal(db.state().tasks.length,2);
  const second=await runCloudAutomations(db.store);assert.equal(second.actions,0);assert.equal(db.state().tasks.length,2);assert.equal(db.state().logs.length,2);assert.equal(second.revision,2);
});
test('concorrência relê antes de gravar e preserva mudanças feitas pela equipe',async()=>{
  const db=memory();const write=db.store.write;let conflict=true;
  db.store.write=async(revision,state)=>{if(conflict){conflict=false;const concurrent=db.state();concurrent.deals[0].notes='Edição da equipe preservada';await write(revision,concurrent);return false;}return write(revision,state);};
  const result=await runCloudAutomations(db.store);assert.equal(result.revision,2);assert.equal(db.state().deals[0].notes,'Edição da equipe preservada');assert.equal(db.state().tasks.length,2);
});
test('duas verificações simultâneas não criam tarefas duplicadas',async()=>{
  const db=memory();const results=await Promise.all([runCloudAutomations(db.store),runCloudAutomations(db.store)]);assert.deepEqual(results.map(r=>r.actions).sort(),[0,2]);assert.equal(db.state().tasks.length,2);
});
test('conflito persistente e workspace ausente falham sem confirmar execução',async()=>{
  const db=memory();db.store.write=async()=>false;await assert.rejects(()=>runCloudAutomations(db.store),/CONFLICT/);assert.equal(db.state().cloudAutomation,undefined);
  await assert.rejects(()=>runCloudAutomations({read:async()=>null,write:async()=>{throw new Error('must not write');}}),/WORKSPACE_NOT_INITIALIZED/);
});
test('SLA não duplica quando o histórico é compactado; novo prazo permite novo alerta',()=>{
  let s=apply(overdue(),'automation.run');const runs=s.rules.find(r=>r.event==='sla')!.runs;s.logs=[];s=apply(s,'automation.run');assert.equal(s.rules.find(r=>r.event==='sla')!.runs,runs);
  const t=s.tasks.find(t=>t.slaNotified)!;t.due='2020-01-03T00:00:00Z';s=apply(s,'automation.run');assert.equal(s.rules.find(r=>r.event==='sla')!.runs,runs+1);
});
test('regras pausadas e oportunidades encerradas não geram ações; FUP preserva histórico',()=>{
  const s=overdue();s.rules.forEach(r=>r.enabled=false);assert.equal(apply(s,'automation.run').logs.length,0);
  s.rules.forEach(r=>r.enabled=true);s.deals[0].stage='won';assert.equal(apply(s,'automation.run').logs.length,0);
  s.deals[0].stage='conversation';s.rules.find(r=>r.event==='no_reply')!.action='followup';const result=apply(s,'automation.run');assert.equal(result.deals[0].stage,'followup');assert.match(result.deals[0].history[0].text,/movido.*FUP/);
});
test('sincronização descarta leituras antigas após salvar e não regride a revisão',()=>{
  const guard=new SyncGuard(),old=guard.start();guard.commit(5);assert.equal(guard.accept(old,4),false);assert.equal(guard.accept(guard.start(),4),false);assert.equal(guard.accept(guard.start(),6),true);
});
test('troca de ambiente e respostas fora de ordem não substituem os dados atuais',()=>{
  const guard=new SyncGuard(),demo=guard.start();guard.invalidate(true);const live=guard.start();assert.equal(guard.accept(demo,1000),false);assert.equal(guard.accept(live,0),true);
  const slow=guard.start(),fast=guard.start();assert.equal(guard.accept(fast,2),true);assert.equal(guard.accept(slow,3),false);
});
