import { useState } from 'react';
import { getSiteUrl } from '../lib/siteDomains';

export const invitationNavigation = [
  { label: 'Beranda', href: '/undangan' },
  { label: 'Keunggulan', href: '/undangan/keunggulan' },
  { label: 'Katalog Template', href: '/undangan/template' },
  { label: 'Paket Harga', href: '/undangan/harga' },
  { label: 'Testimoni', href: '/undangan/testimoni' },
  { label: 'FAQ', href: '/undangan/faq' },
];

export default function Navbar({ siteName, logo = 'U', logoImage, activePath = '/undangan', onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar invitation-topbar">
      <div className="container nav-wrap invitation-nav-wrap">
        <a className="brand" href="/undangan" aria-label={`${siteName}, beranda`}>
          {logoImage ? (
            <img className="site-logo-image" src={logoImage} alt={`${siteName} logo`} />
          ) : (
            <span className="logo-mark" aria-hidden="true">
              {logo === 'U' ? (
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 8.5 8.2 4h7.6L20 8.5 12 20 4 8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="M4.5 8.5h15M8.2 4l3.8 4.5L15.8 4M8.5 8.5 12 20l3.5-11.5" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
                </svg>
              ) : logo}
            </span>
          )}
          {!logoImage ? siteName : null}
        </a>
        <button
          className="invitation-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
          aria-controls="invitation-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <nav id="invitation-navigation" className={`nav-links${menuOpen ? ' is-open' : ''}`} aria-label="Navigasi Nuansa Invite">
          {invitationNavigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={activePath === item.href ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a href={getSiteUrl('aurora')} onClick={() => setMenuOpen(false)}>Aurora Media</a>
        </nav>
        <div className="invitation-nav-actions">
          <button className="invitation-login-link" onClick={onLogin}>Masuk</button>
          <button className="primary-btn" onClick={() => { setMenuOpen(false); onRegister(); }}>Buat Undangan</button>
        </div>
      </div>
    </header>
  );
}
