export const SITE_DOMAINS = Object.freeze({
  aurora: 'https://auroramedia.online',
  nunuy: 'https://wediing.auroramedia.online',
  entertainment: 'https://entertainment.musik.auroramedia.online',
  invitation: 'https://invite.auroramedia.online',
});

const SITE_ROOTS = [
  { site: 'nunuy', route: '/nunuy-nadhifa-wedding' },
  { site: 'entertainment', route: '/gibrig' },
  { site: 'invitation', route: '/undangan' },
];

export function getSiteUrl(site, path = '/') {
  const base = SITE_DOMAINS[site];
  if (!base) return path;
  return new URL(path, `${base}/`).href;
}

export function getRootRouteForHost(hostname = window.location.hostname) {
  const normalizedHost = String(hostname || '').toLowerCase().replace(/^www\./, '');
  if (normalizedHost === 'wediing.auroramedia.online') return '/nunuy-nadhifa-wedding';
  if (normalizedHost === 'entertainment.musik.auroramedia.online') return '/gibrig';
  if (normalizedHost === 'invite.auroramedia.online') return '/undangan';
  return '/';
}

export function resolveBrandHref(href) {
  if (typeof href !== 'string') return href;
  const match = SITE_ROOTS.find(({ route }) => href === route || href.startsWith(`${route}/`) || href.startsWith(`${route}?`) || href.startsWith(`${route}#`));
  return match ? getSiteUrl(match.site, href) : href;
}
