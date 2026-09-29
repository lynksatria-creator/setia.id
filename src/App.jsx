import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Auth from './pages/Auth';
import Blog, { articleSlug } from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import Pricing from './pages/Pricing';
import Templates, { createPreviewInvitation, slugify } from './pages/Templates';
import Dashboard from './pages/Dashboard';
import AdminBilling from './pages/AdminBilling';
import PublicInvitation from './pages/PublicInvitation';

const storage = {
  portal: 'portal-cms',
  gibrig: 'gibrig-cms',
  nunuy: 'nunuy-cms',
  invitation: 'invitation-cms',
};

const hashString = async (value) => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const loadData = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    return fallback;
  }
};

const saveData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const defaultPortalData = {
  siteName: 'Portal Iklan',
  logo: 'G',
  hero: {
    title: 'Rayakan momen penting dengan cerita yang terasa milik Anda.',
    subtitle:
      'Dari perencanaan pernikahan bersama Nunuy Nadhifa Wedding hingga undangan digital elegan dari Undangan.id, setiap detail dibuat lebih personal.',
    cta: 'Rencanakan Acara dengan Nunuy Nadhifa Wedding',
    secondary: 'Buat Undangan dengan Undangan.id',
    tertiary: 'Hiburan bersama Gibrig Entertainment',
  },
  services: [
    {
      name: 'GIBRIG ENTERTAINMENT',
      description: 'Jasa entertainment dan hiburan profesional untuk berbagai acara.',
      button: 'Kunjungi Website',
      href: '/gibrig',
      accent: '#8b5cf6',
    },
    {
      name: 'NUNUY NADHIFA WEDDING',
      description:
        'Wedding planner dan dekorasi personal untuk hari istimewa yang tertata indah dari awal hingga akhir.',
      button: 'Konsultasi Wedding',
      href: '/nunuy-nadhifa-wedding',
      accent: '#ec4899',
    },
    {
      name: 'UNDANGAN DIGITAL',
      description: 'Undangan online berdesain premium, lengkap dengan RSVP, peta lokasi, galeri, dan musik.',
      button: 'Lihat Undangan.id',
      href: '/undangan',
      accent: '#10b981',
    },
  ],
  gallery: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
  ],
  packages: [
    { name: 'Wedding Classic', price: 'Mulai Rp 18 Juta', features: ['Konsep dan dekorasi', 'Koordinator acara', 'Rundown yang tertata'], href: '/nunuy-nadhifa-wedding' },
    { name: 'Wedding Luxury', price: 'Mulai Rp 32 Juta', features: ['Styling venue premium', 'Fotografi dan live music', 'Perencanaan menyeluruh'], href: '/nunuy-nadhifa-wedding' },
    { name: 'Undangan Premium', price: 'Mulai Rp 99 Ribu', features: ['Template eksklusif', 'RSVP dan buku tamu', 'Link personal siap dibagikan'], href: '/undangan' },
  ],
  testimonials: [
    { name: 'Ayu & Rafi', text: 'Proses cepat, hasil premium, dan struktur website yang sangat rapi.' },
    { name: 'Mitra Event', text: 'Kolaborasi dengan admin panel membuat kami mudah update konten sendiri.' },
  ],
  faqs: [
    { q: 'Apakah bisa dibuat banyak website?', a: 'Ya, platform dirancang agar beberapa brand dapat berdiri sendiri.' },
    { q: 'Apakah admin bisa mengubah semua teks?', a: 'Ya, seluruh konten dapat diatur dari panel admin terpisah.' },
  ],
  contact: {
    phone: '+62 812-3456-7890',
    email: 'hello@portaliklan.com',
    address: 'Jakarta Selatan, Indonesia',
  },
  whatsapp: { number: '+6281234567890', message: 'Halo, saya tertarik dengan layanan portal iklan.' },
  socials: ['Instagram', 'TikTok', 'YouTube'],
  footer: '© 2026 Portal Iklan • Crafted for premium digital brands',
  theme: {
    primary: '#203f35',
    secondary: '#f6f0e7',
    accent: '#bd755d',
    background: '#fbf9f4',
    font: 'DM Sans',
  },
};

