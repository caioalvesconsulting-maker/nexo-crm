'use client';

import {useEffect,useRef,useState} from 'react';
import {Check,Globe,Moon,Play,Sun,Volume2,VolumeX,Sparkles} from 'lucide-react';

type Sound='click'|'success'|'error'|'win';
export function useExperience(){
  const [enabled,setEnabled]=useState(true),[volume,setVolume]=useState(35),[glass,setGlass]=useState('full'),[compact,setCompact]=useState(false),[status,setStatus]=useState('Pronto para testar');
  const audio=useRef<HTMLAudioElement|null>(null),last=useRef(0);
  useEffect(()=>{setEnabled(localStorage.getItem('nexo-sounds')!=='off');const v=Number(localStorage.getItem('nexo-volume')??35);setVolume(Number.isFinite(v)?Math.max(0,Math.min(100,v)):35);setGlass(localStorage.getItem('nexo-glass')==='soft'?'soft':'full');setCompact(localStorage.getItem('nexo-compact')==='true');},[]);
  function play(kind:Sound='click',test=false){
    const el=audio.current;if(!el||(!enabled&&!test)||(!test&&performance.now()-last.current<80))return;
    last.current=performance.now();el.pause();el.src=`/sounds/${kind}.wav`;el.volume=volume/100;
    if(test)setStatus('Reproduzindo prévia…');
    void el.play().then(()=>{if(test)setStatus(volume===0?'Volume em zero. Aumente para ouvir.':'Prévia reproduzida');}).catch(()=>{if(test)setStatus('O navegador bloqueou o áudio. Clique em testar novamente.');});
  }
  return {enabled,volume,glass,compact,status,play,
    setEnabled:(v:boolean)=>{setEnabled(v);localStorage.setItem('nexo-sounds',v?'on':'off');if(!v)audio.current?.pause();},
    setVolume:(v:number)=>{setVolume(v);localStorage.setItem('nexo-volume',String(v));},
    setGlass:(v:string)=>{setGlass(v);localStorage.setItem('nexo-glass',v);},
    setCompact:(v:boolean)=>{setCompact(v);localStorage.setItem('nexo-compact',String(v));},
    audio:<audio ref={audio} id="interface-audio" preload="none" aria-hidden="true"/>,
  };
}

export function ExperienceSettings({experience:e,light,onTheme}:{experience:ReturnType<typeof useExperience>;light:boolean;onTheme:(v:boolean)=>void}){
 return <div className="experience-settings">
  <section className="panel"><div className="panel-heading"><div><h3>Aparência</h3><p>Seu ambiente de trabalho, do seu jeito. Preferências salvas neste navegador.</p></div><Sparkles size={19}/></div>
   <div className="theme-choices">{[{light:false,name:'Noite orbital',text:'Azul profundo, luz e transparência.',Icon:Moon},{light:true,name:'Luz do dia',text:'Vidro claro com contraste suave.',Icon:Sun}].map(t=><button key={t.name} className={`theme-choice ${t.light?'day':'night'} ${light===t.light?'selected':''}`} aria-pressed={light===t.light} onClick={()=>onTheme(t.light)}><div className="theme-preview"><i/><div><b/><span/><span/><span/></div></div><strong><t.Icon size={16}/>{t.name}{light===t.light&&<Check size={16}/>}</strong><small>{t.text}</small></button>)}</div>
   <div className="preference-row"><div><b>Transparência dos painéis</b><p>Escolha a intensidade do efeito de vidro.</p></div><div className="view-switch">{[['soft','Suave'],['full','Imersiva']].map(([v,label])=><button key={v} className={e.glass===v?'active':''} aria-pressed={e.glass===v} onClick={()=>e.setGlass(v)}>{label}</button>)}</div></div>
   <div className="preference-row"><div><b>Menu compacto</b><p>Mais espaço para o seu trabalho em telas grandes.</p></div><button className={`toggle ${e.compact?'on':''}`} role="switch" aria-checked={e.compact} aria-label="Menu compacto" onClick={()=>e.setCompact(!e.compact)}><span/></button></div>
  </section>
  <section className="panel"><div className="panel-heading"><div><h3>Sons da interface</h3><p>Retornos discretos ao navegar, salvar e concluir uma venda.</p></div>{e.enabled?<Volume2 size={19}/>:<VolumeX size={19}/>}</div>
   <div className="preference-row"><div><b>Ativar sons</b><p>Os avisos visuais continuam disponíveis com o som desligado.</p></div><button className={`toggle ${e.enabled?'on':''}`} role="switch" aria-checked={e.enabled} aria-label="Ativar sons" onClick={()=>e.setEnabled(!e.enabled)}><span/></button></div>
   <div className="preference-row"><label htmlFor="sound-volume"><b>Volume</b><p>{e.volume}%</p></label><input id="sound-volume" type="range" min="0" max="100" value={e.volume} onChange={ev=>e.setVolume(Number(ev.target.value))}/></div>
   <div className="sound-tests">{[['success','Salvamento'],['win','Venda ganha'],['error','Atenção']].map(([kind,label])=><button key={kind} className="btn" onClick={()=>e.play(kind as Sound,true)}><Play size={14}/>Testar {label.toLowerCase()}</button>)}</div><p className="sound-status" role="status">{e.status}</p>
  </section>
  <section className="panel locale-panel"><Globe size={23}/><div><h3>Português do Brasil</h3><p>Datas em dia/mês/ano · Valores em real (R$) · Horário de Brasília.</p></div><span className="badge green">Padrão</span></section>
 </div>;
}
