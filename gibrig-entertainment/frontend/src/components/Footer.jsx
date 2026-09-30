import React from 'react';
import { Crown, Phone, MapPin, Music2 } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';

const Footer = () => {
  const { config } = useSiteConfig();
  const { brand, social, footer } = config;

  return (
    <footer className="relative bg-royal-dark text-purple-100 mt-20">
      <div className="absolute inset-0 grain" />
      <div className="relative container-x py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center ring-2 ring-amber-300/50">
                <Crown size={22} className="text-purple-950" />
              </div>
              <div>
                <div className="font-display text-2xl text-white">
                  {brand.name} <span className="text-amber-300 italic">{brand.subtitle}</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                  Official • {brand.tagline}
                </div>
              </div>
            </div>
            <p className="text-purple-200/80 text-sm leading-relaxed max-w-md">
              {footer.description}
            </p>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-purple-200/90">
                <Phone size={14} className="text-amber-300" />
                <a href={`tel:${brand.phoneRaw}`} className="hover:text-amber-200">
                  {brand.phone}
                </a>
              </div>
              <div className="flex items-start gap-2 text-purple-200/90">
                <MapPin size={14} className="text-amber-300 mt-0.5" />
                <span>{brand.address}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-amber-300 text-xs uppercase tracking-[0.18em] mb-4">Tautan Cepat</div>
            <ul className="space-y-3 text-sm">
              {footer.quickLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-purple-200/85 hover:text-amber-200 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-amber-300 text-xs uppercase tracking-[0.18em] mb-4">Sosial Media</div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-purple-200/85">
                <Music2 size={14} className="text-amber-300" /> TikTok: {social.tiktok}
              </li>
              <li className="flex items-center gap-2 text-purple-200/85">
                <Music2 size={14} className="text-amber-300" /> YouTube: {social.youtube}
              </li>
              <li className="flex items-center gap-2 text-purple-200/85">
                <Music2 size={14} className="text-amber-300" /> Instagram: {social.instagram}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-purple-700/40 flex flex-col md:flex-row gap-4 items-center justify-between text-xs text-purple-300/70">
          <div>{footer.copyright}</div>
          <div className="flex items-center gap-2">
            <span className="watermark-shimmer font-display text-base">{brand.tagline}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
