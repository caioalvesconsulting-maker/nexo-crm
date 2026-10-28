import {context,json,verifyOrigin,save,failure} from '@/lib/server';
import {visibleState,assert} from '@/lib/crm';
import {mutateState} from '@/lib/commands';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const c=await context(request);return json({state:visibleState(c.state,c.actor),actor:c.actor,revision:c.revision,demo:c.demo});}catch(e){return failure(e);}}
export async function POST(request:Request){try{verifyOrigin(request);const raw=await request.text();assert(raw.length<60000,'Solicitação muito grande.');const command=JSON.parse(raw);assert(command.type!=='attachment.add','Use o envio de arquivos para anexar.');const c=await context(request);assert(command.revision===c.revision,'CONFLICT');const state=mutateState(c.state,command,c.actor,c.demo);return json(await save(c,state));}catch(e){return failure(e);}}
