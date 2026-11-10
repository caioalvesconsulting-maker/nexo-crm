'use client';
import React, { useEffect, useId, useRef } from 'react';
import { ArrowUpRight, Inbox, X } from 'lucide-react';
import { heatLabels, type Heat, type MvpModel } from '@/lib/growth-mvp';

export type GrowthProps = { model: MvpModel; update: (fn: (m: MvpModel) => MvpModel) => void; notify: (text: string, error?: boolean) => void; canEdit: boolean; openApi: () => void };
export function GButton({ children, primary, small, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; small?: boolean }) {
  return <button type="button" {...props} className={`btn ${primary ? 'primary' : ''} ${small ? 'small' : ''} ${props.className || ''}`}>{children}</button>;
}
export function Pill({ children, color = 'muted' }: { children: React.ReactNode; color?: string }) { return <span className={`g-pill g-${color}`}>{children}</span>; }
export function HeatPill({ value }: { value: Heat }) { return <Pill color={value}><i />{heatLabels[value]}</Pill>; }
export function GEmpty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) { return <div className="g-empty"><Inbox size={28} /><h3>{title}</h3><p>{text}</p>{action}</div>; }
export function Metric({ label, value, foot, icon: Icon, color = 'violet' }: { label: string; value: string | number; foot: string; icon: React.ElementType; color?: string }) { return <article className={`g-metric g-${color}`}><div><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{foot}</small></article>; }
export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) { return <div className="g-section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
export function Field({ label, children, hint, full }: { label: string; children: React.ReactNode; hint?: string; full?: boolean }) { return <label className={`g-field ${full ? 'g-full' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Progress({ value, large = false }: { value: number | null; large?: boolean }) { return <div className={`g-progress ${large ? 'g-progress-large' : ''}`}><div><span>{value === null ? 'Sem dados' : `${value}%`}</span>{large && <small>do conteúdo assistido</small>}</div><div className="g-progress-track" role="progressbar" aria-label="Conteúdo assistido" aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${value || 0}%` }} /></div></div>; }
export function Person({ name, subtitle }: { name: string; subtitle?: string }) { return <div className="g-person"><span className="g-avatar">{name.split(' ').slice(0, 2).map(w => w[0]).join('')}</span><span><strong>{name}</strong>{subtitle && <small>{subtitle}</small>}</span></div>; }
export function GDialog({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null), titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])].filter(el => el.getClientRects().length > 0);
        if (!items.length) { e.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="g-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`g-dialog ${wide ? 'g-dialog-wide' : ''}`}><div className="g-dialog-head"><div><span className="g-kicker">NEXO · MVP INTERATIVO</span><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Fechar janela" onClick={onClose}><X size={20} /></button></div><div className="g-dialog-body">{children}</div></div></div>;
}
export function ApiHint({ onClick }: { onClick: () => void }) { return <button className="g-api-hint" onClick={onClick}><span><i />Conexões por API · próximas etapas</span><ArrowUpRight size={15} /></button>; }
