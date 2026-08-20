import { useEffect, useState } from 'react';
import { useConfig } from './lib/useConfig.js';
import ShirtPreview from './components/ShirtPreview.jsx';
import DesignArt from './components/DesignArt.jsx';
import Modal from './components/Modal.jsx';
import Basket from './components/Basket.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import { loadBasket, saveBasket, basketTotal } from './lib/basket.js';
import {
  loadAreaOverrides,
  saveAreaOverrides,
  loadDesignDefaults,
  saveDesignDefaults,
} from './lib/adminStore.js';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Admin workbench: open the site with ?admin (e.g. leftee.netlify.app/?admin)
const IS_ADMIN =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('admin');

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
    <details className="group mt-4">
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
  const [selectedColorHex, setSelectedColorHex] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designPosition, setDesignPosition] = useState({ x: 50, y: 50 });
  const [designSize, setDesignSize] = useState(20);
  const [designActive, setDesignActive] = useState(false); // transform box visible

  // Session-only additions (admin workbench)
  const [customColors, setCustomColors] = useState([]);
  const [customSizes, setCustomSizes] = useState([]);

  // Inputs
  const [newColorInput, setNewColorInput] = useState('#b0603f');
  const [newSizeInput, setNewSizeInput] = useState('');

  // Admin edits: print areas + design default placements (browser-local until
  // exported to shop-data.xlsx and uploaded)
  const [areaEdit, setAreaEdit] = useState(false);
  const [areaOverrides, setAreaOverrides] = useState(loadAreaOverrides);
  const [designDefaults, setDesignDefaults] = useState(loadDesignDefaults);

  const [modal, setModal] = useState(null);

  // Basket + tiny hash router ('#/basket' shows the basket page)
  const [basket, setBasket] = useState(loadBasket);
  const [route, setRoute] = useState(
    typeof window !== 'undefined' ? window.location.hash : ''
  );
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const onBasketPage = route.startsWith('#/basket');

  const updateBasket = (items) => {
    setBasket(items);
    saveBasket(items);
  };

  // Defaults once config arrives
  useEffect(() => {
    if (!config) return;
    setSelectedCutId((v) => v ?? config.cuts[0]?.id ?? null);
    setSelectedColorHex((v) => v ?? config.colors[0]?.hex ?? '#ffffff');
    setSelectedSize((v) => v ?? (config.sizes?.includes('M') ? 'M' : config.sizes?.[0]));
    setDesignSize(config.designScale ?? 20);
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
  const selectedCut = cuts.find((c) => c.id === selectedCutId) ?? cuts[0];

  // Per-cut allowed colors/sizes (empty list in the Excel row = allow all)
  const allColors = [...(config.colors ?? []), ...customColors];
  const cutColorFilter = new Set(
    (selectedCut?.colors ?? []).map((c) => String(c).trim().toLowerCase())
  );
  const colors = cutColorFilter.size
    ? allColors.filter(
        (c) =>
          cutColorFilter.has(c.hex.toLowerCase()) ||
          cutColorFilter.has(String(c.name ?? '').toLowerCase())
      )
    : allColors;

  const sizes = [
    ...(selectedCut?.sizes?.length ? selectedCut.sizes : config.sizes ?? []),
    ...customSizes,
  ];

  const designs = config.designs ?? [];

  // Print area: admin override (this browser) wins over the published value
  const effectiveArea = areaOverrides[selectedCut?.id] ?? selectedCut?.printArea;
  const cutForPreview = selectedCut ? { ...selectedCut, printArea: effectiveArea } : selectedCut;

  const defaultPlacementFor = (design) =>
    designDefaults[design.id] ??
    design.default ??
    (selectedCut?.printArea
      ? {
          x: (effectiveArea.left + effectiveArea.right) / 2,
          y: (effectiveArea.top + effectiveArea.bottom) / 2,
          scale: config.designScale ?? 20,
        }
      : { x: 50, y: 50, scale: config.designScale ?? 20 });

  // Keep selections valid when the cut changes
  const activeColor = colors.find((c) => c.hex === selectedColorHex) ?? colors[0];
  const activeSize = sizes.includes(selectedSize) ? selectedSize : sizes[0];
  const colorTitle = activeColor
    ? `${activeColor.name}${activeColor.pantone ? ` (${activeColor.pantone})` : ''}`
    : '—';

  const showError = (body) => setModal({ title: 'Hold on', body });

  const selectCut = (id) => {
    setSelectedCutId(id);
    const cut = cuts.find((c) => c.id === id);
    const a = areaOverrides[id] ?? cut?.printArea;
    if (a && selectedDesign) {
      setDesignPosition({ x: (a.left + a.right) / 2, y: (a.top + a.bottom) / 2 });
    }
  };

  const selectDesign = (design) => {
    setSelectedDesign(design);
    setDesignActive(Boolean(design));
    if (design) {
      const d = defaultPlacementFor(design);
      setDesignPosition({ x: d.x, y: d.y });
      setDesignSize(d.scale);
    }
  };

  const handleAddColor = () => {
    const hex = newColorInput.trim().toLowerCase();
    if (!HEX_RE.test(hex)) return showError('Please enter a valid hex color, e.g. #b0603f.');
    if (allColors.some((c) => c.hex === hex)) return showError('That color is already in the palette.');
    setCustomColors((prev) => [...prev, { name: hex, hex }]);
    setSelectedColorHex(hex);
  };

  const handleAddSize = () => {
    const size = newSizeInput.trim().toUpperCase();
    if (!size) return;
    if (sizes.includes(size)) return showError('That size already exists.');
    setCustomSizes((prev) => [...prev, size]);
    setSelectedSize(size);
    setNewSizeInput('');
  };

  const handleAreaChange = (area) => {
    if (!selectedCut) return;
    const next = { ...areaOverrides, [selectedCut.id]: area };
    setAreaOverrides(next);
    saveAreaOverrides(next);
  };

  const handleSaveDesignDefault = () => {
    if (!selectedDesign) return;
    const next = {
      ...designDefaults,
      [selectedDesign.id]: {
        x: Number(designPosition.x.toFixed(1)),
        y: Number(designPosition.y.toFixed(1)),
        scale: Number(designSize.toFixed(1)),
      },
    };
    setDesignDefaults(next);
    saveDesignDefaults(next);
  };

  const currency = config.currency ?? '$';
  const price = selectedCut?.price ?? null;
  const fmtPrice = (v) =>
    v == null ? null : `${currency}${Number(v).toFixed(2).replace(/\.00$/, '')}`;

  const handleAddToBasket = () => {
    const item = {
      id: Date.now(),
      qty: 1,
      cutId: selectedCut?.id,
      cutLabel: selectedCut?.label ?? '—',
      colorName: activeColor?.name ?? activeColor?.hex ?? '—',
      hex: activeColor?.hex ?? '#ffffff',
      size: activeSize ?? '—',
      designTitle: selectedDesign?.title ?? null,
      designSrc: selectedDesign?.src ?? null,
      designPrintSrc: selectedDesign?.printSrc ?? selectedDesign?.src ?? null,
      placement: selectedDesign
        ? {
            x: Number(designPosition.x.toFixed(1)),
            y: Number(designPosition.y.toFixed(1)),
            scale: Number(designSize.toFixed(1)),
          }
        : null,
      price,
    };
    updateBasket([...basket, item]);
    window.location.hash = '#/basket';
  };

  const handleCheckout = () => {
    if (config.orderUrl) {
      const params = new URLSearchParams({ basket: JSON.stringify(basket) });
      window.open(`${config.orderUrl}?${params.toString()}`, '_blank', 'noopener');
      return;
    }
    setModal({
      title: 'Order Summary',
      rows: [
        ...basket.map((it) => [
          `${it.qty || 1}× ${it.cutLabel} (${it.size})`,
          `${it.colorName}${it.designTitle ? ` · ${it.designTitle}` : ''}${
            it.price != null ? ` · ${fmtPrice(it.price * (it.qty || 1))}` : ''
          }`,
        ]),
        ['Total', fmtPrice(basketTotal(basket)) ?? '—'],
      ],
    });
  };

  const orderButton = (
    <button
      type="button"
      onClick={handleAddToBasket}
      className="w-full rounded-xl bg-clay py-4 text-sm font-semibold uppercase tracking-[0.15em] text-cream shadow-sm transition-colors hover:bg-clay-dark"
    >
      Add to basket{price != null ? ` · ${fmtPrice(price)}` : ''}
    </button>
  );

  return (
    <div className="min-h-screen bg-cream font-sans text-ink">
      {/* Header */}
      <header className="border-b border-sand">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-4 py-5 sm:px-6">
          <h1 className="font-display text-2xl font-semibold">
            {config.shopName ?? 'Leftee'}
            {IS_ADMIN && (
              <span className="ml-3 rounded-full border border-clay px-2 py-0.5 align-middle text-[10px] font-medium uppercase tracking-widest text-clay">
                Admin
              </span>
            )}
          </h1>
          <div className="flex items-baseline gap-6">
            <p className="hidden text-xs uppercase tracking-[0.2em] text-stone sm:block">
              Made to order
            </p>
            <a
              href="#/basket"
              className="text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              Basket
              {basket.length > 0 && (
                <span className="ml-1.5 rounded-full bg-clay px-2 py-0.5 text-xs font-semibold text-cream">
                  {basket.reduce((n, it) => n + (it.qty || 1), 0)}
                </span>
              )}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
        {onBasketPage ? (
          <Basket
            items={basket}
            currency={currency}
            onQty={(id, delta) =>
              updateBasket(
                basket
                  .map((it) =>
                    it.id === id ? { ...it, qty: Math.max(0, (it.qty || 1) + delta) } : it
                  )
                  .filter((it) => (it.qty || 1) > 0)
              )
            }
            onRemove={(id) => updateBasket(basket.filter((it) => it.id !== id))}
            onCheckout={handleCheckout}
          />
        ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
          {/* Preview — sticky on desktop */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            {IS_ADMIN && (
              <AdminPanel
                areaEdit={areaEdit}
                onAreaEditChange={setAreaEdit}
                area={effectiveArea ?? { left: 0, top: 0, right: 0, bottom: 0 }}
                cutLabel={selectedCut?.label ?? '—'}
                design={selectedDesign}
                position={designPosition}
                size={designSize}
                onSaveDesignDefault={handleSaveDesignDefault}
                hasDesignDefault={Boolean(
                  selectedDesign && (designDefaults[selectedDesign.id] ?? selectedDesign.default)
                )}
                exportData={() => ({
                  colors: config.colors ?? [],
                  cuts,
                  areaOverrides,
                  designs,
                  designDefaults,
                })}
              />
            )}
            <ShirtPreview
              cut={cutForPreview}
              color={activeColor?.hex}
              design={selectedDesign}
              position={designPosition}
              onMove={setDesignPosition}
              size={designSize}
              onResize={setDesignSize}
              selected={designActive}
              onSelectChange={setDesignActive}
              areaEditable={IS_ADMIN && areaEdit}
              onAreaChange={handleAreaChange}
              showArea={IS_ADMIN}
            />
            <p className="mt-3 text-center text-sm text-stone">
              {IS_ADMIN && areaEdit
                ? 'Drag the box to move the print area · corner handles to resize.'
                : selectedDesign
                  ? 'Drag to position · click the artwork to resize with the corner handles.'
                  : 'Pick a design to place it on the shirt.'}
            </p>
          </div>

          {/* Controls */}
          <div>
            <Section index="01" title="Cut">
              <div className="inline-flex max-w-full flex-wrap rounded-full border border-sand bg-paper p-1">
                {cuts.map((cut) => (
                  <button
                    key={cut.id}
                    type="button"
                    onClick={() => selectCut(cut.id)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      selectedCut?.id === cut.id ? 'bg-ink text-cream' : 'text-stone hover:text-ink'
                    }`}
                  >
                    {cut.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section index="02" title="Color">
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColorHex(c.hex)}
                    aria-label={`Color ${c.name}`}
                    title={`${c.name}${c.pantone ? ` · ${c.pantone}` : ''} · ${c.hex}`}
                    className={`h-9 w-9 rounded-full border border-sand transition-all ${
                      activeColor?.hex === c.hex
                        ? 'ring-2 ring-clay ring-offset-2 ring-offset-cream'
                        : 'hover:ring-2 hover:ring-sand hover:ring-offset-2 hover:ring-offset-cream'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-stone">{colorTitle}</p>
              {IS_ADMIN && (
                <Disclosure label="Try a color (session only — add permanently via shop-data.xlsx)">
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
              )}
            </Section>

            <Section index="03" title="Size">
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      activeSize === size
                        ? 'border-ink bg-ink text-cream'
                        : 'border-sand bg-paper text-ink hover:border-ink'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {IS_ADMIN && (
                <Disclosure label="Try a size (session only — add permanently via shop-data.xlsx)">
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
              )}
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
                  onClick={() => selectDesign(null)}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xs font-medium transition-all ${
                    selectedDesign === null
                      ? 'border-clay bg-paper text-clay ring-1 ring-clay'
                      : 'border-sand bg-paper text-stone hover:border-stone'
                  }`}
                >
                  None
                </button>
              </div>
            </Section>

            {/* Order — in-flow on desktop */}
            <div className="hidden border-t border-sand pt-6 lg:block">
              {price != null && (
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-stone">Price</span>
                  <span className="font-display text-3xl font-semibold text-ink">
                    {fmtPrice(price)}
                  </span>
                </div>
              )}
              {orderButton}
              <p className="mt-3 text-center text-xs text-stone">
                {selectedCut?.label} · {colorTitle} · {activeSize} ·{' '}
                {selectedDesign ? selectedDesign.title : 'no design'}
              </p>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Order — sticky bar on mobile */}
      {!onBasketPage && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-cream/90 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-6xl">{orderButton}</div>
        </div>
      )}

      <footer className="hidden border-t border-sand lg:block">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-stone">
          © {new Date().getFullYear()} {config.shopName ?? 'Leftee'}
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
