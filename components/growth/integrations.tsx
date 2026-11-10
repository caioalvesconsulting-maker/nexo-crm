'use client';
import React, { useState } from 'react';
import { Braces, Check, CheckCircle2, Code2, Copy, GraduationCap, Link2, Mail, Play, Radio, ShieldCheck } from 'lucide-react';
import { bonusAvailable, id, type MvpModel } from '@/lib/growth-mvp';
import { Field, GButton, GDialog, Pill, SectionTitle, type GrowthProps } from './shared';

function eventExample(model: MvpModel, event: string) {
  const course = model.courses[0], enrollment = model.enrollments.find(e => e.courseId === course?.id && e.status === 'active'), contact = event === 'purchase.approved' ? model.contacts.find(p => !model.enrollments.some(e => e.courseId === course?.id && e.contactId === p.id)) || model.contacts[0] : model.contacts.find(p => p.id === enrollment?.contactId) || model.contacts[0];
  return JSON.stringify({ event_id: `evt_demo_${id().slice(0, 8)}`, event, occurred_at: new Date().toISOString(), data: { email: contact?.email || 'aluno@example.com', product_id: course?.externalId || course?.id, ...(event === 'course.progress' ? { lesson_id: course?.lessons[0]?.id, watched_seconds: course?.lessons[0]?.seconds || 600 } : event === 'bonus.redeemed' ? { bonus_id: model.bonuses.find(b => b.courseId === course?.id)?.id || '' } : {}) } }, null, 2);
}
export function IntegrationPreview({ onClose, ...props }: GrowthProps & { onClose: () => void }) {
  const { model, update, notify, canEdit } = props;
  const [settings, setSettings] = useState(model.integration), [eventType, setEventType] = useState('course.progress'), [payload, setPayload] = useState(() => eventExample(model, 'course.progress')), [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const simulate = () => {
    try {
      const data = JSON.parse(payload);
      if (!data || typeof data.event_id !== 'string' || !data.event_id.trim() || data.event_id.length > 100 || !['course.progress', 'purchase.approved', 'bonus.redeemed'].includes(data.event)) throw new Error('Informe event_id e um dos eventos disponíveis no exemplo.');
      if (model.events.some(e => e.id === data.event_id)) throw new Error('Evento repetido: este event_id já foi processado na simulação.');
      const contact = model.contacts.find(p => p.email.toLowerCase() === String(data.data?.email || '').toLowerCase());
      const course = model.courses.find(c => c.externalId === data.data?.product_id || c.id === data.data?.product_id);
      if (!contact || !course) throw new Error('Use o e-mail de um contato e o ID de um curso existentes nesta operação do MVP.');
      const next = structuredClone(model), enrollment = next.enrollments.find(e => e.contactId === contact.id && e.courseId === course.id);
      const at = data.occurred_at || new Date().toISOString();
      if (!Number.isFinite(Date.parse(at))) throw new Error('Data do evento inválida.');
      if (data.event === 'course.progress') {
        const lesson = course.lessons.find(l => l.id === data.data.lesson_id), seconds = data.data.watched_seconds;
        if (!enrollment || enrollment.status !== 'active') throw new Error('Este exemplo precisa de uma matrícula ativa.');
        if (!lesson || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) throw new Error('Informe lesson_id válido e watched_seconds maior ou igual a zero.');
        enrollment.watched = { ...(enrollment.watched || {}), [lesson.id]: Math.max(enrollment.watched?.[lesson.id] || 0, Math.min(lesson.seconds, seconds)) };
        enrollment.lastSeen = enrollment.lastSeen && enrollment.lastSeen > at ? enrollment.lastSeen : at;
      } else if (data.event === 'purchase.approved') {
        if (enrollment) throw new Error('Este contato já tem uma matrícula para o curso. Use outro contato de exemplo.');
        next.enrollments.push({ id: id(), courseId: course.id, contactId: contact.id, purchasedAt: at, lastSeen: null, watched: null, status: 'active', bonusClaims: [] });
      } else {
        const bonus = next.bonuses.find(b => b.id === data.data.bonus_id);
        if (!enrollment || !bonus || !bonusAvailable(bonus, enrollment, course)) throw new Error('O aluno precisa estar elegível para este bônus na simulação.');
        if (!enrollment.bonusClaims.includes(bonus.id)) enrollment.bonusClaims.push(bonus.id);
      }
      next.events.unshift({ id: data.event_id, at, title: `${data.event} · simulado`, detail: `${contact.name} · ${course.title}` });
      next.events = next.events.slice(0, 50);
      update(() => next);
      setResult({ ok: true, text: 'Evento simulado. A prévia do aluno foi atualizada neste navegador.' });
    } catch (error) { setResult({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível simular este evento.' }); }
  };
  return <GDialog title="Conexões e eventos" subtitle="Desenho das integrações do MVP. Nenhum serviço externo está conectado." onClose={onClose} wide><div className="g-api-status"><span className="g-symbol g-violet"><Link2 size={24} /></span><div><h3>Uma jornada conectada por eventos.</h3><p>Compra, consumo de conteúdo e resgate de bônus serão sinais diferentes.</p></div><Pill color="amber">Não conectado</Pill></div><div className="g-api-config"><form onSubmit={e => { e.preventDefault(); update(m => ({ ...m, integration: settings })); notify('Preferências de integração salvas no MVP. Nenhuma conexão foi ativada.'); }}><SectionTitle title="Plataformas planejadas" subtitle="Apenas referências para o próximo passo. Não insira senhas ou chaves." /><div className="g-form-grid"><Field label="Plataforma de cursos / checkout"><input placeholder="Ainda não definida" maxLength={100} value={settings.lms} onChange={e => setSettings({ ...settings, lms: e.target.value })} /></Field><Field label="Serviço de e-mail"><input placeholder="Ainda não definido" maxLength={100} value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} /></Field></div><GButton small type="submit" disabled={!canEdit}><Check size={14} />Salvar planejamento</GButton></form><div className="g-api-steps"><span><GraduationCap size={19} /><strong>Plataforma de aulas</strong><small>Progresso informado por aula e aluno.</small></span><span><Braces size={19} /><strong>Eventos do CRM</strong><small>Identidade, origem e histórico preservados.</small></span><span><Mail size={19} /><strong>Comunicação</strong><small>Fila, permissão e retorno do provedor.</small></span></div></div><div className="g-api-simulator"><div><SectionTitle title="Simulador de webhook" subtitle="Teste o contrato proposto e veja o efeito no MVP, sem uma chamada de API." /><Field label="Evento de exemplo"><select value={eventType} onChange={e => { setEventType(e.target.value); setPayload(eventExample(model, e.target.value)); setResult(null); }}><option value="course.progress">Progresso em uma aula</option><option value="purchase.approved">Compra aprovada</option><option value="bonus.redeemed">Bônus resgatado</option></select></Field><label className="g-code-label"><span><Code2 size={15} />JSON do evento</span><textarea aria-label="JSON do evento de teste" spellCheck={false} rows={15} value={payload} onChange={e => { setPayload(e.target.value); setResult(null); }} /></label><div className="g-api-simulator-actions"><GButton primary disabled={!canEdit} onClick={simulate}><Play size={15} />Simular evento</GButton><GButton onClick={async () => { try { await navigator.clipboard.writeText(payload); notify('Exemplo de evento copiado.'); } catch { notify('Selecione o JSON para copiar manualmente.', true); } }}><Copy size={14} />Copiar exemplo</GButton></div>{result && <p className={`g-api-result ${result.ok ? 'success' : 'error'}`} role="status">{result.ok && <CheckCircle2 size={16} />}{result.text}</p>}</div><aside><span className="g-kicker">ÚLTIMOS EVENTOS SIMULADOS</span><div className="g-event-list">{model.events.length ? model.events.slice(0, 6).map(e => <div key={e.id}><Radio size={15} /><span><strong>{e.title}</strong><p>{e.detail}</p><small>{new Date(e.at).toLocaleString('pt-BR')}</small></span></div>) : <div className="g-event-empty"><Radio size={25} /><p>Os testes vão aparecer aqui.</p></div>}</div><div className="g-note"><ShieldCheck size={18} /><p>O próximo passo será conectar a API oficial de cada serviço, validar autenticidade e tratar repetição de eventos. O MVP não possui endpoint público nem processa webhooks externos.</p></div></aside></div></GDialog>;
}
