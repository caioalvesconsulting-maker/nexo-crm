import {mutateState} from './commands';
import {upgradeState} from './operations';
import type {Actor, State} from './crm';

export type WorkspaceRow = {owner_id:string;data:string;revision:number};
export type AutomationStore = {
  read:()=>Promise<WorkspaceRow|null>;
  write:(revision:number,state:State)=>Promise<boolean>;
};

// Only the shared, real workspace is eligible. Callers cannot select a user,
// project or demo workspace. CAS retries preserve concurrent team edits.
export async function runCloudAutomations(store:AutomationStore) {
  for(let attempt=0;attempt<3;attempt++) {
    const row=await store.read();
    if(!row)throw new Error('WORKSPACE_NOT_INITIALIZED');
    const state=upgradeState(JSON.parse(row.data) as State,row.owner_id);
    const actor:Actor={id:row.owner_id,name:'Automação na nuvem',role:'Administrador',isOwner:true,projects:state.projects,allLeads:true,finance:false,export:false};
    const result=mutateState(state,{type:'automation.run',payload:{}},actor);
    const actions=result.rules.reduce((sum,r)=>sum+r.runs,0)-state.rules.reduce((sum,r)=>sum+r.runs,0);
    const run={id:crypto.randomUUID(),at:new Date().toISOString()};
    result.cloudAutomation=run;
    if(await store.write(row.revision,result))return {run,actions,revision:row.revision+1};
  }
  throw new Error('CONFLICT');
}

export function automationStore(db:D1Database):AutomationStore {
  return {
    read:()=>db.prepare('SELECT owner_id,data,revision FROM crm_workspaces WHERE id = ?').bind('main').first<WorkspaceRow>(),
    async write(revision,state) {
      const result=await db.prepare('UPDATE crm_workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(state),new Date().toISOString(),'main',revision).run();
      return result.meta.changes===1;
    },
  };
}