const defaultGibrigData = {
  siteName: 'Gibrig Entertainment',
  tagline: 'Menyatukan hiburan, kreativitas, dan energi panggung profesional.',
  hero: {
    title: 'Artist Performance & Entertainment Studio',
    subtitle: 'Panggung, artist, event, dan pengalaman hiburan yang memorable untuk setiap momen spesial.',
    cta: 'Booking Artist',
  },
  about: 'Gibrig Entertainment menghadirkan ekosistem hiburan modern dengan artis berbakat, crew profesional, dan pengalaman event yang elegan.',
  artists: [
    { name: 'Alya Nusa', category: 'Singer', description: 'Vocalist dengan performa stage yang energik.', price: 'Rp 3.5 Juta', active: true },
    { name: 'Nara Vibes', category: 'DJ', description: 'Musik dan mood dance yang berkesan untuk crowd modern.', price: 'Rp 4.2 Juta', active: true },
    { name: 'Rizki Pesta', category: 'MC', description: 'Host professional untuk acara formal dan casual.', price: 'Rp 2.8 Juta', active: true },
  ],
  packages: [
    { name: 'Wedding Package', price: 'Rp 5 Juta', description: 'Musik dan performer untuk acara pernikahan.' },
    { name: 'Corporate Event', price: 'Rp 8 Juta', description: 'MC, entertainment, dan stage support.' },
  ],
  testimonials: [
    { name: 'Sabrina', text: 'Semua artist hadir dengan profesionalitas tinggi dan penampilan luar biasa.' },
  ],
  contact: { phone: '+62 812-9988-8777', email: 'booking@gibrigentertainment.com' },
  whatsapp: { number: '+6281299888777', message: 'Halo, saya tertarik dengan layanan Gibrig Entertainment.' },
};

const defaultNunuyData = {
  siteName: 'Nunuy Nadhifa Wedding',
  hero: {
    title: 'Wedding Experience That Feels Like A Fairytale',
    subtitle: 'Luxury wedding planner, dekorasi, dan organizer yang memadukan elegansi dengan detail romantis.',
    cta: 'Book Consultation',
  },
  about: 'Kita membantu pasangan merancang momen pernikahan, dari konsep, dekorasi, hingga pengelolaan sesi acara.',
  packages: [
    { name: 'Classic Romance', price: 'Rp 18 Juta', description: 'Dekorasi, planner, dan koord event lengkap.', facilities: ['Dekorasi', 'MC', 'Koordinator'], duration: '1 hari', guests: '200 orang', status: 'Aktif' },
    { name: 'Luxury Garden', price: 'Rp 32 Juta', description: 'Tema outdoor premium dengan detail mewah.', facilities: ['Venue styling', 'Fotografi', 'Live music'], duration: '2 hari', guests: '300 orang', status: 'Aktif' },
  ],
  testimonials: [
    { name: 'Nadia & Reza', text: 'Acara kami terasa sangat elegan dan tertata dengan sempurna.' },
  ],
  contact: { phone: '+62 812-7788-1122', email: 'hello@nunuywedding.com' },
  whatsapp: { number: '+6281277881122', message: 'Halo, saya ingin konsultasi wedding.' },
};

