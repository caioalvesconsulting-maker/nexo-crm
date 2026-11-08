'use client';
import {useEffect,useState} from 'react';
import {Cloud,Clock,RefreshCw} from 'lucide-react';
type Status={mode:'demo'|'live';scheduled:boolean;lastRun:{id:string;at:string}|null};
export function AutomationStatus({demo}:{demo:boolean}) {
  const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let active=false;
    setStatus(null);setError(false);
    async function check(){if(active)return;active=true;try{const response=await fetch(`/api/automations/status?demo=${demo?1:0}`,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json() as Status;if(!controller.signal.aborted){setStatus(data);setError(false);}}catch{if(!controller.signal.aborted)setError(true);}finally{active=false;}}
    void check();const interval=setInterval(()=>{if(document.visibilityState==='visible')void check();},30000);
    return()=>{controller.abort();clearInterval(interval);};
  },[demo,retry]);
  const overdue=!!status?.lastRun&&Date.now()-Date.parse(status.lastRun.at)>90*60000;
  return <section className="panel automation-health" aria-label="Verificação automática de prazos">
    <div className="automation-health-heading"><span className="automation-health-icon"><Cloud size={23}/></span><div><span className="eyebrow">ROTINA COMERCIAL</span><h3>{demo?'Explore as automações':'Seu acompanhamento continua na nuvem'}</h3></div><span className={`badge ${error||overdue?'orange':status?.scheduled?'green':'gray'}`} role="status">{error?'Status indisponível':!status?'Consultando…':demo?'Demonstração':status.scheduled?overdue?'Verificação atrasada':'Rotina agendada':'Agendamento pendente'}</span></div>
    <div className="automation-health-grid"><div><b>Ao cadastrar ou mover</b><p>As regras são executadas na hora, conforme o gatilho e a operação.</p></div><div><b>{demo?'Teste de prazos':'Prazos e follow-ups'}</b><p>{demo?'Use “Verificar agora” para testar com os dados de exemplo.':status?.scheduled?'Verificação a cada hora, mesmo com o CRM fechado. Com a tela aberta, a cada minuto.':'Verificação a cada minuto com a tela aberta. A rotina na nuvem aguarda ativação.'}</p></div><div><b>Equipe sincronizada</b><p>Alterações são buscadas a cada 15 segundos, sem interromper formulários ou arrastes.</p></div></div>
    <div className="automation-health-foot"><span><Clock size={14}/>{demo?'A demonstração não participa da rotina na nuvem.':status?.lastRun?`Última verificação na nuvem: ${new Date(status.lastRun.at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}`:'Nenhuma verificação na nuvem registrada.'}</span><button className="text-btn" onClick={()=>setRetry(x=>x+1)}><RefreshCw size={13}/>Atualizar status</button></div>
    {overdue&&!demo&&<p className="red-text">A última verificação passou do intervalo esperado. Use “Verificar agora” e confira a rotina agendada.</p>}
    <p className="automation-health-note">As regras criam tarefas, registram alertas e podem mover leads para FUP. Os avisos ficam no CRM.</p>
  </section>;
}
