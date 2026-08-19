import { useEffect, useState } from 'react';
import { fetchSvg, isSvgUrl, sanitizeSvg } from '../lib/media.js';

/**
 * Renders a design in any supported format:
 * - design.svg  → inline sanitized SVG markup (recolorable via currentColor)
 * - design.src ending in .svg → fetched, sanitized, inlined
 * - design.src PNG/JPG/anything else → plain <img> (transparency respected)
 */
export default function DesignArt({ design, className = '' }) {
  const [inlineSvg, setInlineSvg] = useState(null);

  useEffect(() => {
    let alive = true;
    if (design.svg) {
      setInlineSvg(sanitizeSvg(design.svg));
    } else if (isSvgUrl(design.src)) {
      setInlineSvg(null);
      fetchSvg(design.src)
        .then((svg) => alive && setInlineSvg(svg))
        .catch(() => alive && setInlineSvg(null));
    } else {
      setInlineSvg(null);
    }
    return () => {
      alive = false;
    };
  }, [design]);

  if (inlineSvg) {
    return (
      <div
        className={`design-art ${className}`}
        dangerouslySetInnerHTML={{ __html: inlineSvg }}
      />
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
