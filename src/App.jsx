import { useEffect, useState } from 'react';
import { useConfig } from './lib/useConfig.js';
import { isSvgMarkup, sanitizeSvg } from './lib/media.js';
import ShirtPreview from './components/ShirtPreview.jsx';
import DesignArt from './components/DesignArt.jsx';
import Modal from './components/Modal.jsx';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/* ---------- Small UI atoms ---------- */

function Section({ index, title, children }) {
  return (
    <section className="border-t border-sand py-6 first:border-t-0 first:pt-0">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone">
        <span className="mr-2 text-clay">{index}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Disclosure({ label, children }) {
  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer list-none text-sm text-stone transition-colors hover:text-ink">
        <span className="mr-1 inline-block transition-transform group-open:rotate-45">+</span>
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

const inputClass =
  'min-w-0 flex-grow rounded-lg border border-sand bg-paper px-3 py-2 text-sm text-ink placeholder:text-stone/70 focus:border-clay focus:outline-none';

const addBtnClass =
  'rounded-lg border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream';

/* ---------- App ---------- */

export default function App() {
  const { config, error } = useConfig();

  // Selections
  const [selectedCutId, setSelectedCutId] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designPosition, setDesignPosition] = useState({ x: 50, y: 50 });

  // Session-only additions by the visitor (permanent options live in config.json)
  const [customColors, setCustomColors] = useState([]);
  const [customSizes, setCustomSizes] = useState([]);
  const [customDesigns, setCustomDesigns] = useState([]);

  // Inputs
  const [newColorInput, setNewColorInput] = useState('#b0603f');
  const [newSizeInput, setNewSizeInput] = useState('');
  const [newDesignSourceInput, setNewDesignSourceInput] = useState('');
  const [newDesignTitleInput, setNewDesignTitleInput] = useState('');

  const [modal, setModal] = useState(null);

  // Defaults once config arrives
  useEffect(() => {
    if (!config) return;
    setSelectedCutId((v) => v ?? config.cuts[0]?.id ?? null);
    setSelectedColor((v) => v ?? config.colors[0] ?? '#ffffff');
    setSelectedSize((v) => v ?? (config.sizes.includes('M') ? 'M' : config.sizes[0]));
  }, [config]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6 text-center text-ink">
        Failed to load shop configuration: {error}
      </div>
    );
  }
  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-stone">
        Loading…
      </div>
    );
  }

  const cuts = config.cuts ?? [];
  const colors = [...(config.colors ?? []), ...customColors];
  const sizes = [...(config.sizes ?? []), ...customSizes];
  const designs = [...(config.designs ?? []), ...customDesigns];
  const designScale = config.designScale ?? 20;
  const selectedCut = cuts.find((c) => c.id === selectedCutId) ?? cuts[0];

  const showError = (body) => setModal({ title: 'Hold on', body });

  const selectDesign = (design) => {
    setSelectedDesign(design);
    if (design && selectedCut?.printArea) {
      const a = selectedCut.printArea;
      setDesignPosition({ x: (a.left + a.right) / 2, y: (a.top + a.bottom) / 2 });
    }
  };

  const handleAddColor = () => {
    const color = newColorInput.trim().toLowerCase();
    if (!HEX_RE.test(color)) return showError('Please enter a valid hex color, e.g. #b0603f.');
    if (colors.includes(color)) return showError('That color is already in the palette.');
    setCustomColors((prev) => [...prev, color]);
    setSelectedColor(color);
  };

  const handleAddSize = () => {
    const size = newSizeInput.trim().toUpperCase();
    if (!size) return;
    if (sizes.includes(size)) return showError('That size already exists.');
    setCustomSizes((prev) => [...prev, size]);
    setSelectedSize(size);
    setNewSizeInput('');
  };

  const handleAddDesign = () => {
    const source = newDesignSourceInput.trim();
    const title = newDesignTitleInput.trim();
    if (!source || !title) {
      return showError('Please provide a design (image URL or SVG code) and a title.');
    }
    let design;
    if (isSvgMarkup(source)) {
      const clean = sanitizeSvg(source);
      if (!clean) return showError('That SVG code is not valid.');
      design = { id: `custom-${Date.now()}`, title, svg: clean };
    } else if (/^(https?:\/\/|\/)/i.test(source)) {
      design = { id: `custom-${Date.now()}`, title, src: source };
    } else {
      return showError('Paste either an image URL (PNG, JPG or SVG) or SVG code starting with <svg.');
    }
    setCustomDesigns((prev) => [...prev, design]);
    selectDesign(design);
    setNewDesignSourceInput('');
    setNewDesignTitleInput('');
  };

  const handleOrder = () => {
    // Shopify-ready: if config.orderUrl is set, hand the choices to that page
    // (e.g. a Shopify product URL). Otherwise show the summary dialog.
    if (config.orderUrl) {
      const params = new URLSearchParams({
        cut: selectedCut?.label ?? '',
        color: selectedColor ?? '',
        size: selectedSize ?? '',
        design: selectedDesign?.title ?? 'none',
        x: designPosition.x.toFixed(0),
        y: designPosition.y.toFixed(0),
      });
      window.open(`${config.orderUrl}?${params.toString()}`, '_blank', 'noopener');
      return;
    }
    setModal({
      title: 'Order Summary',
      rows: [
        ['Cut', selectedCut?.label ?? '—'],
        ['Color', selectedColor ?? '—'],
        ['Size', selectedSize ?? '—'],
        ['Design', selectedDesign ? selectedDesign.title : 'None'],
        ...(selectedDesign
          ? [['Placement', `${designPosition.x.toFixed(0)}% across · ${designPosition.y.toFixed(0)}% down`]]
          : []),
      ],
    });
  };

  const orderButton = (
    <button
      type="button"
      onClick={handleOrder}
      className="w-full rounded-xl bg-clay py-4 text-sm font-semibold uppercase tracking-[0.15em] text-cream shadow-sm transition-colors hover:bg-clay-dark"
    >
      Order this shirt
    </button>
  );

  return (
    <div className="min-h-screen bg-cream font-sans text-ink">
      {/* Header */}
      <header className="border-b border-sand">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-4 py-5 sm:px-6">
          <h1 className="font-display text-2xl">{config.shopName ?? 'T-Shirt Studio'}</h1>
          <p className="hidden text-xs uppercase tracking-[0.2em] text-stone sm:block">
            Made to order
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
          {/* Preview — sticky on desktop */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <ShirtPreview
              cut={selectedCut}
              color={selectedColor}
              design={selectedDesign}
              position={designPosition}
              onMove={setDesignPosition}
              designScale={designScale}
            />
            <p className="mt-3 text-center text-sm text-stone">
              {selectedDesign
                ? 'Drag the artwork to position it.'
                : 'Pick a design to place it on the shirt.'}
            </p>
          </div>

          {/* Controls */}
          <div>
            <Section index="01" title="Cut">
              <div className="inline-flex rounded-full border border-sand bg-paper p-1">
                {cuts.map((cut) => (
                  <button
                    key={cut.id}
                    type="button"
                    onClick={() => setSelectedCutId(cut.id)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      selectedCutId === cut.id
                        ? 'bg-ink text-cream'
                        : 'text-stone hover:text-ink'
                    }`}
                  >
                    {cut.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section index="02" title="Color">
              <div className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Color ${color}`}
                    title={color}
                    className={`h-9 w-9 rounded-full border border-sand transition-all ${
                      selectedColor === color
                        ? 'ring-2 ring-clay ring-offset-2 ring-offset-cream'
                        : 'hover:ring-2 hover:ring-sand hover:ring-offset-2 hover:ring-offset-cream'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Disclosure label="Add a custom color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={HEX_RE.test(newColorInput) ? newColorInput : '#b0603f'}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-sand bg-paper"
                    title="Pick custom color"
                  />
                  <input
                    type="text"
                    placeholder="#B0603F"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    className={inputClass}
                  />
                  <button type="button" onClick={handleAddColor} className={addBtnClass}>
                    Add
                  </button>
                </div>
              </Disclosure>
            </Section>

            <Section index="03" title="Size">
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? 'border-ink bg-ink text-cream'
                        : 'border-sand bg-paper text-ink hover:border-ink'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <Disclosure label="Need another size?">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 3XL"
                    maxLength={6}
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSize()}
                    className={inputClass}
                  />
                  <button type="button" onClick={handleAddSize} className={addBtnClass}>
                    Add
                  </button>
                </div>
              </Disclosure>
            </Section>

            <Section index="04" title="Design">
              <div className="grid grid-cols-4 gap-3">
                {designs.map((design) => (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() => selectDesign(design)}
                    title={design.title}
                    className={`flex aspect-square items-center justify-center rounded-xl border bg-paper p-3 transition-all ${
                      selectedDesign?.id === design.id
                        ? 'border-clay ring-1 ring-clay'
                        : 'border-sand hover:border-stone'
                    }`}
                  >
                    <DesignArt design={design} className="h-full w-full text-ink" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedDesign(null)}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xs font-medium transition-all ${
                    selectedDesign === null
                      ? 'border-clay bg-paper text-clay ring-1 ring-clay'
                      : 'border-sand bg-paper text-stone hover:border-stone'
                  }`}
                >
                  None
                </button>
              </div>
              {config.allowCustomerUploads !== false && (
                <Disclosure label="Use your own artwork">
                  <div className="flex flex-col gap-2">
                    <textarea
                      placeholder="Image URL (PNG / JPG / SVG) or SVG code (<svg>…</svg>)"
                      value={newDesignSourceInput}
                      onChange={(e) => setNewDesignSourceInput(e.target.value)}
                      rows={2}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Artwork title"
                      value={newDesignTitleInput}
                      onChange={(e) => setNewDesignTitleInput(e.target.value)}
                      className={inputClass}
                    />
                    <button type="button" onClick={handleAddDesign} className={addBtnClass}>
                      Add artwork
                    </button>
                  </div>
                </Disclosure>
              )}
            </Section>

            {/* Order — in-flow on desktop */}
            <div className="hidden border-t border-sand pt-6 lg:block">
              {orderButton}
              <p className="mt-3 text-center text-xs text-stone">
                {selectedCut?.label} · {selectedColor} · {selectedSize} ·{' '}
                {selectedDesign ? selectedDesign.title : 'no design'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Order — sticky bar on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-cream/90 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-6xl">{orderButton}</div>
      </div>

      <footer className="hidden border-t border-sand lg:block">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-stone">
          © {new Date().getFullYear()} {config.shopName ?? 'T-Shirt Studio'}
        </div>
      </footer>

      {modal && (
        <Modal
          title={modal.title}
          body={modal.body}
          rows={modal.rows}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
