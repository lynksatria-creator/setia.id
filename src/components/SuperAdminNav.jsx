const adminLinks = [
  { label: 'Portal', href: '/portal-admin' },
  { label: 'Gibrig', href: '/gibrig-admin' },
  { label: 'Nunuy Wedding', href: '/nunuy-admin' },
  { label: 'Undangan.id Website', href: '/undangan-website-admin' },
  { label: 'Undangan.id', href: '/undangan-admin' },
];

const websiteLinks = [
  { label: 'Portal', href: '/' },
  { label: 'Gibrig', href: '/gibrig' },
  { label: 'Nunuy Wedding', href: '/nunuy-nadhifa-wedding' },
  { label: 'Undangan.id', href: '/undangan' },
];

export default function SuperAdminNav() {
  return (
    <nav className="super-admin-nav" aria-label="Navigasi super admin">
      <div className="super-admin-nav-group">
        <strong>Panel</strong>
        {adminLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      </div>
      <div className="super-admin-nav-group">
        <strong>Website</strong>
        {websiteLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      </div>
    </nav>
  );
}
