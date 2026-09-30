import React from 'react';
import { Music2, Youtube, Instagram, Music } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';
// Artist data now comes from config (editable via admin)


const ArtistSection = () => {
  const { config } = useSiteConfig();
  const { social } = config;
  return (
    <section id="artis" className="relative py-20 md:py-28 bg-royal-alt overflow-hidden">
      <div className="absolute inset-0 pattern-dots opacity-40" />
      <div className="relative container-x grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden ring-1 ring-purple-200 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.45)] aspect-[4/5] max-w-md mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-900 to-purple-950" />
            <img src={config.artist?.image} alt={config.artist?.name} className="absolute inset-0 w-full h-full object-cover opacity-90" />

            <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <div className="text-amber-300 text-[10px] uppercase tracking-[0.2em] mb-1">{config.artist?.role}</div>
              <div className="font-display text-3xl">{config.artist?.name}</div>

            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-px bg-amber-500" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
              Artis Utama — {config.artist?.name}

            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-purple-950 leading-[1.05]">
            Kehangatan suara,
            <br />
            <span className="font-italic-accent">pesona panggung</span>.
          </h2>
          <p className="mt-6 text-purple-900/75 max-w-xl leading-relaxed">
            {config.artist?.bio}

          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
            <SocialCard icon={<Music2 size={16} />} title="TikTok" label={social.tiktok} />
            <SocialCard icon={<Youtube size={16} />} title="YouTube" label={social.youtube} />
            <SocialCard icon={<Instagram size={16} />} title="Instagram" label={social.instagram} />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-purple-900/80 text-sm">
            <Music size={14} className="text-amber-600" />
            {(config.artist?.genres || []).join(' • ')}

          </div>
        </div>
      </div>
    </section>
  );
};

const SocialCard = ({ icon, title, label }) => {
  const safeLabel = String(label ?? '');

  return (
    <div className="card-royal flex items-center gap-3 px-4 py-3">
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-700 to-purple-900 text-amber-300 flex items-center justify-center ring-1 ring-amber-300/40 flex-shrink-0">
        {icon}
      </span>

      <div className="leading-tight min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-amber-700">{title}</div>
        <div className="text-[12px] text-purple-950 font-medium break-words">
          {safeLabel}
        </div>
      </div>
    </div>
  );
};

export default ArtistSection;
