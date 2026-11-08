import type {Deal,Sale} from './crm';

// Revenue belongs to the sale date; cash belongs to the receipt date.
// A receipt from an older sale must still appear in this period's cash chart.
export function projectFinancials(projects:string[],deals:Deal[],sales:Sale[],within:(at:string)=>boolean){
 const projectOf=new Map(deals.map(d=>[d.id,d.project]));
 const totals=new Map(projects.map(name=>[name,{name,revenue:0,net:0}]));
 for(const sale of sales){
  if(sale.status!=='Ativa')continue;
  const row=totals.get(projectOf.get(sale.dealId)||'');if(!row)continue;
  if(within(sale.createdAt))row.revenue+=sale.amount;
  for(const receipt of sale.receipts)if(within(receipt.at))row.net+=receipt.net;
 }
 return [...totals.values()];
}
