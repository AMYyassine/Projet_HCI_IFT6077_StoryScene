import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Grip } from "lucide-react";
export type StartDrag = (
  event: ReactPointerEvent,
  kind: string,
  value: string,
  label: string,
) => void;
export function useDirectDrag(
  onDrop: (id: string, kind: string, value: string, x: number) => void,
) {
  const active = useRef<{
    kind: string;
    value: string;
    label: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppress = useRef(false);
  const [ghost, setGhost] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);
  const start: StartDrag = useCallback((event, kind, value, label) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    active.current = {
      kind,
      value,
      label,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }, []);
  useEffect(() => {
    let hovered: Element | null = null;
    const move = (event: PointerEvent) => {
      const drag = active.current;
      if (!drag) return;
      if (
        Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5 &&
        !drag.moved
      )
        return;
      drag.moved = true;
      event.preventDefault();
      setGhost({ x: event.clientX, y: event.clientY, label: drag.label });
      const target =
        document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest(".scene-stage") ?? null;
      if (target !== hovered) {
        hovered?.classList.remove("drop-active");
        target?.classList.add("drop-active");
        hovered = target;
      }
    };
    const finish = (event: PointerEvent) => {
      const drag = active.current;
      if (!drag) return;
      if (drag.moved) {
        suppress.current = true;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>(".scene-stage");
        if (target?.dataset.sceneId) {
          const rect = target.getBoundingClientRect();
          onDrop(
            target.dataset.sceneId,
            drag.kind,
            drag.value,
            Math.max(
              15,
              Math.min(85, ((event.clientX - rect.left) / rect.width) * 100),
            ),
          );
        }
        window.setTimeout(() => {
          suppress.current = false;
        }, 0);
      }
      hovered?.classList.remove("drop-active");
      hovered = null;
      active.current = null;
      setGhost(null);
    };
    const cancel = () => {
      hovered?.classList.remove("drop-active");
      active.current = null;
      setGhost(null);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      hovered?.classList.remove("drop-active");
    };
  }, [onDrop]);
  return {
    start,
    suppress,
    overlay: ghost ? (
      <div
        className="drag-ghost"
        style={{ left: ghost.x + 14, top: ghost.y + 12 }}
      >
        <Grip size={13} />
        {ghost.label}
      </div>
    ) : null,
  };
}
