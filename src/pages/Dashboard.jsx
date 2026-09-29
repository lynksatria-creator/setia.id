import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { billingApi, invitationsApi, paymentsApi } from '../lib/api';
import PublicInvitation from './PublicInvitation';

const emptyForm = {
  title: '',
  plan_id: 'basic',
  slug: '',
  event_type: 'Pernikahan',
  template_id: 'luxury-gold',
  custom_design: false,
  custom_primary: '#294b3e',
  custom_accent: '#995c49',
  custom_background: '#f8f5ee',
  couple_names: '',
  honoree_name: '',
  cover_image: '',
  event_date: '',
  event_time: '',
  venue: '',
  address: '',
  maps_url: '',
  story: 'Cerita acara pernikahan',
  opening_text: 'Dengan penuh hati kami mengundang Anda untuk hadir di hari istimewa kami.',
  music_url: '',
  video_url: '',
  rsvp_url: '',
  gallery: '',
};

const invitationTemplates = [
  { id: 'luxury-gold', name: 'Royal Gold', category: 'Pernikahan', description: 'Hangat dan elegan', colors: ['#c49a3d', '#fffaf5'] },
  { id: 'royal-black-gold', name: 'Royal Black Gold', category: 'Pernikahan', description: 'Megah dan dramatis', colors: ['#111827', '#f5d98b'] },
  { id: 'luxury-maroon', name: 'Luxury Maroon', category: 'Pernikahan', description: 'Mewah dan berani', colors: ['#741f36', '#fff4f1'] },
  { id: 'classic-wedding', name: 'Classic Wedding', category: 'Pernikahan', description: 'Klasik dan timeless', colors: ['#8c7255', '#fffdf8'] },
  { id: 'elegant-white-gold', name: 'Elegant White Gold', category: 'Pernikahan', description: 'Bersih dan eksklusif', colors: ['#b28a45', '#ffffff'] },
  { id: 'rose-gold-romance', name: 'Rose Gold Romance', category: 'Pernikahan', description: 'Lembut dan romantis', colors: ['#b76e79', '#fff7f6'] },
  { id: 'emerald-royal', name: 'Emerald Royal', category: 'Pernikahan', description: 'Segar dan premium', colors: ['#18745b', '#f1faf5'] },
  { id: 'navy-royal', name: 'Navy Royal', category: 'Pernikahan', description: 'Formal dan megah', colors: ['#1e3a5f', '#f3f6fb'] },
  { id: 'garden-luxury', name: 'Garden Luxury', category: 'Pernikahan', description: 'Romantis dan natural', colors: ['#557463', '#f4f8f2'] },
  { id: 'floral-elegant', name: 'Floral Elegant', category: 'Pernikahan', description: 'Floral dan berkelas', colors: ['#a87945', '#fff8ed'] },
  { id: 'minimalist-luxury', name: 'Minimalist Luxury', category: 'Pernikahan', description: 'Sederhana dan premium', colors: ['#4b5563', '#f9fafb'] },
  { id: 'modern-black', name: 'Modern Black', category: 'Pernikahan', description: 'Tegas dan modern', colors: ['#111827', '#e5e7eb'] },
  { id: 'islamic-gold', name: 'Islamic Gold', category: 'Islami', description: 'Hangat dengan aksen gold', colors: ['#92733e', '#fffaf0'] },
  { id: 'islamic-emerald', name: 'Islamic Emerald', category: 'Islami', description: 'Teduh dan khidmat', colors: ['#166534', '#f0fdf4'] },
  { id: 'islamic-white', name: 'Islamic White', category: 'Islami', description: 'Putih dan tenang', colors: ['#64748b', '#ffffff'] },
  { id: 'islamic-maroon', name: 'Islamic Maroon', category: 'Islami', description: 'Anggun dan dalam', colors: ['#7f1d1d', '#fff7ed'] },
  { id: 'traditional-sunda', name: 'Traditional Sunda', category: 'Nusantara', description: 'Natural dan bersahaja', colors: ['#166534', '#ecfccb'] },
  { id: 'traditional-jawa', name: 'Traditional Jawa', category: 'Nusantara', description: 'Klasik dan hangat', colors: ['#78350f', '#fff7ed'] },
  { id: 'traditional-nusantara', name: 'Traditional Nusantara', category: 'Nusantara', description: 'Kaya budaya Indonesia', colors: ['#9a3412', '#fffbeb'] },
  { id: 'khitanan-royal', name: 'Khitanan Royal', category: 'Keluarga', description: 'Ceria dan meriah', colors: ['#0369a1', '#f0f9ff'] },
  { id: 'aqiqah-elegant', name: 'Aqiqah Elegant', category: 'Keluarga', description: 'Lembut dan hangat', colors: ['#0f766e', '#f0fdfa'] },
  { id: 'birthday-luxury', name: 'Birthday Luxury', category: 'Perayaan', description: 'Meriah dan eksklusif', colors: ['#be185d', '#fdf2f8'] },
  { id: 'birthday-kids', name: 'Birthday Kids', category: 'Perayaan', description: 'Ceria dan playful', colors: ['#2563eb', '#eff6ff'] },
  { id: 'graduation-gold', name: 'Graduation Gold', category: 'Pendidikan', description: 'Bangga dan berprestasi', colors: ['#a16207', '#fefce8'] },
  { id: 'anniversary', name: 'Anniversary', category: 'Perayaan', description: 'Romantis dan intim', colors: ['#9f1239', '#fff1f2'] },
  { id: 'engagement', name: 'Engagement', category: 'Pernikahan', description: 'Manis dan berkesan', colors: ['#be185d', '#fff7fb'] },
  { id: 'baby-shower', name: 'Baby Shower', category: 'Keluarga', description: 'Lembut dan penuh sukacita', colors: ['#0891b2', '#ecfeff'] },
  { id: 'tasyakuran', name: 'Tasyakuran', category: 'Keluarga', description: 'Syukur dan hangat', colors: ['#92400e', '#fffbeb'] },
  { id: 'corporate-event', name: 'Corporate / Event', category: 'Umum', description: 'Profesional dan modern', colors: ['#334155', '#f8fafc'] },
  { id: 'custom-premium', name: 'Custom Premium', category: 'Custom', description: 'Bebas dirancang sendiri', colors: ['#7c3aed', '#faf5ff'] },
];

