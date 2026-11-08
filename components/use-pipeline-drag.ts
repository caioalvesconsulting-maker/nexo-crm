'use client';

import {useEffect, useRef, useState} from 'react';
import type {MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject} from 'react';
import {STAGES} from '@/lib/crm';
import type {Stage} from '@/lib/crm';

type Position = {id: string; x: number; y: number};

// Pointer events also work when the gesture starts inside the card's button.
// Native HTML drag-and-drop does not reliably start from interactive children.
export function usePipelineDrag(
  board: RefObject<HTMLDivElement | null>,
  disabled: boolean,
  onDrop: (id: string, stage: Stage) => void,
) {
  const [dragging, setDragging] = useState<Position | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const dropRef = useRef(onDrop);
  const suppressClickUntil = useRef(0);
  dropRef.current = onDrop;

  useEffect(() => () => stopRef.current?.(), []);

  function begin(event: ReactPointerEvent<HTMLElement>, id: string) {
    const target = event.target as HTMLElement;
    if (disabled || !event.isPrimary || event.button !== 0 || target.closest('select,input,textarea,a,[data-no-drag]')) return;
    // Preserve normal touch scrolling; touch dragging starts from the grip.
    if (event.pointerType !== 'mouse' && !target.closest('[data-drag-handle]')) return;
    stopRef.current?.();
    const element = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX, startY = event.clientY;
    let x = startX, y = startY, active = false, stopped = false, frame = 0;

    function destination(): Stage | null {
      const column = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-pipeline-stage]');
      if (!column || !board.current?.contains(column)) return null;
      const stage = column.dataset.pipelineStage;
      return STAGES.some(item => item.id === stage) ? stage as Stage : null;
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('blur', cancel);
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      if (active) suppressClickUntil.current = performance.now() + 500;
      setDragging(null);
      setOver(null);
      stopRef.current = null;
    }

    function tick() {
      if (stopped || !active) return;
      const container = board.current, rect = container?.getBoundingClientRect();
      if (container && rect && y >= rect.top && y <= rect.bottom) {
        if (x < rect.left + 48 && x >= rect.left - 10) container.scrollLeft -= 12;
        else if (x > rect.right - 48 && x <= rect.right + 10) container.scrollLeft += 12;
        if (y > window.innerHeight - 55) window.scrollBy(0, 9);
        else if (y < 100 && y >= 0) window.scrollBy(0, -9);
      }
      setOver(destination());
      frame = requestAnimationFrame(tick);
    }

    function move(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      x = e.clientX; y = e.clientY;
      if (!active && Math.hypot(x - startX, y - startY) < 6) return;
      if (!active) {
        active = true;
        element.setPointerCapture(pointerId);
        frame = requestAnimationFrame(tick);
      }
      e.preventDefault();
      setDragging({id, x, y});
      setOver(destination());
    }

    function finish(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      x = e.clientX; y = e.clientY;
      const stage = active ? destination() : null;
      if (active) e.preventDefault();
      stop();
      if (stage) dropRef.current(id, stage);
    }

    function cancel() { stop(); }
    function keydown(e: KeyboardEvent) { if (e.key === 'Escape') stop(); }
    stopRef.current = stop;
    window.addEventListener('pointermove', move, {passive: false});
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', keydown);
    window.addEventListener('blur', cancel);
  }

  function preventClickAfterDrag(e: ReactMouseEvent<HTMLElement>) {
    if (performance.now() < suppressClickUntil.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return {dragging, over, begin, preventClickAfterDrag};
}
