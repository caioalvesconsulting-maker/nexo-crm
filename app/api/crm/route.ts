import {context,json,verifyOrigin,save,failure} from '@/lib/server';
import {visibleState,assert} from '@/lib/crm';
import {mutateState} from '@/lib/commands';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const c=await context(request);return json({state:visibleState(c.state,c.actor),actor:c.actor,revision:c.revision,demo:c.demo});}catch(e){return failure(e);}}
export async function POST(request:Request){try{verifyOrigin(request);const raw=await request.text();assert(raw.length<60000,'Solicitação muito grande.');const command=JSON.parse(raw);assert(!['attachment.add','learning.lesson.file'].includes(command.type),'Use o envio de arquivos para anexar.');const c=await context(request);if(command.type!=='automation.run')assert(command.revision===c.revision,'CONFLICT');const state=mutateState(c.state,command,c.actor,c.demo);if(JSON.stringify(state)===JSON.stringify(c.state))return json({state:visibleState(state,c.actor),actor:c.actor,revision:c.revision,demo:c.demo});return json(await save(c,state));}catch(e){return failure(e);}}
