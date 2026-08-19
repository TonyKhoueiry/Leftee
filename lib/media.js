import DOMPurify from 'dompurify';

/** Strip scripts/event handlers from SVG markup (XSS protection). */
export const sanitizeSvg = (svg) =>
  DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });

export const isSvgMarkup = (s) => typeof s === 'string' && s.trim().startsWith('<svg');
export const isSvgUrl = (s) => typeof s === 'string' && /\.svg(\?.*)?$/i.test(s);

/**
 * Make an SVG scale to its container:
 * - add a viewBox if it's missing (derived from width/height attributes),
 * - remove fixed width/height so CSS controls the size.
 * Many design tools export SVGs with fixed pixel sizes and no viewBox,
 * which renders as a clipped or invisible image — this fixes that.
 */
export function normalizeSvg(markup) {
  try {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg') return markup;
    if (!svg.getAttribute('viewBox')) {
      const w = parseFloat(svg.getAttribute('width'));
      const h = parseFloat(svg.getAttribute('height'));
      if (w > 0 && h > 0) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return markup;
  }
}

/** Sanitize + normalize in one step. */
export const prepareSvg = (markup) => {
  const clean = sanitizeSvg(markup);
  return clean ? normalizeSvg(clean) : '';
};

const svgCache = new Map();

/** Fetch an .svg file and return sanitized, scalable markup (cached). */
export async function fetchSvg(url) {
  if (svgCache.has(url)) return svgCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const prepared = prepareSvg(await res.text());
  if (!prepared) throw new Error('Empty or invalid SVG');
  svgCache.set(url, prepared);
  return prepared;
}