const eventGroups = [
  { label: 'Pernikahan', options: ['Pernikahan', 'Akad Nikah', 'Resepsi', 'Akad & Resepsi', 'Lamaran', 'Tunangan', 'Walimatul Ursy', 'Anniversary'] },
  { label: 'Acara Islami & Keluarga', options: ['Aqiqah', 'Khitanan', 'Walimatul Khitan', 'Tasyakuran', 'Pengajian', 'Haul', 'Syukuran', 'Milad'] },
  { label: 'Anak & Pendidikan', options: ['Ulang Tahun Anak', 'Ulang Tahun Dewasa', 'Baby Shower', 'Gender Reveal', 'Wisuda', 'Kelulusan', 'Reuni'] },
  { label: 'Acara Umum', options: ['Gathering', 'Family Gathering', 'Halal Bihalal', 'Seminar', 'Workshop', 'Meeting', 'Grand Opening', 'Event', 'Acara Komunitas', 'Custom Event'] },
];

const weddingEventTypes = ['Pernikahan', 'Akad Nikah', 'Resepsi', 'Akad & Resepsi', 'Lamaran', 'Tunangan', 'Walimatul Ursy', 'Anniversary'];

const templateGroups = {
  Pernikahan: ['Pernikahan'],
  'Acara Islami & Keluarga': ['Islami', 'Keluarga'],
  'Anak & Pendidikan': ['Keluarga', 'Perayaan', 'Pendidikan'],
  'Acara Umum': ['Umum', 'Custom', 'Nusantara'],
};

const displayDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Belum aktif';

