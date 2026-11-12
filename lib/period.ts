export type PeriodFilter = {period:string;from:string;to:string};
export const businessDay = (at:Date|string = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
}).format(new Date(at));

export function shiftDay(day:string, amount:number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()+amount);
  return date.toISOString().slice(0,10);
}

export function periodRange(filter:PeriodFilter, now = new Date()) {
  if(filter.period==='all') return {from:'',to:''};
  if(filter.period==='custom') return {from:filter.from,to:filter.to};
  const to=businessDay(now), days=Number(filter.period)||30;
  return {from:shiftDay(to,1-days),to};
}

export function withinPeriod(at:string, filter:PeriodFilter, now = new Date()) {
  const time=Date.parse(at), {from,to}=periodRange(filter,now);
  return Number.isFinite(time)
    && (!from||time>=Date.parse(`${from}T00:00:00-03:00`))
    && (!to||time<Date.parse(`${shiftDay(to,1)}T00:00:00-03:00`));
}

// Daily points for short periods; monthly buckets keep long ranges readable.
export function periodBuckets(filter:PeriodFilter, earliest:string, now = new Date()) {
  const range=periodRange(filter,now), to=range.to||businessDay(now), from=range.from||earliest||to;
  const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;
  if(days<=0)return [];
  if(days<=90)return Array.from({length:days},(_,i)=>{const day=shiftDay(from,i);return {from:day,to:day,label:`${day.slice(8)}/${day.slice(5,7)}`};});
  const buckets=[];
  for(let start=from;start<=to;){
    const next=new Date(`${start.slice(0,7)}-01T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth()+1);
    const nextDay=next.toISOString().slice(0,10),end=shiftDay(nextDay,-1);
    buckets.push({from:start,to:end<to?end:to,label:`${start.slice(5,7)}/${start.slice(2,4)}`});
    start=nextDay;
  }
  return buckets;
}
