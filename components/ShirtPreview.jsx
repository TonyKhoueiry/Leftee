import { useCallback, useRef, useState } from 'react';
import DesignArt from './DesignArt.jsx';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * The shirt canvas.
 *
 * Layering (bottom to top):
 *   1. White box — matches the mockup's own white background.
 *   2. The selected garment color, flat.
 *   3. The mockup image, completely untouched. Its transparent areas
 *      (the shirt shape) reveal the color underneath; its opaque white
 *      background hides the color everywhere else.
 *   4. The draggable design.
 */
export default function ShirtPreview({ cut, color, design, position, onMove, designScale }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const area = cut?.printArea ?? { left: 25, top: 30, right: 75, bottom: 80 };

  const moveTo = useCallback(
    (clientX, clientY) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      onMove({
        x: clamp(((clientX - rect.left) / rect.width) * 100, area.left, area.right),
        y: clamp(((clientY - rect.top) / rect.height) * 100, area.top, area.bottom),
      });
    },
    [onMove, area.left, area.right, area.top, area.bottom]
  );

  return (
    <div
      ref={canvasRef}
      className="relative w-full select-none overflow-hidden rounded-2xl border border-sand bg-white"
    >
      {/* Garment color underneath the mockup */}
      <div className="absolute inset-0" style={{ backgroundColor: color }} />

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
            isDragging ? 'border-clay opacity-90' : 'border-stone opacity-25'
          }`}
          style={{
            left: `${area.left - designScale / 2}%`,
            top: `${area.top - designScale / 2}%`,
            width: `${area.right - area.left + designScale}%`,
            height: `${area.bottom - area.top + designScale}%`,
          }}
        />
      )}

      {/* Draggable design */}
      {design && (
        <div
          role="img"
          aria-label={design.title}
          className={`absolute touch-none transition-transform duration-75 ${
            isDragging ? 'scale-105 cursor-grabbing' : 'cursor-grab hover:scale-105'
          }`}
          style={{
            width: `${designScale}%`,
            height: `${designScale}%`,
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onPointerDown={(e) => {
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
        </div>
      )}
    </div>
  );
}
