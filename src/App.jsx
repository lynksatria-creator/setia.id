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
import SuperAdminHome from './pages/SuperAdminHome';
import PublicInvitation from './pages/PublicInvitation';
import GuestTicket from './pages/GuestTicket';
import SuperAdminNav from './components/SuperAdminNav';
import StructuredEditor from './components/StructuredEditor';
import { SUPER_ADMIN_SESSION_KEY } from './lib/adminSession';
import { advertisementsApi } from './lib/api';
import { createDefaultTheme, getThemeCatalog, themeStyle } from './lib/themeCatalog';

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

const mergeDataDefaults = (defaults, saved) => {
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) return saved ?? defaults;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [
    key,
    Object.hasOwn(saved, key) ? mergeDataDefaults(value, saved[key]) : structuredClone(value),
  ]));
};

const optimizeImageFile = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Ukuran gambar maksimum 12 MB.');
  if (typeof createImageBitmap !== 'function') throw new Error('Browser ini tidak mendukung pemrosesan gambar.');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Gambar tidak dapat diproses di browser ini.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) throw new Error('Gambar gagal dikompresi.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
    reader.readAsDataURL(blob);
  });
};

const defaultPortalData = {
  siteName: 'Portal.id',
  logo: 'P',
  logoImage: '',
  hero: {
    eyebrow: 'CREATIVE BRANDS · ONE PORTAL',
    title: 'Temukan partner terbaik untuk momen istimewa Anda.',
    subtitle: 'Wedding yang penuh makna, musik yang menghidupkan suasana, dan undangan digital yang merangkai cerita.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=90',
    cta: 'Jelajahi pilihan kami',
    imageAlt: 'Dekorasi pernikahan outdoor yang hangat dan elegan',
    tertiary: 'Hiburan bersama Gibrig Entertainment',
    secondary: 'Buat Undangan dengan Undangan.id',
  },
  services: [
    {
      name: 'NUNUY NADHIFA WEDDING',
      description: 'Wedding planner dan dekorasi personal untuk merancang hari istimewa yang terasa anggun, intim, dan penuh makna.',
      button: 'Konsultasi Wedding',
      href: '/nunuy-nadhifa-wedding',
      image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85',
      accent: '#ec4899',
      headingFont: 'Cormorant Garamond',
      bodyFont: 'DM Sans',
    },
    {
      name: 'Musik.id',
      description: 'Hadirkan musik dan hiburan yang dinamis untuk menciptakan suasana acara yang tak terlupakan.',
      button: 'Jelajahi Musik.id',
      href: '/gibrig',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
      accent: '#d09046',
      headingFont: 'Space Grotesk',
      bodyFont: 'DM Sans',
    },
    {
      name: 'Undangan.id',
      description: 'Undangan online minimalis dan mudah dibagikan, lengkap dengan RSVP, peta lokasi, galeri, dan musik.',
      button: 'Lihat Undangan.id',
      href: '/undangan',
      image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=85',
      accent: '#10b981',
      headingFont: 'DM Sans',
      bodyFont: 'DM Sans',
    },
  ],
  ads: {
    top: { enabled: true, label: 'PARTNER SPOTLIGHT', title: 'Ruang untuk brand Anda', image: '', href: '#contact' },
    midFeed: { enabled: true, label: 'FEATURED PARTNER', title: 'Buat momen Anda lebih istimewa', image: '', href: '/nunuy-nadhifa-wedding' },
    sidebar: { enabled: true, label: 'DIREKOMENDASIKAN', title: 'Cerita indah dimulai dari sini', image: '', href: '/undangan' },
    floatingBottom: { enabled: true, label: 'Punya acara dalam waktu dekat?', title: 'Mari rencanakan bersama', image: '', href: '/nunuy-nadhifa-wedding' },
  },
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
  footer: '© 2026 Portal.id • Tiga brand, satu cerita.',
  theme: {
    ...createDefaultTheme('admin'),
    primary: '#203f35',
    secondary: '#f6f0e7',
    accent: '#bd755d',
    background: '#fbf9f4',
    headingFont: 'Cormorant Garamond',
    bodyFont: 'DM Sans',
    radius: 12,
    spacing: 24,
    preset: 'soft-elegant-pastel',
    animations: true,
    animationDelay: 120,
    animationDuration: 650,
    elementAnimations: { hero: true, brandCards: true, ads: true },
    font: 'DM Sans',
  },
};

