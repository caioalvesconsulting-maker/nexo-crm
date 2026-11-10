/** Isolated, browser-only product prototype. Never writes to the CRM or sends messages. */
export type FormKind = 'magnet' | 'networking' | 'mentoring';
export type Heat = 'hot' | 'warm' | 'cold' | 'unknown';
export type FormField = { id: string; label: string; type: 'text' | 'email' | 'tel' | 'textarea' | 'select'; required: boolean; options?: string[] };
export type CaptureForm = { id: string; kind: FormKind; title: string; description: string; button: string; status: 'draft' | 'ready'; fields: FormField[]; asset: string; campaign: string; source: string };
export type Touch = { id: string; title: string; detail: string; at: string };
export type Prospect = { id: string; name: string; email: string; phone: string; source: string; campaign: string; content: string; emailConsent: boolean; whatsappConsent: boolean; optedOut: boolean; mentor: boolean; signals: string[]; heat: Heat; fit: 'pending' | 'fit' | 'outside'; override?: { heat: Heat; reason: string }; timeline: Touch[] };
export type Submission = { id: string; formId: string; contactId: string; at: string; answers: Record<string, string>; source: string; campaign: string; content: string; review: 'pending' | 'approved' | 'invited' | 'joined' };
export type Lesson = { id: string; title: string; module: string; seconds: number };
export type Course = { id: string; title: string; subtitle: string; price: number; lessons: Lesson[]; externalId: string; color: string };
export type Enrollment = { id: string; courseId: string; contactId: string; purchasedAt: string; lastSeen: string | null; watched: Record<string, number> | null; status: 'active' | 'refunded'; bonusClaims: string[] };
export type Bonus = { id: string; courseId: string; title: string; description: string; type: 'PDF' | 'Vídeo' | 'Planilha' | 'Encontro'; url: string; trigger: 'days' | 'progress' | 'manual'; threshold: number; enabled: boolean };
export type Campaign = { id: string; name: string; channel: 'email' | 'whatsapp' | 'groups'; courseId: string; contactId?: string; audience: 'all' | 'not-started' | 'engaged' | 'incomplete'; subject: string; body: string; bonusId: string; delay: number; groups: string[]; status: 'draft' | 'simulated'; recipients: number; at: string };
export type MvpModel = { version: 1; project: string; forms: CaptureForm[]; contacts: Prospect[]; submissions: Submission[]; courses: Course[]; enrollments: Enrollment[]; bonuses: Bonus[]; campaigns: Campaign[]; integration: { lms: string; email: string }; events: Touch[] };
export const kinds: Record<FormKind, { label: string; short: string; color: string; description: string }> = {
  magnet: { label: 'Isca gratuita', short: 'Iscas', color: 'cyan', description: 'Conteúdo que inicia uma relação.' },
  networking: { label: 'Networking selecionado', short: 'Networking', color: 'violet', description: 'Pessoas que crescem juntas.' },
  mentoring: { label: 'Aplicação para mentoria', short: 'Mentoria', color: 'amber', description: 'Interesse declarado. Contexto para qualificar.' },
};
export const heatLabels: Record<Heat, string> = { hot: 'Quente', warm: 'Morno', cold: 'Frio', unknown: 'Sem avaliação' };
export const fitLabels = { pending: 'A qualificar', fit: 'Perfil compatível', outside: 'Fora do perfil' };
export const id = () => crypto.randomUUID();
export const atDays = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
export const shortDate = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
export const heatOf = (p: Prospect) => p.override?.heat || p.heat;
export const heatRank: Record<Heat, number> = { hot: 3, warm: 2, cold: 1, unknown: 0 };
export function fieldsFor(kind: FormKind): FormField[] {
  const fields: FormField[] = [
    { id: 'name', label: 'Como você se chama?', type: 'text', required: true },
    { id: 'email', label: 'Seu e-mail', type: 'email', required: true },
    { id: 'phone', label: 'Seu WhatsApp com DDD', type: 'tel', required: true },
  ];
  if (kind !== 'magnet') fields.push(
    { id: 'moment', label: 'Em qual área você atua e em que momento está?', type: 'textarea', required: true },
    { id: 'result', label: 'Qual resultado você já conquistou?', type: 'textarea', required: true },
    { id: 'goal', label: 'O que deseja alcançar nos próximos três meses?', type: 'textarea', required: true },
  );
  if (kind === 'networking') fields.push(
    { id: 'action', label: 'O que você está fazendo para chegar lá?', type: 'textarea', required: true },
    { id: 'contribution', label: 'O que pode compartilhar com o grupo?', type: 'textarea', required: true },
  );
  if (kind === 'mentoring') fields.push(
    { id: 'challenge', label: 'O que está impedindo seu próximo passo?', type: 'textarea', required: true },
    { id: 'attempts', label: 'O que já tentou para resolver?', type: 'textarea', required: false },
    { id: 'time', label: 'Quanto tempo pode dedicar à aplicação?', type: 'text', required: true },
    { id: 'start', label: 'Quando pretende começar?', type: 'select', options: ['Neste mês', 'Nos próximos três meses', 'Estou pesquisando'], required: true },
  );
  return fields;
}
export function newCaptureForm(kind: FormKind): CaptureForm {
  return { id: id(), kind, title: kinds[kind].label, description: kinds[kind].description, button: kind === 'magnet' ? 'Quero receber o material' : kind === 'networking' ? 'Enviar minha candidatura' : 'Quero me candidatar', status: 'draft', fields: fieldsFor(kind), asset: '', campaign: '', source: '' };
}
export function progress(course: Course, enrollment: Enrollment): number | null {
  if (enrollment.watched === null) return null;
  const total = course.lessons.reduce((n, l) => n + l.seconds, 0);
  if (!total) return null;
  const watched = course.lessons.reduce((n, l) => n + Math.min(l.seconds, Math.max(0, enrollment.watched?.[l.id] || 0)), 0);
  return Math.round(watched / total * 100);
}
export function bonusAvailable(b: Bonus, e: Enrollment, c: Course): boolean {
  if (!b.enabled || b.courseId !== e.courseId || e.status !== 'active') return false;
  return b.trigger === 'days' ? (Date.now() - Date.parse(e.purchasedAt)) / 86400000 >= b.threshold : b.trigger === 'progress' ? (progress(c, e) ?? -1) >= b.threshold : false;
}
export function campaignAudience(model: MvpModel, campaign: Pick<Campaign, 'channel' | 'courseId' | 'contactId' | 'audience'>) {
  let contacts = model.contacts.filter(p => !campaign.contactId || p.id === campaign.contactId);
  if (campaign.courseId || campaign.audience !== 'all') {
    const ids = new Set(model.enrollments.filter(e => {
      if (e.status !== 'active' || (campaign.courseId && e.courseId !== campaign.courseId)) return false;
      const course = model.courses.find(c => c.id === e.courseId);
      const p = course ? progress(course, e) : null;
      return campaign.audience === 'all' || (p !== null && (campaign.audience === 'not-started' ? p === 0 : campaign.audience === 'engaged' ? p >= 50 : p > 0 && p < 100));
    }).map(e => e.contactId));
    contacts = contacts.filter(p => ids.has(p.id));
  }
  const excluded: { contact: Prospect; reason: string }[] = [];
  const eligible = contacts.filter(p => {
    const reason = p.optedOut ? 'Descadastrado' : p.mentor ? 'Já está na mentoria' : campaign.channel === 'email' && !p.emailConsent ? 'Sem permissão para e-mail' : campaign.channel === 'whatsapp' && !p.whatsappConsent ? 'Sem permissão para WhatsApp' : '';
    if (reason) excluded.push({ contact: p, reason });
    return !reason;
  });
  return { eligible, excluded };
}
export function seedMvp(project: string): MvpModel {
  const forms = (['magnet', 'networking', 'mentoring'] as FormKind[]).map((kind, i) => ({ ...newCaptureForm(kind), id: `form-${kind}`, status: 'ready' as const, title: ['Mapa do próximo nível', 'Círculo de networking', 'Mentoria · próximo nível'][i], description: ['Receba o guia para organizar seu crescimento e colocar o próximo passo em prática.', 'Um espaço para quem executa, compartilha e quer construir novas conexões.', 'Conte seu momento. Vamos entender se a mentoria faz sentido para você.'][i], campaign: ['Guia orgânico', 'Comunidade novembro', 'Aplicações novembro'][i], source: ['YouTube', 'Story · formulário', 'Página da mentoria'][i], asset: kind === 'magnet' ? 'Mapa do próximo nível.pdf' : '' }));
  const names = ['Marina Costa', 'Rafael Almeida', 'Beatriz Rocha', 'Lucas Ferreira', 'Camila Santos', 'Pedro Martins', 'Juliana Lima', 'Gabriel Souza', 'Amanda Oliveira', 'Thiago Ribeiro', 'Fernanda Dias', 'Bruno Nunes'];
  const sources = ['YouTube', 'Story · página de vendas', 'Tráfego pago', 'Networking', 'Story · formulário', 'YouTube'];
  const contacts: Prospect[] = names.map((name, i) => {
    const hot = [0, 2, 4].includes(i), warm = [1, 3, 6, 7].includes(i);
    return { id: `prospect-${i}`, name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: `+55 (11) 9••••-${String(1000 + i)}`, source: sources[i % sources.length], campaign: i % 2 ? 'Próximo nível · orgânico' : 'Novembro · aquisição', content: i % 2 ? 'Story: seu próximo passo' : 'Vídeo: organizando o comercial', emailConsent: i !== 8, whatsappConsent: i % 3 !== 1, optedOut: i === 9, mentor: i === 11, signals: hot ? ['Aplicação para mentoria recebida.', 'Declarou intenção de começar neste mês.', i === 0 ? 'Respondeu ao SDR e descreveu o objetivo.' : 'Informou disponibilidade para aplicar o conteúdo.'] : warm ? ['Demonstrou interesse em conhecer a mentoria.', 'Interação de interesse registrada no exemplo.'] : i === 5 ? ['Candidatura ao networking. Interesse em mentoria ainda não avaliado.'] : ['Solicitou uma isca. Nenhum outro sinal de intenção registrado.'], heat: hot ? 'hot' : warm ? 'warm' : i === 5 ? 'unknown' : 'cold', fit: i === 0 || i === 4 ? 'fit' : i === 2 ? 'outside' : 'pending', timeline: [{ id: `touch-${i}`, title: 'Primeiro contato identificado', detail: `${sources[i % sources.length]} · ${i % 2 ? 'Conteúdo orgânico' : 'Campanha de novembro'}`, at: atDays(14 - i) }] };
  });
  const submissions: Submission[] = [];
  contacts.forEach((p, i) => {
    const types: FormKind[] = i === 5 ? ['networking'] : i === 0 ? ['magnet', 'networking', 'mentoring'] : [2, 4].includes(i) ? ['magnet', 'mentoring'] : [1, 3, 7].includes(i) ? ['magnet', 'networking'] : ['magnet'];
    types.forEach((kind, j) => {
      const at = atDays(Math.max(0, 12 - i - j));
      submissions.push({ id: `submission-${i}-${kind}`, formId: `form-${kind}`, contactId: p.id, at, source: j ? 'E-mail · relacionamento' : p.source, campaign: j ? 'Convite para o próximo passo' : p.campaign, content: kind === 'magnet' ? 'Mapa do próximo nível' : kind === 'networking' ? 'Convite para networking' : 'Aplicação para mentoria', review: kind === 'networking' && i === 0 ? 'joined' : 'pending', answers: { name: p.name, email: p.email, phone: p.phone, moment: i % 2 ? 'Tenho um negócio em crescimento e quero estruturar a próxima etapa.' : 'Atuo com serviços e estou organizando meu processo comercial.', result: 'Conquistei os primeiros clientes recorrentes e validei minha oferta.', goal: 'Estruturar o comercial e crescer com mais previsibilidade.', action: 'Estou revisando minha oferta e colocando uma rotina de prospecção em prática.', contribution: 'Posso compartilhar experiências com conteúdo, atendimento e aquisição.', challenge: 'Tenho dificuldade em transformar conversas em oportunidades qualificadas.', attempts: 'Já fiz cursos e organizei uma rotina, mas preciso de acompanhamento.', time: 'Três horas por semana', start: 'Neste mês' } });
      p.timeline.push({ id: `timeline-${i}-${kind}`, at, title: kind === 'magnet' ? 'Solicitou a isca' : kind === 'networking' ? 'Enviou candidatura ao networking' : 'Aplicou para a mentoria', detail: forms.find(f => f.kind === kind)!.title });
    });
  });
  const courses: Course[] = ['Fundamentos do crescimento', 'Conteúdo que conecta', 'Oferta e posicionamento'].map((title, i) => ({ id: `course-${i}`, title, subtitle: ['Seu primeiro passo para uma operação organizada.', 'Transforme conhecimento em conversas relevantes.', 'Clareza para comunicar e vender sua transformação.'][i], price: [97, 147, 197][i], externalId: `produto-front-${i + 1}`, color: ['violet', 'cyan', 'amber'][i], lessons: ['Seu ponto de partida', 'Diagnóstico e direção', 'Construindo o processo', 'Aplicação na prática', 'Plano dos próximos 30 dias', 'Seu próximo nível'].map((name, j) => ({ id: `lesson-${i}-${j}`, title: name, module: ['01 · Comece aqui', '02 · Coloque em prática', '03 · Próximo passo'][Math.floor(j / 2)], seconds: [600, 900, 1200, 1500, 900, 600][j] })) }));
  const percentages: (number | null)[] = [86, 0, 64, 32, 100, null, 18, 73, 0, 45, 100, 92];
  const enrollments: Enrollment[] = contacts.map((p, i) => {
    const c = courses[i % 3], percent = percentages[i];
    let seconds = c.lessons.reduce((n, l) => n + l.seconds, 0) * (percent || 0) / 100;
    const watched: Record<string, number> = {};
    c.lessons.forEach(l => { watched[l.id] = Math.min(l.seconds, seconds); seconds = Math.max(0, seconds - l.seconds); });
    return { id: `enrollment-${i}`, courseId: c.id, contactId: p.id, purchasedAt: atDays(15 - i), lastSeen: percent ? atDays(i % 4) : null, watched: percent === null ? null : watched, status: i === 9 ? 'refunded' : 'active', bonusClaims: i === 0 ? ['bonus-0'] : [] };
  });
  return { version: 1, project, forms, contacts, submissions, courses, enrollments, bonuses: [
    { id: 'bonus-0', courseId: 'course-0', title: 'Plano de ação de 30 dias', description: 'Transforme o conteúdo em uma rotina prática de execução.', type: 'Planilha', url: '', trigger: 'days', threshold: 3, enabled: true },
    { id: 'bonus-1', courseId: 'course-1', title: 'Roteiros para criar conexão', description: 'Uma biblioteca de ideias para colocar seu conteúdo em movimento.', type: 'PDF', url: '', trigger: 'progress', threshold: 50, enabled: true },
    { id: 'bonus-2', courseId: 'course-2', title: 'Clínica de posicionamento', description: 'Um encontro para revisar a oferta e desenhar o próximo passo.', type: 'Encontro', url: '', trigger: 'manual', threshold: 0, enabled: false },
  ], campaigns: [{ id: 'campaign-0', name: 'Boas-vindas ao próximo nível', channel: 'email', courseId: 'course-0', audience: 'all', subject: '{{nome}}, seu próximo passo começa aqui', body: 'Olá, {{nome}}! Que bom ter você por aqui.\n\nComece pela primeira aula de {{curso}}. Ela vai ajudar você a transformar seus objetivos em um plano concreto.\n\nReserve alguns minutos hoje e dê seu primeiro passo.', bonusId: '', delay: 0, groups: [], status: 'draft', recipients: 0, at: atDays(1) }], integration: { lms: '', email: '' }, events: [] };
}
export function addTestSubmission(model: MvpModel, form: CaptureForm, answers: Record<string, string>, consent: { email: boolean; whatsapp: boolean }): MvpModel {
  const next = structuredClone(model), now = new Date().toISOString();
  const email = (answers.email || '').trim().toLowerCase();
  let contact = next.contacts.find(p => p.email.toLowerCase() === email);
  if (!contact) {
    contact = { id: id(), name: answers.name || 'Contato de teste', email, phone: answers.phone || '', source: form.source || 'Prévia do formulário', campaign: form.campaign || 'Teste local', content: form.title, emailConsent: consent.email, whatsappConsent: consent.whatsapp, optedOut: false, mentor: false, heat: form.kind === 'mentoring' ? answers.start === 'Neste mês' ? 'hot' : 'warm' : form.kind === 'magnet' ? 'cold' : 'unknown', fit: 'pending', signals: [form.kind === 'mentoring' ? `Aplicou para mentoria. Prazo declarado: ${answers.start || 'não informado'}.` : `Preencheu ${kinds[form.kind].label.toLowerCase()}. Interesse em mentoria a avaliar.`], timeline: [] };
    next.contacts.push(contact);
  } else {
    // A new request never silently re-subscribes an opted-out contact.
    if (!contact.optedOut) { contact.emailConsent ||= consent.email; contact.whatsappConsent ||= consent.whatsapp; }
    if (form.kind === 'mentoring') { contact.heat = answers.start === 'Neste mês' ? 'hot' : 'warm'; contact.signals.push(`Nova aplicação para mentoria: ${answers.start || 'prazo não informado'}.`); }
  }
  contact.timeline.push({ id: id(), at: now, title: 'Resposta de teste recebida', detail: form.title });
  next.submissions.unshift({ id: id(), formId: form.id, contactId: contact.id, at: now, answers, source: form.source || 'Prévia do formulário', campaign: form.campaign || 'Teste local', content: form.title, review: 'pending' });
  return next;
}
