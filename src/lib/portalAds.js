export const normalizePortalAds = (defaults, ads = {}) => Object.fromEntries(Object.entries(defaults).map(([key, defaultValue]) => {
  const ad = { ...defaultValue, ...(ads[key] || {}) };
  if (key === 'page') return [key, ad];
  const imageWidth = Number(ad.imageWidth);
  return [key, {
    ...ad,
    title: String(ad.title ?? '').slice(0, 180),
    imageWidth: Number.isFinite(imageWidth) ? Math.min(100, Math.max(20, imageWidth)) : defaultValue.imageWidth,
  }];
}));