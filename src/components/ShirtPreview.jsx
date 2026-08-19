import { useCallback, useEffect, useRef, useState } from 'react';
import DesignArt from './DesignArt.jsx';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * Measures the average brightness of a mockup image's visible (opaque) pixels.
 * Light shirts are tinted with 'multiply' (color darkens the fabric).
 * Dark shirts are tinted with 'screen' (fabric highlights lighten the color).
 */
function useMockupBlend(imageUrl) {
  const [blend, setBlend] = useState('multiply');

  useEffect(() => {
    if (!imageUrl) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 200) {
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            count++;
          }
        }
        if (alive && count > 0) setBlend(sum / count < 100 ? 'screen' : 'multiply');
      } catch {
        /* keep default */
      }
    };
    img.src = imageUrl;
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  return blend;
}

/**
 * The shirt canvas: transparent mockup PNG + color tint + draggable design.
 * A colored layer is clipped to the shirt's silhouette (via the PNG's alpha),
 * then the photo is blended on top so its shading/texture shows through.
 */
export default function ShirtPreview({ cut, color, design, position, onMove, designScale }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const area = cut?.printArea ?? { left: 25, top: 30, right: 75, bottom: 80 };
  const blend = useMockupBlend(cut?.image);

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

  const mask = cut?.image
    ? {
        WebkitMaskImage: `url("${cut.image}")`,
        maskImage: `url("${cut.image}")`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }
    : {};

  return (
    <div
      ref={canvasRef}
      className="relative aspect-square w-full select-none overflow-hidden rounded-2xl border border-sand bg-gradient-to-b from-paper to-sand/40"
    >
      {/* Color tint, clipped to the shirt silhouette */}
      <div className="absolute inset-0" style={{ backgroundColor: color, ...mask }} />
      {/* Mockup photo: shading & texture blended over the color */}
      {cut?.image && (
        <img
          src={cut.image}
          alt={`${cut.label} mockup`}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ mixBlendMode: blend }}
        />
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