const defaultInvitationData = {
  siteName: 'Undangan.id',
  hero: {
    title: 'Buat undangan digital premium yang elegan, modern, dan berkesan.',
    subtitle: 'Buat undangan yang tampil profesional, mudah dibagikan, dan siap menghadirkan momen spesial Anda dengan sentuhan elegan.',
    cta: 'Buat Undangan',
    secondary: 'Lihat Template',
  },
  templates: [
    { name: 'Luxury Gold', category: 'Pernikahan', description: 'Tema mewah dengan palet gold, bouquet, dan detail elegan yang berkesan.', active: true, palette: 'gold' },
    { name: 'Romantic Pink', category: 'Engagement', description: 'Desain lembut, romantis, dan memikat untuk momen istimewa Anda.', active: true, palette: 'pink' },
    { name: 'Modern Emerald', category: 'Aqiqah', description: 'Sentuhan modern dengan nuansa hijau yang tenang dan premium.', active: true, palette: 'emerald' },
    { name: 'Floral Champagne', category: 'Tasyakuran', description: 'Tema hangat dengan aesthetic floral yang cocok untuk event keluarga.', active: true, palette: 'champagne' },
    { name: 'Navy Luxe', category: 'Corporate Event', description: 'Desain formal, premium, dan cocok untuk acara institusi dengan gaya modern.', active: true, palette: 'navy' },
    { name: 'Lilac Romance', category: 'Lamaran', description: 'Nuansa lilac yang lembut dengan kombinasi elegan untuk moment spesial.', active: true, palette: 'lilac' },
  ],
  categories: ['Pernikahan', 'Khitanan', 'Ulang Tahun', 'Aqiqah', 'Tasyakuran', 'Anniversary', 'Engagement', 'Graduation', 'Event', 'Custom invitation'],
  demoItems: [
    { name: 'Wedding Classic', category: 'Pernikahan', label: 'Lihat Demo' },
    { name: 'Khitan Modern', category: 'Khitanan', label: 'Lihat Demo' },
    { name: 'Birthday Luxury', category: 'Ulang Tahun', label: 'Lihat Demo' },
    { name: 'Corporate Event', category: 'Event', label: 'Lihat Demo' },
  ],
  features: [
    { title: 'Custom Design', description: 'Pilih layout, warna, dan gaya sesuai tema acara Anda.' },
    { title: 'Countdown & RSVP', description: 'Tampilkan hitung mundur, pengunjung, dan konfirmasi kehadiran.' },
    { title: 'Gallery & Story', description: 'Sampaikan perjalanan cinta dan momen berharga dengan slideshow yang indah.' },
    { title: 'Music & Maps', description: 'Tambahkan musik, lokasi, dan fitur share yang praktis untuk tamu.' },
  ],
  pricingPlans: [
    { name: 'Basic', price: 'Rp 99.000', features: ['1 undangan aktif', 'Template dasar', 'RSVP', 'Buku tamu', 'Ucapan & doa'], highlight: false },
    { name: 'Premium', price: 'Rp 249.000', features: ['Semua fitur Basic', 'Template premium', 'Custom nama tamu', 'Statistik', 'QR code', 'Custom domain'], highlight: true },
    { name: 'Business', price: 'Rp 599.000', features: ['Bulk undangan', 'Bulk tamu', 'Bulk template', 'Statistik lengkap', 'Branding & API'], highlight: false },
  ],
  testimonials: [
    { name: 'Nadia & Farel', event: 'Pernikahan', rating: 5, quote: 'Undangannya sangat cantik dan mudah dibagikan ke keluarga. Fitur yang dibutuhkan semua ada.' },
    { name: 'Ayu', event: 'Khitanan', rating: 5, quote: 'Prosesnya gampang dan hasilnya premium. Sangat cocok untuk acara keluarga.' },
    { name: 'Rizky', event: 'Wisuda', rating: 5, quote: 'Saya suka karena semua fitur seperti RSVP, musik, sampai live location sudah terintegrasi.' },
  ],
  articles: [
    { title: 'Tips memilih template undangan digital yang sesuai tema acara', category: 'Design' },
    { title: 'Cara menambahkan musik dan gallery di undangan online', category: 'Feature' },
    { title: 'Panduan mengelola tamu dan RSVP dengan lebih efektif', category: 'Management' },
  ],
  faq: [
    { q: 'Apakah bisa custom isi acara?', a: 'Bisa, semua detail seperti tanggal, lokasi, musik, gallery, dan story dapat diubah sesuai kebutuhan.' },
    { q: 'Apakah template bisa diubah?', a: 'Tentu, Anda bisa mengganti tema, warna, font, dan layout secara fleksibel.' },
    { q: 'Apakah undangan bisa dibagikan ke WhatsApp?', a: 'Ya, setiap undangan memiliki link unik dan tombol share WhatsApp yang siap dipakai.' },
    { q: 'Apakah tersedia fitur login dan dashboard pengguna?', a: 'Ya, sistem ini didesain untuk user dashboard, admin dashboard, dan pengelolaan undangan yang lebih rapi.' },
  ],
};

const defaultAdmins = {
  admin: { username: 'admin', password: 'admin123' },
  gibrig: { username: 'gibrigadmin', password: 'gibrig123' },
  nunuy: { username: 'nunuyadmin', password: 'nunuy123' },
  invitation: { username: 'invitationadmin', password: 'invitation123' },
};

const themeLibrary = [
  { name: 'Luxury Gold', primary: '#c49a3d', secondary: '#f8efe1', accent: '#8c6a2b', background: '#fffaf5', font: 'Cormorant Garamond' },
  { name: 'Elegant Black', primary: '#111827', secondary: '#f3f4f6', accent: '#d1d5db', background: '#f8fafc', font: 'Poppins' },
  { name: 'Romantic Pink', primary: '#ec4899', secondary: '#fdf2f8', accent: '#be185d', background: '#fff7fb', font: 'Playfair Display' },
];

const navItems = [
  { label: 'Beranda', href: '#top' },
  { label: 'Wedding', href: '#brands' },
  { label: 'Galeri', href: '#gallery' },
  { label: 'Paket', href: '#packages' },
  { label: 'Kontak', href: '#contact' },
];

const formatPath = (path) => path || '/';

const useWindowPath = () => {
  const [path, setPath] = useState(formatPath(window.location.pathname));

  useEffect(() => {
    const handleChange = () => setPath(formatPath(window.location.pathname));
    window.addEventListener('popstate', handleChange);
    return () => window.removeEventListener('popstate', handleChange);
  }, []);

  return path;
};

const navigate = (path) => {
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
};

const openWhatsApp = (number, message) => {
  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
};

const getAuthStorageKey = (site) => `${site}-auth`;

const readCredentials = async (site) => {
  const config = loadData(getAuthStorageKey(site), { username: defaultAdmins[site].username, passwordHash: '' });
  if (!config.passwordHash) {
    const hashed = await hashString(defaultAdmins[site].password);
    config.passwordHash = hashed;
    saveData(getAuthStorageKey(site), config);
  }
  return config;
};

