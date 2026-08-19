import { useMemo } from 'react';
import { prepareSvg } from '../lib/media.js';

/**
 * Renders a design in any supported format.
 *
 * - design.svg (pasted markup) → sanitized and inlined.
 * - design.src (png / jpg / webp / svg file) → a plain <img>.
 *
 * SVG *files* are deliberately shown as images, not inlined: files exported
 * from Illustrator all reuse the same internal class names (.cls-1 …), and
 * inlining several of them on one page makes their styles collide — designs
 * turn invisible. As an <img> each SVG is isolated (and can't run scripts).
 */
export default function DesignArt({ design, className = '' }) {
  const inlineSvg = useMemo(
    () => (design.svg ? prepareSvg(design.svg) : null),
    [design.svg]
  );

  if (inlineSvg) {
    return (
      <div className={`design-art ${className}`} dangerouslySetInnerHTML={{ __html: inlineSvg }} />
    );
  }
  return (
    <img
      src={design.src}
      alt={design.title}
      draggable={false}
      className={`${className} object-contain`}
    />
  );
}
