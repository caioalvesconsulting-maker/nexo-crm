import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert.ok(cookie,'Local development sign-in must set cookie');
const unauth=await fetch(base+'/api/crm?demo=1');assert.equal(unauth.status,401);
const request=async(path,opts={})=>fetch(base+path,{...opts,headers:{Cookie:cookie,...opts.headers}});
const initial=await (await request('/api/crm?demo=1')).json();assert.ok(initial.state.deals.length>0);
const denied=await request('/api/crm?demo=1',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:JSON.stringify({type:'lead.note',payload:{dealId:initial.state.deals[0].id,text:'must not write'},revision:initial.revision})});assert.ok([400,403].includes(denied.status));
const body={type:'lead.note',payload:{dealId:initial.state.deals[0].id,text:'Teste automatizado de persistência e concorrência'},revision:initial.revision};
const first=await request('/api/crm?demo=1',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(first.status,200);const saved=await first.json();
const repeated=await request('/api/crm?demo=1',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(repeated.status,409);
const loaded=await (await request('/api/crm?demo=1')).json();assert.equal(loaded.revision,saved.revision);assert.equal(loaded.state.deals[0].history[0].text,body.payload.text);
const form=new FormData();form.set('dealId',loaded.state.deals[0].id);form.set('file',new File(['Nexo CRM: arquivo de teste de armazenamento.'],'teste-armazenamento.txt',{type:'text/plain'}));
const upload=await request('/api/files?demo=1',{method:'POST',headers:{Origin:base},body:form});assert.equal(upload.status,200);const result=await upload.json(),attachment=result.state.deals[0].attachments.at(-1);assert.ok(attachment.id);
const file=await request('/api/files?demo=1&id='+attachment.id);assert.equal(file.status,200);assert.match(await file.text(),/Nexo CRM/);assert.match(file.headers.get('content-disposition'),/attachment/);
const inactive=await request('/api/integrations/events',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(inactive.status,503);
const igStatus=await request('/api/integrations/instagram/status?demo=1&project='+encodeURIComponent(initial.state.projects[0]));assert.equal(igStatus.status,200);assert.deepEqual(await igStatus.json(),{mode:'demo',configured:false,receiving:false,lastWebhookAt:null});
assert.equal((await fetch(base+'/api/integrations/instagram/status?demo=1')).status,401);
assert.equal((await request('/api/integrations/instagram/status?demo=1&project=not-an-operation')).status,400);
assert.equal((await request('/api/integrations/instagram/webhook',{method:'POST',body:'{}'})).status,503);
assert.equal((await fetch(base+'/api/automations/status?demo=1')).status,401);
const automationStatus=await (await request('/api/automations/status?demo=1')).json();assert.deepEqual(automationStatus,{mode:'demo',scheduled:false,lastRun:null});
assert.equal((await request('/api/automations/cloud',{method:'POST'})).status,503);
console.log('PASS: identity, same-origin enforcement, persistence, optimistic concurrency, R2 upload/download, scoped Instagram status and disabled external events.');

// Dedicated routes: identity, origin, draft fallback and private PDF storage.
const current=await (await request('/api/crm?demo=1')).json();
const createFollowup=await request('/api/crm?demo=1',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({type:'followup.save',revision:current.revision,payload:{project:current.state.projects[0],name:'Teste HTTP follow-up',ownerId:current.actor.id,stop:'dm',objection:'Vai pensar',lastContact:'2020-01-01'}})});
assert.equal(createFollowup.status,200);const followState=await createFollowup.json(),followup=followState.state.followups[0];
assert.equal((await fetch(base+'/api/followup/suggest?demo=1',{method:'POST',headers:{Origin:base},body:JSON.stringify({id:followup.id})})).status,401);
assert.ok([400,403].includes((await request('/api/followup/suggest?demo=1',{method:'POST',headers:{Origin:'https://untrusted.invalid'},body:JSON.stringify({id:followup.id})})).status));
const suggested=await request('/api/followup/suggest?demo=1',{method:'POST',headers:{Origin:base},body:JSON.stringify({id:followup.id})});assert.equal(suggested.status,200);const draft=await suggested.json();assert.equal(draft.mode,'template');assert.equal(draft.connected,false);assert.ok(draft.text.length>30);
assert.equal((await request('/api/followup/suggest?demo=1',{method:'POST',headers:{Origin:base},body:JSON.stringify({id:'missing'})})).status,400);
const lesson=followState.state.learning.lessons[0],invalidPdf=new FormData();invalidPdf.set('lessonId',lesson.id);invalidPdf.set('file',new File(['not a PDF'],'fake.pdf',{type:'application/pdf'}));
assert.equal((await request('/api/training/files?demo=1',{method:'POST',headers:{Origin:base},body:invalidPdf})).status,400);
const pdf=new FormData();pdf.set('lessonId',lesson.id);pdf.set('file',new File(['%PDF-1.4\n% Storage round-trip fixture\n%%EOF'],'teste-pdf.pdf',{type:'application/pdf'}));
const pdfResponse=await request('/api/training/files?demo=1',{method:'POST',headers:{Origin:base},body:pdf});assert.equal(pdfResponse.status,200);const pdfSaved=await pdfResponse.json(),updatedLesson=pdfSaved.state.learning.lessons.find(l=>l.id===lesson.id);assert.equal(updatedLesson.version,lesson.version+1);
assert.equal((await fetch(base+'/api/training/files?demo=1&id='+updatedLesson.file.id)).status,401);
const pdfRead=await request('/api/training/files?demo=1&id='+updatedLesson.file.id);assert.equal(pdfRead.status,200);assert.equal(pdfRead.headers.get('content-type'),'application/pdf');assert.match(pdfRead.headers.get('content-disposition'),/attachment/);assert.match(await pdfRead.text(),/^%PDF-/);
assert.equal((await request('/api/crm?demo=1',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({type:'learning.lesson.file',revision:pdfSaved.revision,payload:{lessonId:lesson.id,file:{id:'fake',name:'fake.pdf'}}})})).status,400);
console.log('PASS: follow-up drafts, identity and origin checks, PDF validation, private storage, material versioning and rejection of fabricated file attachments.');

// Success workflow uses the same revision guard; uploads cannot forge completion.
const successInitial=await (await request('/api/crm?demo=1')).json();
const successProject=successInitial.state.projects[1]||successInitial.state.projects[0];
async function successCommand(type,payload){const snapshot=await(await request('/api/crm?demo=1')).json();return request('/api/crm?demo=1',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({type:'success.'+type,payload,revision:snapshot.revision})});}
const sc=await successCommand('case.save',{project:successProject,name:'Teste HTTP · Success',result:'Resultado de teste para validar armazenamento',resultAt:'2026-01-01',assignees:Array(8).fill(successInitial.actor.id)});assert.equal(sc.status,200);const scState=await sc.json(),scId=scState.state.success.cases.find(c=>!successInitial.state.success.cases.some(old=>old.id===c.id)).id;
// The case may wait behind another local test case. Restrict file tests to the active case selected by the queue.
let ss=await(await request('/api/crm?demo=1')).json();if(!ss.state.success.cases.some(c=>c.project===successProject&&c.status==='active')){const next=await successCommand('next',{project:successProject});assert.equal(next.status,200);ss=await next.json();}
const scActive=ss.state.success.cases.find(c=>c.project===successProject&&c.status==='active');
assert.equal((await fetch(base+'/api/success/files?demo=1&id=missing')).status,401);
const fakePhoto=new FormData();fakePhoto.set('caseId',scActive.id);fakePhoto.set('kind','photo');fakePhoto.set('step',String(scActive.proofs.length));fakePhoto.set('file',new File(['not a photo'],'bad.png',{type:'image/png'}));assert.equal((await request('/api/success/files?demo=1',{method:'POST',headers:{Origin:base},body:fakePhoto})).status,400);
const sf=new FormData();sf.set('caseId',scActive.id);sf.set('kind','proof');sf.set('step',String(scActive.proofs.length));sf.set('file',new File(['Success: prova de teste local.'],'prova-success.txt',{type:'text/plain'}));const su=await request('/api/success/files?demo=1',{method:'POST',headers:{Origin:base},body:sf});assert.equal(su.status,200);const sur=await su.json();assert.ok(sur.fileId);
const sg=await request('/api/success/files?demo=1&id='+sur.fileId);assert.equal(sg.status,200);assert.match(sg.headers.get('content-disposition'),/attachment/);assert.match(sg.headers.get('cache-control'),/private/);assert.match(await sg.text(),/Success/);
assert.equal((await successCommand('file',{id:scActive.id,file:{id:'forged',name:'fake.txt',kind:'proof',step:scActive.proofs.length}})).status,400);
assert.equal((await successCommand('complete',{id:scActive.id,step:scActive.proofs.length+1,data:{}})).status,400);
const sp=new FormData();sp.set('caseId',scActive.id);sp.set('kind','photo');sp.set('step',String(scActive.proofs.length));sp.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64')],'foto-teste.png',{type:'image/png'}));const spu=await request('/api/success/files?demo=1',{method:'POST',headers:{Origin:base},body:sp});assert.equal(spu.status,200);const spr=await spu.json(),spg=await request('/api/success/files?demo=1&id='+spr.fileId);assert.equal(spg.headers.get('content-type'),'image/png');assert.match(spg.headers.get('content-disposition'),/inline/);
console.log('PASS: Success case persistence, active queue, private evidence/photo uploads, authentication, photo validation and rejection of forged files/skipped steps.');

