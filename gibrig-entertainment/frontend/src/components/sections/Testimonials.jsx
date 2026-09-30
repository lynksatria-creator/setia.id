import React from 'react';
import { Star, Quote } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';

const Testimonials = () => {
  const { config } = useSiteConfig();
  const testimonials = Array.isArray(config.testimonials) ? config.testimonials : [];

  return (
    <section id="testimoni" className="relative py-20 md:py-28 bg-royal overflow-hidden">
      <div className="absolute inset-0 pattern-dots opacity-40" />
      <div className="relative container-x">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-px bg-amber-500" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
              Kata Klien Kami
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-purple-950 leading-[1.05]">
            Suara nyata dari <span className="font-italic-accent">para tuan rumah</span>.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.id} className="card-royal p-7 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: Number(t.rating) || 0 }).map((_, i) => (
                    <Star key={i} size={15} className="text-amber-500" fill="currentColor" />
                  ))}
                </div>
                <Quote size={28} className="text-purple-300" />
              </div>
              <p className="mt-5 text-purple-950/90 leading-relaxed text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 pt-5 border-t border-purple-200/60 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-300/50"
                />
                <div>
                  <div className="text-purple-950 font-semibold text-sm">{t.name}</div>
                  <div className="text-amber-700 text-xs">{t.event}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

