import { useCallback, useEffect, useRef, useState } from 'react';
import DesignArt from './DesignArt.jsx';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const MIN_SIZE = 6;
const MAX_SIZE = 70;

/**
 * The shirt canvas.
 *
 * Layers (bottom → top): white box, flat garment color, the untouched mockup
 * image (its transparent shirt shape reveals the color), the draggable design.
 *
 * Clicking the design shows a transform box with corner handles for resizing.
 * Clicking anywhere else hides it.
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
        x: clamp(p.x, area.left, area.right),
        y: clamp(p.y, area.top, area.bottom),
      });
    },
    [pointerPct, onMove, area.left, area.right, area.top, area.bottom]
  );

  const resizeTo = useCallback(
    (clientX, clientY) => {
      const p = pointerPct(clientX, clientY);
      if (!p) return;
      const next = 2 * Math.max(Math.abs(p.x - position.x), Math.abs(p.y - position.y));
      onResize(clamp(next, MIN_SIZE, MAX_SIZE));
    },
    [pointerPct, onResize, position.x, position.y]
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
        // Background click (color layer carries data-bg) → deselect
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

      {/* Print area guide */}
      {design && (
        <div
          className={`pointer-events-none absolute rounded-lg border border-dashed transition-opacity ${
            isDragging || isResizing || selected
              ? 'border-clay opacity-90'
              : 'border-stone opacity-25'
          }`}
          style={{
            left: `${area.left - size / 2}%`,
            top: `${area.top - size / 2}%`,
            width: `${area.right - area.left + size}%`,
            height: `${area.bottom - area.top + size}%`,
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