// Moving an opportunity to FUP must persist both records atomically, without a date dialog.
let pipelineSnapshot=await(await request('/api/crm?demo=1')).json();
const pipelineMove=async(type,payload)=>{
 const response=await request('/api/crm?demo=1',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({type,payload,revision:pipelineSnapshot.revision})});
 assert.equal(response.status,200);pipelineSnapshot=await response.json();return pipelineSnapshot;
};
await pipelineMove('lead.save',{name:'FUP automático · teste',project:pipelineSnapshot.state.projects[0],ownerId:pipelineSnapshot.actor.id,source:'Instagram',phone:'11987650000',notes:'Contexto para o próximo contato.'});
const pipelineId=pipelineSnapshot.state.deals[0].id;
await pipelineMove('lead.move',{dealId:pipelineId,stage:'followup'});
const linkedFollowup=pipelineSnapshot.state.followups.find(f=>f.dealId===pipelineId);
assert.ok(linkedFollowup);assert.equal(linkedFollowup.status,'active');assert.equal(linkedFollowup.lastContact,'');assert.equal(linkedFollowup.ownerId,pipelineSnapshot.actor.id);
await pipelineMove('lead.move',{dealId:pipelineId,stage:'booking'});
await pipelineMove('lead.move',{dealId:pipelineId,stage:'followup'});
const pipelineReload=await(await request('/api/crm?demo=1')).json();
assert.equal(pipelineReload.state.deals.find(d=>d.id===pipelineId).stage,'followup');
assert.equal(pipelineReload.state.followups.filter(f=>f.dealId===pipelineId).length,1);
assert.equal(pipelineReload.state.followups.find(f=>f.dealId===pipelineId).id,linkedFollowup.id);
console.log('PASS: pipeline FUP entry, persistent follow-up, responsible person and duplicate-free reentry.');
