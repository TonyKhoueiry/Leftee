import DOMPurify from 'dompurify';

/** Strip scripts/event handlers from SVG markup (XSS protection). */
export const sanitizeSvg = (svg) =>
  DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });

export const isSvgMarkup = (s) => typeof s === 'string' && s.trim().startsWith('<svg');
export const isSvgUrl = (s) => typeof s === 'string' && /\.svg(\?.*)?$/i.test(s);

const svgCache = new Map();

/** Fetch an .svg file and return sanitized markup (cached). */
export async function fetchSvg(url) {
  if (svgCache.has(url)) return svgCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const clean = sanitizeSvg(await res.text());
  svgCache.set(url, clean);
  return clean;
}
