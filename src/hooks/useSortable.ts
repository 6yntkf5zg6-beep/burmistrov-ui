import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

interface Rect {
  top: number;
  height: number;
}

/** Что нужно навесить на ручку, чтобы строку можно было потащить. */
export interface SortableHandleProps {
  style: CSSProperties;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

interface DragState {
  from: number;
  to: number;
  dy: number;
}

/**
 * Перетаскивание строк списка за ручку. Построено на pointer events, а не на HTML5 drag-and-drop:
 * тот рисует собственный полупрозрачный «призрак» и не даёт управлять анимацией. Здесь строка
 * буквально следует за курсором через transform, а соседи расступаются с плавным переходом.
 *
 * Геометрия снимается один раз в момент захвата, дальше пересчёта layout не происходит — поэтому
 * перетаскивание не дёргается даже на длинных списках.
 */
export function useSortable(count: number, onReorder: (from: number, to: number) => void) {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const geometry = useRef<{ rects: Rect[]; slot: number; startY: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Пока строку тащат, выделение текста только мешает.
  useEffect(() => {
    if (!drag) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [drag]);

  const setItemRef = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      itemRefs.current[index] = element;
    },
    [],
  );

  function finish(state: DragState | null) {
    geometry.current = null;
    setDrag(null);
    if (state && state.from !== state.to) onReorder(state.from, state.to);
  }

  function handleProps(index: number): SortableHandleProps {
    return {
      style: { touchAction: "none" as const },
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        const elements = itemRefs.current.slice(0, count);
        if (elements.some((el) => !el)) return;

        const rects = elements.map((el) => {
          const rect = el!.getBoundingClientRect();
          return { top: rect.top, height: rect.height };
        });
        // Расстояние между соседями — это и есть зазор списка, каким бы он ни был задан.
        const gap = rects.length > 1 ? rects[1].top - (rects[0].top + rects[0].height) : 0;

        geometry.current = { rects, slot: rects[index].height + gap, startY: event.clientY };
        setDrag({ from: index, to: index, dy: 0 });
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const geo = geometry.current;
        if (!geo || !drag) return;

        const dy = event.clientY - geo.startY;
        const center = geo.rects[drag.from].top + geo.rects[drag.from].height / 2 + dy;

        // Цель ищем по серединам соседей, а не по кратности высоте — так корректно работают
        // списки, где строки разной высоты.
        let to = drag.from;
        if (dy > 0) {
          for (let j = drag.from + 1; j < geo.rects.length; j++) {
            if (center > geo.rects[j].top + geo.rects[j].height / 2) to = j;
            else break;
          }
        } else if (dy < 0) {
          for (let j = drag.from - 1; j >= 0; j--) {
            if (center < geo.rects[j].top + geo.rects[j].height / 2) to = j;
            else break;
          }
        }
        setDrag({ from: drag.from, to, dy });
      },
      onPointerUp: () => finish(drag),
      onPointerCancel: () => finish(null),
    };
  }

  function itemStyle(index: number): CSSProperties {
    const geo = geometry.current;
    if (!drag || !geo) return {};

    if (index === drag.from) {
      return {
        transform: `translateY(${drag.dy}px)`,
        // scale отдельным свойством: transform обязан следовать за курсором мгновенно,
        // а подъём строки — плавно.
        scale: "1.015",
        position: "relative",
        zIndex: 30,
        boxShadow: "0 18px 32px -14px rgba(0, 0, 0, 0.35)",
        transition: "scale 160ms ease, box-shadow 160ms ease",
        cursor: "grabbing",
        touchAction: "none",
      };
    }

    let shift = 0;
    if (drag.to > drag.from && index > drag.from && index <= drag.to) shift = -geo.slot;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) shift = geo.slot;

    return {
      transform: `translateY(${shift}px)`,
      transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    };
  }

  return { setItemRef, itemStyle, handleProps, draggingIndex: drag?.from ?? null };
}
