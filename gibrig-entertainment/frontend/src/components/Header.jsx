import React, { useState, useEffect } from 'react';
import { Menu, X, Crown, Phone } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';

const Header = () => {
  const { config } = useSiteConfig();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Artis', href: '#artis' },
    { label: 'Paket', href: '#paket' },
    { label: 'Galeri', href: '#galeri' },
    { label: 'Testimoni', href: '#testimoni' },
    { label: 'Booking', href: '#booking' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-purple-200/60 shadow-[0_8px_30px_-15px_rgba(76,29,149,0.25)]'
          : 'bg-white/40 backdrop-blur-sm border-b border-white/20'
      }`}
    >
      <div className="container-x flex items-center justify-between h-20">
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center ring-2 ring-amber-400/60 shadow-[0_8px_24px_-8px_rgba(76,29,149,0.6)] group-hover:rotate-6 transition-transform duration-300">
              <Crown size={20} className="text-amber-300" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-display text-2xl text-purple-950 font-semibold">
              {config.brand.name}{' '}
              <span className="font-italic-accent">{config.brand.subtitle}</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700/80 font-medium">
              Official
            </div>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-10">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav-link text-sm font-medium">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href={`tel:${config.brand.phoneRaw}`}
            className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          >
            <Phone size={15} />
            Hubungi Kami
          </a>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 rounded-lg text-purple-900 hover:bg-purple-100/60 transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-purple-200/60 bg-white/95 backdrop-blur-md">
          <div className="container-x py-4 flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 px-2 rounded-lg text-purple-950 hover:bg-purple-50 text-sm font-medium"
              >
                {l.label}
              </a>
            ))}
            <a
              href={`tel:${config.brand.phoneRaw}`}
              className="btn-primary mt-2 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"
            >
              <Phone size={15} /> Hubungi Kami
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
