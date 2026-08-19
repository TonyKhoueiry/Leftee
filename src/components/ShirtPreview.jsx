import { useCallback, useEffect, useRef, useState } from 'react';
import DesignArt from './DesignArt.jsx';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const MIN_SIZE = 6;
const MIN_AREA = 8; // minimum print-area width/height in %

// Keep the design's center far enough from the boundary that its edges stay inside.
const clampCenter = (v, lo, hi, size) => {
  const a = lo + size / 2;
  const b = hi - size / 2;
  return a > b ? (lo + hi) / 2 : clamp(v, a, b);
};

/**
 * The shirt canvas.
 *
 * Layers (bottom → top): white box, flat garment color, the untouched mockup
 * image (its transparent shirt shape reveals the color), the draggable design.
 *
 * The dashed print area is a fixed boundary the design moves/grows within.
 * In admin area-edit mode (areaEditable) the boundary itself becomes
 * draggable and resizable; customers never see that.
 */
export default function ShirtPreview({
  cut,
  color,
  design,
  position,
  onMove,
  size,
  onResize,
  selected,
  onSelectChange,
  areaEditable = false,
  onAreaChange,
}) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const areaGesture = useRef(null); // { mode, start: {x,y}, area }
  const area = cut?.printArea ?? { left: 25, top: 30, right: 75, bottom: 80 };
  const maxSize = Math.max(MIN_SIZE, Math.min(area.right - area.left, area.bottom - area.top));

  const pointerPct = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  /* ---- design move / resize (public + admin) ---- */

  const moveTo = useCallback(
    (clientX, clientY) => {
      const p = pointerPct(clientX, clientY);
      if (!p) return;
      onMove({
        x: clampCenter(p.x, area.left, area.right, size),
        y: clampCenter(p.y, area.top, area.bottom, size),
      });
    },
    [pointerPct, onMove, area.left, area.right, area.top, area.bottom, size]
  );

  const resizeTo = useCallback(
    (clientX, clientY) => {
      const p = pointerPct(clientX, clientY);
      if (!p) return;
      const wanted = 2 * Math.max(Math.abs(p.x - position.x), Math.abs(p.y - position.y));
      const next = clamp(wanted, MIN_SIZE, maxSize);
      onResize(next);
      onMove({
        x: clampCenter(position.x, area.left, area.right, next),
        y: clampCenter(position.y, area.top, area.bottom, next),
      });
    },
    [pointerPct, onResize, onMove, position.x, position.y, maxSize, area.left, area.right, area.top, area.bottom]
  );

  /* ---- print-area editing (admin only) ---- */

  const startAreaGesture = (mode) => (e) => {
    if (!areaEditable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerPct(e.clientX, e.clientY);
    if (p) areaGesture.current = { mode, start: p, area: { ...area } };
  };

  const moveAreaGesture = (e) => {
    const g = areaGesture.current;
    if (!g) return;
    const p = pointerPct(e.clientX, e.clientY);
    if (!p) return;
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    const a = { ...g.area };
    if (g.mode === 'move') {
      const w = a.right - a.left;
      const h = a.bottom - a.top;
      a.left = clamp(g.area.left + dx, 0, 100 - w);
      a.top = clamp(g.area.top + dy, 0, 100 - h);
      a.right = a.left + w;
      a.bottom = a.top + h;
    } else {
      if (g.mode.includes('w')) a.left = clamp(g.area.left + dx, 0, g.area.right - MIN_AREA);
      if (g.mode.includes('e')) a.right = clamp(g.area.right + dx, g.area.left + MIN_AREA, 100);
      if (g.mode.includes('n')) a.top = clamp(g.area.top + dy, 0, g.area.bottom - MIN_AREA);
      if (g.mode.includes('s')) a.bottom = clamp(g.area.bottom + dy, g.area.top + MIN_AREA, 100);
    }
    onAreaChange?.({
      left: Number(a.left.toFixed(1)),
      top: Number(a.top.toFixed(1)),
      right: Number(a.right.toFixed(1)),
      bottom: Number(a.bottom.toFixed(1)),
    });
  };

  const endAreaGesture = () => {
    areaGesture.current = null;
  };

  // Click outside the canvas hides the transform box
  useEffect(() => {
    if (!selected) return;
    const onDocDown = (e) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target)) onSelectChange(false);
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [selected, onSelectChange]);

  const cornerHandles = [
    ['nw', { left: 0, top: 0 }, 'cursor-nwse-resize'],
    ['ne', { right: 0, top: 0 }, 'cursor-nesw-resize'],
    ['sw', { left: 0, bottom: 0 }, 'cursor-nesw-resize'],
    ['se', { right: 0, bottom: 0 }, 'cursor-nwse-resize'],
  ];

  return (
    <div
      ref={canvasRef}
      className="relative w-full select-none overflow-hidden rounded-2xl border border-sand bg-white"
      onPointerDown={(e) => {
        if (e.target.dataset?.bg) onSelectChange(false);
      }}
    >
      {/* Garment color underneath the mockup */}
      <div className="absolute inset-0" data-bg="1" style={{ backgroundColor: color }} />

      {/* The mockup file, untouched. It defines the canvas size. */}
      {cut?.image ? (
        <img
          src={cut.image}
          alt={`${cut.label} mockup`}
          draggable={false}
          className="pointer-events-none relative block h-auto w-full"
        />
      ) : (
        <div className="aspect-square w-full" />
      )}

      {/* Print area — fixed boundary; editable only in admin area-edit mode */}
      {(design || areaEditable) && (
        <div
          className={`absolute rounded-lg border border-dashed transition-colors ${
            areaEditable
              ? 'cursor-move border-clay bg-clay/10'
              : `pointer-events-none ${
                  isDragging || isResizing || selected
                    ? 'border-clay opacity-90'
                    : 'border-stone opacity-25'
                }`
          }`}
          style={{
            left: `${area.left}%`,
            top: `${area.top}%`,
            width: `${area.right - area.left}%`,
            height: `${area.bottom - area.top}%`,
          }}
          onPointerDown={startAreaGesture('move')}
          onPointerMove={moveAreaGesture}
          onPointerUp={endAreaGesture}
          onPointerCancel={endAreaGesture}
        >
          {areaEditable &&
            cornerHandles.map(([mode, pos, cursor]) => (
              <span
                key={mode}
                className={`absolute z-10 h-3.5 w-3.5 rounded-sm border-2 border-white bg-clay shadow ${cursor} touch-none`}
                style={{
                  ...pos,
                  transform: `translate(${'left' in pos ? '-50%' : '50%'}, ${
                    'top' in pos ? '-50%' : '50%'
                  })`,
                }}
                onPointerDown={startAreaGesture(mode)}
                onPointerMove={moveAreaGesture}
                onPointerUp={endAreaGesture}
                onPointerCancel={endAreaGesture}
              />
            ))}
        </div>
      )}

      {/* Draggable, resizable design (inert while editing the area) */}
      {design && (
        <div
          role="img"
          aria-label={design.title}
          className={`absolute touch-none transition-transform duration-75 ${
            areaEditable ? 'pointer-events-none opacity-60' : ''
          } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
            selected && !areaEditable ? 'outline outline-1 outline-clay' : ''
          }`}
          style={{
            width: `${size}%`,
            height: `${size}%`,
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelectChange(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDragging(true);
          }}
          onPointerMove={(e) => isDragging && moveTo(e.clientX, e.clientY)}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
        >
          <DesignArt
            design={design}
            className="pointer-events-none h-full w-full text-ink drop-shadow-md"
          />

          {selected &&
            !areaEditable &&
            cornerHandles.map(([key, pos, cursor]) => (
              <span
                key={key}
                className={`absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-clay shadow ${cursor} touch-none`}
                style={{
                  ...pos,
                  transform: `translate(${'left' in pos ? '-50%' : '50%'}, ${
                    'top' in pos ? '-50%' : '50%'
                  })`,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setIsResizing(true);
                }}
                onPointerMove={(e) => isResizing && resizeTo(e.clientX, e.clientY)}
                onPointerUp={() => setIsResizing(false)}
                onPointerCancel={() => setIsResizing(false)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
