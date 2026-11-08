import {ingestEvent} from './inbound';
import {upgradeState} from './operations';
import {normalizeInstagramWebhook} from './instagram-webhook';
import type {InstagramBinding} from './instagram-webhook';
import type {State} from './crm';

export async function ingestInstagramWebhook(input:State,body:unknown,bindings:InstagramBinding[],now=Date.now()){
  const {events,ignored}=await normalizeInstagramWebhook(body,bindings,now);
  let state=upgradeState(input,input.ownerId||input.members[0].id),accepted=0,duplicates=0;
  for(const event of events){
    const result=ingestEvent(state,event);state=result.state;
    if(result.duplicate){duplicates++;continue;}
    accepted++;
    const key=`${event.project}::Instagram`,binding=bindings.find(b=>b.accountId===event.instagramAccountId)!;
    const previous=state.integrations[key];
    state.integrations[key]={...previous,account:binding.username||previous?.account||'',notes:previous?.notes||'',project:event.project,channel:'Instagram',instagramAccountId:binding.accountId,lastWebhookAt:new Date(now).toISOString()};
  }
  return {state,accepted,duplicates,ignored};
}
