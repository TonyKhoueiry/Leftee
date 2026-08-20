const basename = (p) => String(p ?? '').split('/').pop();

/**
 * Builds shop-data.xlsx in the browser (admin only) with the current values —
 * including any print areas and design defaults adjusted in this session —
 * and triggers a download. Upload the file to the repo root to publish.
 */
async function buildWorkbook({ colors, cuts, areaOverrides, designs, designDefaults }) {
  const XLSX = await import('xlsx');

  const colorRows = colors.map((c) => ({
    Name: c.name ?? c.hex,
    Hex: c.hex,
    Pantone: c.pantone ?? '',
  }));

  const cutRows = cuts.map((cut) => {
    const area = areaOverrides[cut.id] ?? cut.printArea;
    return {
      File: basename(cut.image),
      Label: cut.label,
      Left: area.left,
      Top: area.top,
      Right: area.right,
      Bottom: area.bottom,
      Sizes: (cut.sizes ?? []).join(','),
      Colors: (cut.colors ?? []).join(','),
      Price: cut.price ?? '',
    };
  });

  const designRows = designs
    .filter((d) => d.src || d.printSrc)
    .map((d) => {
      const def = designDefaults[d.id] ?? d.default ?? null;
      return {
        File: basename(d.printSrc ?? d.src),
        X: def ? Number(def.x.toFixed(1)) : '',
        Y: def ? Number(def.y.toFixed(1)) : '',
        Scale: def ? Number(def.scale.toFixed(1)) : '',
      };
    });

  const wb = XLSX.utils.book_new();
  const wsColors = XLSX.utils.json_to_sheet(colorRows);
  wsColors['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsColors, 'Colors');

  const wsCuts = XLSX.utils.json_to_sheet(cutRows);
  wsCuts['!cols'] = [18, 14, 6, 6, 6, 8, 20, 24, 8].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, wsCuts, 'Cuts');

  const wsDesigns = XLSX.utils.json_to_sheet(designRows);
  wsDesigns['!cols'] = [{ wch: 34 }, { wch: 7 }, { wch: 7 }, { wch: 7 }];
  XLSX.utils.book_append_sheet(wb, wsDesigns, 'Designs');

  return { XLSX, wb };
}

/** Download shop-data.xlsx to the admin's computer. */
export async function downloadShopData(data) {
  const { XLSX, wb } = await buildWorkbook(data);
  XLSX.writeFile(wb, 'shop-data.xlsx');
}

/** Return shop-data.xlsx as base64, for committing straight to GitHub. */
export async function shopDataBase64(data) {
  const { XLSX, wb } = await buildWorkbook(data);
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
