import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Lock,
  Phone,
  MapPin,
  Sparkles,
  RefreshCcw,
  Save,
  Plus,
  Trash,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSiteConfig } from '../context/SiteConfigContext';
import { initialSiteConfig } from '../mock/mock';
import { toast } from 'sonner';

const uid = () => `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;


const Input = ({ label, value, onChange, placeholder, type = 'text' }) => {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-4 pr-3 py-3 rounded-xl border border-purple-200 bg-white text-purple-950 text-sm input-royal"
      />
    </label>
  );
};

const TextArea = ({ label, value, onChange, placeholder }) => {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full pl-4 pr-3 py-3 rounded-xl border border-purple-200 bg-white text-purple-950 text-sm input-royal resize-none"
      />
    </label>
  );
};

const FileToDataUrl = ({ accept = 'image/*', onPick, label = 'Upload', helpText }) => {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">
        {label}
      </div>
      <input
        type="file"
        accept={accept}
        className="w-full" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') onPick(reader.result);
          };
          reader.readAsDataURL(file);
        }}
      />
      {helpText ? <div className="text-xs text-purple-200/80 mt-2">{helpText}</div> : null}
    </label>
  );
};

const PackagesAdminEditor = ({ formPackages, setFormPackages, phoneRaw }) => {
  const { updatePackages } = useSiteConfig();

  const [working, setWorking] = useState(formPackages);

  useEffect(() => {
    setWorking(formPackages);
  }, [formPackages]);

  const addPackage = () => {
    setWorking((p) => [
      ...p,
      {
        id: uid(),
        name: '',
        label: '',
        badge: null,
        image: '',
        description: '',
        items: [],
        price: '',
      },
    ]);
  };

  const commit = () => {
    const next = working;
    setFormPackages(next);
    updatePackages(next);
    toast.success('Paket musik tersimpan');
  };


  return (
    <div className="space-y-4">
      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-sm uppercase tracking-widest text-amber-300/80">Edit Pilihan Paket Musik</div>
        <div className="text-purple-200/80 text-sm mt-2">Tambah, edit, atau hapus paket yang tampil di section #paket.</div>
      </div>

      <div className="space-y-4">
        {working.map((p, idx) => (
          <div key={p.id} className="bg-white/10 border border-white/10 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-amber-300 text-sm font-semibold">Paket #{idx + 1}</div>
                <div className="text-purple-200/70 text-xs mt-1">ID: {p.id}</div>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/20 px-4 py-2 text-red-200 hover:bg-red-500/30"
                onClick={() => setWorking((s) => s.filter((x) => x.id !== p.id))}
              >
                <Trash size={16} className="mr-2" /> Hapus
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Paket" value={p.name} placeholder="Paket 1" onChange={(v) => {
                setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, name: v } : x)));
              }} />
              <Input label="Label (Esensial/Populer/Premium)" value={p.label} placeholder="Esensial" onChange={(v) => {
                setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, label: v } : x)));
              }} />
              <Input label="Badge (opsional)" value={p.badge ?? ''} placeholder="Populer" onChange={(v) => {
                setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, badge: v.trim() ? v : null } : x)));
              }} />
              <Input label="Harga" value={p.price} placeholder="Menyesuaikan Lokasi" onChange={(v) => {
                setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, price: v } : x)));
              }} />

              <div className="sm:col-span-2 space-y-3">
                <Input
                  label="Image (URL)"
                  value={p.image}
                  placeholder="https://..."
                  onChange={(v) => {
                    setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, image: v } : x)));
                  }}
                />
                <FileToDataUrl
                  accept="image/*"
                  label="Upload Image (langsung)"
                  helpText="File akan disimpan sebagai data URL di localStorage (tanpa server)."
                  onPick={(dataUrl) => {
                    setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, image: dataUrl } : x)));
                  }}
                />
              </div>

              <div className="sm:col-span-2">
                <TextArea label="Deskripsi" value={p.description} placeholder="Deskripsi paket..." onChange={(v) => {
                  setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, description: v } : x)));
                }} />
              </div>

              <div className="sm:col-span-2">
                <TextArea
                  label="Items (pisahkan pakai koma)"
                  value={(Array.isArray(p.items) ? p.items : []).join(', ')}
                  placeholder="Kendang, Melodi, Keyboard, ..."
                  onChange={(v) => {
                    const items = v
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean);
                    setWorking((s) => s.map((x) => (x.id === p.id ? { ...x, items } : x)));
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 font-semibold text-purple-950 hover:bg-amber-300"
                onClick={commit}
              >
                <Save size={16} className="mr-2" /> Simpan Paket
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <button
          className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-3 font-semibold text-purple-200/90 hover:bg-white/15"
          onClick={addPackage}
        >
          <Plus size={16} className="mr-2" /> Tambah Paket
        </button>
        <div className="text-xs text-purple-200/70 mt-2 sm:mt-0">
          WA booking akan otomatis memakai {phoneRaw}.
        </div>
      </div>
    </div>
  );
};

const GalleryAdminEditor = ({ formGallery, setFormGallery }) => {
  const [working, setWorking] = useState(formGallery);

  useEffect(() => {
    setWorking(formGallery);
  }, [formGallery]);

  const addItem = (type) => {
    setWorking((s) => [
      ...s,
      {
        id: uid(),
        type,
        src: '',
        caption: '',
      },
    ]);
  };

  const commit = () => setFormGallery(working);

  return (
    <div className="space-y-4">
      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-sm uppercase tracking-widest text-amber-300/80">Edit Galeri Momen</div>
        <div className="text-purple-200/80 text-sm mt-2">Tambah / hapus gambar atau video untuk section #galeri.</div>
      </div>

      {working.map((g, idx) => (
        <div key={g.id} className="bg-white/10 border border-white/10 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-amber-300 text-sm font-semibold">Item #{idx + 1}</div>
              <div className="text-purple-200/70 text-xs mt-1">Tipe: {g.type || 'image'}</div>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/20 px-4 py-2 text-red-200 hover:bg-red-500/30"
              onClick={() => setWorking((s) => s.filter((x) => x.id !== g.id))}
            >
              <Trash size={16} className="mr-2" /> Hapus
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">
                Tipe Media
              </div>
              <div className="flex gap-2">
                {['image', 'video'].map((t) => (
                  <button
                    key={t}
                    className={
                      (g.type || 'image') === t
                        ? 'inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 font-semibold text-purple-950'
                        : 'inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-2 font-semibold text-purple-200/90 hover:bg-white/15'
                    }
                    onClick={() => setWorking((s) => s.map((x) => (x.id === g.id ? { ...x, type: t } : x)))}
                  >
                    {t === 'image' ? 'Image' : 'Video'}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Source (URL/Data URL)"
                value={g.src}
                placeholder={g.type === 'video' ? 'https://...mp4 atau data URL' : 'https://...jpg/png atau data URL'}
                onChange={(v) => setWorking((s) => s.map((x) => (x.id === g.id ? { ...x, src: v } : x)))}
              />
              <div className="mt-3">
                <FileToDataUrl
                  accept={g.type === 'video' ? 'video/*' : 'image/*'}
                  label={g.type === 'video' ? 'Upload Video (langsung)' : 'Upload Image (langsung)'}
                  helpText="File disimpan sebagai data URL di localStorage (tanpa server)."
                  onPick={(dataUrl) => {
                    setWorking((s) => s.map((x) => (x.id === g.id ? { ...x, src: dataUrl } : x)));
                  }}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Caption"
                value={g.caption}
                placeholder="Tulis caption..."
                onChange={(v) => setWorking((s) => s.map((x) => (x.id === g.id ? { ...x, caption: v } : x)))}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 font-semibold text-purple-950 hover:bg-amber-300"
              onClick={commit}
            >
              <Save size={16} className="mr-2" /> Simpan Galeri
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <button
            className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-3 font-semibold text-purple-200/90 hover:bg-white/15"
            onClick={() => addItem('image')}
          >
            <Plus size={16} className="mr-2" /> Tambah Image
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-3 font-semibold text-purple-200/90 hover:bg-white/15"
            onClick={() => addItem('video')}
          >
            <Plus size={16} className="mr-2" /> Tambah Video
          </button>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 font-semibold text-purple-950 hover:bg-amber-300"
          onClick={commit}
        >
          <Save size={16} className="mr-2" /> Simpan Semua
        </button>
      </div>
    </div>
  );
};

const HeroAdminEditor = ({ formHero, toast, updateHero }) => {
  const [working, setWorking] = useState(formHero || {});

  useEffect(() => {
    setWorking(formHero || {});
  }, [formHero]);

  const commit = () => {
    const next = {
      headlineTop: String(working?.headlineTop ?? ''),
      headlineAccent: String(working?.headlineAccent ?? ''),
      headlineBottom: String(working?.headlineBottom ?? ''),
      headlineBottomAccent: String(working?.headlineBottomAccent ?? ''),
      description: String(working?.description ?? ''),
      ctaLabel: String(working?.ctaLabel ?? ''),
      ctaHref: String(working?.ctaHref ?? ''),
      photo: String(working?.photo ?? ''),
      stats: Array.isArray(working?.stats)
        ? working.stats.slice(0, 10).map((s) => ({
            value: String(s?.value ?? ''),
            label: String(s?.label ?? ''),
          }))
        : [],
    };

    updateHero(next);
    toast.success('Konten Hero tersimpan');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-sm uppercase tracking-widest text-amber-300/80">Edit Hiburan Berkualitas</div>
        <div className="text-purple-200/80 text-sm mt-2">
          Update headline, deskripsi layanan, CTA, dan statistik yang tampil di Hero.
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-amber-300 text-sm font-semibold">Headline</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Headline Top"
            value={working.headlineTop ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, headlineTop: v }))}
            placeholder="Hiburan"
          />
          <Input
            label="Headline Accent"
            value={working.headlineAccent ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, headlineAccent: v }))}
            placeholder="Berkualitas"
          />
          <Input
            label="Headline Bottom"
            value={working.headlineBottom ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, headlineBottom: v }))}
            placeholder="Momen"
          />
          <Input
            label="Headline Bottom Accent"
            value={working.headlineBottomAccent ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, headlineBottomAccent: v }))}
            placeholder="Tak Terlupakan"
          />
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-amber-300 text-sm font-semibold">Deskripsi Layanan</div>
        <div className="mt-4">
          <TextArea
            label="Deskripsi"
            value={working.description ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, description: v }))}
            placeholder="Gibrig Musik Entertainment menghadirkan musik live spektakuler untuk pernikahan, khitanan, ulang tahun, dan hajatan Anda..."
          />
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-amber-300 text-sm font-semibold">Hero Photo</div>
        <div className="text-purple-200/80 text-xs mt-2">
          Foto yang ditampilkan di lingkaran kanan pada section Hero.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <Input
            label="Hero Photo (URL/Data URL)"
            value={working.photo ?? ''}
            placeholder="https://...jpeg/png atau data URL"
            onChange={(v) => setWorking((p) => ({ ...p, photo: v }))}
          />
          <FileToDataUrl
            accept="image/*"
            label="Upload Hero Photo (langsung)"
            helpText="File disimpan sebagai data URL di localStorage (tanpa server)."
            onPick={(dataUrl) => {
              setWorking((p) => ({ ...p, photo: dataUrl }));
            }}
          />
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-amber-300 text-sm font-semibold">CTA</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="CTA Label"
            value={working.ctaLabel ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, ctaLabel: v }))}
            placeholder="Lihat Paket"
          />
          <Input
            label="CTA Href"
            value={working.ctaHref ?? ''}
            onChange={(v) => setWorking((p) => ({ ...p, ctaHref: v }))}
            placeholder="#paket"
          />
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-amber-300 text-sm font-semibold">Statistik Hero</div>
            <div className="text-purple-200/80 text-xs mt-1">
              3 item: (value + label). Di UI akan dipetakan per label.
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-4 py-2 text-xs font-semibold text-purple-200/90 hover:bg-white/15"
            onClick={() => {
              setWorking((p) => ({
                ...p,
                stats: [...(Array.isArray(p.stats) ? p.stats : []), { value: '', label: '' }],
              }));
            }}
          >
            <Plus size={14} className="mr-2" /> Tambah
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {(Array.isArray(working.stats) ? working.stats : []).slice(0, 10).map((s, idx) => (
            <div key={`${idx}-${s?.label || ''}`} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={`Value #${idx + 1}`}
                value={s.value ?? ''}
                onChange={(v) => {
                  setWorking((p) => {
                    const stats = Array.isArray(p.stats) ? [...p.stats] : [];
                    stats[idx] = { ...(stats[idx] || {}), value: v };
                    return { ...p, stats };
                  });
                }}
                placeholder="100+"
              />
              <Input
                label={`Label #${idx + 1}`}
                value={s.label ?? ''}
                onChange={(v) => {
                  setWorking((p) => {
                    const stats = Array.isArray(p.stats) ? [...p.stats] : [];
                    stats[idx] = { ...(stats[idx] || {}), label: v };
                    return { ...p, stats };
                  });
                }}
                placeholder="Acara Sukses"
              />

              <div className="sm:col-span-2 flex justify-end">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/20 px-4 py-2 text-red-200 hover:bg-red-500/30"
                  onClick={() => {
                    setWorking((p) => {
                      const stats = Array.isArray(p.stats) ? [...p.stats] : [];
                      stats.splice(idx, 1);
                      return { ...p, stats };
                    });
                  }}
                >
                  <Trash size={14} className="mr-2" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 font-semibold text-purple-950 hover:bg-amber-300"
          onClick={commit}
        >
          <Save size={16} className="mr-2" /> Simpan Hero
        </button>
      </div>
    </div>
  );
};

