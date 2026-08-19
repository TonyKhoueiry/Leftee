import { useCallback, useEffect, useRef, useState } from 'react';
import DesignArt from './DesignArt.jsx';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const MIN_SIZE = 6;

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
 * The dashed print area is a fixed boundary: the design moves and grows only
 * within it. Clicking the design shows corner handles for resizing; clicking
 * anywhere else hides them.
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
}) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
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
      // Growing near the edge: nudge the design back inside the boundary
      onMove({
        x: clampCenter(position.x, area.left, area.right, next),
        y: clampCenter(position.y, area.top, area.bottom, next),
      });
    },
    [pointerPct, onResize, onMove, position.x, position.y, maxSize, area.left, area.right, area.top, area.bottom]
  );

  // Click outside the canvas hides the transform box
  useEffect(() => {
    if (!selected) return;
    const onDocDown = (e) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target)) onSelectChange(false);
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [selected, onSelectChange]);

  const handles = [
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

      {/* Print area — a fixed boundary, independent of the design */}
      {design && (
        <div
          className={`pointer-events-none absolute rounded-lg border border-dashed transition-opacity ${
            isDragging || isResizing || selected
              ? 'border-clay opacity-90'
              : 'border-stone opacity-25'
          }`}
          style={{
            left: `${area.left}%`,
            top: `${area.top}%`,
            width: `${area.right - area.left}%`,
            height: `${area.bottom - area.top}%`,
          }}
        />
      )}

      {/* Draggable, resizable design */}
      {design && (
        <div
          role="img"
          aria-label={design.title}
          className={`absolute touch-none transition-transform duration-75 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${selected ? 'outline outline-1 outline-clay' : ''}`}
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

          {/* Corner handles */}
          {selected &&
            handles.map(([key, pos, cursor]) => (
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
