import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';

const Gallery = () => {
  const { config } = useSiteConfig();
  const gallery = Array.isArray(config.gallery) ? config.gallery : [];

  return (
    <section id="galeri" className="relative py-20 md:py-28 bg-royal-alt overflow-hidden">
      <div className="relative container-x">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-px bg-amber-500" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
              Galeri Momen
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-purple-950 leading-[1.05]">
            Cuplikan dari panggung <span className="font-italic-accent">kami</span>.
          </h2>
          <p className="mt-4 text-purple-900/70">Foto/video contoh suasana acara</p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.map((g) => (
            <div key={g.id} className="group relative rounded-2xl overflow-hidden aspect-[4/3] ring-1 ring-purple-200/70 shadow-[0_20px_60px_-30px_rgba(76,29,149,0.35)]">
              {g.type === 'video' ? (
                <video
                  src={g.src}
                  controls
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <img
                  src={g.src}
                  alt={g.caption}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-purple-950/85 via-purple-950/20 to-transparent" />
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-purple-950/70 backdrop-blur border border-amber-400/40 text-amber-300 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                <Sparkles size={10} /> LIVE
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white text-sm font-medium">
                {g.caption}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;

