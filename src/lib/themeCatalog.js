const palettesBySite = {
  admin: [
    { name: 'Ivory & Olive', primary: '#52634c', secondary: '#f1efe3', accent: '#ad7656', background: '#fbfaf5', text: '#29342b' },
    { name: 'Terracotta', primary: '#a44f38', secondary: '#f5e5da', accent: '#d69a59', background: '#fffaf5', text: '#382a26' },
    { name: 'Coastal Blue', primary: '#315d70', secondary: '#e1edf0', accent: '#bd875d', background: '#f7fbfc', text: '#263b43' },
    { name: 'Sage Garden', primary: '#62816b', secondary: '#e6eee6', accent: '#c28c75', background: '#f8fbf7', text: '#2f4035' },
    { name: 'Champagne', primary: '#9a7843', secondary: '#f5eedf', accent: '#bd8b68', background: '#fffdf7', text: '#403729' },
    { name: 'Rosewood', primary: '#814b53', secondary: '#f0e3e4', accent: '#c08a73', background: '#fcf8f7', text: '#392e31' },
    { name: 'Forest', primary: '#244f42', secondary: '#e0eae3', accent: '#c39458', background: '#f7faf7', text: '#20352e' },
    { name: 'Lavender', primary: '#675779', secondary: '#ece7f1', accent: '#b37e88', background: '#fbf9fc', text: '#342e3d' },
    { name: 'Sandstone', primary: '#806248', secondary: '#eee5d9', accent: '#b77c53', background: '#faf7f1', text: '#393128' },
    { name: 'Charcoal', primary: '#30393b', secondary: '#e7e9e7', accent: '#c18d56', background: '#f8f9f7', text: '#252c2c' },
  ],
  gibrig: [
    { name: 'Stage Violet', primary: '#5e35a5', secondary: '#eee8f8', accent: '#f0a34a', background: '#fbf9ff', text: '#292238' },
    { name: 'Electric Blue', primary: '#1557b0', secondary: '#e4efff', accent: '#f28c45', background: '#f8fbff', text: '#1e2d43' },
    { name: 'Midnight', primary: '#24233c', secondary: '#e8e7f0', accent: '#d4538c', background: '#f7f7fb', text: '#272637' },
    { name: 'Live Coral', primary: '#bb433f', secondary: '#f8e8e4', accent: '#e4a448', background: '#fffaf8', text: '#3d2929' },
    { name: 'Emerald Sound', primary: '#146552', secondary: '#e2f0ea', accent: '#d9a441', background: '#f7fcf9', text: '#20362f' },
    { name: 'Neon Lime', primary: '#385e28', secondary: '#edf2df', accent: '#c5d940', background: '#fbfcf4', text: '#293222' },
    { name: 'Indigo', primary: '#3f4a9c', secondary: '#e8e9f8', accent: '#eb8b64', background: '#f9f9ff', text: '#292d48' },
    { name: 'Sunset', primary: '#a84430', secondary: '#f7e8dc', accent: '#f2b34b', background: '#fffaf5', text: '#3c2d27' },
    { name: 'Graphite', primary: '#30363e', secondary: '#e7e9eb', accent: '#b64d78', background: '#f8f9fa', text: '#272c32' },
    { name: 'Ocean Teal', primary: '#08747a', secondary: '#e0f2f1', accent: '#ee9e53', background: '#f5fcfb', text: '#203638' },
  ],
  nunuy: [
    { name: 'Rose Champagne', primary: '#925b61', secondary: '#f3e8e5', accent: '#c29b66', background: '#fffaf7', text: '#3b3030' },
    { name: 'Ivory Gold', primary: '#927447', secondary: '#f5efdf', accent: '#c09a50', background: '#fffdf8', text: '#3a352b' },
    { name: 'Garden Sage', primary: '#55735e', secondary: '#e8eee5', accent: '#c78d7b', background: '#fbfcf8', text: '#2f3c33' },
    { name: 'Dusty Blue', primary: '#5b7384', secondary: '#e8eef0', accent: '#c59a74', background: '#fafcfc', text: '#303a40' },
    { name: 'Blush', primary: '#a85671', secondary: '#f8e8ed', accent: '#c89174', background: '#fff9fb', text: '#3d2e35' },
    { name: 'Plum Velvet', primary: '#68415e', secondary: '#efe6ed', accent: '#c69a68', background: '#fcf9fc', text: '#332a34' },
    { name: 'Olive Estate', primary: '#686b3c', secondary: '#eeeedf', accent: '#bb8c55', background: '#fcfbf4', text: '#343427' },
    { name: 'Terracotta Romance', primary: '#a35d48', secondary: '#f5e8df', accent: '#c99370', background: '#fdfaf6', text: '#3d302c' },
    { name: 'Classic Black', primary: '#33312f', secondary: '#eae7e3', accent: '#b69b73', background: '#fbfaf8', text: '#2c2a28' },
    { name: 'Misty Lilac', primary: '#73637e', secondary: '#efebf2', accent: '#be9c82', background: '#fcfafc', text: '#342f39' },
  ],
  invitation: [
    { name: 'Royal Gold', primary: '#9b742f', secondary: '#f5eddd', accent: '#bd8f43', background: '#fffaf0', text: '#362f24' },
    { name: 'Romantic Pink', primary: '#ae5277', secondary: '#f8e8ef', accent: '#c77f82', background: '#fff8fb', text: '#402e37' },
    { name: 'Modern Emerald', primary: '#23715b', secondary: '#e4f0e9', accent: '#b28a50', background: '#f7fcf9', text: '#253a32' },
    { name: 'Navy Luxe', primary: '#294a72', secondary: '#e6edf5', accent: '#c4a15a', background: '#f8fafd', text: '#283442' },
    { name: 'Lilac Romance', primary: '#765d91', secondary: '#eee8f5', accent: '#bd849a', background: '#fbf9fd', text: '#352d3c' },
    { name: 'Floral Peach', primary: '#a8664e', secondary: '#f7e8dc', accent: '#cf9a62', background: '#fffaf6', text: '#3e3029' },
    { name: 'Sage Minimal', primary: '#607a67', secondary: '#e9eee8', accent: '#b98b71', background: '#fbfcfa', text: '#303a32' },
    { name: 'Black Tie', primary: '#2c3037', secondary: '#e9eaeb', accent: '#b99459', background: '#fafafa', text: '#282b30' },
    { name: 'Maroon Heritage', primary: '#7a3444', secondary: '#f1e5e6', accent: '#c09b67', background: '#fcf9f8', text: '#382c30' },
    { name: 'Sky Celebration', primary: '#39718a', secondary: '#e3f0f5', accent: '#d79755', background: '#f8fcfd', text: '#293940' },
  ],
};