const defaultGibrigData = {
  siteName: 'Gibrig Entertainment',
  logo: 'G',
  logoImage: '',
  tagline: 'Official Gibrig Entertainment',
  hero: {
    eyebrow: 'Gibrig Entertainment',
    title: 'Hiburan Berkualitas, Momen Tak Terlupakan',
    subtitle: 'Gibrig Musik Entertainment menghadirkan musik live spektakuler untuk pernikahan, khitanan, ulang tahun, dan hajatan Anda — formasi lengkap, tim profesional, harga ramah lokasi.',
    cta: 'Lihat Paket',
    image: 'https://customer-assets.emergentagent.com/job_a90515ef-0030-4204-8c84-537c287d5958/artifacts/qw36c2aw_WhatsApp%20Image%202026-06-11%20at%2020.08.13.jpeg',
  },
  theme: createDefaultTheme('gibrig'),
  about: 'Gibrig Entertainment menghadirkan musik live spektakuler untuk pernikahan, khitanan, ulang tahun, dan hajatan Anda.',
  artists: [
    {
      name: 'Neng Syelfi Oktora',
      category: 'Artis Utama · Dangdut, Pop, Religi, Sunda',
      description: 'Dikenal lewat suara merdu dan interaksi hangat bersama tamu, ia mampu menghidupkan suasana setiap hajatan dari pembuka hingga puncak acara.',
      price: 'Menyesuaikan Lokasi',
      image: 'https://customer-assets.emergentagent.com/job_a90515ef-0030-4204-8c84-537c287d5958/artifacts/qw36c2aw_WhatsApp%20Image%202026-06-11%20at%2020.08.13.jpeg',
      active: true,
    },
  ],
  packages: [
    {
      name: 'Paket 1',
      label: 'Esensial',
      price: 'Menyesuaikan Lokasi',
      description: 'Pilihan ekonomis dengan formasi musik standar untuk acara intim.',
      image: 'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/5auam5gf_WhatsApp%20Image%202026-06-11%20at%2009.47.40.jpeg',
      items: ['Kendang', 'Melodi', 'Keyboard', 'MC', 'Singer 2 Orang', 'Soundsistem'],
    },
    {
      name: 'Paket 2',
      label: 'Populer',
      price: 'Menyesuaikan Lokasi',
      description: 'Formasi lengkap dengan kentrung & terompet untuk acara meriah.',
      image: 'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/ltv7hoqj_WhatsApp%20Image%202026-06-11%20at%2009.48.02.jpeg',
      items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'MC', 'Singer 2 Orang', 'Soundsistem'],
    },
    {
      name: 'Paket 3',
      label: 'Premium',
      price: 'Menyesuaikan Lokasi',
      description: 'Paket spesial dengan penampilan langsung Neng Syelfi Oktora.',
      image: 'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/acnkfdp2_WhatsApp%20Image%202026-06-11%20at%2009.48.20.jpeg',
      items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'Neng Syelfi Oktora', 'Singer 2 Orang', 'Soundsistem'],
    },
  ],
  testimonials: [
    { name: 'Ibu Ratna', event: 'Pernikahan · Garut', text: 'Suara Neng Syelfi merdu sekali, tamu undangan ikut joget semua. Tim sangat profesional dari awal sampai selesai.' },
    { name: 'Pak Asep', event: 'Khitanan · Cigedug', text: 'Sound system jernih, MC ramah, dan Paket 2 sangat cocok untuk acara khitanan anak saya. Recommended!' },
    { name: 'Teh Dewi', event: 'Hajatan · Sukahurip', text: 'Booking via WhatsApp gampang banget, hari H tampil tepat waktu, formasi lengkap. Pasti pakai lagi.' },
  ],
  gallery: [
    { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Pertunjukan live di panggung' },
    { src: 'https://images.pexels.com/photos/15865403/pexels-photo-15865403.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940', caption: 'Resepsi pernikahan elegan' },
    { src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Vokalis tampil di panggung' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Pengantin merayakan momen' },
    { src: 'https://images.unsplash.com/photo-1583939411023-14783179e581?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Tamu menari di acara' },
    { src: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Suasana panggung outdoor' },
  ],
  contact: {
    phone: '0855-2475-2102',
    email: '',
    address: 'Kp Baranangsiang, Ds Sukahurip, Kec Cigedug, Kab Garut',
  },
  social: {
    tiktok: '@neng_syelfi_oktora_2',
    youtube: '@nengsyelfioktora7310',
    instagram: '@nengsyelfiofficial',
  },
  footer: '© 2026 Official Gibrig Entertainment. All rights reserved.',
  whatsapp: { number: '6285524752102', message: 'Halo Gibrig Entertainment, saya ingin booking acara.' },
};

const defaultNunuyData = {
  siteName: 'Nunuy Nadhifa Wedding',
  logo: 'N',
  logoImage: '',
  hero: {
    title: 'Wedding Experience That Feels Like A Fairytale',
    subtitle: 'Luxury wedding planner, dekorasi, dan organizer yang memadukan elegansi dengan detail romantis.',
    cta: 'Book Consultation',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1500&q=85',
    eyebrow: 'Wedding Planner',
  },
  theme: createDefaultTheme('nunuy'),
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
  logo: 'U',
  logoImage: '',
  hero: {
    title: 'Buat undangan digital premium yang elegan, modern, dan berkesan.',
    subtitle: 'Buat undangan yang tampil profesional, mudah dibagikan, dan siap menghadirkan momen spesial Anda dengan sentuhan elegan.',
    cta: 'Buat Undangan',
    secondary: 'Lihat Template',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=85',
    eyebrow: 'Platform undangan digital premium',
  },
  theme: createDefaultTheme('invitation'),
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
  contact: { phone: '+62 812-3456-7890', email: 'hello@undangan.id' },
  whatsapp: { number: '+6281234567890', message: 'Halo, saya ingin bertanya tentang Undangan.id.' },
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

const portalPresets = [
  { id: 'glassmorphism-luxury', name: 'Glassmorphism Luxury', description: 'Kaca berlapis, pastel transparan, dan glow halus.' },
  { id: 'neumorphism-clean', name: 'Neumorphism Clean', description: 'Monokrom lembut dengan bayangan timbul dan inset.' },
  { id: 'cinematic-parallax', name: 'Cinematic Parallax', description: 'Visual sinematik dengan kedalaman dan reveal bertahap.' },
  { id: 'minimalist-monochromatic', name: 'Minimalist Monochromatic', description: 'Kontras hitam-putih, serif elegan, dan garis ekspansif.' },
  { id: 'neon-cyberpunk', name: 'Neon Cyberpunk / Dynamic Night', description: 'Mode gelap, garis neon berpendar, dan pulse.' },
  { id: 'soft-elegant-pastel', name: 'Soft Elegant Pastel', description: 'Nuansa champagne dan rose dengan zoom lembut.' },
  { id: 'fluid-liquid-gradient', name: 'Fluid Liquid Gradient', description: 'Gradient bergerak dengan elemen mengambang.' },
  { id: 'geometric-bauhaus', name: 'Geometric Bauhaus', description: 'Bidang warna tegas dan komposisi geometris.' },
  { id: 'retro-vintage-paper', name: 'Retro Vintage Paper', description: 'Tekstur kertas klasik dengan interaksi tilt.' },
  { id: 'modern-card-stacking', name: 'Modern Card Stacking', description: 'Card bertumpuk dengan efek flip dan depth.' },
  { id: 'split-screen-interactive', name: 'Split-Screen Interactive', description: 'Kolom brand melebar secara interaktif.' },
  { id: 'bento-grid-showcase', name: 'Bento Grid Showcase', description: 'Grid modular modern dengan scale-up.' },
  { id: 'dark-mode-obsidian', name: 'Dark Mode Obsidian', description: 'Hitam matte dengan shimmer metalik.' },
  { id: 'aurora-borealis-wave', name: 'Aurora Borealis Wave', description: 'Pendaran hijau-ungu bergerak perlahan.' },
  { id: 'floating-bubble-particles', name: 'Floating Bubble / Particles', description: 'Partikel lembut yang mengikuti gerak pointer.' },
  { id: 'isomorphic-3d-tilt', name: 'Isomorphic 3D Tilt', description: 'Card miring dan merespons pointer.' },
  { id: 'typographic-bold-focus', name: 'Typographic Bold Focus', description: 'Headline besar dengan ticker berjalan.' },
  { id: 'frosted-mesh-light', name: 'Frosted Mesh Light', description: 'Permukaan kristal dengan reveal blur.' },
  { id: 'interactive-spotlight', name: 'Interactive Spotlight', description: 'Sorotan warna mengikuti posisi pointer.' },
  { id: 'elastic-spring-motion', name: 'Elastic Spring Motion', description: 'Transisi antarmuka dengan gerak membal.' },
];

const navItems = [
  { label: 'Beranda', href: '#top' },
  { label: 'Wedding', href: '#brands' },
  { label: 'Galeri', href: '#gallery' },
  { label: 'Paket', href: '#packages' },
  { label: 'Kontak', href: '#contact' },
];

const formatPath = (path) => path || '/';

const normalizePortalData = (data) => {
  const saved = data && typeof data === 'object' ? data : {};
  const savedServices = Array.isArray(saved.services) ? saved.services : [];
  return {
    ...defaultPortalData,
    ...saved,
    hero: { ...defaultPortalData.hero, ...(saved.hero || {}) },
    services: defaultPortalData.services.map((service, index) => ({
      ...service,
      ...(savedServices.find((item) => item.href === service.href) || savedServices[index] || {}),
    })),
    ads: Object.fromEntries(Object.entries(defaultPortalData.ads).map(([key, value]) => [
      key,
      { ...value, ...(saved.ads?.[key] || {}) },
    ])),
    theme: {
      ...defaultPortalData.theme,
      ...(saved.theme || {}),
      elementAnimations: { ...defaultPortalData.theme.elementAnimations, ...(saved.theme?.elementAnimations || {}) },
    },
    contact: { ...defaultPortalData.contact, ...(saved.contact || {}) },
    whatsapp: { ...defaultPortalData.whatsapp, ...(saved.whatsapp || {}) },
    socials: Array.isArray(saved.socials) ? saved.socials : defaultPortalData.socials,
  };
};

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

const WhatsAppContact = ({ siteName, number, message }) => {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;

  return (
    <a
      className="whatsapp-contact-link"
      href={`https://wa.me/${digits}?text=${encodeURIComponent(message || '')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Hubungi ${siteName} via WhatsApp: ${number}`}
    >
      <strong>WhatsApp</strong>
      <span>{number}</span>
    </a>
  );
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

const AdminPanel = ({ site, label, dataKey, defaultData, customFields = [], description, superAdminAuthenticated = false, onSuperAdminLogout }) => {
  const [credentials, setCredentials] = useState({ username: defaultAdmins[site].username, passwordHash: '' });
  const [loggedIn, setLoggedIn] = useState(superAdminAuthenticated);
  const [formData, setFormData] = useState(() => site === 'admin'
    ? normalizePortalData(loadData(dataKey, defaultData))
    : mergeDataDefaults(defaultData, loadData(dataKey, defaultData)));
  const [themeName, setThemeName] = useState('Luxury Gold');
  const [configMessage, setConfigMessage] = useState('');
  const [customThemes, setCustomThemes] = useState(() => {
    const savedThemes = loadData(`${site}-themes`, []);
    return Array.isArray(savedThemes) ? savedThemes : [];
  });
  const [customThemeName, setCustomThemeName] = useState('');
  const [themeSearch, setThemeSearch] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const [editorError, setEditorError] = useState('');
  const themes = useMemo(() => [...getThemeCatalog(site), ...customThemes], [site, customThemes]);
  const filteredThemes = useMemo(() => themes.filter((theme) => theme.name.toLowerCase().includes(themeSearch.toLowerCase())), [themes, themeSearch]);

  useEffect(() => {
    const loadCreds = async () => {
      const current = await readCredentials(site);
      setCredentials(current);
      setLoggedIn(superAdminAuthenticated || Boolean(loadData(`${site}-session`, null)));
    };
    loadCreds();
  }, [site, superAdminAuthenticated]);

  const updateField = (path, value) => {
    setFormData((prev) => {
      const next = structuredClone(prev);
      let cursor = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        cursor = cursor[path[i]];
      }
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const saveChanges = () => {
    try {
      saveData(dataKey, formData);
      setEditorError('');
      setEditorMessage('Semua perubahan website berhasil dipublikasikan di browser ini.');
    } catch (error) {
      setEditorError(`Perubahan gagal disimpan: ${error.message}`);
    }
  };

  const saveDraft = () => {
    try {
      saveData(dataKey, formData);
      setEditorError('');
      setEditorMessage('Draft berhasil disimpan di browser ini.');
    } catch (error) {
      setEditorError(`Draft gagal disimpan: ${error.message}`);
    }
  };

  const exportPortalConfig = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'portal-id-config.json';
    link.click();
    window.URL.revokeObjectURL(url);
    setConfigMessage('Konfigurasi berhasil diekspor.');
  };

  const importPortalConfig = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = JSON.parse(await file.text());
      if (!imported || typeof imported !== 'object' || !imported.hero || !Array.isArray(imported.services) || imported.services.length !== 3 || !imported.theme || !imported.ads) {
        throw new Error('Format konfigurasi tidak sesuai. Pastikan file memiliki hero, 3 brand, theme, dan ads.');
      }
      setFormData(normalizePortalData(imported));
      setConfigMessage('Konfigurasi berhasil dimuat. Tekan Publish untuk menerapkannya.');
    } catch (error) {
      setConfigMessage(error instanceof SyntaxError ? 'File bukan JSON yang valid.' : error.message);
    } finally {
      event.target.value = '';
    }
  };

  const preview = () => {
    const previewPaths = {
      admin: '/',
      gibrig: '/gibrig',
      nunuy: '/nunuy-nadhifa-wedding',
      invitation: '/undangan',
    };
    try {
      saveData(dataKey, formData);
      navigate(previewPaths[site] || '/');
    } catch (error) {
      setEditorError(`Preview gagal disimpan: ${error.message}`);
    }
  };

  const saveCustomTheme = () => {
    if (!customThemeName.trim()) {
      setEditorError('Isi nama tema terlebih dahulu.');
      return;
    }
    const nextTheme = { ...formData.theme, id: `${site}-custom-${Date.now()}`, name: customThemeName.trim() };
    const nextThemes = [...customThemes, nextTheme];
    try {
      saveData(`${site}-themes`, nextThemes);
      setCustomThemes(nextThemes);
      setCustomThemeName('');
      setEditorError('');
      setEditorMessage('Tema kustom tersimpan untuk website ini.');
    } catch (error) {
      setEditorError(`Tema gagal disimpan: ${error.message}`);
    }
  };

  const handleImageUpload = async (path, file) => {
    if (!file) return;
    setEditorError('');
    try {
      const image = await optimizeImageFile(file);
      updateField(path, image);
      setEditorMessage('Gambar telah diproses. Tekan Publish agar perubahan tersimpan.');
    } catch (error) {
      setEditorError(error.message);
    }
  };

  const logout = () => {
    if (onSuperAdminLogout) {
      onSuperAdminLogout();
      return;
    }
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
        <button className="logout-button" onClick={logout}>{superAdminAuthenticated ? 'Keluar super admin' : 'Logout'}</button>
      </aside>

      <main className="admin-main">
        {superAdminAuthenticated ? <SuperAdminNav /> : null}
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

        {editorMessage ? <p className="admin-editor-message" role="status">{editorMessage}</p> : null}
        {editorError ? <p className="form-error admin-editor-error" role="alert">{editorError}</p> : null}

        <section className="stats-grid">
          <div className="stat-card"><span>Visitor</span><strong>12.4k</strong></div>
          <div className="stat-card"><span>Clicks</span><strong>8.7k</strong></div>
          <div className="stat-card"><span>Contacts</span><strong>240</strong></div>
          <div className="stat-card"><span>Inquiry</span><strong>96</strong></div>
        </section>

        <section className="admin-panel-block">
          <h3>Logo, gambar & tampilan</h3>
          <p className="muted">{description}</p>
          <div className="form-grid">
            <label>
              Nama Website
              <input value={formData.siteName || ''} onChange={(event) => updateField(['siteName'], event.target.value)} />
            </label>
            <label>Logo teks<input value={formData.logo || ''} onChange={(event) => updateField(['logo'], event.target.value)} /></label>
            <label>
              Alamat gambar logo
              <input value={formData.logoImage || ''} onChange={(event) => updateField(['logoImage'], event.target.value)} placeholder="https://..." />
            </label>
            <label>Upload gambar logo<input type="file" accept="image/*" onChange={(event) => handleImageUpload(['logoImage'], event.target.files?.[0])} /></label>
            <label>
              Gambar utama / hero
              <input value={formData.hero?.image || ''} onChange={(event) => updateField(['hero', 'image'], event.target.value)} placeholder="https://..." />
            </label>
            <label>Upload gambar hero<input type="file" accept="image/*" onChange={(event) => handleImageUpload(['hero', 'image'], event.target.files?.[0])} /></label>
            {formData.logoImage ? <div className="admin-media-preview"><span>Pratinjau logo</span><img src={formData.logoImage} alt="Pratinjau logo website" /></div> : null}
            {formData.hero?.image ? <div className="admin-media-preview admin-hero-preview"><span>Pratinjau hero</span><img src={formData.hero.image} alt="Pratinjau gambar utama website" /></div> : null}
          </div>
        </section>

        <section className="admin-panel-block">
          <h3>Nomor HP & WhatsApp</h3>
          <p className="muted">Atur nomor telepon dan nomor WhatsApp khusus untuk website ini. Nomor WhatsApp ditampilkan sebagai tombol kontak di website publik.</p>
          <div className="form-grid">
            <label>
              Nomor HP publik
              <input type="tel" value={formData.contact?.phone || ''} onChange={(event) => updateField(['contact', 'phone'], event.target.value)} placeholder="+62 812-3456-7890" />
            </label>
            {site === 'admin' ? (
              <>
                <label>Teks logo<input value={formData.logo || ''} onChange={(event) => updateField('logo', event.target.value)} /></label>
                <label>URL gambar logo<input value={formData.logoImage || ''} onChange={(event) => updateField('logoImage', event.target.value)} /></label>
              </>
            ) : null}
            <label>
              Nomor WhatsApp
              <input type="tel" value={formData.whatsapp?.number || ''} onChange={(event) => updateField(['whatsapp', 'number'], event.target.value)} placeholder="+62 812-3456-7890" />
            </label>
            <label>
              Pesan pembuka WhatsApp
              <input value={formData.whatsapp?.message || ''} onChange={(event) => updateField(['whatsapp', 'message'], event.target.value)} placeholder="Halo, saya ingin bertanya..." />
            </label>
          </div>
        </section>

        {site === 'admin' ? (
          <>
            <section className="admin-panel-block portal-cms-block">
              <div className="portal-admin-section-heading">
                <div>
                  <h3>Portal.id · Content Studio</h3>
                  <p className="muted">Kelola hero, tiga brand utama, materi visual, dan area iklan portal.</p>
                </div>
                <div className="portal-config-actions">
                  <button type="button" className="ghost" onClick={exportPortalConfig}>Ekspor JSON</button>
                  <label className="portal-import-button">Impor JSON<input type="file" accept="application/json,.json" onChange={importPortalConfig} /></label>
                </div>
              </div>
              {configMessage ? <p className="portal-config-message" role="status">{configMessage}</p> : null}
              <h4>Hero section</h4>
              <div className="form-grid">
                <label>Eyebrow<input value={formData.hero.eyebrow || ''} onChange={(event) => updateField('hero.eyebrow', event.target.value)} /></label>
                <label>Judul utama<input value={formData.hero.title || ''} onChange={(event) => updateField('hero.title', event.target.value)} /></label>
                <label className="portal-form-wide">Deskripsi<input value={formData.hero.subtitle || ''} onChange={(event) => updateField('hero.subtitle', event.target.value)} /></label>
                <label>CTA<input value={formData.hero.cta || ''} onChange={(event) => updateField('hero.cta', event.target.value)} /></label>
                <label>URL gambar hero<input value={formData.hero.image || ''} onChange={(event) => updateField('hero.image', event.target.value)} /></label>
              </div>
              <h4>Brand showcase · 3 kartu utama</h4>
              <div className="portal-admin-brand-list">
                {formData.services.map((service, index) => (
                  <fieldset className="portal-admin-brand" key={`${service.href}-${index}`}>
                    <legend>Brand 0{index + 1}</legend>
                    <div className="form-grid">
                      <label>Nama<input value={service.name || ''} onChange={(event) => updateField(`services.${index}.name`, event.target.value)} /></label>
                      <label>CTA<input value={service.button || ''} onChange={(event) => updateField(`services.${index}.button`, event.target.value)} /></label>
                      <label className="portal-form-wide">Deskripsi<input value={service.description || ''} onChange={(event) => updateField(`services.${index}.description`, event.target.value)} /></label>
                      <label>URL website<input value={service.href || ''} onChange={(event) => updateField(`services.${index}.href`, event.target.value)} /></label>
                      <label>URL gambar kartu<input value={service.image || ''} onChange={(event) => updateField(`services.${index}.image`, event.target.value)} /></label>
                      <label>Warna aksen<input type="color" value={service.accent || '#203f35'} onChange={(event) => updateField(`services.${index}.accent`, event.target.value)} /></label>
                      <label>Google Font · heading<input value={service.headingFont || ''} onChange={(event) => updateField(`services.${index}.headingFont`, event.target.value)} placeholder="Cormorant Garamond" /></label>
                      <label>Google Font · body<input value={service.bodyFont || ''} onChange={(event) => updateField(`services.${index}.bodyFont`, event.target.value)} placeholder="DM Sans" /></label>
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>

            <section className="admin-panel-block">
              <h3>Ad Slot Manager</h3>
              <p className="muted">Aktifkan, ubah materi, dan atur tautan setiap slot iklan.</p>
              <div className="portal-admin-ad-grid">
                {[
                  ['top', 'Top Banner'],
                  ['midFeed', 'Mid-Feed Banner'],
                  ['sidebar', 'Sidebar'],
                  ['floatingBottom', 'Floating Bottom'],
                ].map(([key, title]) => (
                  <fieldset className="portal-admin-ad" key={key}>
                    <legend>{title}</legend>
                    <label className="portal-checkbox-label"><input type="checkbox" checked={Boolean(formData.ads[key].enabled)} onChange={(event) => updateField(`ads.${key}.enabled`, event.target.checked)} /> Slot aktif</label>
                    <label>Label<input value={formData.ads[key].label || ''} onChange={(event) => updateField(`ads.${key}.label`, event.target.value)} /></label>
                    <label>Judul<input value={formData.ads[key].title || ''} onChange={(event) => updateField(`ads.${key}.title`, event.target.value)} /></label>
                    <label>URL gambar<input value={formData.ads[key].image || ''} onChange={(event) => updateField(`ads.${key}.image`, event.target.value)} /></label>
                    <label>URL tujuan<input value={formData.ads[key].href || ''} onChange={(event) => updateField(`ads.${key}.href`, event.target.value)} /></label>
                  </fieldset>
                ))}
              </div>
            </section>

            <section className="admin-panel-block">
              <h3>Preset, Theme & Motion</h3>
              <div className="form-grid portal-theme-controls">
                <label className="portal-form-wide">20 template preset
                  <select value={formData.theme.preset || portalPresets[5].id} onChange={(event) => updateField('theme.preset', event.target.value)}>
                    {portalPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} — {preset.description}</option>)}
                  </select>
                </label>
                <label>Warna utama<input type="color" value={formData.theme.primary || '#203f35'} onChange={(event) => updateField('theme.primary', event.target.value)} /></label>
                <label>Warna permukaan<input type="color" value={formData.theme.secondary || '#f6f0e7'} onChange={(event) => updateField('theme.secondary', event.target.value)} /></label>
                <label>Warna aksen<input type="color" value={formData.theme.accent || '#bd755d'} onChange={(event) => updateField('theme.accent', event.target.value)} /></label>
                <label>Warna latar<input type="color" value={formData.theme.background || '#fbf9f4'} onChange={(event) => updateField('theme.background', event.target.value)} /></label>
                <label>Google Font · heading<input value={formData.theme.headingFont || ''} onChange={(event) => updateField('theme.headingFont', event.target.value)} /></label>
                <label>Google Font · body<input value={formData.theme.bodyFont || ''} onChange={(event) => updateField('theme.bodyFont', event.target.value)} /></label>
                <label>Radius kartu (px)<input type="number" min="0" max="48" value={formData.theme.radius ?? 12} onChange={(event) => updateField('theme.radius', Number(event.target.value))} /></label>
                <label>Jarak grid (px)<input type="number" min="8" max="64" value={formData.theme.spacing ?? 24} onChange={(event) => updateField('theme.spacing', Number(event.target.value))} /></label>
                <label className="portal-checkbox-label"><input type="checkbox" checked={formData.theme.animations !== false} onChange={(event) => updateField('theme.animations', event.target.checked)} /> Animasi global aktif</label>
                <label className="portal-checkbox-label"><input type="checkbox" checked={formData.theme.elementAnimations?.hero !== false} onChange={(event) => updateField('theme.elementAnimations.hero', event.target.checked)} /> Animasi hero aktif</label>
                <label className="portal-checkbox-label"><input type="checkbox" checked={formData.theme.elementAnimations?.brandCards !== false} onChange={(event) => updateField('theme.elementAnimations.brandCards', event.target.checked)} /> Animasi kartu brand aktif</label>
                <label className="portal-checkbox-label"><input type="checkbox" checked={formData.theme.elementAnimations?.ads !== false} onChange={(event) => updateField('theme.elementAnimations.ads', event.target.checked)} /> Animasi slot iklan aktif</label>
                <label>Delay animasi (ms)<input type="number" min="0" max="2000" value={formData.theme.animationDelay ?? 120} onChange={(event) => updateField('theme.animationDelay', Number(event.target.value))} /></label>
                <label>Durasi animasi (ms)<input type="number" min="100" max="3000" value={formData.theme.animationDuration ?? 650} onChange={(event) => updateField('theme.animationDuration', Number(event.target.value))} /></label>
              </div>
              <div className="portal-preset-catalog">
                {portalPresets.map((preset, index) => (
                  <button type="button" key={preset.id} className={formData.theme.preset === preset.id ? 'portal-preset-chip is-selected' : 'portal-preset-chip'} onClick={() => {
                    const visualPreset = getThemeCatalog(site)[index * 5];
                    updateField(['theme'], { ...formData.theme, ...visualPreset, preset: preset.id });
                    setEditorMessage('Tema diterapkan. Klik Publish untuk mengubah tampilan website.');
                  }}>
                    <span>{String(index + 1).padStart(2, '0')}</span>{preset.name}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : null}

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
          <h3>Pengaturan semua konten</h3>
          <p className="muted">Edit teks, data kontak, daftar layanan, paket, FAQ, tema, ukuran, dan seluruh data website.</p>
          <StructuredEditor data={formData} onChange={updateField} />
          <div className="admin-custom-theme">
            <label>Nama tema kustom<input value={customThemeName} onChange={(event) => setCustomThemeName(event.target.value)} placeholder="Tema baru saya" /></label>
            <button type="button" className="secondary-btn" onClick={saveCustomTheme}>Simpan warna sebagai tema</button>
          </div>
        </section>

        <section className="admin-panel-block">
          <h3>100 template desain untuk {label.replace(' Admin', '')}</h3>
          <p className="muted">Template original dengan kombinasi layout, tipografi, warna, dan proporsi yang dapat diedit lagi setelah diterapkan.</p>
          <label className="theme-search-label">Cari template<input value={themeSearch} onChange={(event) => setThemeSearch(event.target.value)} placeholder="Cari gaya atau warna" /></label>
          <div className="theme-preview-grid admin-template-grid">
            {filteredThemes.map((theme) => (
              <article key={theme.id || theme.name} className="theme-swatch admin-template-card" style={{ background: theme.background, borderColor: theme.primary }}>
                <div className="admin-template-swatches">
                  {[theme.primary, theme.secondary, theme.accent, theme.background].map((color) => <span key={color} style={{ background: color }} />)}
                </div>
                <strong>{theme.name}</strong>
                <small>{theme.layout} · {theme.font}</small>
                <button type="button" onClick={() => updateField(['theme'], { ...theme })}>Terapkan template</button>
              </article>
            ))}
            {filteredThemes.length === 0 ? <p role="status">Template tidak ditemukan.</p> : null}
          </div>
          <p className="muted">{getThemeCatalog(site).length} template bawaan · {customThemes.length} tema kustom</p>
        </section>
      </main>
    </div>
  );
};

const LegacyPortalHome = () => {
  const portalData = useMemo(() => mergeDataDefaults(defaultPortalData, loadData(storage.portal, defaultPortalData)), []);

  return (
    <div className={`site-shell theme-portal theme-layout-${portalData.theme?.layout || 'editorial'} theme-preset-${portalData.theme?.preset || 'default'}`} style={themeStyle(portalData.theme)}>
      <header className="topbar portal-topbar">
        <div className="container nav-wrap portal-nav-wrap">
          <a className="brand portal-brand" href="#top">{portalData.logoImage ? <img className="site-logo-image" src={portalData.logoImage} alt={`${portalData.siteName} logo`} /> : <span className="logo-mark">{portalData.logo}</span>}<span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span></a>
          <nav className="nav-links portal-nav-links" aria-label="Navigasi utama">
            {navItems.map((item) => (
              <a key={item.label} href={item.href}>{item.label}</a>
            ))}
          </nav>
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
              <img src={portalData.hero.image} alt={portalData.hero.imageAlt || 'Gambar utama website'} />
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
            <div className="brand">{portalData.logoImage ? <img className="site-logo-image" src={portalData.logoImage} alt={`${portalData.siteName} logo`} /> : <span className="logo-mark">{portalData.logo}</span>}{portalData.siteName}</div>
            <p>{portalData.footer}</p>
          </div>
          <div>
            <h4>Kontak</h4>
            <p><a href={`tel:${String(portalData.contact.phone || '').replace(/[^\d+]/g, '')}`}>{portalData.contact.phone}</a></p>
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
            <a href={`https://wa.me/${portalData.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(portalData.whatsapp.message)}`} target="_blank" rel="noopener noreferrer">Chat sekarang</a>
          </div>
        </div>
      </footer>
      <WhatsAppContact siteName={portalData.siteName} number={portalData.whatsapp.number} message={portalData.whatsapp.message} />
    </div>
  );
};

const PortalHome = () => {
  const portalData = useMemo(() => normalizePortalData(loadData(storage.portal, defaultPortalData)), []);
  const { theme } = portalData;
  const portalStyle = {
    '--primary': theme.primary,
    '--accent': theme.accent,
    '--portal-surface': theme.secondary,
    '--portal-background': theme.background,
    '--portal-radius': `${theme.radius}px`,
    '--portal-gap': `${theme.spacing}px`,
    '--portal-heading-font': `'${theme.headingFont}', Georgia, serif`,
    '--portal-body-font': `'${theme.bodyFont}', sans-serif`,
    '--portal-animation-delay': `${theme.animationDelay}ms`,
    '--portal-animation-duration': `${theme.animationDuration}ms`,
  };

  useEffect(() => {
    const fonts = [...new Set([
      theme.headingFont,
      theme.bodyFont,
      ...portalData.services.flatMap((service) => [service.headingFont, service.bodyFont]),
    ].filter((font) => typeof font === 'string' && font.trim()))];
    if (!fonts.length) return;
    const fontLink = document.getElementById('portal-google-fonts') || document.createElement('link');
    fontLink.id = 'portal-google-fonts';
    fontLink.rel = 'stylesheet';
    fontLink.href = `https://fonts.googleapis.com/css2?${fonts.map((font) => `family=${encodeURIComponent(font.trim()).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap`;
    if (!fontLink.parentNode) document.head.appendChild(fontLink);
  }, [theme.headingFont, theme.bodyFont, portalData.services]);

  const openLink = (href) => {
    if (href?.startsWith('/')) navigate(href);
    else if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  const renderAd = (key, className) => {
    const slot = portalData.ads[key];
    if (!slot?.enabled) return null;
    return (
      <a className={`portal-ad-slot ${className}`} href={slot.href || '#contact'} onClick={(event) => {
        if (slot.href?.startsWith('/')) {
          event.preventDefault();
          navigate(slot.href);
        }
      }}>
        {slot.image ? <img src={slot.image} alt="" loading="lazy" /> : null}
        <span className="portal-ad-copy">
          <small>{slot.label}</small>
          <strong>{slot.title}</strong>
          <span className="portal-ad-cta">Pelajari lebih lanjut <span aria-hidden="true">↗</span></span>
        </span>
        <span className="portal-ad-badge">IKLAN</span>
      </a>
    );
  };

  const presetClass = `portal-preset-${(theme.preset || portalPresets[5].id).replace(/[^a-z0-9-]/g, '')}`;

  const trackSpotlight = (event) => {
    if (!event.currentTarget.classList.contains('portal-preset-interactive-spotlight') && !event.currentTarget.classList.contains('portal-preset-floating-bubble-particles')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
  };

  return (
    <div className={`site-shell theme-portal portal-home ${presetClass} ${theme.animations === false ? 'portal-motion-off' : ''} ${theme.elementAnimations?.hero === false ? 'portal-hero-motion-off' : ''} ${theme.elementAnimations?.brandCards === false ? 'portal-card-motion-off' : ''} ${theme.elementAnimations?.ads === false ? 'portal-ad-motion-off' : ''}`} style={portalStyle} data-preset={theme.preset} onMouseMove={trackSpotlight}>
      <header className="topbar portal-topbar">
        <div className="container nav-wrap portal-nav-wrap">
          <a className="brand portal-brand" href="#top">
            <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span>
            <span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span>
          </a>
          <nav className="nav-links portal-nav-links" aria-label="Navigasi utama">
            <a href="#brands">Brand</a>
            <a href="#advertise">Beriklan</a>
            <a href="#contact">Kontak</a>
          </nav>
        </div>
      </header>

      {renderAd('top', 'portal-ad-top')}

      <main id="top">
        <section className="portal-home-hero">
          <div className="container portal-home-hero-grid">
            <div className="portal-home-hero-copy">
              <p className="eyebrow">{portalData.hero.eyebrow}</p>
              <h1>{portalData.hero.title}</h1>
              <p className="portal-home-hero-description">{portalData.hero.subtitle}</p>
              <button className="primary-btn" onClick={() => document.getElementById('brands')?.scrollIntoView({ behavior: 'smooth' })}>{portalData.hero.cta}<span aria-hidden="true"> ↓</span></button>
              <div className="portal-hero-links" aria-label="Kunjungi website utama">
                {portalData.services.map((service) => (
                  <button key={service.href} onClick={() => openLink(service.href)}>{service.name}<span aria-hidden="true">↗</span></button>
                ))}
              </div>
            </div>
            <div className="portal-home-hero-image">
              <img src={portalData.hero.image} alt="Momen perayaan yang dirancang dengan indah" />
              <span>PORTAL.ID · CURATED FOR YOUR MOMENTS</span>
            </div>
          </div>
        </section>

        <section id="brands" className="portal-home-brands">
          <div className="container">
            <div className="portal-home-section-heading">
              <p className="eyebrow">TIGA BRAND · SATU PORTAL</p>
              <h2>Semua yang Anda butuhkan<br />untuk sebuah perayaan.</h2>
              <p>Pilih partner yang tepat untuk merancang, menghidupkan, dan membagikan momen paling berarti.</p>
            </div>
            <div className="portal-showcase-grid">
              {portalData.services.map((service, index) => (
                <article className={`portal-showcase-card portal-showcase-card-${index + 1}`} key={`${service.name}-${index}`} style={{ '--brand-accent': service.accent, '--brand-heading-font': `'${service.headingFont}', Georgia, serif`, '--brand-body-font': `'${service.bodyFont}', sans-serif` }}>
                  <button className="portal-showcase-image" onClick={() => openLink(service.href)} aria-label={`Kunjungi ${service.name}`}>
                    <img src={service.image} alt={`Visual ${service.name}`} loading="lazy" />
                    <span>0{index + 1} / 03</span>
                  </button>
                  <div className="portal-showcase-copy">
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                    <button className="portal-showcase-link" onClick={() => openLink(service.href)}>{service.button}<span aria-hidden="true">↗</span></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {renderAd('midFeed', 'portal-ad-mid')}

        <section id="advertise" className="portal-advertise-section">
          <div className="container portal-advertise-layout">
            <div>
              <p className="eyebrow">ADVERTISE WITH US</p>
              <h2>Jangkau audiens yang merayakan momen penting.</h2>
              <p>Tempatkan brand Anda di ruang yang relevan untuk calon pengantin, keluarga, dan penyelenggara acara.</p>
            </div>
            {renderAd('sidebar', 'portal-ad-sidebar')}
          </div>
        </section>
      </main>

      <footer id="contact" className="portal-home-footer">
        <div className="container portal-footer-inner">
          <a className="brand portal-brand" href="#top">          <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span><span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span></a>
          <p>{portalData.footer}</p>
          <div><a href={`mailto:${portalData.contact.email}`}>{portalData.contact.email}</a><span>{portalData.contact.phone}</span></div>
        </div>
      </footer>

      {renderAd('floatingBottom', 'portal-ad-floating')}
      <WhatsAppContact siteName={portalData.siteName} number={portalData.whatsapp.number} message={portalData.whatsapp.message} />
    </div>
  );
};

const GibrigHome = () => {
  const data = useMemo(() => mergeDataDefaults(defaultGibrigData, loadData(storage.gibrig, defaultGibrigData)), []);

  return (
    <div className={`site-shell gibrig-shell theme-layout-${data.theme?.layout || 'editorial'} theme-preset-${data.theme?.preset || 'default'}`} style={themeStyle(data.theme)}>
      <header className="topbar gibrig-topbar">
        <div className="container nav-wrap">
          <div className="brand">{data.logoImage ? <img className="site-logo-image" src={data.logoImage} alt={`${data.siteName} logo`} /> : <span className="logo-mark">{data.logo || 'G'}</span>}{data.siteName}</div>
          <nav className="nav-links">
            <a href="/">Beranda</a>
            <a href="#about">About</a>
            <a href="#artists">Artist</a>
            <a href="#entertainment">Entertainment</a>
            <a href="#gallery">Galeri</a>
            <a href="#packages">Paket</a>
            <a href="#testimonials">Testimoni</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-section hero-compact">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">{data.hero.eyebrow || data.tagline}</p>
              <h1>{data.hero.title}</h1>
              <h2 className="gibrig-hero-subheading">Artist Performance &amp; Entertainment Studio</h2>
              <p>{data.hero.subtitle}</p>
              <button className="primary-btn" onClick={() => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' })}>{data.hero.cta}</button>
            </div>
            <div className="hero-visual gibrig-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.6)), url(${data.hero.image})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
              <img className="site-hero-image" src={data.hero.image} alt={`${data.siteName} performance`} />
              <div className="hero-panel"><span>{data.artists[0].category}</span><strong>{data.artists[0].name}</strong></div>
            </div>
          </div>
        </section>

        <section id="about" className="section-wrap">
          <div className="container two-column">
            <div>
              <p className="eyebrow">About</p>
              <h2>Hiburan live untuk setiap momen istimewa</h2>
            </div>
            <p>{data.about}</p>
          </div>
        </section>

        <section id="artists" className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Artist</p>
              <h2>Artis utama</h2>
            </div>
            <div className="artist-grid">
              {data.artists.map((artist) => (
                <article key={artist.name} className="artist-card">
                  {artist.image ? <img className="artist-avatar" src={artist.image} alt={artist.name} style={{ objectFit: 'cover' }} /> : <div className="artist-avatar">{artist.name[0]}</div>}
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
                  {pkg.image && <img src={pkg.image} alt={pkg.name} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />}
                  <h3>{pkg.name}</h3>
                  <strong>{pkg.price}</strong>
                  <p>{pkg.description}</p>
                  {pkg.items && <ul>{pkg.items.map((item) => <li key={item}>{item}</li>)}</ul>}
                  <button onClick={() => openWhatsApp(data.whatsapp.number, `${data.whatsapp.message} Saya tertarik dengan ${pkg.name}.`)}>Tanya Paket</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="section-wrap muted-bg">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Galeri</p>
              <h2>Momen bersama Gibrig</h2>
            </div>
            <div className="portal-gallery-grid">
              {data.gallery.map((item, index) => (
                <figure key={item.src} className={`portal-gallery-item portal-gallery-item-${(index % 3) + 1}`}>
                  <img src={item.src} alt={item.caption} loading="lazy" />
                  <figcaption>{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="section-wrap">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Testimoni</p>
              <h2>Cerita dari keluarga dan klien</h2>
            </div>
            <div className="artist-grid">
              {data.testimonials.map((testimonial) => (
                <article key={testimonial.name} className="artist-card">
                  <strong>★★★★★</strong>
                  <h3>{testimonial.name}</h3>
                  <small>{testimonial.event}</small>
                  <p>{testimonial.text}</p>
                </article>
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
              <p><a href={`tel:${String(data.contact.phone || '').replace(/[^\d+]/g, '')}`}>{data.contact.phone}</a></p>
              <p>{data.contact.email}</p>
              <p>{data.contact.address}</p>
              <p>Instagram {data.socials?.[0] || ''} · TikTok {data.socials?.[1] || ''} · YouTube {data.socials?.[2] || ''}</p>
              <a href={`https://wa.me/${data.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(data.whatsapp.message)}`} target="_blank" rel="noopener noreferrer">Chat WhatsApp</a>
            </div>
          </div>
        </section>
      </main>
      <footer className="section-wrap"><div className="container"><p>{data.footer}</p></div></footer>
      <WhatsAppContact siteName={data.siteName} number={data.whatsapp.number} message={data.whatsapp.message} />
    </div>
  );
};

const NunuyHome = () => {
  const data = useMemo(() => mergeDataDefaults(defaultNunuyData, loadData(storage.nunuy, defaultNunuyData)), []);

  return (
    <div className={`site-shell nunuy-shell theme-layout-${data.theme?.layout || 'editorial'} theme-preset-${data.theme?.preset || 'default'}`} style={themeStyle(data.theme)}>
      <header className="topbar nunuy-topbar">
        <div className="container nav-wrap">
          <div className="brand">{data.logoImage ? <img className="site-logo-image" src={data.logoImage} alt={`${data.siteName} logo`} /> : <span className="logo-mark">{data.logo || 'N'}</span>}{data.siteName}</div>
          <nav className="nav-links">
            <a href="/">Beranda</a>
            <a href="#about">About</a>
            <a href="#packages">Packages</a>
            <a href="#gallery">Gallery</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-section wedding-hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">{data.hero.eyebrow}</p>
              <h1>{data.hero.title}</h1>
              <p>{data.hero.subtitle}</p>
              <button className="primary-btn" onClick={() => openWhatsApp(data.whatsapp.number, data.whatsapp.message)}>{data.hero.cta}</button>
            </div>
            <div className="hero-visual wedding-visual">
              <img className="site-hero-image" src={data.hero.image} alt={`${data.siteName} wedding`} />
            </div>
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
              <p><a href={`tel:${String(data.contact.phone || '').replace(/[^\d+]/g, '')}`}>{data.contact.phone}</a></p>
              <p>{data.contact.email}</p>
              <a href={`https://wa.me/${data.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(data.whatsapp.message)}`} target="_blank" rel="noopener noreferrer">Chat WhatsApp</a>
            </div>
          </div>
        </section>
      </main>
      <WhatsAppContact siteName={data.siteName} number={data.whatsapp.number} message={data.whatsapp.message} />
    </div>
  );
};

const InvitationHome = () => {
  const data = useMemo(() => mergeDataDefaults(defaultInvitationData, loadData(storage.invitation, defaultInvitationData)), []);
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsError, setAdvertisementsError] = useState('');
  const openAuth = (mode) => navigate(`/undangan-auth?mode=${mode}`);

  useEffect(() => {
    let active = true;
    advertisementsApi.listPublic()
      .then((items) => { if (active) setAdvertisements(items); })
      .catch((error) => { if (active) setAdvertisementsError(error.message); });
    return () => { active = false; };
  }, []);

  return (
    <div className={`site-shell invitation-shell theme-layout-${data.theme?.layout || 'editorial'} theme-preset-${data.theme?.preset || 'default'}`} style={themeStyle(data.theme)}>
      <Navbar
        siteName={data.siteName}
        logo={data.logo}
        logoImage={data.logoImage}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
      />

      <main>
        <section className="hero-section invitation-hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">{data.hero.eyebrow}</p>
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
              <img className="site-hero-image" src={data.hero.image} alt={`${data.siteName} undangan digital`} />
              <div className="floating-card card-a">Wedding</div>
              <div className="floating-card card-b">Event</div>
              <div className="hero-panel">
                <span>Digital Invitation</span>
                <strong>Elegant • Modern • Custom</strong>
              </div>
            </div>
          </div>
        </section>

        {(advertisements.length || advertisementsError) ? (
          <section className="section-wrap affiliate-advertisements" aria-labelledby="affiliate-advertisements-title">
            <div className="container">
              <div className="section-head">
                <p className="eyebrow">Rekomendasi partner</p>
                <h2 id="affiliate-advertisements-title">Pilihan dari mitra Undangan.id</h2>
              </div>
              {advertisementsError ? <p className="form-error" role="alert">Iklan mitra belum dapat dimuat: {advertisementsError}</p> : null}
              <div className="affiliate-advertisement-grid">
                {advertisements.map((advertisement) => (
                  <a
                    className="affiliate-advertisement-card"
                    href={advertisement.url}
                    key={advertisement.id}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {advertisement.image ? (
                      <div className="affiliate-advertisement-image">
                        <img src={advertisement.image} alt="" loading="lazy" />
                        <span>Rekomendasi mitra</span>
                      </div>
                    ) : null}
                    <div className="affiliate-advertisement-content">
                      <span className="affiliate-advertisement-advertiser">Iklan · {advertisement.advertiser}</span>
                      <h3>{advertisement.title}</h3>
                      <p>{advertisement.description}</p>
                      <span className="primary-btn affiliate-advertisement-cta">
                        Kunjungi website <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

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

        <Templates templates={data.templates} demos={data.demoItems} categories={data.categories} />

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

      <Footer
        siteName={data.siteName}
        phone={data.contact.phone}
        email={data.contact.email}
        whatsappNumber={data.whatsapp.number}
        whatsappMessage={data.whatsapp.message}
      />
      <WhatsAppContact siteName={data.siteName} number={data.whatsapp.number} message={data.whatsapp.message} />
    </div>
  );
};

function App() {
  const path = useWindowPath().replace(/\/+$/, '') || '/';
  const superAdminAuthenticated = Boolean(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY));
  const logoutSuperAdmin = () => {
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    navigate('/setia-creative-admin');
  };

  if (path === '/undangan-auth') {
    const requestedPath = new URLSearchParams(window.location.search).get('next');
    const dashboardPath = requestedPath?.startsWith('/undangan-dashboard') && !requestedPath.startsWith('//')
      ? requestedPath
      : '/undangan-dashboard';
    return <Auth onBack={() => navigate('/undangan')} onSuccess={() => navigate(dashboardPath)} />;
  }

  if (path === '/undangan-dashboard') {
    const requestedPath = `${window.location.pathname}${window.location.search}`;
    return <Dashboard onSignIn={() => navigate(`/undangan-auth?mode=login&next=${encodeURIComponent(requestedPath)}`)} />;
  }
  if (path.startsWith('/undangan-ticket/')) return <GuestTicket ticketToken={path.slice('/undangan-ticket/'.length)} />;
  if (path === '/setia-creative-admin') return <SuperAdminHome />;
  if (path === '/undangan-website-admin') {
    if (!superAdminAuthenticated) return <SuperAdminHome onLogin={() => navigate(path)} />;
    return (
      <AdminPanel
        site="invitation"
        label="Undangan.id Website Admin"
        dataKey={storage.invitation}
        defaultData={defaultInvitationData}
        description="Kelola konten website publik Undangan.id, nomor kontak, logo, hero, tema, template, dan media."
        superAdminAuthenticated
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }
  if (path === '/setia-creative-admin/billing' || path === '/undangan-admin') {
    return superAdminAuthenticated
      ? <AdminBilling onLogout={() => navigate('/setia-creative-admin')} />
      : <SuperAdminHome onLogin={() => navigate(path)} />;
  }
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

  if (path === '/portal-admin' || path === '/admin') {
    if (!superAdminAuthenticated) return <SuperAdminHome onLogin={() => navigate(path)} />;
    return (
      <AdminPanel
        site="admin"
        label="Portal Admin"
        dataKey={storage.portal}
        defaultData={defaultPortalData}
        description="Kelola website utama, layanan, galeri, paket, kontak, WhatsApp, sosial media, dan admin dashboard."
        superAdminAuthenticated
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }

  if (path === '/gibrig-admin') {
    if (!superAdminAuthenticated) return <SuperAdminHome onLogin={() => navigate(path)} />;
    return (
      <AdminPanel
        site="gibrig"
        label="Gibrig Admin"
        dataKey={storage.gibrig}
        defaultData={defaultGibrigData}
        description="Ubah isi utama Gibrig Entertainment, artist, event, testimonial, contact, SEO, dan media."
        superAdminAuthenticated
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }

  if (path === '/nunuy-admin') {
    if (!superAdminAuthenticated) return <SuperAdminHome onLogin={() => navigate(path)} />;
    return (
      <AdminPanel
        site="nunuy"
        label="Nunuy Admin"
        dataKey={storage.nunuy}
        defaultData={defaultNunuyData}
        description="Kelola wedding package, gallery, pricing, testimonials, FAQ, contact, logo, dan hero."
        superAdminAuthenticated
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }

  if (path === '/gibrig') return <GibrigHome />;
  if (path === '/nunuy-nadhifa-wedding') return <NunuyHome />;
  if (path === '/undangan') return <InvitationHome />;

  return <PortalHome />;
}

export default App;
