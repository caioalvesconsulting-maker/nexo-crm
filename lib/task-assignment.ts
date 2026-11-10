import {accessible} from './crm';
import type {Actor,Deal,Member,State} from './crm';
export const isTaskManager=(a:Actor)=>a.isOwner||['Gestor','Administrador'].includes(a.role);
export function eligibleRecipients(s:State,project:string,actor:Actor,deal?:Deal):Member[]{
 return s.members.filter(m=>m.active&&(m.id===s.ownerId||m.projects?.includes(project))&&(isTaskManager(actor)||m.id===actor.id)&&(!deal||accessible(deal,{...m,isOwner:m.id===s.ownerId,projects:m.projects||[]})));
}