const designStyles = [
  { name: 'Editorial', layout: 'editorial', font: 'Georgia', radius: 4, fontScale: 1, heroHeight: 440 },
  { name: 'Minimal', layout: 'minimal', font: 'Arial', radius: 2, fontScale: 0.96, heroHeight: 390 },
  { name: 'Romantic', layout: 'centered', font: 'Georgia', radius: 18, fontScale: 1.04, heroHeight: 460 },
  { name: 'Modern', layout: 'split', font: 'system-ui', radius: 12, fontScale: 1, heroHeight: 430 },
  { name: 'Classic', layout: 'classic', font: 'Times New Roman', radius: 0, fontScale: 1.02, heroHeight: 410 },
  { name: 'Organic', layout: 'organic', font: 'Trebuchet MS', radius: 28, fontScale: 0.98, heroHeight: 470 },
  { name: 'Dramatic', layout: 'dramatic', font: 'Georgia', radius: 2, fontScale: 1.1, heroHeight: 520 },
  { name: 'Playful', layout: 'playful', font: 'Trebuchet MS', radius: 22, fontScale: 1.02, heroHeight: 430 },
  { name: 'Monochrome', layout: 'monochrome', font: 'Arial', radius: 0, fontScale: 0.95, heroHeight: 400 },
  { name: 'Timeless', layout: 'timeless', font: 'Georgia', radius: 8, fontScale: 1.05, heroHeight: 450 },
];

export const createDefaultTheme = (site) => ({
  ...palettesBySite[site][0],
  font: 'Georgia',
  layout: 'editorial',
  fontScale: 1,
  logoSize: 42,
  heroHeight: 440,
  radius: 8,
});

export const getThemeCatalog = (site) => {
  const palettes = palettesBySite[site] || palettesBySite.admin;
  return designStyles.flatMap((design, designIndex) =>
    palettes.map((palette, paletteIndex) => ({
      id: `${site}-${design.layout}-${paletteIndex + 1}`,
      name: `${design.name} · ${palette.name}`,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background,
      text: palette.text,
      font: design.font,
      layout: design.layout,
      fontScale: design.fontScale,
      logoSize: 36 + ((designIndex + paletteIndex) % 4) * 4,
      heroHeight: design.heroHeight,
      radius: design.radius,
    })),
  );
};

export const themeStyle = (theme = {}) => ({
  '--theme-primary': theme.primary || '#294b3e',
  '--theme-secondary': theme.secondary || '#f5f4ef',
  '--theme-accent': theme.accent || '#bd755d',
  '--theme-background': theme.background || '#fbf9f4',
  '--theme-text': theme.text || '#20352e',
  '--theme-font': theme.font || 'DM Sans',
  '--theme-heading-font': theme.headingFont || theme.font || 'DM Sans',
  '--theme-font-scale': theme.fontScale || 1,
  '--theme-spacing': `${theme.spacing || 24}px`,
  '--theme-logo-size': `${theme.logoSize || 42}px`,
  '--theme-hero-height': `${theme.heroHeight || 440}px`,
  '--theme-radius': `${theme.radius ?? 8}px`,
});
