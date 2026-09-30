import React, { useEffect, useMemo, useState } from 'react';
import { Check, Star, MessageCircle, X } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';

const Packages = () => {
  const { config } = useSiteConfig();
  const phone = config.brand.phoneRaw;
  const packages = Array.isArray(config.packages) ? config.packages : [];

  const [selectedImage, setSelectedImage] = useState('');

  const isOpen = Boolean(selectedImage);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pop up gambar paket"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedImage('');
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20"
            aria-label="Tutup"
            onClick={() => setSelectedImage('')}
          >
            <X size={18} />
          </button>
          <div className="max-w-4xl w-full">
            <img
              src={selectedImage}
              alt="Gambar paket"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl border border-white/10 bg-black"
            />
          </div>
        </div>
      )}

      <section id="paket" className="relative py-20 md:py-28 bg-royal overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-40" />
        <div className="relative container-x">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-10 h-px bg-amber-500" />
              <span className="text-[11px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
                Pilihan Paket Musik
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-purple-950 leading-[1.05]">
              Tiga formasi, satu standar:
              <br />
              <span className="font-italic-accent">spektakuler</span>.
            </h2>
            <p className="mt-5 text-purple-900/75 max-w-xl">
              Pilih paket yang paling pas dengan suasana acara Anda. Semua harga menyesuaikan lokasi — diskusikan langsung via WhatsApp.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {packages.map((p) => (
              <div key={p.id} className={`card-royal relative flex flex-col overflow-hidden ${p.badge ? 'lg:-translate-y-2' : ''}`}>
                {p.badge && (
                  <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-purple-950 text-xs font-semibold shadow-md">
                    <Star size={12} fill="currentColor" />
                    {p.badge}
                  </div>
                )}

                <button
                  type="button"
                  className="relative aspect-[4/3] overflow-hidden text-left"
                  onClick={() => setSelectedImage(p.image)}
                  aria-label={`Buka gambar ${p.name}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-800 to-purple-950" />
                  <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-950/60 via-transparent to-transparent" />
                </button>

                <div className="p-6 flex flex-col flex-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-semibold">
                    {p.label}
                  </div>
                  <h3 className="font-display text-3xl text-purple-950 mt-1">{p.name}</h3>
                  <p className="text-sm text-purple-900/70 mt-2">{p.description}</p>

                  <ul className="mt-5 space-y-2 flex-1">
                    {(Array.isArray(p.items) ? p.items : []).map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-purple-950/90">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Check size={12} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 pt-5 border-t border-purple-200/60">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 mb-1">Harga</div>
                    <div className="font-display text-xl text-purple-950">{p.price}</div>
                  </div>

                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(`Halo Gibrig, saya ingin booking *${p.name}* (${p.label}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary mt-5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"
                  >
                    <MessageCircle size={15} />
                    Booking via WA
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Packages;

