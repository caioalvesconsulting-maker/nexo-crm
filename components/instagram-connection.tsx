'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,ExternalLink,Camera,RefreshCw,ShieldCheck} from 'lucide-react';

type Status={mode:'demo'|'live';configured:boolean;receiving:boolean;lastWebhookAt:string|null;account?:string|null;configurationError?:boolean};
export function InstagramConnection({project,demo,isOwner,reference,onConfigure}:{project:string;demo:boolean;isOwner:boolean;reference?:string;onConfigure:()=>void}){
  const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setStatus(null);setError('');
    void fetch(`/api/integrations/instagram/status?demo=${demo?1:0}&project=${encodeURIComponent(project)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error('Não foi possível consultar a conexão. Tente atualizar o status.');
      const result=await response.json() as Status;if(!controller.signal.aborted)setStatus(result);
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[project,demo,refresh]);
  const label=loading?'Verificando…':error?'Status indisponível':demo?'Demonstração':status?.receiving?'Recebimento confirmado':status?.configured?'Aguardando direct de teste':'Aguardando configuração';
  return <section className="panel instagram-connection" aria-label="Conexão oficial do Instagram">
    <div className="instagram-connection-heading"><div className="inline-actions"><span className="channel-logo"><Camera size={26}/></span><div><span className="eyebrow">INTEGRAÇÃO OFICIAL META</span><h3>Instagram → Leads em conversa</h3><p>Operação de destino: <strong>{project||'Selecione uma operação'}</strong></p></div></div><span className={`badge ${status?.receiving?'green':'orange'}`}>{label}</span></div>
    <p className="instagram-intro">Receba novos directs no histórico e crie oportunidades na operação certa. A autorização acontece na Meta, com uma conta profissional de Empresa ou Criador.</p>
    {reference&&<p className="instagram-intro">Conta de referência: <strong>{reference}</strong>. O cadastro não concede autorização.</p>}
    <div className="instagram-steps">
      <div><b>01 · Conta profissional</b><p>Confirme o @ e a operação que receberá as conversas.</p></div>
      <div><b>02 · Autorização na Meta</b><p>Configure o aplicativo oficial e conceda acesso às mensagens pela própria Meta.</p></div>
      <div><b>03 · Direct de teste</b><p>Valide uma mensagem recebida antes de iniciar o atendimento.</p></div>
    </div>
    {error&&<p className="red-text" role="alert">{error}</p>}
    <div className="instagram-connection-status" role="status">
      {status?.receiving?<><CheckCircle2 size={18}/><span>Último direct registrado{status.account?` em ${status.account}`:''}: <strong>{new Date(status.lastWebhookAt!).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</strong>. Isso confirma aquele recebimento; não verifica a validade atual da autorização.</span></>:<><ShieldCheck size={18}/><span>{demo?'Você está no ambiente de demonstração. A conexão real deve ser configurada em “Meu CRM”.':status?.configurationError?'A configuração precisa de revisão pelo proprietário.':status?.configured?'A recepção está preparada. Falta confirmar a autorização da conta e receber um direct de teste.':'A conta ainda não está conectada. O proprietário precisa concluir o aplicativo Meta e a configuração de recebimento.'}</span></>}
    </div>
    <div className="instagram-connection-actions">{isOwner&&<button className="btn" onClick={onConfigure}>Registrar conta de referência</button>}<button className="btn" disabled={loading} onClick={()=>setRefresh(v=>v+1)}><RefreshCw size={15} className={loading?'spin':''}/>Atualizar status</button>{isOwner&&<a className="btn" href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Abrir painel da Meta<ExternalLink size={14}/></a>}<span>Envios pelo CRM: desativados nesta etapa.</span></div>
  </section>;
}