export default function Dashboard({ onSignIn }) {
  const { user, token, isChecking, logout } = useAuth();
  const [billing, setBilling] = useState({ plans: [], payment_methods: [] });
  const [invitations, setInvitations] = useState([]);
  const [previewInvitation, setPreviewInvitation] = useState(null);
  const [demoTemplate, setDemoTemplate] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupGroup, setSetupGroup] = useState('');
  const [setupEventType, setSetupEventType] = useState('');
  const [setupTemplateId, setSetupTemplateId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [activePayment, setActivePayment] = useState(null);
  const [transferReference, setTransferReference] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    Promise.all([billingApi.getConfig(), invitationsApi.list(token)])
      .then(([nextBilling, nextInvitations]) => {
        if (!active) return;
        setBilling(nextBilling);
        setInvitations(nextInvitations);
        setPaymentMethodId((current) => current || nextBilling.payment_methods[0]?.id || '');
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoading(false); });

    const paymentId = new URLSearchParams(window.location.search).get('payment');
    if (paymentId) {
      paymentsApi.get(token, paymentId)
        .then((payment) => { if (active) setActivePayment(payment); })
        .catch(() => {});
    }

    return () => { active = false; };
  }, [token]);

  const selectedPlan = billing.plans.find((plan) => plan.id === form.plan_id);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const refreshInvitations = async () => {
    setInvitations(await invitationsApi.list(token));
  };

  const resetForm = () => {
    setEditingId(null);
    setSetupComplete(false);
    setSetupGroup('');
    setSetupEventType('');
    setSetupTemplateId('');
    setForm({ ...emptyForm, plan_id: billing.plans[0]?.id || 'basic' });
  };

  const setupTemplates = setupGroup
    ? invitationTemplates.filter((template) => templateGroups[setupGroup]?.includes(template.category))
    : [];

  const beginInvitation = () => {
    if (!setupGroup || !setupEventType || !setupTemplateId) {
      setError('Pilih kelompok acara, jenis acara, dan template terlebih dahulu.');
      return;
    }
    setError('');
    setForm((current) => ({ ...current, event_type: setupEventType, template_id: setupTemplateId, custom_design: false }));
    setSetupComplete(true);
  };

  const editInvitation = (invitation) => {
    const content = invitation.content || {};
    const eventGroup = eventGroups.find((group) => group.options.includes(content.event_type || 'Pernikahan'))?.label || 'Pernikahan';
    setEditingId(invitation.id);
    setSetupComplete(true);
    setSetupGroup(eventGroup);
    setSetupEventType(content.event_type || 'Pernikahan');
    setSetupTemplateId(content.template_id || 'luxury-gold');
    setForm({
      ...emptyForm,
      title: invitation.title || '',
      plan_id: invitation.plan_id,
      slug: invitation.slug || '',
      event_type: content.event_type || 'Pernikahan',
      template_id: content.template_id || 'luxury-gold',
      custom_design: Boolean(content.custom_design),
      custom_primary: content.custom_primary || '#294b3e',
      custom_accent: content.custom_accent || '#995c49',
      custom_background: content.custom_background || '#f8f5ee',
      couple_names: content.couple_names || '',
      honoree_name: content.honoree_name || '',
      cover_image: content.cover_image || '',
      event_date: content.event_date || '',
      event_time: content.event_time || '',
      venue: content.venue || '',
      address: content.address || '',
      maps_url: content.maps_url || '',
      story: content.story || '',
      opening_text: content.opening_text || '',
      music_url: content.music_url || '',
      video_url: content.video_url || '',
      rsvp_url: content.rsvp_url || '',
      gallery: Array.isArray(content.gallery) ? content.gallery.join('\n') : '',
    });
    setError('');
    setMessage('Mode edit aktif. Simpan untuk menerapkan perubahan.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMusicUpload = (event) => {
    const [file] = event.target.files;
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Ukuran musik maksimal 8 MB. Gunakan URL musik untuk file yang lebih besar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField('music_url', reader.result);
      setMessage('Musik berhasil dimuat. Simpan draft untuk menerapkannya.');
    };
    reader.onerror = () => setError('File musik tidak dapat dibaca.');
    reader.readAsDataURL(file);
  };

  const readImageFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleCoverUpload = async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran foto sampul maksimal 5 MB.');
      return;
    }
    try {
      updateField('cover_image', await readImageFile(file));
      setMessage('Foto sampul berhasil dimuat. Simpan draft untuk menerapkannya.');
    } catch {
      setError('Foto sampul tidak dapat dibaca.');
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError('Setiap foto galeri maksimal 5 MB.');
      return;
    }
    try {
      const images = await Promise.all(files.map(readImageFile));
      updateField('gallery', [form.gallery, ...images].filter(Boolean).join('\n'));
      setMessage(`${images.length} foto galeri berhasil dimuat. Simpan draft untuk menerapkannya.`);
    } catch {
      setError('Sebagian foto galeri tidak dapat dibaca.');
    }
  };

  const saveInvitation = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);
    const content = {
      event_type: form.event_type,
      template_id: form.template_id,
      custom_design: form.custom_design,
      custom_primary: form.custom_primary,
      custom_accent: form.custom_accent,
      custom_background: form.custom_background,
      honoree_name: form.honoree_name,
      cover_image: form.cover_image,
      couple_names: form.couple_names,
      event_date: form.event_date,
      event_time: form.event_time,
      venue: form.venue,
      address: form.address,
      maps_url: form.maps_url,
      story: form.story,
      opening_text: form.opening_text,
      music_url: form.music_url,
      video_url: form.video_url,
      rsvp_url: form.rsvp_url,
      gallery: form.gallery.split('\n').map((url) => url.trim()).filter(Boolean),
    };
    const plan = billing.plans.find((item) => item.id === form.plan_id);
    const payload = { title: form.title, content };
    if (!editingId) {
      payload.plan_id = form.plan_id;
      if (plan?.slug_mode === 'custom') payload.slug = form.slug;
    } else if (plan?.slug_mode === 'custom') {
      payload.slug = form.slug;
    }

    try {
      const saved = editingId
        ? await invitationsApi.update(token, editingId, payload)
        : await invitationsApi.create(token, payload);
      await refreshInvitations();
      setEditingId(saved.id);
      setMessage(editingId ? 'Perubahan undangan tersimpan.' : 'Draft dibuat. Lanjutkan pembayaran untuk mengaktifkan masa tayang.');
      if (!editingId) setForm((current) => ({ ...current, slug: saved.slug }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const beginPayment = async (invitation) => {
    setError('');
    setMessage('');
    try {
      const payment = await paymentsApi.create(token, invitation.id, paymentMethodId);
      setActivePayment(payment);
      if (payment.redirect_url) window.location.assign(payment.redirect_url);
      else setMessage('Instruksi transfer siap. Setelah transfer, kirim referensi untuk verifikasi admin.');
      await refreshInvitations();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitReference = async () => {
    if (!activePayment || !transferReference.trim()) return;
    setError('');
    try {
      await paymentsApi.submitTransferReference(token, activePayment.id, transferReference.trim());
      setActivePayment({ ...activePayment, transfer_reference: transferReference.trim() });
      setMessage('Referensi transfer dikirim. Undangan akan aktif setelah pembayaran diverifikasi admin.');
      setTransferReference('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const publishInvitation = async (invitation) => {
    setError('');
    try {
      const result = await invitationsApi.publish(token, invitation.id);
      await refreshInvitations();
      setMessage(`Undangan aktif dan siap dibagikan: ${window.location.origin}${result.url}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (isChecking || isLoading) return <main className="account-page container"><p>Memuat dashboard…</p></main>;
  if (!user || !token) {
    return (
      <main className="account-page container account-locked">
        <p className="eyebrow">Dashboard Undangan.id</p>
        <h1>Masuk untuk mengelola undangan</h1>
        <button className="primary-btn" onClick={onSignIn}>Masuk / Daftar</button>
      </main>
    );
  }

  return (
    <main className="account-page">
      <header className="account-topbar">
        <a className="brand" href="/undangan"><span className="logo-mark">U</span>Undangan.id</a>
        <div><span>{user.full_name}</span><button onClick={() => { logout(); onSignIn(); }}>Keluar</button></div>
      </header>
      <div className="account-layout container">
        <section className="account-main-column">
          <div className="account-heading">
            <div><p className="eyebrow">Ruang undangan Anda</p><h1>Rancang cerita hari istimewa.</h1><p>Buat draft, edit detail acara, lalu aktifkan setelah pembayaran dikonfirmasi.</p></div>
          </div>

          {!setupComplete ? <section className="account-panel invitation-setup-panel">
            <div className="account-panel-heading"><div><span className="eyebrow">Langkah 1 dari 3</span><h2>Mulai rancangan undangan</h2></div></div>
            <p className="setup-intro">Pilih kelompok acara, jenis undangan, dan template agar form berikutnya menyesuaikan kebutuhan Anda.</p>
            <div className="setup-grid">
              <label>Kelompok acara<select value={setupGroup} onChange={(event) => { setSetupGroup(event.target.value); setSetupEventType(''); setSetupTemplateId(''); }}><option value="">Pilih kelompok</option>{eventGroups.map((group) => <option key={group.label} value={group.label}>{group.label}</option>)}</select></label>
              <label>Jenis acara<select value={setupEventType} disabled={!setupGroup} onChange={(event) => setSetupEventType(event.target.value)}><option value="">Pilih jenis acara</option>{eventGroups.find((group) => group.label === setupGroup)?.options.map((option) => <option key={option}>{option}</option>)}</select></label>
            </div>
            <div className="setup-template-section"><span className="form-label">Jenis template</span><div className="setup-template-grid">{setupTemplates.map((template) => <button type="button" key={template.id} className={`setup-template-card ${setupTemplateId === template.id ? 'selected' : ''}`} onClick={() => setSetupTemplateId(template.id)}><span className="template-choice-swatch" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }} /><strong>{template.name}</strong><small>{template.category}</small></button>)}</div></div>
            {setupGroup ? <p className="form-hint">Menampilkan {setupTemplates.length} template yang sesuai untuk kelompok {setupGroup}.</p> : null}
            <button className="primary-btn setup-continue-button" onClick={beginInvitation}>Lanjutkan ke isi data</button>
          </section> : <section className="account-panel invitation-editor-panel">
            <div className="account-panel-heading"><div><span className="eyebrow">{editingId ? 'Edit undangan' : 'Undangan baru'}</span><h2>{editingId ? 'Perbarui detail acara' : 'Mulai dengan detail acara'}</h2></div>{editingId ? <button className="text-button" onClick={resetForm}>Buat draft baru</button> : null}</div>
            <form className="invitation-editor-form" onSubmit={saveInvitation}>
              <label>Nama acara<input value={form.title} onChange={(event) => updateField('title', event.target.value)} required maxLength={120} placeholder="Pernikahan Aulia & Farhan" /></label>
              <label>Paket<select value={form.plan_id} disabled={Boolean(editingId)} onChange={(event) => updateField('plan_id', event.target.value)}>{billing.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · Rp {Number(plan.price).toLocaleString('id-ID')} · {plan.duration_days} hari</option>)}</select></label>
              {selectedPlan?.slug_mode === 'custom' ? <label>Link pilihan<input value={form.slug} onChange={(event) => updateField('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required minLength={3} maxLength={64} placeholder="aulia-farhan" /><small>URL publik: {window.location.host}/i/{form.slug || 'link-pilihan'}</small></label> : <p className="form-hint">Paket Basic memakai link otomatis setelah draft dibuat.</p>}
              <label>Undangan ini untuk acara apa?<select value={form.event_type} onChange={(event) => updateField('event_type', event.target.value)}>{eventGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((option) => <option key={option}>{option}</option>)}</optgroup>)}</select></label>
              <div className="template-picker-field">
                <span className="form-label">Pilih template</span>
                <div className="template-picker">
                  {invitationTemplates.map((template) => (
                    <article key={template.id} className={`template-choice ${form.template_id === template.id && !form.custom_design ? 'selected' : ''}`}>
                      <button type="button" className="template-choice-select" onClick={() => setForm((current) => ({ ...current, template_id: template.id, custom_design: false }))}>
                        <span className="template-choice-swatch" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }} />
                        <strong>{template.name}</strong>
                        <small>{template.category} · {template.description}</small>
                      </button>
                      <button type="button" className="template-demo-button" onClick={() => setDemoTemplate(template)}>Lihat Demo</button>
                    </article>
                  ))}
                  <button type="button" className={`template-choice template-choice-custom ${form.custom_design ? 'selected' : ''}`} onClick={() => updateField('custom_design', true)}>
                    <span className="template-choice-swatch custom-swatch" />
                    <strong>Buat desain sendiri</strong>
                    <small>Pilih warna sesuai tema Anda</small>
                  </button>
                </div>
                {demoTemplate ? <div className="template-demo-panel"><div><span className="template-choice-swatch" style={{ background: `linear-gradient(135deg, ${demoTemplate.colors[0]}, ${demoTemplate.colors[1]})` }} /><p className="eyebrow">{demoTemplate.category}</p><h3>{demoTemplate.name}</h3><p>{demoTemplate.description}. Template ini mencakup bingkai cover, nama, foto, informasi acara, galeri, RSVP, ucapan, dan penutup.</p></div><div><button type="button" className="secondary-btn" onClick={() => setDemoTemplate(null)}>Tutup Demo</button><button type="button" className="primary-btn" onClick={() => { setForm((current) => ({ ...current, template_id: demoTemplate.id, custom_design: false })); setDemoTemplate(null); }}>Gunakan Template</button></div></div> : null}
                {form.custom_design ? <div className="custom-design-fields"><label>Warna utama<input type="color" value={form.custom_primary} onChange={(event) => updateField('custom_primary', event.target.value)} /></label><label>Warna aksen<input type="color" value={form.custom_accent} onChange={(event) => updateField('custom_accent', event.target.value)} /></label><label>Warna latar<input type="color" value={form.custom_background} onChange={(event) => updateField('custom_background', event.target.value)} /></label></div> : null}
              </div>
              {weddingEventTypes.includes(form.event_type) ? <label>Nama pasangan<input value={form.couple_names} onChange={(event) => updateField('couple_names', event.target.value)} placeholder="Aulia & Farhan" /></label> : <label>Nama yang dirayakan<input value={form.honoree_name} onChange={(event) => updateField('honoree_name', event.target.value)} placeholder="Nama anak, keluarga, atau penyelenggara" /></label>}
              <div className="account-form-row"><label>Tanggal acara<input type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} /></label><label>Waktu acara<input type="time" value={form.event_time} onChange={(event) => updateField('event_time', event.target.value)} /></label></div>
              <label>Nama venue<input value={form.venue} onChange={(event) => updateField('venue', event.target.value)} placeholder="The Glass House" /></label>
              <label>Alamat<textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} rows={2} /></label>
              <label>Link Google Maps<input type="url" value={form.maps_url} onChange={(event) => updateField('maps_url', event.target.value)} placeholder="https://maps.google.com/..." /></label>
              <div className="media-upload-field"><label>Foto sampul<input type="file" accept="image/*" onChange={handleCoverUpload} /></label><label>Atau paste URL foto sampul<input type="url" value={form.cover_image.startsWith('data:') ? '' : form.cover_image} onChange={(event) => updateField('cover_image', event.target.value)} placeholder="https://..." /></label><small className="form-hint">Maksimal 5 MB untuk upload foto.</small></div>
              <label>Salam pembuka<textarea value={form.opening_text} onChange={(event) => updateField('opening_text', event.target.value)} rows={2} placeholder="Dengan penuh sukacita kami mengundang..." /></label>
              <label>Cerita acara<textarea value={form.story} onChange={(event) => updateField('story', event.target.value)} rows={4} /></label>
              <div className="music-input-field"><label>Link musik<input type="text" value={form.music_url.startsWith('data:') ? '' : form.music_url} onChange={(event) => updateField('music_url', event.target.value)} placeholder="https://..." /></label><label>Atau upload musik<input type="file" accept="audio/*" onChange={handleMusicUpload} /></label><small className="form-hint">Maksimal 8 MB untuk upload langsung. URL musik boleh ditempel sendiri.</small></div>
              <label>Link video prewedding<input type="url" value={form.video_url} onChange={(event) => updateField('video_url', event.target.value)} placeholder="YouTube, Vimeo, atau URL video langsung" /></label>
              <label>Link RSVP<input type="url" value={form.rsvp_url} onChange={(event) => updateField('rsvp_url', event.target.value)} placeholder="https://forms.google.com/..." /></label>
              <div className="media-upload-field"><label>Link galeri, satu URL per baris<textarea value={form.gallery} onChange={(event) => updateField('gallery', event.target.value)} rows={3} placeholder="https://foto-1.jpg\nhttps://foto-2.jpg" /></label><label>Atau upload foto galeri<input type="file" accept="image/*" multiple onChange={handleGalleryUpload} /></label><small className="form-hint">Pilih beberapa foto sekaligus. Maksimal 5 MB per foto.</small></div>
              <button className="primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan…' : editingId ? 'Simpan semua perubahan' : 'Simpan draft'}</button>
            </form>
          </section>}

          {activePayment?.manual_details ? (
            <section className="account-panel manual-payment-panel">
              <p className="eyebrow">Menunggu transfer</p><h2>{activePayment.manual_details.bank_name}</h2>
              <p>Nama rekening: <strong>{activePayment.manual_details.account_name}</strong></p>
              <p>Nomor rekening: <strong>{activePayment.manual_details.account_number}</strong></p>
              <p>Nominal: <strong>Rp {Number(activePayment.amount).toLocaleString('id-ID')}</strong></p>
              <p>{activePayment.manual_details.instructions}</p>
              <label>Referensi transfer<input value={transferReference} onChange={(event) => setTransferReference(event.target.value)} placeholder="Nomor referensi / berita transfer" /></label>
              <button className="primary-btn" onClick={submitReference} disabled={!transferReference.trim()}>Kirim untuk verifikasi</button>
            </section>
          ) : null}

          {message ? <p className="account-message" role="status">{message}</p> : null}
          {error ? <p className="form-error account-error" role="alert">{error}</p> : null}

          <section className="account-panel">
            <div className="account-panel-heading"><div><span className="eyebrow">Koleksi Anda</span><h2>Undangan dan masa aktif</h2></div><button className="text-button" onClick={() => refreshInvitations().catch((requestError) => setError(requestError.message))}>Muat ulang</button></div>
            {!invitations.length ? <p className="form-hint">Belum ada draft. Isi form di atas untuk memulai.</p> : (
              <div className="account-invitation-list">
                {invitations.map((invitation) => {
                  const plan = billing.plans.find((item) => item.id === invitation.plan_id);
                  const active = ['active', 'published'].includes(invitation.status) && new Date(invitation.active_until) > new Date();
                  return (
                    <article className="account-invitation-card" key={invitation.id}>
                      <div><span className={`status-label status-${invitation.status}`}>{invitation.status}</span><h3>{invitation.title}</h3><p>{plan?.name || invitation.plan_id} · aktif sampai {displayDate(invitation.active_until)}</p><p className="invitation-link-label">{active ? `${window.location.origin}/i/${invitation.slug}` : 'Link share terbuka setelah pembayaran dan publish.'}</p></div>
                      <div className="account-card-actions">
                        <button className="secondary-btn" onClick={() => setPreviewInvitation(invitation)}>Preview</button>
                        <button className="secondary-btn" onClick={() => editInvitation(invitation)}>Edit</button>
                        {active && invitation.status !== 'published' ? <button className="primary-btn" onClick={() => publishInvitation(invitation)}>Publish</button> : null}
                        {!active ? <>
                          <label className="payment-method-select">Metode<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}>{billing.payment_methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
                          <button className="primary-btn" disabled={!paymentMethodId} onClick={() => beginPayment(invitation)}>Bayar & aktifkan · Rp {Number(plan?.price || 0).toLocaleString('id-ID')}</button>
                        </> : null}
                        {invitation.status === 'published' ? <a className="secondary-btn invitation-share-button" href={`/i/${invitation.slug}`} target="_blank" rel="noreferrer">Buka link ↗</a> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {previewInvitation ? (
            <section className="account-panel invitation-preview-panel">
              <div className="account-panel-heading"><div><span className="eyebrow">Preview untuk calon undangan</span><h2>{previewInvitation.title}</h2></div><button className="text-button" onClick={() => setPreviewInvitation(null)}>Tutup preview</button></div>
              <div className="invitation-preview-viewport"><PublicInvitation invitation={previewInvitation} slug={previewInvitation.slug} /></div>
            </section>
          ) : null}
        </section>
        <aside className="account-side-column"><section className="account-panel"><span className="eyebrow">Pilihan paket</span><h2>Waktu tayang dan link mengikuti paket.</h2>{billing.plans.map((plan) => <div className="account-plan-row" key={plan.id}><strong>{plan.name}</strong><span>{plan.duration_days} hari</span><small>{plan.slug_mode === 'custom' ? 'Link pilihan' : 'Link otomatis'} · maks. {plan.max_invitations || 1} undangan</small><b>Rp {Number(plan.price).toLocaleString('id-ID')}</b></div>)}</section><p className="account-secure-note">Pembayaran gateway divalidasi server. Undangan tidak bisa dibagikan sebelum pembayaran terkonfirmasi.</p></aside>
      </div>
    </main>
  );
}