const ArtistAdminEditor = ({ social, artist, updateSocial, updateArtist, toast: toastFn }) => {


  const [formArtist, setFormArtist] = useState(artist || {});
  const [formSocial, setFormSocial] = useState(social || {});

  // state sementara untuk preview/textarea wrapping yang rapi
  // (handles panjang tetap tidak keluar area teks)


  useEffect(() => {
    setFormArtist(artist || {});
  }, [artist]);

  useEffect(() => {
    setFormSocial(social || {});
  }, [social]);

  const commit = () => {
    updateArtist({
      name: String(formArtist.name ?? ''),
      role: String(formArtist.role ?? ''),
      bio: String(formArtist.bio ?? ''),
      image: String(formArtist.image ?? ''),
      genres: Array.isArray(formArtist.genres) ? formArtist.genres : [],
    });
    updateSocial({
      tiktok: String(formSocial.tiktok ?? ''),
      youtube: String(formSocial.youtube ?? ''),
      instagram: String(formSocial.instagram ?? ''),
    });
    toastFn.success('Perubahan Artis & Social tersimpan');

  };

  return (
    <div className="space-y-4">
      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-sm uppercase tracking-widest text-amber-300/80">Edit Artis Utama</div>
        <div className="text-purple-200/80 text-sm mt-2">Ganti foto artis utama + role/bio/genres dan handles TikTok/YouTube/Instagram.</div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-amber-300 text-sm font-semibold">Data Artis</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nama Artis" value={formArtist.name ?? ''} placeholder="Nama artis..." onChange={(v) => setFormArtist((p) => ({ ...p, name: v }))} />
          <Input label="Role" value={formArtist.role ?? ''} placeholder="Artis Utama" onChange={(v) => setFormArtist((p) => ({ ...p, role: v }))} />

          <div className="sm:col-span-2 space-y-3">
            <Input
              label="Image Artis (URL/Data URL)"
              value={formArtist.image ?? ''}
              placeholder="https://...jpeg atau data URL"
              onChange={(v) => setFormArtist((p) => ({ ...p, image: v }))}
            />
            <FileToDataUrl
              accept="image/*"
              label="Upload Foto Artis (langsung)"
              helpText="File disimpan sebagai data URL di localStorage (tanpa server)."
              onPick={(dataUrl) => setFormArtist((p) => ({ ...p, image: dataUrl }))}
            />
          </div>

          <div className="sm:col-span-2">
            <TextArea label="Bio" value={formArtist.bio ?? ''} placeholder="Bio artis..." onChange={(v) => setFormArtist((p) => ({ ...p, bio: v }))} />
          </div>

          <div className="sm:col-span-2">
            <TextArea
              label="Genres (pisahkan pakai koma)"
              value={(Array.isArray(formArtist.genres) ? formArtist.genres : []).join(', ')}
              placeholder="Dangdut, Pop, Religi, Sunda"
              onChange={(v) => {
                const genres = v.split(',').map((t) => t.trim()).filter(Boolean);
                setFormArtist((p) => ({ ...p, genres }));
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="text-amber-300 text-sm font-semibold">Social (TikTok / YouTube / Instagram)</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="TikTok"
            value={formSocial.tiktok ?? ''}
            placeholder="@username"
            onChange={(v) => setFormSocial((p) => ({ ...p, tiktok: v }))}
          />
          <Input
            label="YouTube"
            value={formSocial.youtube ?? ''}
            placeholder="@channel"
            onChange={(v) => setFormSocial((p) => ({ ...p, youtube: v }))}
          />
          <Input
            label="Instagram"
            value={formSocial.instagram ?? ''}
            placeholder="@username"
            onChange={(v) => setFormSocial((p) => ({ ...p, instagram: v }))}
          />

          <div className="sm:col-span-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">
              Preview wrap handles
            </div>
            <div className="text-purple-200/80 text-xs leading-relaxed break-words">
              TikTok: {formSocial.tiktok}
              <br />
              YouTube: {formSocial.youtube}
              <br />
              Instagram: {formSocial.instagram}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 font-semibold text-purple-950 hover:bg-amber-300"
          onClick={commit}
        >
          <Save size={16} className="mr-2" /> Simpan Artis & Social
        </button>
      </div>
    </div>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState('header');

  const navigate = useNavigate();

  // NOTE: Admin panel di episode ini hanya untuk edit konten.
  // Tidak menampilkan tombol ganti password.


  const {
    config,
    updateBrand,
    updateFooter,
    updatePackages,
    updateGallery,
    updateTestimonials,
    updateSocial,
    updateArtist,
    setConfig,
  } = useSiteConfig();




  const [mockUser, setMockUser] = useState(null);

  // Local form state (supaya user bisa edit tanpa langsung commit ke storage)
  const [formBrand, setFormBrand] = useState(config.brand);
  const [formFooter, setFormFooter] = useState(config.footer);

  useEffect(() => {
    const token = localStorage.getItem('gibrig_admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    setMockUser({ token });
  }, [navigate]);

  useEffect(() => {
    setFormBrand(config.brand);
    setFormFooter(config.footer);
  }, [config.brand, config.footer]);

  const quickLinks = useMemo(() => {
    const list = Array.isArray(formFooter.quickLinks) ? formFooter.quickLinks : [];
    // Pastikan minimal 5 biar UI stabil (sesuai initial)
    const normalized = [...list];
    while (normalized.length < 5) normalized.push({ label: '', href: '' });
    return normalized.slice(0, 5);
  }, [formFooter.quickLinks]);

  const onSave = () => {
    // sanitize minimal
    const safeBrand = {
      name: String(formBrand.name ?? ''),
      subtitle: String(formBrand.subtitle ?? ''),
      tagline: String(formBrand.tagline ?? ''),
      phone: String(formBrand.phone ?? ''),
      phoneRaw: String(formBrand.phoneRaw ?? ''),
      address: String(formBrand.address ?? ''),
    };

    const safeFooter = {
      description: String(formFooter.description ?? ''),
      copyright: String(formFooter.copyright ?? ''),
      quickLinks: Array.isArray(formFooter.quickLinks)
        ? formFooter.quickLinks.slice(0, 5).map((l) => ({
            label: String(l?.label ?? ''),
            href: String(l?.href ?? ''),
          }))
        : quickLinks.map((l) => ({ label: String(l.label ?? ''), href: String(l.href ?? '') })),
    };

    updateBrand(safeBrand);
    updateFooter(safeFooter);
    toast.success('Perubahan header & footer tersimpan');
  };

  const onReset = () => {
    setConfig(initialSiteConfig);
    toast.success('Reset ke default berhasil');
  };

  const [formPackages, setFormPackages] = useState(Array.isArray(config.packages) ? config.packages : []);
  const [formGallery, setFormGallery] = useState(Array.isArray(config.gallery) ? config.gallery : []);
  const [formTestimonials, setFormTestimonials] = useState(
    Array.isArray(config.testimonials) ? config.testimonials : []
  );

  useEffect(() => {
    setFormPackages(Array.isArray(config.packages) ? config.packages : []);
    setFormGallery(Array.isArray(config.gallery) ? config.gallery : []);
    setFormTestimonials(Array.isArray(config.testimonials) ? config.testimonials : []);
  }, [config.packages, config.gallery, config.testimonials]);

  // sanitize untuk header/footer (dibutuhkan untuk onSaveAll)
  const safeBrand = {
    name: String(formBrand.name ?? ''),
    subtitle: String(formBrand.subtitle ?? ''),
    tagline: String(formBrand.tagline ?? ''),
    phone: String(formBrand.phone ?? ''),
    phoneRaw: String(formBrand.phoneRaw ?? ''),
    address: String(formBrand.address ?? ''),
  };

  const safeFooter = {
    description: String(formFooter.description ?? ''),
    copyright: String(formFooter.copyright ?? ''),
    quickLinks: Array.isArray(formFooter.quickLinks)
      ? formFooter.quickLinks.slice(0, 5).map((l) => ({
          label: String(l?.label ?? ''),
          href: String(l?.href ?? ''),
        }))
      : quickLinks.map((l) => ({ label: String(l.label ?? ''), href: String(l.href ?? '') })),
  };

  const onSaveAll = () => {
    updateBrand(safeBrand);
    updateFooter(safeFooter);
    updatePackages(formPackages);
    updateGallery(formGallery);
    updateTestimonials(formTestimonials);
    toast.success('Perubahan header/footer & konten tersimpan');
  };

  const onSaveHeaderFooterOnly = () => {
    updateBrand(safeBrand);
    updateFooter(safeFooter);
    toast.success('Perubahan header & footer tersimpan');
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-royal-dark to-purple-950 relative overflow-hidden text-black">

      <div className="absolute inset-0 grain" />
      <div className="orb bg-purple-500/40 w-[420px] h-[420px] -top-32 -left-24" />
      <div className="orb bg-amber-300/30 w-[360px] h-[360px] bottom-0 -right-24" />

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-300/90 text-xs uppercase tracking-[0.18em]">
              <Sparkles size={14} /> Admin Panel
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-4xl text-white">
              Edit <span className="font-italic-accent text-amber-300">Header</span> &{' '}
              <span className="font-italic-accent text-amber-300">Footer</span>
            </h1>
            <p className="text-purple-200/80 text-sm mt-2">
              Tema ungu, tidak polos. Pastikan bagian bertuliskan <b>Official Gibrig Entertainment</b> tetap ada.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-xs text-purple-200/80">
              <Lock size={14} />
              <span className="font-medium">{mockUser ? 'Login OK' : 'Memuat...'}</span>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 font-semibold text-purple-950 hover:bg-amber-300"
              onClick={() => {
                localStorage.removeItem('gibrig_admin_token');
                navigate('/admin/login');
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'header', label: 'Header/Footer' },
                { key: 'hero', label: 'Hero / Landing Copy' },
                { key: 'packages', label: 'Paket Musik' },
                { key: 'gallery', label: 'Galeri Momen' },
                { key: 'artist', label: 'Artis Utama' },
              ].map((t) => (

                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={
                    activeTab === t.key
                      ? 'inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 font-semibold text-purple-950'
                      : 'inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-2 font-semibold text-purple-200/90 hover:bg-white/15'
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'header' && (
              <>
                <section className="bg-white/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm uppercase tracking-widest text-amber-300/80 flex items-center gap-2">
                        <Crown size={16} className="text-amber-300" /> Header / Brand
                      </div>
                      <div className="text-purple-200/80 text-sm mt-2">
                        Konten yang muncul di navbar: nama, subtitle, tagline, dan kontak.
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nama Brand"
                      value={formBrand.name}
                      onChange={(v) => setFormBrand((p) => ({ ...p, name: v }))}
                      placeholder="Gibrig"
                    />
                    <Input
                      label="Subtitle"
                      value={formBrand.subtitle}
                      onChange={(v) => setFormBrand((p) => ({ ...p, subtitle: v }))}
                      placeholder="Entertainment"
                    />
                    <Input
                      label="Tagline (Official)"
                      value={formBrand.tagline}
                      onChange={(v) => setFormBrand((p) => ({ ...p, tagline: v }))}
                      placeholder="Official Gibrig Entertainment"
                    />
                    <Input
                      label="Phone Display"
                      value={formBrand.phone}
                      onChange={(v) => setFormBrand((p) => ({ ...p, phone: v }))}
                      placeholder="0855-2475-2102"
                      type="text"
                    />
                    <Input
                      label="Phone Raw (tanpa +)"
                      value={formBrand.phoneRaw}
                      onChange={(v) => setFormBrand((p) => ({ ...p, phoneRaw: v }))}
                      placeholder="6285524752102"
                      type="text"
                    />
                    <div className="sm:col-span-2">
                      <Input
                        label="Alamat"
                        value={formBrand.address}
                        onChange={(v) => setFormBrand((p) => ({ ...p, address: v }))}
                        placeholder="Kp Baranangsiang, ..."
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm uppercase tracking-widest text-amber-300/80">Footer / Tautan Cepat</div>
                      <div className="text-purple-200/80 text-sm mt-2">Deskripsi footer, copyright, dan Tautan Cepat (5 item).</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5">
                    <TextArea
                      label="Deskripsi Footer"
                      value={formFooter.description}
                      onChange={(v) => setFormFooter((p) => ({ ...p, description: v }))}
                      placeholder="Gibrig Entertainment menghadirkan ..."
                    />

                    <TextArea
                      label="Copyright"
                      value={formFooter.copyright}
                      onChange={(v) => setFormFooter((p) => ({ ...p, copyright: v }))}
                      placeholder="© 2026 Official Gibrig Entertainment..."
                    />

                    <div className="mt-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-3">Quick Links (5)</div>
                      <div className="space-y-3">
                        {quickLinks.map((l, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label={`Label #${idx + 1}`}
                              value={l.label}
                              onChange={(v) => {
                                const next = [...quickLinks];
                                next[idx] = { ...next[idx], label: v };
                                setFormFooter((p) => ({ ...p, quickLinks: next }));
                              }}
                              placeholder="Artis"
                            />
                            <Input
                              label={`Href #${idx + 1}`}
                              value={l.href}
                              onChange={(v) => {
                                const next = [...quickLinks];
                                next[idx] = { ...next[idx], href: v };
                                setFormFooter((p) => ({ ...p, quickLinks: next }));
                              }}
                              placeholder="#artis"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-3 font-semibold text-purple-100 hover:bg-white/15"
                    onClick={onReset}
                  >
                    <RefreshCcw size={16} className="mr-2" /> Reset ke Default
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/10 px-5 py-3 font-semibold text-purple-200/90 hover:bg-white/15"
                    onClick={() => navigate('/', { replace: true })}
                  >
                    Kembali ke Halaman Depan
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 font-semibold text-purple-950 hover:bg-amber-300"
                    onClick={() => {
                      onSave();
                      setTimeout(() => {
                        navigate('/', { replace: true });
                      }, 50);
                    }}
                  >
                    <Save size={16} className="mr-2" /> Simpan Perubahan
                  </button>
                </div>
              </>
            )}

            {activeTab === 'hero' && (
              <HeroAdminEditor
                formHero={config.hero}
                toast={toast}
                updateHero={(next) => setConfig((prev) => ({ ...prev, hero: next }))}
              />
            )}

            {activeTab === 'packages' && (
              <PackagesAdminEditor
                formPackages={formPackages}
                setFormPackages={setFormPackages}
                phoneRaw={config.brand.phoneRaw}
              />
            )}


            {activeTab === 'gallery' && (
              <GalleryAdminEditor formGallery={formGallery} setFormGallery={setFormGallery} />
            )}

            {activeTab === 'artist' && (
              <ArtistAdminEditor
                social={config.social}
                artist={config.artist}
                updateSocial={updateSocial}
                updateArtist={updateArtist}
                toast={toast}
              />
            )}
          </div>


          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
                <div className="text-sm uppercase tracking-widest text-amber-300/80 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-300" /> Preview Live
                </div>
                <div className="text-purple-200/80 text-sm mt-2">
                  Header & Footer akan mengikuti perubahan dari konfigurasi.
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Preview pakai komponen asli */}
                <Header />
                <div className="px-5 py-4 bg-gradient-to-b from-purple-950/30 to-transparent border-t border-white/10">
                  <div className="grid grid-cols-1 gap-2 text-xs text-purple-200/80">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-amber-300" /> {config.brand.phone}
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-amber-300 mt-0.5" />{' '}
                      <span>{config.brand.address}</span>
                    </div>
                    <div className="pt-1 text-purple-100/80">
                      Official: <span className="text-amber-300">{config.brand.tagline}</span>
                    </div>
                  </div>
                </div>
                <Footer />
              </div>

              <div className="bg-white/10 border border-white/10 rounded-2xl p-5 text-xs text-purple-200/80">
                <div className="text-amber-300/90 font-semibold mb-2">Catatan</div>
                <ul className="space-y-1">
                  <li>- Klik <b>Simpan Perubahan</b> agar tersimpan ke localStorage.</li>
                  <li>- Klik <b>Reset ke Default</b> untuk mengembalikan data ke awal.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;


