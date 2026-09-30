import React, { useState } from 'react';
import { Send, Phone } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';
import { toast } from 'sonner';

const Booking = () => {
  const { config } = useSiteConfig();
  const phone = config.brand.phoneRaw;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    eventType: '',
    eventDate: '',
    location: '',
    packageChoice: '',
    notes: '',
  });

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.eventType || !form.eventDate || !form.location || !form.packageChoice) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }
    const msg = `Halo Gibrig Entertainment, saya ingin booking acara.%0A%0A*Nama:* ${form.name}%0A*No. HP:* ${form.phone}%0A*Jenis Acara:* ${form.eventType}%0A*Tanggal:* ${form.eventDate}%0A*Lokasi:* ${form.location}%0A*Paket:* ${form.packageChoice}%0A*Catatan:* ${form.notes || '-'}`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    toast.success('Membuka WhatsApp...');
  };

  return (
    <section id="booking" className="relative py-20 md:py-28 bg-royal-alt overflow-hidden">
      <div className="absolute inset-0 pattern-dots opacity-40" />
      <div className="relative container-x">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <span className="w-10 h-px bg-amber-500" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
              Formulir Pemesanan
            </span>
            <span className="w-10 h-px bg-amber-500" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-purple-950 leading-[1.05]">
            Booking acara Anda <span className="font-italic-accent">sekarang</span>.
          </h2>
          <p className="mt-5 text-purple-900/75">
            Isi formulir di bawah, kami akan langsung membuka WhatsApp dengan pesan booking yang sudah lengkap.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-12 max-w-3xl mx-auto card-royal p-7 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nama Lengkap *">
              <input className="field-input input-royal" value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Nama Anda" />
            </Field>
            <Field label="No. HP / WhatsApp *">
              <input className="field-input input-royal" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="08xx-xxxx-xxxx" />
            </Field>
            <Field label="Jenis Acara *">
              <select className="field-input input-royal" value={form.eventType} onChange={(e) => onChange('eventType', e.target.value)}>
                <option value="">Pilih jenis acara</option>
                <option>Pernikahan</option>
                <option>Khitanan</option>
                <option>Ulang Tahun</option>
                <option>Hajatan</option>
                <option>Lainnya</option>
              </select>
            </Field>
            <Field label="Tanggal Acara *">
              <input type="date" className="field-input input-royal" value={form.eventDate} onChange={(e) => onChange('eventDate', e.target.value)} />
            </Field>
            <Field label="Lokasi Acara *" className="md:col-span-2">
              <input className="field-input input-royal" value={form.location} onChange={(e) => onChange('location', e.target.value)} placeholder="Alamat lengkap acara" />
            </Field>
            <Field label="Pilihan Paket *" className="md:col-span-2">
              <select className="field-input input-royal" value={form.packageChoice} onChange={(e) => onChange('packageChoice', e.target.value)}>
                <option value="">Pilih paket musik</option>
                <option>Paket 1 — Esensial</option>
                <option>Paket 2 — Populer</option>
                <option>Paket 3 — Premium</option>
              </select>
            </Field>
            <Field label="Catatan Tambahan" className="md:col-span-2">
              <textarea rows={4} className="field-input input-royal" value={form.notes} onChange={(e) => onChange('notes', e.target.value)} placeholder="Permintaan khusus, lagu request, dll." />
            </Field>
          </div>

          <div className="mt-7 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="text-sm text-purple-900/70 inline-flex items-center gap-2">
              <Phone size={14} className="text-amber-600" />
              Akan terhubung ke WhatsApp {config.brand.phone}
            </div>
            <button type="submit" className="btn-gold inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm">
              <Send size={15} />
              Kirim ke WhatsApp
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(76,29,149,0.15);
          background: rgba(255,255,255,0.9);
          color: #1a0d2e;
          font-size: 14px;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .field-input::placeholder { color: rgba(76,29,149,0.45); }
      `}</style>
    </section>
  );
};

const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold mb-2">{label}</div>
    {children}
  </label>
);

export default Booking;
