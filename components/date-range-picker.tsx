'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {DayPicker,type DateRange} from 'react-day-picker';
import {ptBR} from 'react-day-picker/locale';
import {businessDay,periodRange,type PeriodFilter} from '@/lib/period';

const dateOf=(day:string)=>new Date(`${day}T12:00:00`);
const dayOf=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const shortDate=(day:string)=>`${day.slice(8)}/${day.slice(5,7)}/${day.slice(2,4)}`;

export function DateRangePicker({value,onChange}:{value:PeriodFilter;onChange:(value:PeriodFilter)=>void}) {
  const range=periodRange(value), id=useId();
  const root=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false),[narrow,setNarrow]=useState(false);
  const [draft,setDraft]=useState<DateRange>(),[month,setMonth]=useState(new Date());
  const label=range.from&&range.to?`${shortDate(range.from)} - ${shortDate(range.to)}`:value.period==='all'?'Todo o período':'Selecionar período';

  useEffect(()=>{
    const query=window.matchMedia('(max-width: 760px)');
    const update=()=>setNarrow(query.matches);
    update();query.addEventListener('change',update);
    return()=>query.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    if(!open)return;
    const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
  },[open]);

  function toggle() {
    if(open){setOpen(false);return;}
    const from=range.from?dateOf(range.from):undefined,to=range.to?dateOf(range.to):undefined;
    setDraft(from?{from,to}:undefined);
    setMonth(from||dateOf(businessDay()));setOpen(true);
  }
  function apply(next:PeriodFilter){onChange(next);setOpen(false);trigger.current?.focus();}

  return <div className="date-range-picker" ref={root} onBlur={event=>{
    if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);
  }}>
    <button ref={trigger} type="button" className="date-range-trigger" aria-label={`Período: ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={toggle}>
      <CalendarDays size={17}/><span>{label}</span>
    </button>
    {open&&<div className="date-range-popover" id={id} role="dialog" aria-label="Selecionar período">
      <DayPicker mode="range" required resetOnSelect selected={draft} onSelect={next=>{
        setDraft(next);
        if(next.from&&next.to)apply({period:'custom',from:dayOf(next.from),to:dayOf(next.to)});
      }} month={month} onMonthChange={setMonth} numberOfMonths={narrow?1:2} locale={ptBR} weekStartsOn={0} showOutsideDays autoFocus
      formatters={{formatCaption:date=>date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(' de ',' '),formatWeekdayName:date=>date.toLocaleDateString('pt-BR',{weekday:'short'}).slice(0,3)}}
      labels={{labelNext:()=> 'Próximo mês',labelPrevious:()=> 'Mês anterior',labelNav:()=> 'Navegar pelos meses',labelDayButton:(date,modifiers)=>`${date.toLocaleDateString('pt-BR',{dateStyle:'full'})}${modifiers.selected?', selecionado':''}`}}
      />
      <div className="date-range-footer">
        <span role="status">{draft?.from&&!draft.to?'Agora escolha a data final':'Escolha a data inicial e a final'}</span>
        <div className="date-range-presets" aria-label="Períodos rápidos">
          {['7','30','90'].map(period=><button type="button" key={period} onClick={()=>apply({period,from:'',to:''})}>{period} dias</button>)}
          <button type="button" onClick={()=>apply({period:'all',from:'',to:''})}>Todo o período</button>
        </div>
      </div>
    </div>}
  </div>;
}