const AdminLogin = ({ site, label, onLogin, credentials }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const hashed = await hashString(password);
    if (username === credentials.username && hashed === credentials.passwordHash) {
      saveData(`${site}-session`, { loggedIn: true, username });
      onLogin();
      return;
    }
    setError('Username atau password salah.');
  };

  return (
    <div className="admin-shell">
      <div className="login-card">
        <div className="login-header">
          <span className="logo-mark">{label[0]}</span>
          <h2>{label}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

const AdminPanel = ({ site, label, dataKey, defaultData, customFields = [], description }) => {
  const [credentials, setCredentials] = useState({ username: defaultAdmins[site].username, passwordHash: '' });
  const [loggedIn, setLoggedIn] = useState(false);
  const [formData, setFormData] = useState(() => loadData(dataKey, defaultData));
  const [themeName, setThemeName] = useState('Luxury Gold');

  useEffect(() => {
    const loadCreds = async () => {
      const current = await readCredentials(site);
      setCredentials(current);
      setLoggedIn(Boolean(loadData(`${site}-session`, null)));
    };
    loadCreds();
  }, [site]);

  const updateField = (path, value) => {
    setFormData((prev) => {
      const next = structuredClone(prev);
      const parts = path.split('.');
      let cursor = next;
      for (let i = 0; i < parts.length - 1; i += 1) {
        cursor = cursor[parts[i]];
      }
      cursor[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const saveChanges = () => {
    saveData(dataKey, formData);
    alert('Perubahan berhasil disimpan.');
  };

  const saveDraft = () => {
    saveData(dataKey, formData);
    alert('Draft berhasil disimpan di perangkat ini.');
  };

  const preview = () => {
    const previewPaths = {
      admin: '/',
      gibrig: '/gibrig',
      nunuy: '/nunuy-nadhifa-wedding',
      invitation: '/undangan',
    };
    navigate(previewPaths[site] || '/');
  };

  const addTheme = () => {
    const nextTheme = {
      name: themeName || `Theme ${Date.now()}`,
      primary: '#111827',
      secondary: '#f3f4f6',
      accent: '#8b5cf6',
      background: '#ffffff',
      font: 'Poppins',
    };

    const existing = loadData(`${site}-themes`, themeLibrary);
    saveData(`${site}-themes`, [...existing, nextTheme]);
    setThemeName('');
    alert('Tema baru ditambahkan.');
  };

  const logout = () => {
    localStorage.removeItem(`${site}-session`);
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <AdminLogin site={site} label={label} onLogin={() => setLoggedIn(true)} credentials={credentials} />;
  }

  return (
    <div className="admin-shell admin-dashboard">
      <aside className="admin-sidebar">
        <div className="brand-box">{label}</div>
        <nav>
          <a href="#">Dashboard</a>
          <a href="#">Content</a>
          <a href="#">Theme</a>
          <a href="#">Media</a>
          <a href="#">SEO</a>
        </nav>
        <button className="logout-button" onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Admin Panel</p>
            <h1>{label}</h1>
          </div>
          <div className="admin-actions">
            <button className="ghost" onClick={saveDraft}>Save Draft</button>
            <button className="ghost" onClick={preview}>Preview</button>
            <button onClick={saveChanges}>Publish</button>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card"><span>Visitor</span><strong>12.4k</strong></div>
          <div className="stat-card"><span>Clicks</span><strong>8.7k</strong></div>
          <div className="stat-card"><span>Contacts</span><strong>240</strong></div>
          <div className="stat-card"><span>Inquiry</span><strong>96</strong></div>
        </section>

        <section className="admin-panel-block">
          <h3>Website Settings</h3>
          <p className="muted">{description}</p>
          <div className="form-grid">
            <label>
              Nama Website
              <input value={formData.siteName || ''} onChange={(event) => updateField('siteName', event.target.value)} />
            </label>
            <label>
              WhatsApp Number
              <input value={formData.whatsapp?.number || ''} onChange={(event) => updateField('whatsapp.number', event.target.value)} />
            </label>
            <label>
              Email
              <input value={formData.contact?.email || ''} onChange={(event) => updateField('contact.email', event.target.value)} />
            </label>
            <label>
              Phone
              <input value={formData.contact?.phone || ''} onChange={(event) => updateField('contact.phone', event.target.value)} />
            </label>
          </div>
        </section>

        {customFields.length ? (
          <section className="admin-panel-block">
            <h3>Content Editor</h3>
            <div className="form-grid">
              {customFields.map((field) => (
                <label key={field.label}>
                  {field.label}
                  <input value={field.value} onChange={(event) => field.onChange(event.target.value)} />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <section className="admin-panel-block">
          <h3>Theme Builder</h3>
          <div className="theme-builder-row">
            <input value={themeName} onChange={(event) => setThemeName(event.target.value)} placeholder="Nama tema" />
            <button onClick={addTheme}>Create Theme</button>
          </div>
          <div className="theme-preview-grid">
            {loadData(`${site}-themes`, themeLibrary).map((theme) => (
              <div key={theme.name} className="theme-swatch" style={{ background: theme.background, borderColor: theme.primary }}>
                <span style={{ background: theme.primary }} />
                <strong>{theme.name}</strong>
                <small>{theme.font}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel-block">
          <h3>Media Manager</h3>
          <div className="media-grid">
            <div className="media-card">Upload Logo</div>
            <div className="media-card">Upload Favicon</div>
            <div className="media-card">Upload Gallery</div>
            <div className="media-card">Upload Video</div>
          </div>
        </section>
      </main>
    </div>
  );
};

const PortalHome = () => {
  const portalData = useMemo(() => loadData(storage.portal, defaultPortalData), []);

  return (
    <div className="site-shell theme-portal">
      <header className="topbar portal-topbar">
        <div className="container nav-wrap portal-nav-wrap">
          <a className="brand portal-brand" href="#top"><span className="logo-mark">{portalData.logo}</span><span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span></a>
          <nav className="nav-links portal-nav-links" aria-label="Navigasi utama">
            {navItems.map((item) => (
              <a key={item.label} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <button className="portal-admin-button" onClick={() => navigate('/admin')}>Admin</button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section portal-hero">
          <div className="container hero-grid portal-hero-grid">
            <div className="portal-hero-copy">
              <p className="eyebrow">Wedding planning <span>·</span> Digital invitation</p>
              <h1>{portalData.hero.title}</h1>
              <p>{portalData.hero.subtitle}</p>
              <div className="cta-row">
                <button className="primary-btn" onClick={() => navigate('/nunuy-nadhifa-wedding')}>{portalData.hero.cta}</button>
                <button className="secondary-btn" onClick={() => navigate('/undangan')}>{portalData.hero.secondary}</button>
                <button className="secondary-btn portal-tertiary-btn" onClick={() => navigate('/gibrig')}>{portalData.hero.tertiary || 'Hiburan bersama Gibrig Entertainment'}</button>
              </div>
              <div className="portal-proofline"><span>Dirancang dengan personal</span><span>Siap dibagikan ke seluruh keluarga</span></div>
            </div>
            <div className="portal-hero-visual">
              <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=90" alt="Dekorasi pernikahan outdoor yang hangat dan elegan" />
              <div className="portal-hero-image-shade" />
              <div className="portal-photo-caption"><span>THE ART OF CELEBRATING</span><strong>Every detail, thoughtfully yours.</strong></div>
              <div className="portal-floating-note portal-note-top"><span>WEDDING PLANNER</span><strong>Nunuy Nadhifa</strong></div>
              <div className="portal-floating-note portal-note-bottom"><span>YOUR STORY, BEAUTIFULLY TOLD</span><strong>Undangan.id</strong></div>
              <span className="portal-image-index">01 <i /> 02</span>
            </div>
          </div>
          <div className="portal-hero-bottom container"><span>Wedding planning with heart</span><span>Digital invitations with meaning</span><span>Made for your once-in-a-lifetime day</span></div>
        </section>

        <section id="brands" className="section-wrap portal-brands-section">
          <div className="container">
            <div className="section-head portal-section-head">
              <p className="eyebrow">Momen berharga, detail istimewa</p>
              <h2>Tiga cara untuk merayakan<br />cerita yang paling berarti.</h2>
              <p className="portal-section-intro">Temukan tim yang tepat untuk merancang acara, membagikan kabarnya, dan menghadirkan hiburan yang tak terlupakan.</p>
            </div>
            <div className="service-grid portal-brand-grid">
              {portalData.services.map((service, index) => {
                const isWedding = service.href.includes('nunuy');
                const isInvitation = service.href.includes('undangan');
                const image = isWedding
                  ? 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85'
                  : isInvitation
                    ? 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=85'
                    : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85';
                const brandType = isWedding ? 'wedding' : isInvitation ? 'invitation' : 'gibrig';

                return (
                  <article key={service.name} className={`service-card portal-brand-card portal-brand-${brandType}`}>
                    <div className="portal-brand-photo">
                      <img src={image} alt={isWedding ? 'Pasangan merayakan hari pernikahan' : isInvitation ? 'Detail stationery untuk undangan pernikahan' : 'Panggung hiburan untuk sebuah perayaan'} loading="lazy" />
                      <span className="portal-brand-kicker">{isWedding ? 'WEDDING PLANNER & DECOR' : isInvitation ? 'DIGITAL INVITATION STUDIO' : 'ENTERTAINMENT & EVENT'}</span>
                    </div>
                    <div className="portal-brand-content">
                      <span className="portal-brand-number">0{index + 1} / 03</span>
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                      <button onClick={() => navigate(service.href)}>{service.button}<span aria-hidden="true">↗</span></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="gallery" className="section-wrap portal-gallery-section">
          <div className="container">
            <div className="section-head portal-gallery-head">
              <div><p className="eyebrow">Wedding journal</p><h2>Suasana yang ingin<br />Anda kenang selamanya.</h2></div>
              <p>Inspirasi untuk merangkai perayaan yang terasa hangat, intim, dan sepenuhnya milik Anda.</p>
            </div>
            <div className="gallery-grid portal-gallery-grid">
              {portalData.gallery.map((image, index) => (
                <figure key={index} className={`portal-gallery-item portal-gallery-item-${index + 1}`}>
                  <img src={image} alt={`Inspirasi momen pernikahan ${index + 1}`} loading="lazy" />
                  <figcaption>{['The ceremony', 'Little details', 'Together, always'][index % 3]}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="packages" className="section-wrap portal-packages-section">
          <div className="container">
            <div className="section-head portal-section-head">
              <p className="eyebrow">Mulai dari yang Anda butuhkan</p>
              <h2>Pilih pengalaman yang<br />paling sesuai untuk Anda.</h2>
            </div>
            <div className="pricing-grid portal-pricing-grid">
              {portalData.packages.map((pkg, index) => (
                <div key={pkg.name} className={`price-card portal-price-card portal-price-card-${index + 1}`}>
                  <span className="portal-package-index">0{index + 1}</span>
                  <h3>{pkg.name}</h3>
                  <strong>{pkg.price}</strong>
                  <ul>{pkg.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <button onClick={() => navigate(pkg.href || '/nunuy-nadhifa-wedding')}>{pkg.href === '/undangan' ? 'Pilih Undangan' : 'Konsultasi Paket'}<span aria-hidden="true">↗</span></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap portal-quote-section">
          <div className="container portal-quote-inner">
            <span className="portal-quote-mark">“</span>
            <p>Some days deserve to be remembered beautifully.</p>
            <span>— NUNUY NADHIFA WEDDING × UNDANGAN.ID</span>
          </div>
        </section>

        <section className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Testimoni</p>
              <h2>Klien yang puas</h2>
            </div>
            <div className="testimonial-grid">
              {portalData.testimonials.map((item) => (
                <blockquote key={item.name}>
                  “{item.text}”
                  <span>{item.name}</span>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap faq-section">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2>Pertanyaan umum</h2>
            </div>
            <div className="faq-list">
              {portalData.faqs.map((faq) => (
                <div key={faq.q} className="faq-item">
                  <h4>{faq.q}</h4>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="brand"><span className="logo-mark">{portalData.logo}</span>{portalData.siteName}</div>
            <p>{portalData.footer}</p>
          </div>
          <div>
            <h4>Kontak</h4>
            <p>{portalData.contact.phone}</p>
            <p>{portalData.contact.email}</p>
          </div>
          <div>
            <h4>Social</h4>
            <ul>
              {portalData.socials.map((social) => <li key={social}>{social}</li>)}
            </ul>
          </div>
          <div>
            <h4>WhatsApp</h4>
            <a href={`https://wa.me/${portalData.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(portalData.whatsapp.message)}`} target="_blank" rel="noreferrer">Chat sekarang</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const GibrigHome = () => {
  const data = useMemo(() => loadData(storage.gibrig, defaultGibrigData), []);

  return (
    <div className="site-shell gibrig-shell">
      <header className="topbar gibrig-topbar">
        <div className="container nav-wrap">
          <div className="brand"><span className="logo-mark">G</span>{data.siteName}</div>
          <nav className="nav-links">
            <a href="#about">About</a>
            <a href="#artists">Artist</a>
            <a href="#entertainment">Entertainment</a>
            <a href="#packages">Paket</a>
            <a href="#contact">Contact</a>
          </nav>
          <button className="primary-btn" onClick={() => navigate('/gibrig-admin')}>Admin</button>
        </div>
      </header>

      <main>
        <section className="hero-section hero-compact">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">Gibrig Entertainment</p>
              <h1>{data.hero.title}</h1>
              <p>{data.hero.subtitle}</p>
              <button className="primary-btn" onClick={() => openWhatsApp(data.whatsapp.number, data.whatsapp.message)}>{data.hero.cta}</button>
            </div>
            <div className="hero-visual gibrig-visual">
              <div className="hero-panel"><span>Artist</span><strong>Premium performance</strong></div>
            </div>
          </div>
        </section>

        <section id="about" className="section-wrap">
          <div className="container two-column">
            <div>
              <p className="eyebrow">About</p>
              <h2>Creative performance for every unforgettable moment</h2>
            </div>
            <p>{data.about}</p>
          </div>
        </section>

        <section id="artists" className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Artist</p>
              <h2>Talented performers</h2>
            </div>
            <div className="artist-grid">
              {data.artists.map((artist) => (
                <article key={artist.name} className="artist-card">
                  <div className="artist-avatar">{artist.name[0]}</div>
                  <h3>{artist.name}</h3>
                  <small>{artist.category}</small>
                  <p>{artist.description}</p>
                  <strong>{artist.price}</strong>
                  <button onClick={() => openWhatsApp(data.whatsapp.number, `${data.whatsapp.message} Saya tertarik booking ${artist.name}.`)}>Booking Inquiry</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="packages" className="section-wrap">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Paket</p>
              <h2>Event packages</h2>
            </div>
            <div className="pricing-grid">
              {data.packages.map((pkg) => (
                <div key={pkg.name} className="price-card">
                  <h3>{pkg.name}</h3>
                  <strong>{pkg.price}</strong>
                  <p>{pkg.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section-wrap">
          <div className="container contact-panel">
            <div>
              <p className="eyebrow">Contact</p>
              <h2>Let’s create your next event moment</h2>
            </div>
            <div>
              <p>{data.contact.phone}</p>
              <p>{data.contact.email}</p>
              <a href={`https://wa.me/${data.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(data.whatsapp.message)}`} target="_blank" rel="noreferrer">Chat WhatsApp</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const NunuyHome = () => {
  const data = useMemo(() => loadData(storage.nunuy, defaultNunuyData), []);

  return (
    <div className="site-shell nunuy-shell">
      <header className="topbar nunuy-topbar">
        <div className="container nav-wrap">
          <div className="brand"><span className="logo-mark">N</span>{data.siteName}</div>
          <nav className="nav-links">
            <a href="#about">About</a>
            <a href="#packages">Packages</a>
            <a href="#gallery">Gallery</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </nav>
          <button className="primary-btn" onClick={() => navigate('/nunuy-admin')}>Admin</button>
        </div>
      </header>

      <main>
        <section className="hero-section wedding-hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">Wedding Planner</p>
              <h1>{data.hero.title}</h1>
              <p>{data.hero.subtitle}</p>
              <button className="primary-btn" onClick={() => openWhatsApp(data.whatsapp.number, data.whatsapp.message)}>{data.hero.cta}</button>
            </div>
            <div className="hero-visual wedding-visual" />
          </div>
        </section>

        <section id="about" className="section-wrap">
          <div className="container two-column">
            <div>
              <p className="eyebrow">About</p>
              <h2>Elegant wedding moments designed specially for you</h2>
            </div>
            <p>{data.about}</p>
          </div>
        </section>

        <section id="packages" className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Wedding Packages</p>
              <h2>Choose your dream celebration</h2>
            </div>
            <div className="pricing-grid">
              {data.packages.map((pkg) => (
                <div key={pkg.name} className="price-card wedding-card">
                  <h3>{pkg.name}</h3>
                  <strong>{pkg.price}</strong>
                  <p>{pkg.description}</p>
                  <ul>
                    {pkg.facilities.map((facility) => <li key={facility}>{facility}</li>)}
                  </ul>
                  <button onClick={() => openWhatsApp(data.whatsapp.number, `${data.whatsapp.message} Saya tertarik dengan paket ${pkg.name}.`)}>WhatsApp</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section-wrap">
          <div className="container contact-panel">
            <div>
              <p className="eyebrow">Contact</p>
              <h2>Let’s plan your romantic day</h2>
            </div>
            <div>
              <p>{data.contact.phone}</p>
              <p>{data.contact.email}</p>
              <a href={`https://wa.me/${data.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(data.whatsapp.message)}`} target="_blank" rel="noreferrer">Chat WhatsApp</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const InvitationHome = () => {
  const data = useMemo(() => loadData(storage.invitation, defaultInvitationData), []);
  const openAuth = (mode) => navigate(`/undangan-auth?mode=${mode}`);

  return (
    <div className="site-shell invitation-shell">
      <Navbar
        siteName={data.siteName}
        onAdmin={() => navigate('/undangan-admin')}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
      />

      <main>
        <section className="hero-section invitation-hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">Platform undangan digital premium</p>
              <h1>{data.hero.title}</h1>
              <p>{data.hero.subtitle}</p>
              <div className="cta-row">
                <button className="primary-btn" onClick={() => openAuth('register')}>{data.hero.cta}</button>
                <button className="secondary-btn" onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}>{data.hero.secondary}</button>
              </div>
              <div className="hero-micro">
                <span>✓ Template premium</span>
                <span>✓ RSVP otomatis</span>
                <span>✓ Share WhatsApp</span>
              </div>
            </div>
            <div className="hero-visual invitation-visual">
              <div className="floating-card card-a">Wedding</div>
              <div className="floating-card card-b">Event</div>
              <div className="hero-panel">
                <span>Digital Invitation</span>
                <strong>Elegant • Modern • Custom</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="categories" className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Kategori</p>
              <h2>Pilih moment yang ingin Anda rayakan</h2>
            </div>
            <div className="category-grid">
              {data.categories.map((category) => (
                <span key={category} className="category-pill">{category}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap">
          <div className="container invite-why-grid">
            <div>
              <p className="eyebrow">Kenapa undangan.id</p>
              <h2>Semua kebutuhan undangan digital dalam satu platform</h2>
              <p>Mulai dari desain elegant, fitur RSVP, gallery, musik, countdown, hingga share ke WhatsApp dan Google Maps. Semua bisa dikelola dengan mudah.</p>
            </div>
            <div className="stats-stack">
              <div className="mini-stat"><strong>10k+</strong><span>Undangan dibuat</span></div>
              <div className="mini-stat"><strong>98%</strong><span>Pengguna puas</span></div>
              <div className="mini-stat"><strong>24/7</strong><span>Siap diakses</span></div>
            </div>
          </div>
        </section>

        <section className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Fitur utama</p>
              <h2>Desain yang memudahkan undangan Anda tampil lebih istimewa</h2>
            </div>
            <div className="feature-grid">
              {data.features.map((feature) => (
                <div key={feature.title} className="feature-card">
                  <div className="feature-icon">✦</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Templates templates={data.templates} demos={data.demoItems} />

        <Pricing plans={data.pricingPlans} onChoose={() => openAuth('register')} />

        <section className="section-wrap">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Apa kata mereka?</p>
              <h2>Testimonial pelanggan</h2>
            </div>
            <div className="testimonial-grid">
              {data.testimonials.map((item) => (
                <blockquote key={item.name} className="quote-card">
                  <div className="rating">{'★'.repeat(item.rating)}</div>
                  <p>“{item.quote}”</p>
                  <span>{item.name} · {item.event}</span>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap muted-bg">
          <div className="container auth-panel">
            <div>
              <p className="eyebrow">Login & Registrasi</p>
              <h2>Mulai membuat undangan Anda hari ini</h2>
              <p>Masuk ke dashboard untuk mengelola template, undangan, tamu, RSVP, dan statistik secara praktis.</p>
            </div>
            <div className="login-box">
              <button className="primary-btn" onClick={() => openAuth('register')}>Daftar Sekarang</button>
              <button className="secondary-btn" onClick={() => openAuth('login')}>Masuk</button>
            </div>
          </div>
        </section>

        <Blog articles={data.articles} onOpen={(slug) => navigate(`/undangan-blog/${slug}`)} />

        <section id="faq" className="section-wrap muted-bg">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2>Pertanyaan seputar undangan digital</h2>
            </div>
            <div className="faq-list">
              {data.faq.map((item) => (
                <div key={item.q} className="faq-item">
                  <h4>{item.q}</h4>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer siteName={data.siteName} />
    </div>
  );
};

function App() {
  const path = useWindowPath();

  if (path === '/undangan-auth') {
    return <Auth onBack={() => navigate('/undangan')} onSuccess={() => navigate('/undangan-dashboard')} />;
  }

  if (path === '/undangan-dashboard') return <Dashboard onSignIn={() => navigate('/undangan-auth?mode=login')} />;
  if (path === '/undangan-admin') return <AdminBilling />;
  if (path.startsWith('/i/')) return <PublicInvitation slug={path.slice(3)} />;

  if (path.startsWith('/undangan-blog/')) {
    const data = loadData(storage.invitation, defaultInvitationData);
    const slug = path.split('/').pop();
    return <BlogDetail articles={data.articles} slug={slug} onBack={() => navigate('/undangan')} />;
  }

  if (path.startsWith('/undangan-preview/')) {
    const templateSlug = path.slice('/undangan-preview/'.length);
    const template = defaultInvitationData.templates.find((item) => slugify(item.name) === templateSlug);
    if (template) return <PublicInvitation invitation={createPreviewInvitation(template)} slug={`demo-${templateSlug}`} />;
  }

  if (path === '/admin') {
    return (
      <AdminPanel
        site="admin"
        label="Portal Admin"
        dataKey={storage.portal}
        defaultData={defaultPortalData}
        description="Kelola website utama, layanan, galeri, paket, kontak, WhatsApp, sosial media, dan admin dashboard."
      />
    );
  }

  if (path === '/gibrig-admin') {
    return (
      <AdminPanel
        site="gibrig"
        label="Gibrig Admin"
        dataKey={storage.gibrig}
        defaultData={defaultGibrigData}
        description="Ubah isi utama Gibrig Entertainment, artist, event, testimonial, contact, SEO, dan media."
      />
    );
  }

  if (path === '/nunuy-admin') {
    return (
      <AdminPanel
        site="nunuy"
        label="Nunuy Admin"
        dataKey={storage.nunuy}
        defaultData={defaultNunuyData}
        description="Kelola wedding package, gallery, pricing, testimonials, FAQ, contact, logo, dan hero."
      />
    );
  }

  if (path === '/gibrig') return <GibrigHome />;
  if (path === '/nunuy-nadhifa-wedding') return <NunuyHome />;
  if (path === '/undangan') return <InvitationHome />;

  return <PortalHome />;
}

export default App;
