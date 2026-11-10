'use client';
import React, { useEffect, useState } from 'react';
import { Beaker, BriefcaseBusiness, Link2, RotateCcw } from 'lucide-react';
import type { Actor } from '@/lib/crm';
import { seedMvp, type MvpModel } from '@/lib/growth-mvp';
import { FormsArea } from './forms';
import { CoursesArea } from './courses';
import { IntegrationPreview } from './integrations';
import { GButton, GDialog } from './shared';

export function GrowthWorkspace({ page, actor, projects, activeProject, demo, notify }: { page: 'forms' | 'courses'; actor: Actor; projects: string[]; activeProject: string; demo: boolean; notify: (s: string, error?: boolean) => void }) {
  const [selected, setSelected] = useState(projects[0] || '');
  const project = activeProject && projects.includes(activeProject) ? activeProject : projects.includes(selected) ? selected : projects[0];
  if (!project) return <div className="g-empty">Crie uma operação para explorar esta área.</div>;
  return <div className="growth"><div className="g-scope"><span><BriefcaseBusiness size={15} />Operação do MVP</span><select aria-label="Operação do MVP" value={project} disabled={!!activeProject} onChange={e => setSelected(e.target.value)}>{projects.map(p => <option key={p}>{p}</option>)}</select><small>{activeProject ? 'Segue a operação selecionada no menu.' : 'Cada operação mantém suas próprias bases.'}</small></div><Workspace key={`${actor.id}:${demo}:${project}`} page={page} project={project} actor={actor} demo={demo} notify={notify} /></div>;
}
function Workspace({ page, project, actor, demo, notify }: { page: 'forms' | 'courses'; project: string; actor: Actor; demo: boolean; notify: (s: string, error?: boolean) => void }) {
  const storageKey = `nexo-growth-mvp-v1:${actor.id}:${demo ? 'demo' : 'live'}:${project}`;
  const [model, setModel] = useState<MvpModel | null>(null), [api, setApi] = useState(false), [reset, setReset] = useState(false), [storageIssue, setStorageIssue] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      setModel(saved?.version === 1 && saved.project === project && ['forms', 'contacts', 'submissions', 'courses', 'enrollments', 'bonuses', 'campaigns', 'events'].every(k => Array.isArray(saved[k])) && saved.integration ? saved : seedMvp(project));
    } catch { setModel(seedMvp(project)); }
  }, [storageKey, project]);
  useEffect(() => { if (model) try { localStorage.setItem(storageKey, JSON.stringify(model)); setStorageIssue(false); } catch { setStorageIssue(true); } }, [model, storageKey]);
  if (!model) return <div className="g-empty">Preparando o MVP…</div>;
  const update = (fn: (m: MvpModel) => MvpModel) => setModel(m => m ? fn(m) : m);
  const props = { model, update, notify, canEdit: actor.isOwner || ['Administrador', 'Gestor'].includes(actor.role), openApi: () => setApi(true) };
  return <><div className="g-prototype-bar"><Beaker size={17} /><span><strong>MVP interativo</strong> · Dados de exemplo. {storageIssue ? 'Alterações temporárias: armazenamento local indisponível.' : 'Alterações salvas neste navegador.'}</span><button onClick={() => setApi(true)}><Link2 size={14} /> APIs</button><button aria-label="Restaurar exemplos do MVP" title="Restaurar exemplos" onClick={() => setReset(true)}><RotateCcw size={14} /></button></div>{page === 'forms' ? <FormsArea {...props} /> : <CoursesArea {...props} />}{api && <IntegrationPreview {...props} onClose={() => setApi(false)} />}{reset && <GDialog title="Restaurar exemplos?" subtitle="Isso apaga apenas suas alterações locais nestas duas áreas do MVP desta operação. Os dados do CRM permanecem preservados." onClose={() => setReset(false)}><div className="g-dialog-actions"><GButton onClick={() => setReset(false)}>Manter alterações</GButton><GButton primary onClick={() => { setModel(seedMvp(project)); setReset(false); notify('Exemplos do MVP restaurados.'); }}>Restaurar exemplos</GButton></div></GDialog>}</>;
}
