import React from 'react';
import { Sparkles, Phone, ArrowRight, Youtube, Instagram } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';
import { artist as mockArtist } from '../../mock/mock';

const Hero = () => {
  const { config } = useSiteConfig();
  const { brand, social } = config;

  return (
    <section className="relative overflow-hidden bg-royal">
      <div className="orb bg-purple-500/40 w-[420px] h-[420px] -top-32 -left-24" />
      <div className="orb bg-amber-300/40 w-[360px] h-[360px] top-40 -right-24" />
      <div className="absolute inset-0 pattern-dots opacity-60" />

      {/* Watermark banner */}
      <div className="relative z-10 pt-4">
        <div className="container-x">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 border border-amber-400/40 shadow-[0_10px_30px_-15px_rgba(76,29,149,0.7)]">
            <Sparkles size={13} className="text-amber-300" />
            <span className="watermark-shimmer text-xs font-semibold tracking-[0.22em] uppercase font-display">
              {brand.tagline}
            </span>
            <Sparkles size={13} className="text-amber-300" />
          </div>
        </div>
      </div>

      <div className="relative container-x py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-purple-200 text-purple-900 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Live Music • Garut • Bersama {mockArtist.name}

            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-purple-950 leading-[1.05]">
              {config.hero?.headlineTop || 'Hiburan'}{' '}
              <span className="font-italic-accent">{config.hero?.headlineAccent || 'Berkualitas'}</span>,
              <br />
              {config.hero?.headlineBottom || 'Momen'}{' '}
              <span className="font-italic-accent">{config.hero?.headlineBottomAccent || 'Tak Terlupakan'}</span>.
            </h1>

            <p className="mt-6 text-purple-900/75 text-base md:text-lg max-w-xl leading-relaxed">
              {config.hero?.description ||
                'Gibrig Musik Entertainment menghadirkan musik live spektakuler untuk pernikahan, khitanan, ulang tahun, dan hajatan Anda — formasi lengkap, tim profesional, harga ramah lokasi.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={config.hero?.ctaHref || '#paket'}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm"
              >
                {config.hero?.ctaLabel || 'Lihat Paket'}
                <ArrowRight size={16} />
              </a>

              <a
                href={`tel:${brand.phoneRaw}`}
                className="btn-outline-purple inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm"
              >
                <Phone size={15} className="text-amber-600" />
                {brand.phone}
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-4 max-w-md">
              {(config.hero?.stats || []).map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl md:text-4xl text-purple-950 font-semibold">
                    {s.value}
                  </div>
                  <div className="text-xs text-purple-700/70 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto w-[320px] h-[320px] md:w-[440px] md:h-[440px] rounded-full overflow-hidden ring-gold float">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-900 to-purple-950" />
              <img
                src={config.hero?.photo || mockArtist.image}
                alt={mockArtist.name}
                className="absolute inset-0 w-full h-full object-cover opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-950/60 via-transparent to-transparent" />
            </div>

            <div className="absolute -right-2 md:right-4 top-10 space-y-3">
              <SocialPill icon={<Music2 size={14} />} label={social.tiktok} title="TikTok" />
              <SocialPill icon={<Youtube size={14} />} label={social.youtube} title="YouTube" />
              <SocialPill icon={<Instagram size={14} />} label={social.instagram} title="Instagram" />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 bg-white/90 backdrop-blur border border-purple-200 rounded-full px-5 py-2 text-sm text-purple-950 shadow-[0_20px_50px_-20px_rgba(76,29,149,0.45)]">
              Artis Utama — <span className="font-italic-accent">{mockArtist.name}</span>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SocialPill = ({ icon, label, title }) => (
  <div className="flex items-center gap-2 bg-white/90 backdrop-blur border border-amber-300/50 rounded-full pl-2 pr-3 py-1.5 shadow-[0_10px_30px_-15px_rgba(76,29,149,0.45)]">
    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">{icon}</span>
    <div className="leading-tight">
      <div className="text-[9px] uppercase tracking-wider text-amber-700">{title}</div>
      <div className="text-[11px] text-purple-950 font-medium">{label}</div>
    </div>
  </div>
);

export default Hero;

