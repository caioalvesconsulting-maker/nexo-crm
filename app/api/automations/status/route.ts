import {env} from 'cloudflare:workers';
import {context,json,failure} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {const c=await context(request);return json({mode:c.demo?'demo':'live',scheduled:!c.demo&&env.CRM_AUTOMATION_SERVICE_ENABLED==='true'&&env.CRM_AUTOMATION_SCHEDULE_ACTIVE==='true',lastRun:c.demo?null:c.state.cloudAutomation||null});}
  catch(e){return failure(e);}
}
