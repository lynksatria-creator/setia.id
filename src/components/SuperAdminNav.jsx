import { getSiteUrl } from '../lib/siteDomains';
import { GOOGLE_SEARCH_CONSOLE_URL } from '../lib/seoSites';

const adminLinks = [
  { label: 'Portal', href: '/portal-admin' },
  { label: 'SEO Semua Website', href: '/setia-creative-admin/seo' },
  { label: 'Google Search Console', href: GOOGLE_SEARCH_CONSOLE_URL, external: true },
  { label: 'Gibrig', href: '/gibrig-admin' },
  { label: 'Nunuy Wedding', href: '/nunuy-admin' },
  { label: 'Nuansa Invite Website', href: '/undangan-website-admin' },
  { label: 'Nuansa Invite', href: '/undangan-admin' },
];

const websiteLinks = [
  { label: 'Portal', href: getSiteUrl('aurora') },
  { label: 'Gibrig', href: getSiteUrl('entertainment', '/gibrig') },
  { label: 'Nunuy Wedding', href: getSiteUrl('nunuy', '/nunuy-nadhifa-wedding') },
  { label: 'Nuansa Invite', href: getSiteUrl('invitation', '/undangan') },
];

export default function SuperAdminNav() {
  return (
    <nav className="super-admin-nav" aria-label="Navigasi super admin">
      <div className="super-admin-nav-group">
        <strong>Panel</strong>
        {adminLinks.map((link) => <a key={link.href} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined}>{link.label}</a>)}
      </div>
      <div className="super-admin-nav-group">
        <strong>Website</strong>
        {websiteLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      </div>
    </nav>
  );
}
