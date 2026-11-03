import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './pages/Gibrig.css';
import './pages/Invitation.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import InvitationUnderDevelopment from './pages/InvitationUnderDevelopment';
import Auth from './pages/Auth';
import Blog, { articleSlug } from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import Pricing from './pages/Pricing';
import Templates, { createPreviewInvitation, slugify } from './pages/Templates';
import Dashboard from './pages/Dashboard';
import AdminBilling from './pages/AdminBilling';
import SuperAdminHome from './pages/SuperAdminHome';
import SuperAdminSeo from './pages/SuperAdminSeo';
import PublicInvitation from './pages/PublicInvitation';
import GuestTicket from './pages/GuestTicket';
import NunuyWedding from './pages/NunuyWedding';
import NunuyConsultationAdmin from './components/NunuyConsultationAdmin';
import { PublicTestimonials, TestimonialModeration } from './components/PublicTestimonials';
import SuperAdminNav from './components/SuperAdminNav';
import SeoHead from './components/SeoHead';
import StructuredEditor from './components/StructuredEditor';
import { getAdminScope, SUPER_ADMIN_SESSION_KEY } from './lib/adminSession';
import { advertisementsApi, nunuyConsultationsApi, portalAdsApi, siteContactApi, testimonialsApi } from './lib/api';
import { createOwnerGuestbookUrl } from './lib/ownerGuestbookUrl';
import { createDefaultTheme, getThemeCatalog, themeStyle } from './lib/themeCatalog';
import { normalizePortalAds } from './lib/portalAds';
import { SEO_DEFAULTS } from './lib/seoSites';
import { createWhatsAppUrl } from './lib/whatsapp';
import { getRootRouteForHost, getSiteUrl, resolveBrandHref } from './lib/siteDomains';

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

const normalizeInvitationBrand = (value) => {
  if (typeof value === 'string') {
    if (/(?:https?:\/\/|[\w.+-]+@)/i.test(value)) return value;
    return value.replace(/\bundangan\.id\b/gi, 'Nuansa Invite');
  }
  if (Array.isArray(value)) return value.map(normalizeInvitationBrand);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
      key,
      normalizeInvitationBrand(nestedValue),
    ]));
  }
  return value;
};

const optimizeImageFile = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Ukuran gambar maksimum 12 MB.');
  if (typeof createImageBitmap !== 'function') throw new Error('Browser ini tidak mendukung pemrosesan gambar.');

  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Gambar tidak dapat diproses di browser ini.');

  let blob = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) break;
    if (blob.size <= 1_800_000) break;
    if (quality > 0.52) quality = Math.max(0.52, quality - 0.1);
    else {
      scale *= 0.82;
      quality = 0.76;
    }
  }
  bitmap.close();
  if (!blob) throw new Error('Gambar gagal dikompresi.');
  if (blob.size > 1_800_000) throw new Error('Poster terlalu besar setelah dikompresi. Pilih gambar yang lebih sederhana.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
    reader.readAsDataURL(blob);
  });
};

const defaultPortalData = {
  siteName: 'Aurora Media',
  logo: 'AM',
  logoImage: '/aurora-media-logo.svg',
  hero: {
    eyebrow: 'CREATIVE BRANDS · ONE PORTAL',
    title: 'Temukan partner terbaik untuk momen istimewa Anda.',
    subtitle: 'Wedding yang penuh makna, musik yang menghidupkan suasana, dan undangan digital yang elegan dalam satu platform.',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1500&q=90',
    cta: 'Jelajahi Pilihan Kami',
    imageAlt: 'Dekorasi pernikahan outdoor yang hangat dan elegan',
  },
  services: [
    {
      name: 'Nunuy Nadhifa Wedding',
      category: 'WEDDING ORGANIZER',
      description: 'Merangkai setiap detail pernikahan menjadi momen istimewa yang indah, berkesan, dan penuh cerita.',
      button: 'Kunjungi Website',
      href: '/nunuy-nadhifa-wedding',
      image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85',
      accent: '#59416F',
      headingFont: 'Cormorant Garamond',
      bodyFont: 'DM Sans',
      active: true,
    },
    {
      name: 'Entertainment Musik',
      category: 'MUSIC & ENTERTAINMENT',
      description: 'Menghadirkan pengalaman musik dan hiburan untuk menghidupkan suasana di setiap perayaan dan acara spesial.',
      button: 'Kunjungi Website',
      href: '/gibrig',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
      accent: '#59416F',
      headingFont: 'Space Grotesk',
      bodyFont: 'DM Sans',
      active: true,
    },
    {
      name: 'Undangan Digital',
      category: 'DIGITAL INVITATION',
      description: 'Undangan digital modern dan personal yang memudahkan Anda membagikan kabar bahagia kepada orang-orang tercinta.',
      button: 'Kunjungi Website',
      href: '/undangan',
      image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=85',
      accent: '#59416F',
      headingFont: 'Cormorant Garamond',
      bodyFont: 'DM Sans',
      active: true,
    },
  ],
  ads: {
    page: { title: 'Pilihan Iklan', description: 'Temukan brand dan layanan pilihan dari partner Aurora Media.', layout: 'grid' },
    top: { enabled: false, label: 'PARTNER SPOTLIGHT', title: 'Ruang untuk brand Anda', description: '', image: '', href: '#contact', format: 'banner', animation: 'rise', duration: 8, imageWidth: 40, imageHeight: 240 },
    midFeed: { enabled: false, label: 'FEATURED PARTNER', title: 'Buat momen Anda lebih istimewa', description: '', image: '', href: '/nunuy-nadhifa-wedding', format: 'card', animation: 'fade', duration: 8, imageWidth: 100, imageHeight: 240 },
    sidebar: { enabled: false, label: 'DIREKOMENDASIKAN', title: 'Cerita indah dimulai dari sini', description: '', image: '', href: '/undangan', format: 'card', animation: 'fade', duration: 8, imageWidth: 100, imageHeight: 240 },
    floatingBottom: { enabled: false, label: 'Punya acara dalam waktu dekat?', title: 'Mari rencanakan bersama', description: '', image: '', href: '/nunuy-nadhifa-wedding', format: 'link', animation: 'float', duration: 8, imageWidth: 40, imageHeight: 180 },
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
  testimonials: [],
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
  socialLinks: { instagram: '', tiktok: '', youtube: '' },
  footer: 'Bersama, wujudkan momen terbaik Anda.',
  promotion: {
    eyebrow: 'GROW WITH AURORA MEDIA',
    title: 'Brand Anda Layak Dikenal Lebih Luas.',
    description: 'Jadikan Aurora Media sebagai ruang untuk memperkenalkan brand, memperluas jangkauan, dan membangun kolaborasi kreatif.',
    button: 'Mulai Kerja Sama',
  },
  seo: SEO_DEFAULTS.portal,
  theme: {
    ...createDefaultTheme('admin'),
    primary: '#59416F',
    secondary: '#E8DDF2',
    accent: '#C9A66B',
    background: '#FCFAFE',
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
  logoImage: '/musik-id-logo.webp',
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
      price: '',
      image: 'https://customer-assets.emergentagent.com/job_a90515ef-0030-4204-8c84-537c287d5958/artifacts/qw36c2aw_WhatsApp%20Image%202026-06-11%20at%2020.08.13.jpeg',
      active: true,
    },
  ],
  packages: [
    {
      name: 'Paket 1',
      label: 'Esensial',
      price: '',
      description: 'Pilihan ekonomis dengan formasi musik standar untuk acara intim.',
      image: 'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/5auam5gf_WhatsApp%20Image%202026-06-11%20at%2009.47.40.jpeg',
      items: ['Kendang', 'Melodi', 'Keyboard', 'MC', 'Singer 2 Orang', 'Soundsistem'],
    },
    {
      name: 'Paket 2',
      label: 'Populer',
      price: '',
      description: 'Formasi lengkap dengan kentrung & terompet untuk acara meriah.',
      image: 'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/ltv7hoqj_WhatsApp%20Image%202026-06-11%20at%2009.48.02.jpeg',
      items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'MC', 'Singer 2 Orang', 'Soundsistem'],
    },
    {
      name: 'Paket 3',
      label: 'Premium',
      price: '',
      description: 'Paket spesial dengan penampilan langsung Neng Syelfi Oktora.',
      image: 'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/acnkfdp2_WhatsApp%20Image%202026-06-11%20at%2009.48.20.jpeg',
      items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'Neng Syelfi Oktora', 'Singer 2 Orang', 'Soundsistem'],
    },
  ],
  testimonials: [],
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
  seo: SEO_DEFAULTS.gibrig,
};

const defaultNunuyData = {
  siteName: 'Nunuy Nadhifa Wedding',
  logo: 'NN',
  logoImage: '/nunuy-nadhifa-logo.webp',
  uiLabels: {
    brandHomeLabel: 'Nunuy Nadhifa Wedding, beranda',
    primaryNavigationLabel: 'Navigasi utama',
    navigationCta: 'Konsultasi Gratis',
    scrollCue: 'SCROLL TO DISCOVER',
    scrollLabel: 'Gulir ke bagian tentang kami',
    visionLabel: 'OUR VISION',
    missionLabel: 'OUR MISSION',
    teamLabel: 'OUR TEAM',
    packageCardLabel: 'WEDDING COLLECTION',
    galleryFilterLabel: 'Filter kategori galeri',
    galleryImageAlt: 'inspirasi visual',
    journalLabel: 'WEDDING NOTES',
    whatsappLabel: 'Konsultasi Nunuy Nadhifa Wedding melalui WhatsApp',
    whatsappTitle: 'Konsultasi melalui WhatsApp',
    closeImageLabel: 'Tutup gambar',
  },
  hero: {
    eyebrow: 'WEDDING PLANNER · GARUT',
    title: 'Make Your Wedding Unforgettable',
    subtitle: 'Kami hadir untuk mewujudkan pernikahan impian Anda dengan sentuhan kreativitas, keindahan, dan cinta.',
    cta: 'Konsultasi Sekarang',
    secondaryCta: 'Lihat Portofolio',
    note: 'Perencanaan personal · Detail terarah · Komunikasi hangat',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1500&q=85',
    stats: [
      { value: 'Personal', label: 'Perencanaan' },
      { value: 'Terarah', label: 'Koordinasi' },
      { value: 'Hangat', label: 'Kolaborasi' },
    ],
  },
  navigation: [
    { label: 'Beranda', href: '#home' },
    { label: 'Tentang Kami', href: '#about' },
    { label: 'Layanan', href: '#services' },
    { label: 'Paket Wedding', href: '#packages' },
    { label: 'Galeri', href: '#gallery' },
    { label: 'Inspirasi', href: '#journal' },
    { label: 'Testimoni', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Kontak', href: '#contact' },
  ],
  theme: createDefaultTheme('nunuy'),
  brandColors: { purple: '#8861A2', pink: '#B58ACB', gold: '#D6B779', peach: '#F4ECF8', paper: '#FFFCFF', ink: '#392843' },
  about: {
    label: 'A LITTLE ABOUT US',
    title: 'Hari istimewa Anda, cerita indah kami.',
    tagline: 'Your Dream Wedding, Our Beautiful Creation.',
    description: 'Nunuy Nadhifa Wedding hadir untuk membantu pasangan merencanakan perayaan yang terasa personal. Kami percaya keindahan tercipta dari ide yang dipahami, detail yang diperhatikan, dan komunikasi yang hangat.',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'Inspirasi dekorasi pernikahan bernuansa lilac',
    linkText: 'Ceritakan rencana Anda',
    visionTitle: 'Perayaan yang terasa seperti cerita Anda sendiri.',
    visionDescription: 'Mendampingi pasangan mewujudkan hari pernikahan yang personal, indah, dan penuh makna.',
    missionTitle: 'Rencana yang jelas, perhatian yang tulus.',
    missionDescription: 'Mendengarkan kebutuhan, menyelaraskan detail, dan menjaga komunikasi sepanjang persiapan sesuai ruang lingkup layanan.',
    teamTitle: 'Kolaborasi untuk hari istimewa.',
    teamDescription: 'Komposisi tim dan dokumentasi personel akan dikonfirmasi saat konsultasi sesuai kebutuhan serta ketersediaan tanggal.',
    team: [{ name: '', role: '', bio: '', image: '', active: false }],
    values: [
      { title: 'Kreativitas', description: 'Ide dan konsep yang tumbuh dari cerita Anda.' },
      { title: 'Ketelitian', description: 'Perhatian pada detail dan alur acara.' },
      { title: 'Kehangatan', description: 'Komunikasi yang terbuka dan penuh empati.' },
      { title: 'Kepercayaan', description: 'Ruang lingkup dan kesepakatan yang jelas.' },
    ],
  },
  serviceSection: {
    label: 'LAYANAN KAMI',
    title: 'Perayaan yang dirancang',
    emphasis: 'dengan penuh perhatian.',
    description: 'Dari ide pertama hingga hari perayaan, mari bicarakan layanan yang paling sesuai dengan kebutuhan Anda.',
    cardCta: 'Tanya Paket',
    items: [
      { title: 'Wedding Organizer', slug: 'wedding-organizer', description: 'Koordinasi rangkaian acara berdasarkan kebutuhan, kesepakatan, dan detail perayaan Anda.', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85', features: ['Diskusi kebutuhan acara', 'Penyusunan alur dan prioritas', 'Ruang lingkup dikonfirmasi saat konsultasi'], active: true },
      { title: 'Wedding Planner', slug: 'wedding-planner', description: 'Rencanakan konsep, prioritas, jadwal, dan kebutuhan vendor bersama tim.', image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=85', features: ['Pembahasan konsep', 'Rencana persiapan', 'Koordinasi sesuai kesepakatan'], active: true },
      { title: 'Dekorasi Pernikahan', slug: 'dekorasi-pernikahan', description: 'Jelajahi referensi dekorasi yang selaras dengan tema, venue, dan cerita Anda.', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85', features: ['Diskusi moodboard', 'Penyesuaian tema dan venue', 'Ketersediaan dibicarakan saat konsultasi'], active: true },
      { title: 'Dokumentasi Foto dan Video', slug: 'dokumentasi-foto-dan-video', description: 'Bahas kebutuhan dokumentasi untuk menyimpan momen penting hari pernikahan.', image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=900&q=85', features: ['Pembahasan kebutuhan dokumentasi', 'Pilihan paket dikonfirmasi saat konsultasi'], active: true },
      { title: 'Entertainment dan Musik', slug: 'entertainment-dan-musik', description: 'Diskusikan pilihan hiburan dan musik yang sesuai dengan suasana acara.', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85', features: ['Diskusi suasana dan alur acara', 'Pilihan hiburan sesuai ketersediaan'], active: true },
      { title: 'Catering', slug: 'catering', description: 'Sampaikan preferensi menu dan kebutuhan jamuan untuk dibahas bersama.', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85', features: ['Diskusi preferensi menu', 'Pilihan vendor dan layanan dikonfirmasi'], active: true },
      { title: 'Makeup dan Busana Pengantin', slug: 'makeup-dan-busana-pengantin', description: 'Bicarakan referensi tata rias dan busana yang sesuai dengan konsep perayaan.', image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=900&q=85', features: ['Diskusi referensi penampilan', 'Pilihan layanan dikonfirmasi saat konsultasi'], active: true },
      { title: 'Wedding Coordination', slug: 'wedding-coordination', description: 'Selaraskan susunan acara dan koordinasi kebutuhan pada hari pernikahan.', image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85', features: ['Pembahasan rundown', 'Koordinasi sesuai ruang lingkup yang disepakati'], active: true },
    ],
  },
  packageSection: {
    label: 'PAKET WEDDING',
    title: 'Pilihan awal untuk',
    emphasis: 'hari istimewa Anda.',
    description: 'Ruang lingkup, kru, durasi, dokumentasi, dan penawaran setiap paket akan dikonfirmasi bersama sebelum pemesanan.',
    priceLabel: 'Harga dibicarakan saat konsultasi',
    cta: 'Tanya Paket',
    items: [
      { name: 'Silver', mood: 'Awali dengan rencana yang jelas', description: 'Paket awal yang ruang lingkupnya disesuaikan melalui konsultasi.', price: 'Hubungi kami', crew: 'Dibicarakan saat konsultasi', duration: 'Dibicarakan saat konsultasi', documentation: 'Dibicarakan saat konsultasi', popular: false, features: ['Diskusi kebutuhan acara', 'Prioritas dan alur dibicarakan bersama'], active: true },
      { name: 'Gold', mood: 'Detail yang dirancang bersama', description: 'Pilihan untuk membahas kebutuhan perayaan secara lebih menyeluruh.', price: 'Hubungi kami', crew: 'Dibicarakan saat konsultasi', duration: 'Dibicarakan saat konsultasi', documentation: 'Dibicarakan saat konsultasi', popular: true, features: ['Pembahasan konsep dan prioritas', 'Koordinasi sesuai ruang lingkup kesepakatan'], active: true },
      { name: 'Platinum', mood: 'Rencana personal untuk cerita Anda', description: 'Ruang lingkup layanan dan kebutuhan khusus dibicarakan secara personal.', price: 'Hubungi kami', crew: 'Dibicarakan saat konsultasi', duration: 'Dibicarakan saat konsultasi', documentation: 'Dibicarakan saat konsultasi', popular: false, features: ['Konsultasi kebutuhan menyeluruh', 'Ruang lingkup dikonfirmasi sebelum pemesanan'], active: true },
    ],
  },
  gallery: {
    label: 'A MOODBOARD OF MOMENTS',
    title: 'Love in every',
    emphasis: 'little detail.',
    description: 'Galeri inspirasi visual. Gambar berikut bukan dokumentasi atau portofolio acara klien Nunuy Nadhifa Wedding.',
    disclaimer: 'Gambar galeri adalah inspirasi visual dan bukan klaim hasil pekerjaan atau portofolio klien.',
    categories: ['Intimate Wedding', 'Garden Wedding', 'Traditional Wedding', 'Luxury Wedding', 'Engagement', 'Decoration'],
    items: [
      { title: 'Intimate Reception', category: 'Intimate Wedding', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Garden Ceremony', category: 'Garden Wedding', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Floral Table Setting', category: 'Decoration', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Luxury Wedding Mood', category: 'Luxury Wedding', image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Traditional Details', category: 'Traditional Wedding', image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Engagement Moments', category: 'Engagement', image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Bridal Floral Mood', category: 'Luxury Wedding', image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85', active: true },
      { title: 'Garden Wedding Mood', category: 'Garden Wedding', image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85', active: true },
    ],
  },
  portfolio: {
    label: 'OUR PORTFOLIO',
    title: 'Every story starts',
    emphasis: 'with a conversation.',
    description: 'Portofolio acara akan ditampilkan setelah dokumentasi dan izin publikasi tersedia. Sampaikan konsep impian Anda, dan mari mulai merencanakannya bersama.',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'Inspirasi suasana pernikahan romantis',
    caption: 'AN IDEA FOR YOUR DAY',
    cta: 'Mulai konsultasi',
    projects: [{ active: false, name: '', theme: '', location: '', description: '', image: '' }],
  },
  testimonials: {
    label: 'KIND WORDS',
    title: 'Cerita dari keluarga dan klien',
    emphasis: '',
    description: 'Testimoni pelanggan asli akan ditampilkan di sini setelah tersedia dan mendapat persetujuan untuk dipublikasikan.',
    items: [{ active: false, name: '', text: '', image: '' }],
  },
  seo: SEO_DEFAULTS.nunuy,
  journal: {
    label: 'THE WEDDING JOURNAL',
    title: 'Little notes for',
    emphasis: 'your big day.',
    description: 'Catatan praktis untuk menemani langkah awal merencanakan perayaan Anda.',
    readMore: 'Baca selengkapnya',
    items: [
      { title: 'Tips Memilih Wedding Organizer yang Tepat', slug: 'tips-memilih-wedding-organizer-yang-tepat', summary: 'Mulai dari memahami kebutuhan, cara berkomunikasi, hingga menyepakati ruang lingkup layanan.', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85', body: 'Tuliskan kebutuhan utama dan hal yang paling penting bagi Anda. Saat berkonsultasi, tanyakan ruang lingkup layanan, alur komunikasi, jadwal persiapan, serta hal-hal yang belum termasuk dalam kesepakatan. Pastikan semua detail yang disetujui tercatat dengan jelas.', active: true },
      { title: 'Menyusun Anggaran Pernikahan dengan Tenang', slug: 'menyusun-anggaran-pernikahan-dengan-tenang', summary: 'Kenali prioritas bersama sebelum menentukan alokasi untuk setiap kebutuhan acara.', image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=85', body: 'Mulailah dengan menetapkan kisaran anggaran dan daftar prioritas bersama. Sisihkan ruang untuk kebutuhan yang berubah, bandingkan penawaran dengan ruang lingkup yang sama, dan pastikan biaya tambahan dibicarakan sebelum mengambil keputusan.', active: true },
      { title: 'Menemukan Tema Dekorasi yang Mencerminkan Anda', slug: 'menemukan-tema-dekorasi-yang-mencerminkan-anda', summary: 'Satukan inspirasi warna, suasana, dan kebutuhan venue menjadi konsep yang terasa personal.', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85', body: 'Kumpulkan beberapa referensi yang benar-benar Anda sukai, lalu cari benang merah dari warna, bunga, pencahayaan, dan suasananya. Sesuaikan inspirasi dengan venue, waktu acara, dan kenyamanan tamu agar hasil akhirnya tetap terasa harmonis.', active: true },
    ],
  },
  faq: {
    label: 'GOOD TO KNOW',
    title: 'A few things',
    emphasis: 'you may wonder.',
    description: 'Belum menemukan jawaban? Tanyakan langsung kepada kami.',
    consultationCta: 'Tanya melalui konsultasi',
    items: [
      { question: 'Bagaimana cara memesan layanan?', answer: 'Kirim formulir konsultasi atau hubungi kami melalui WhatsApp. Tim akan membahas kebutuhan, tanggal, dan ruang lingkup layanan bersama Anda.', active: true },
      { question: 'Berapa biaya wedding organizer?', answer: 'Harga bergantung pada kebutuhan dan ruang lingkup acara. Hubungi kami untuk konsultasi dan penawaran yang sesuai.', active: true },
      { question: 'Apakah melayani acara di luar kota?', answer: 'Lokasi acara dapat disampaikan saat konsultasi. Jangkauan layanan, kebutuhan perjalanan, dan biaya terkait akan dikonfirmasi sebelum pemesanan.', active: true },
      { question: 'Apakah bisa request konsep pernikahan?', answer: 'Ya, sampaikan referensi, tema, dan kebutuhan Anda. Konsep serta ruang lingkupnya akan dibahas bersama tim.', active: true },
      { question: 'Apakah tersedia paket custom?', answer: 'Kebutuhan khusus dapat dibicarakan saat konsultasi. Paket dan fasilitas yang disepakati akan dijelaskan sebelum pemesanan.', active: true },
      { question: 'Bagaimana sistem pembayaran?', answer: 'Skema pembayaran dan ketentuan pemesanan akan dijelaskan saat penawaran dan dicantumkan dalam kesepakatan layanan.', active: true },
      { question: 'Berapa lama waktu persiapan pernikahan?', answer: 'Waktu persiapan menyesuaikan tanggal, kebutuhan acara, dan ketersediaan layanan. Sampaikan tanggal rencana Anda untuk dibahas bersama.', active: true },
    ],
  },
  consultation: {
    label: 'LET’S MAKE IT BEAUTIFUL',
    title: 'Your day.',
    emphasis: 'Your story.',
    description: 'Ceritakan rencana pernikahan Anda. Kami akan membantu membuka percakapan tentang kebutuhan, layanan, dan penawaran yang sesuai.',
    directLinkLabel: 'Tanya langsung melalui WhatsApp',
    formLabel: 'CONSULTATION FORM',
    formDescription: 'Bagikan detail awal rencana hari bahagia Anda.',
    confirmation: 'Detail konsultasi akan dibuka di WhatsApp. Lanjutkan?',
    successMessage: 'WhatsApp terbuka dengan detail konsultasi Anda.',
    submitLabel: 'Kirim konsultasi via WhatsApp',
    privacyNote: 'Data konsultasi disimpan agar admin dapat menindaklanjuti. Detail juga disiapkan untuk dibagikan melalui WhatsApp.',
    serviceLabel: 'Layanan yang diinginkan',
    packageLabel: 'Pilihan paket',
    budgetLabel: 'Kisaran anggaran',
    budgetPlaceholder: 'Pilih kisaran (opsional)',
    budgetOptions: ['Belum menentukan', 'Di bawah Rp 50 juta', 'Rp 50–100 juta', 'Rp 100–250 juta', 'Di atas Rp 250 juta'],
    missingWhatsApp: 'Nomor WhatsApp belum diatur. Silakan hubungi admin website.',
    fields: {
      couple: 'Nama calon pengantin',
      couplePlaceholder: 'Nama Anda dan pasangan',
      phone: 'Nomor WhatsApp',
      phonePlaceholder: '08xxxxxxxxxx',
      email: 'Email',
      emailPlaceholder: 'nama@email.com (opsional)',
      date: 'Tanggal pernikahan',
      guests: 'Perkiraan jumlah tamu',
      guestsPlaceholder: 'Contoh: 150',
      location: 'Lokasi acara',
      locationPlaceholder: 'Kota atau venue pilihan',
      notes: 'Catatan tambahan',
      notesPlaceholder: 'Ceritakan konsep atau hal yang ingin didiskusikan',
      servicePlaceholder: 'Pilih layanan',
      packagePlaceholder: 'Belum menentukan',
    },
  },
  footer: {
    tagline: 'Your Dream Wedding, Our Beautiful Creation.',
    backToTop: 'Kembali ke atas',
  },
  packages: [
    { name: 'Silver', price: 'Hubungi kami', description: 'Ruang lingkup disesuaikan melalui konsultasi.', facilities: ['Diskusi kebutuhan acara'], duration: 'Dibicarakan saat konsultasi', guests: 'Dibicarakan saat konsultasi' },
    { name: 'Gold', price: 'Hubungi kami', description: 'Kebutuhan perayaan dibahas secara lebih menyeluruh.', facilities: ['Pembahasan konsep dan prioritas'], duration: 'Dibicarakan saat konsultasi', guests: 'Dibicarakan saat konsultasi' },
    { name: 'Platinum', price: 'Hubungi kami', description: 'Ruang lingkup khusus dibicarakan secara personal.', facilities: ['Konsultasi kebutuhan menyeluruh'], duration: 'Dibicarakan saat konsultasi', guests: 'Dibicarakan saat konsultasi' },
  ],
  contact: { phone: '+62 812-7788-1122', email: 'hello@nunuywedding.com', address: '', instagram: '', facebook: '', tiktok: '' },
  whatsapp: {
    number: '+6281277881122',
    message: 'Halo Nunuy Nadhifa Wedding, saya ingin berkonsultasi mengenai paket dan layanan pernikahan. Mohon informasi lebih lanjut.',
  },
};

const defaultInvitationData = {
  siteName: 'Nuansa Invite',
  logo: 'U',
  logoImage: '/undangan-logo.svg',
  hero: {
    title: 'Ciptakan Momen Istimewa Berkelas & Elegan.',
    subtitle: 'Rancang undangan digital personal yang elegan dan mudah dibagikan. Kelola RSVP, daftar tamu, musik, lokasi, dan cerita acara dalam satu dashboard praktis.',
    cta: 'Buat Undangan Sekarang',
    secondary: 'Lihat Katalog',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&q=85',
    eyebrow: 'Luxury Digital Invitation',
  },
  theme: {
    ...createDefaultTheme('invitation'),
    primary: '#2563EB',
    secondary: '#E0F2FE',
    accent: '#06B6D4',
    background: '#F4F7FC',
    text: '#0F172A',
    font: 'DM Sans',
    headingFont: 'Cormorant Garamond',
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
  testimonials: [],
  seo: SEO_DEFAULTS.invitation,
  contact: { phone: '+62 812-3456-7890', email: 'hello@undangan.id' },
  whatsapp: { number: '+6281234567890', message: 'Halo, saya ingin bertanya tentang Nuansa Invite.' },
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

const formatPath = (path) => {
  const normalizedPath = path || '/';
  return normalizedPath === '/' ? getRootRouteForHost() : normalizedPath;
};

const isValidPortalPartnerHref = (href) => {
  if (typeof href !== 'string' || !href.trim()) return false;
  const value = href.trim();
  if (value.startsWith('/')) return !value.startsWith('//');
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const normalizePortalData = (data) => {
  const saved = data && typeof data === 'object' ? data : {};
  const savedServices = Array.isArray(saved.services) ? saved.services : [];
  const services = Object.hasOwn(saved, 'services')
    ? savedServices.map((service, index) => ({
      ...(defaultPortalData.services.find((item) => item.href === service.href) || defaultPortalData.services[index] || {}),
      ...service,
      active: service.active !== false,
    }))
    : defaultPortalData.services;
  return {
    ...defaultPortalData,
    ...saved,
    siteName: saved.siteName === 'Portal.id' ? defaultPortalData.siteName : saved.siteName || defaultPortalData.siteName,
    logoImage: saved.logoImage || defaultPortalData.logoImage,
    hero: { ...defaultPortalData.hero, ...(saved.hero || {}) },
    services,
    ads: normalizePortalAds(defaultPortalData.ads, saved.ads),
    theme: {
      ...defaultPortalData.theme,
      ...(saved.theme || {}),
      elementAnimations: { ...defaultPortalData.theme.elementAnimations, ...(saved.theme?.elementAnimations || {}) },
    },
    contact: { ...defaultPortalData.contact, ...(saved.contact || {}) },
    whatsapp: { ...defaultPortalData.whatsapp, ...(saved.whatsapp || {}) },
    socials: Array.isArray(saved.socials) ? saved.socials : defaultPortalData.socials,
    socialLinks: { ...defaultPortalData.socialLinks, ...(saved.socialLinks || {}) },
    promotion: { ...defaultPortalData.promotion, ...(saved.promotion || {}) },
    seo: { ...defaultPortalData.seo, ...(saved.seo || {}) },
  };
};

const mergeSiteContact = (data = {}, contact = {}) => {
  const payload = contact && typeof contact === 'object' && Object.hasOwn(contact, 'contact') && contact.contact && typeof contact.contact === 'object'
    ? contact.contact
    : contact;
  const dataContact = data.contact || {};
  const dataWhatsapp = data.whatsapp || {};
  const nextContact = {
    ...dataContact,
    ...payload,
    phone: Object.prototype.hasOwnProperty.call(payload, 'phone')
      ? payload.phone
      : Object.prototype.hasOwnProperty.call(contact, 'phone')
        ? contact.phone
        : dataContact.phone,
    email: Object.prototype.hasOwnProperty.call(payload, 'email')
      ? payload.email
      : Object.prototype.hasOwnProperty.call(contact, 'email')
        ? contact.email
        : dataContact.email,
  };
  const nextWhatsapp = {
    ...dataWhatsapp,
    ...(payload.whatsapp || contact.whatsapp || {}),
    number: Object.prototype.hasOwnProperty.call(payload, 'whatsappNumber')
      ? payload.whatsappNumber
      : Object.prototype.hasOwnProperty.call(contact, 'whatsappNumber')
        ? contact.whatsappNumber
        : Object.prototype.hasOwnProperty.call(payload, 'number')
          ? payload.number
          : dataWhatsapp.number,
    message: Object.prototype.hasOwnProperty.call(payload, 'whatsappMessage')
      ? payload.whatsappMessage
      : Object.prototype.hasOwnProperty.call(contact, 'whatsappMessage')
        ? contact.whatsappMessage
        : Object.prototype.hasOwnProperty.call(payload, 'message')
          ? payload.message
          : dataWhatsapp.message,
  };

  return {
    ...data,
    contact: nextContact,
    whatsapp: nextWhatsapp,
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

const openWhatsApp = (number, message, website, menu) => {
  const url = createWhatsAppUrl(number, message, website, menu);
  if (typeof window !== 'undefined' && url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const WhatsAppContact = ({ siteName, number, message, menuName = 'Kontak cepat' }) => {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;

  return (
    <a
      className="whatsapp-contact-link"
      href={createWhatsAppUrl(digits, message, siteName, menuName)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Hubungi ${siteName} via WhatsApp: ${number}`}
    >
      <strong aria-hidden="true">
        <svg className="whatsapp-contact-icon" viewBox="0 0 24 24" fill="none" focusable="false">
          <path d="M12 2.25a9.75 9.75 0 0 0-8.4 14.69l-1.35 4.81 4.97-1.3A9.75 9.75 0 1 0 12 2.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.15 7.05c-.28 0-.59.08-.8.34-.28.33-.95 1.02-.95 2.42s.97 2.75 1.1 2.94c.14.19 1.88 3.01 4.64 4.1 2.29.91 2.76.73 3.25.68.5-.05 1.59-.65 1.81-1.29.23-.63.23-1.17.16-1.28-.06-.12-.25-.19-.53-.34l-1.86-.91c-.25-.12-.43-.19-.61.1-.18.28-.7.91-.86 1.1-.16.19-.32.21-.59.07-.28-.14-1.17-.43-2.22-1.36-.82-.73-1.37-1.64-1.53-1.91-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.61-1.57-.84-2.15-.22-.55-.45-.55-.62-.56h-.55Z" fill="currentColor" />
        </svg>
      </strong>
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

const AdminPanel = ({ site, label, dataKey, defaultData, customFields = [], description, adminScope = null, superAdminAuthenticated = false, onSuperAdminLogout }) => {
  const scope = adminScope || (superAdminAuthenticated ? 'all' : null);
  const hasScopedAccess = scope === 'all' || scope === site;
  const contactSite = site === 'admin' ? 'portal' : site;
  const [credentials, setCredentials] = useState({ username: defaultAdmins[site].username, passwordHash: '' });
  const [loggedIn, setLoggedIn] = useState(hasScopedAccess);
  const [activeAdminSection, setActiveAdminSection] = useState('dashboard');
  const [formData, setFormData] = useState(() => site === 'admin'
    ? normalizeInvitationBrand(normalizePortalData(loadData(dataKey, defaultData)))
    : normalizeInvitationBrand(mergeDataDefaults(defaultData, loadData(dataKey, defaultData))));
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
  const contactEditVersion = useRef(0);
  const themes = useMemo(() => [...getThemeCatalog(site), ...customThemes], [site, customThemes]);
  const filteredThemes = useMemo(() => themes.filter((theme) => theme.name.toLowerCase().includes(themeSearch.toLowerCase())), [themes, themeSearch]);

  useEffect(() => {
    const loadCreds = async () => {
      const current = await readCredentials(site);
      setCredentials(current);
      setLoggedIn(hasScopedAccess || Boolean(loadData(`${site}-session`, null)));
    };
    loadCreds();
  }, [hasScopedAccess, site]);

  useEffect(() => {
    let active = true;
    const requestEditVersion = contactEditVersion.current;
    siteContactApi.get(contactSite)
      .then((result) => {
        const nextContact = result?.contact ?? result;
        if (!active || !nextContact || contactEditVersion.current !== requestEditVersion) return;
        setFormData((current) => mergeSiteContact(current, nextContact));
      })
      .catch((error) => {
        console.error(`Kontak publik ${contactSite} gagal dimuat dari API:`, error);
      });
    return () => { active = false; };
  }, [contactSite]);

  useEffect(() => {
    if (site !== 'admin') return undefined;
    let active = true;
    portalAdsApi.adminConfig(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY))
      .then((result) => {
        if (active && result?.ads) {
          setFormData((current) => normalizePortalData({ ...current, ads: result.ads }));
        }
      })
      .catch((error) => { console.error('Konfigurasi iklan Aurora Media gagal dimuat:', error); });
    return () => { active = false; };
  }, [site]);

  const updateField = (path, value) => {
    const pathSegments = Array.isArray(path) ? path : path.split('.');
    if (pathSegments[0] === 'contact' || pathSegments[0] === 'whatsapp') {
      contactEditVersion.current += 1;
    }
    setFormData((prev) => {
      const next = structuredClone(prev);
      let cursor = next;
      for (let i = 0; i < pathSegments.length - 1; i += 1) {
        cursor = cursor[pathSegments[i]];
      }
      cursor[pathSegments[pathSegments.length - 1]] = value;
      return next;
    });
  };

  const saveChanges = async () => {
    if (site === 'admin' && formData.services.some((service) => service.active !== false && !isValidPortalPartnerHref(service.href))) {
      setEditorError('Setiap partner aktif harus memiliki URL website yang valid (HTTP, HTTPS, atau halaman internal).');
      setEditorMessage('');
      return;
    }
    try {
      const nextData = {
        ...formData,
        contact: { ...(formData.contact || {}), phone: formData.contact?.phone ?? '' },
        whatsapp: {
          ...(formData.whatsapp || {}),
          number: formData.whatsapp?.number ?? '',
          message: formData.whatsapp?.message ?? '',
        },
      };
      saveData(dataKey, nextData);
      await siteContactApi.update(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY), contactSite, {
        phone: nextData.contact?.phone ?? '',
        whatsappNumber: nextData.whatsapp?.number ?? '',
        whatsappMessage: nextData.whatsapp?.message ?? '',
      });
      if (site === 'admin') {
        await portalAdsApi.updateConfig(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY), nextData.ads);
      }
      setFormData(nextData);
      setEditorError('');
      setEditorMessage(site === 'admin'
        ? 'Konten dan konfigurasi iklan berhasil dipublikasikan; nomor telepon dan WhatsApp tersinkron ke semua domain situs ini.'
        : 'Perubahan dipublikasikan; nomor telepon dan WhatsApp tersinkron ke semua domain situs ini.');
    } catch (error) {
      setEditorError(`Perubahan lokal tersimpan, tetapi sinkronisasi konfigurasi gagal: ${error.message}`);
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
    if (scope && onSuperAdminLogout) {
      onSuperAdminLogout();
      return;
    }
    localStorage.removeItem(`${site}-session`);
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <AdminLogin site={site} label={label} onLogin={() => setLoggedIn(true)} credentials={credentials} />;
  }

  const adminNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', href: '#admin-dashboard' },
    { id: 'content', label: 'Content', href: '#admin-content' },
    { id: 'theme', label: 'Theme', href: '#admin-theme' },
    { id: 'media', label: 'Media', href: '#admin-media' },
    ...(superAdminAuthenticated ? [{ id: 'seo', label: 'SEO', href: '/setia-creative-admin/seo' }] : []),
    ...(site === 'admin' ? [{ id: 'ads', label: 'Iklan', href: '#admin-ads' }] : []),
  ];

  return (
    <div className="admin-shell admin-dashboard">
      <aside className="admin-sidebar">
        <div className="brand-box">{label}</div>
        <nav aria-label={`Navigasi ${label}`}>
          {adminNavigationItems.map((item) => (
            <a
              href={item.href}
              key={item.id}
              className={activeAdminSection === item.id ? 'is-active' : undefined}
              aria-current={activeAdminSection === item.id ? 'location' : undefined}
              onClick={() => {
                if (item.href.startsWith('#')) setActiveAdminSection(item.id);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button className="logout-button" onClick={logout}>{scope ? 'Keluar' : 'Logout'}</button>
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

        <section className="stats-grid" id="admin-dashboard">
          {site === 'nunuy' ? [
            ['Layanan aktif', formData.serviceSection?.items?.filter((item) => item.active !== false).length || 0],
            ['Paket aktif', formData.packageSection?.items?.filter((item) => item.active !== false).length || 0],
            ['Galeri aktif', formData.gallery?.items?.filter((item) => item.active !== false).length || 0],
            ['Testimoni aktif', formData.testimonials?.items?.filter((item) => item.active === true).length || 0],
          ].map(([title, count]) => <div className="stat-card" key={title}><span>{title}</span><strong>{count}</strong></div>)
            : <>
              <div className="stat-card"><span>Visitor</span><strong>12.4k</strong></div>
              <div className="stat-card"><span>Clicks</span><strong>8.7k</strong></div>
              <div className="stat-card"><span>Contacts</span><strong>240</strong></div>
              <div className="stat-card"><span>Inquiry</span><strong>96</strong></div>
            </>}
        </section>

        <section className="admin-panel-block" id="admin-media">
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
            <section className="admin-panel-block portal-cms-block" id="admin-content">
              <div className="portal-admin-section-heading">
                <div>
                  <h3>Aurora Media · Content Studio</h3>
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
              <div className="portal-admin-section-heading">
                <h4>Website partner untuk diiklankan</h4>
                <button type="button" className="secondary-btn" onClick={() => updateField('services', [...formData.services, {
                  name: 'Website baru',
                  category: 'KATEGORI WEBSITE',
                  description: 'Tuliskan deskripsi singkat website yang diiklankan.',
                  button: 'Kunjungi Website',
                  href: 'https://',
                  image: '',
                  accent: '#59416F',
                  headingFont: 'Cormorant Garamond',
                  bodyFont: 'DM Sans',
                  active: true,
                }])}>Tambah website</button>
              </div>
              <div className="portal-admin-brand-list">
                {formData.services.map((service, index) => (
                  <fieldset className="portal-admin-brand" key={index}>
                    <legend>Partner {String(index + 1).padStart(2, '0')}</legend>
                    <div className="portal-admin-brand-actions">
                      <label className="portal-checkbox-label"><input type="checkbox" checked={service.active !== false} onChange={(event) => updateField(`services.${index}.active`, event.target.checked)} /> Tampilkan partner</label>
                      <button type="button" className="ghost" disabled={index === 0} onClick={() => {
                        const nextServices = [...formData.services];
                        [nextServices[index - 1], nextServices[index]] = [nextServices[index], nextServices[index - 1]];
                        updateField('services', nextServices);
                      }}>Naikkan</button>
                      <button type="button" className="ghost" disabled={index === formData.services.length - 1} onClick={() => {
                        const nextServices = [...formData.services];
                        [nextServices[index], nextServices[index + 1]] = [nextServices[index + 1], nextServices[index]];
                        updateField('services', nextServices);
                      }}>Turunkan</button>
                      <button type="button" className="ghost" onClick={() => updateField('services', formData.services.filter((_, serviceIndex) => serviceIndex !== index))}>Hapus partner</button>
                    </div>
                    <div className="form-grid">
                      <label>Nama<input value={service.name || ''} onChange={(event) => updateField(`services.${index}.name`, event.target.value)} /></label>
                      <label>Kategori<input value={service.category || ''} onChange={(event) => updateField(`services.${index}.category`, event.target.value)} /></label>
                      <label>CTA<input value={service.button || ''} onChange={(event) => updateField(`services.${index}.button`, event.target.value)} /></label>
                      <label className="portal-form-wide">Deskripsi<input value={service.description || ''} onChange={(event) => updateField(`services.${index}.description`, event.target.value)} /></label>
                      <label>URL website partner<input type="url" value={service.href || ''} onChange={(event) => updateField(`services.${index}.href`, event.target.value)} placeholder="https://website-partner.id" /></label>
                      <label>URL foto website<input type="url" value={service.image || ''} onChange={(event) => updateField(`services.${index}.image`, event.target.value)} placeholder="https://..." /></label>
                      <label>Upload foto website<input type="file" accept="image/*" onChange={(event) => handleImageUpload(`services.${index}.image`, event.target.files?.[0])} /></label>
                      {service.image ? <div className="admin-media-preview"><span>Pratinjau {service.name || 'website partner'}</span><img src={service.image} alt={`Pratinjau foto ${service.name || 'website partner'}`} /></div> : null}
                      <label>Warna aksen<input type="color" value={service.accent || '#203f35'} onChange={(event) => updateField(`services.${index}.accent`, event.target.value)} /></label>
                      <label>Google Font · heading<input value={service.headingFont || ''} onChange={(event) => updateField(`services.${index}.headingFont`, event.target.value)} placeholder="Cormorant Garamond" /></label>
                      <label>Google Font · body<input value={service.bodyFont || ''} onChange={(event) => updateField(`services.${index}.bodyFont`, event.target.value)} placeholder="DM Sans" /></label>
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>

            <section className="admin-panel-block">
              <h3>Banner promosi & kerja sama</h3>
              <div className="form-grid">
                <label>Eyebrow<input value={formData.promotion?.eyebrow || ''} onChange={(event) => updateField('promotion.eyebrow', event.target.value)} /></label>
                <label>Judul banner<input value={formData.promotion?.title || ''} onChange={(event) => updateField('promotion.title', event.target.value)} /></label>
                <label className="portal-form-wide">Deskripsi banner<input value={formData.promotion?.description || ''} onChange={(event) => updateField('promotion.description', event.target.value)} /></label>
                <label>Teks tombol<input value={formData.promotion?.button || ''} onChange={(event) => updateField('promotion.button', event.target.value)} /></label>
              </div>
            </section>

            <section className="admin-panel-block">
              <h3>Social media Aurora Media</h3>
              <div className="form-grid">
                <label>Instagram<input value={formData.socialLinks?.instagram || ''} onChange={(event) => updateField('socialLinks.instagram', event.target.value)} placeholder="https://instagram.com/..." /></label>
                <label>TikTok<input value={formData.socialLinks?.tiktok || ''} onChange={(event) => updateField('socialLinks.tiktok', event.target.value)} placeholder="https://tiktok.com/@..." /></label>
                <label>YouTube<input value={formData.socialLinks?.youtube || ''} onChange={(event) => updateField('socialLinks.youtube', event.target.value)} placeholder="https://youtube.com/..." /></label>
              </div>
            </section>

            <section className="admin-panel-block" id="admin-ads">
              <h3>Ad Slot Manager</h3>
              <p className="muted">Aktifkan, ubah materi, dan atur tautan setiap slot iklan.</p>
              <div className="form-grid portal-ad-page-settings">
                <label>Judul halaman iklan<input value={formData.ads.page.title || ''} onChange={(event) => updateField('ads.page.title', event.target.value)} /></label>
                <label className="portal-form-wide">Deskripsi halaman iklan<input value={formData.ads.page.description || ''} onChange={(event) => updateField('ads.page.description', event.target.value)} /></label>
                <label>Layout halaman iklan
                  <select value={formData.ads.page.layout || 'grid'} onChange={(event) => updateField('ads.page.layout', event.target.value)}>
                    <option value="grid">Grid</option>
                    <option value="list">Daftar</option>
                    <option value="featured">Unggulan</option>
                  </select>
                </label>
                <a className="portal-ad-preview-link" href="/iklan" target="_blank" rel="noopener noreferrer">Pratinjau halaman iklan ↗</a>
              </div>
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
                    <label>Judul singkat<input maxLength={180} value={formData.ads[key].title || ''} onChange={(event) => updateField(`ads.${key}.title`, event.target.value.slice(0, 180))} placeholder="Nama brand atau headline" /></label>
                    <label className="portal-form-wide">Deskripsi iklan<textarea rows="3" maxLength="500" value={formData.ads[key].description || ''} onChange={(event) => updateField(`ads.${key}.description`, event.target.value)} placeholder="Detail singkat tentang produk atau penawaran" /></label>
                    <label>URL gambar<input value={formData.ads[key].image || ''} onChange={(event) => updateField(`ads.${key}.image`, event.target.value)} /></label>
                    <label>Upload poster<input type="file" accept="image/*" onChange={(event) => handleImageUpload(`ads.${key}.image`, event.target.files?.[0])} /></label>
                    {formData.ads[key].image ? <div className="admin-media-preview portal-ad-poster-preview"><span>Pratinjau poster</span><img src={formData.ads[key].image} alt={`Pratinjau poster ${title}`} /></div> : null}
                    <label>Lebar poster (%)<input type="number" min="20" max="100" value={formData.ads[key].imageWidth ?? 40} onChange={(event) => updateField(`ads.${key}.imageWidth`, Math.min(100, Math.max(20, Number(event.target.value) || 20)))} /></label>
                    <label>Tinggi poster (px)<input type="number" min="120" max="600" value={formData.ads[key].imageHeight ?? 240} onChange={(event) => updateField(`ads.${key}.imageHeight`, Number(event.target.value))} /></label>
                    <label>Link website iklan<input type="url" value={formData.ads[key].href || ''} onChange={(event) => updateField(`ads.${key}.href`, event.target.value)} placeholder="https://website-brand.com" /></label>
                    {isValidPortalPartnerHref(formData.ads[key].href) ? (
                      <a className="portal-ad-website-preview" href={resolveBrandHref(formData.ads[key].href)} target="_blank" rel="noopener noreferrer">Buka pratinjau website iklan ↗</a>
                    ) : null}
                    <label>Format iklan
                      <select value={formData.ads[key].format || 'card'} onChange={(event) => updateField(`ads.${key}.format`, event.target.value)}>
                        <option value="banner">Banner</option>
                        <option value="card">Kartu</option>
                        <option value="link">Tautan</option>
                      </select>
                    </label>
                    <label>Animasi iklan
                      <select value={formData.ads[key].animation || 'fade'} onChange={(event) => updateField(`ads.${key}.animation`, event.target.value)}>
                        <option value="none">Tanpa animasi</option>
                        <option value="fade">Fade</option>
                        <option value="rise">Naik</option>
                        <option value="float">Mengambang</option>
                      </select>
                    </label>
                    <label>Durasi tayang (detik)<input type="number" min="1" max="120" value={formData.ads[key].duration ?? 8} onChange={(event) => updateField(`ads.${key}.duration`, Number(event.target.value))} /></label>
                  </fieldset>
                ))}
              </div>
            </section>

            <section className="admin-panel-block" id="admin-theme">
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
        {superAdminAuthenticated || scope === (site === 'admin' ? 'portal' : site) ? (
          <TestimonialModeration site={site === 'admin' ? 'portal' : site} token={sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY)} />
        ) : null}
        {site === 'nunuy' && (superAdminAuthenticated || scope === 'nunuy') ? (
          <NunuyConsultationAdmin token={sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY)} />
        ) : null}
        <section className="admin-panel-block" id={site === 'admin' ? undefined : 'admin-content'}>
          <h3>Pengaturan semua konten</h3>
          <p className="muted">Edit teks, data kontak, daftar layanan, paket, FAQ, tema, ukuran, dan seluruh data website.</p>
          <StructuredEditor
            data={Object.fromEntries(Object.entries(formData).filter(([key]) => key !== 'seo'))}
            onChange={updateField}
            onImageUpload={handleImageUpload}
          />
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
  const portalData = useMemo(() => normalizeInvitationBrand(mergeDataDefaults(defaultPortalData, loadData(storage.portal, defaultPortalData))), []);

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
              <div className="portal-floating-note portal-note-bottom"><span>YOUR STORY, BEAUTIFULLY TOLD</span><strong>Nuansa Invite</strong></div>
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
            <span>— NUNUY NADHIFA WEDDING × NUANSA INVITE</span>
          </div>
        </section>

        <PublicTestimonials site="portal" initialItems={portalData.testimonials} />

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
            <a href={createWhatsAppUrl(portalData.whatsapp.number, portalData.whatsapp.message, portalData.siteName, 'Footer > WhatsApp')} target="_blank" rel="noopener noreferrer">Chat sekarang</a>
          </div>
        </div>
      </footer>
      <WhatsAppContact siteName={portalData.siteName} number={portalData.whatsapp.number} message={portalData.whatsapp.message} menuName="Beranda > Kontak cepat" />
    </div>
  );
};

const PortalHomeAdCarousel = ({ ads, animationsEnabled }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const advertisements = useMemo(() => Object.entries(ads).filter(([key, ad]) => key !== 'page' && ad.enabled), [ads]);
  const activeAdvertisement = advertisements.length ? advertisements[activeIndex % advertisements.length] : null;
  const page = ads.page;

  useEffect(() => {
    if (rotationPaused || advertisements.length < 2 || !activeAdvertisement) return undefined;
    const duration = Math.min(120, Math.max(1, Number(activeAdvertisement[1].duration) || 8));
    const timer = window.setTimeout(() => setActiveIndex((index) => (index + 1) % advertisements.length), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [activeAdvertisement, advertisements.length, rotationPaused]);

  if (!activeAdvertisement) return null;

  const [key, ad] = activeAdvertisement;
  const href = resolveBrandHref(isValidPortalPartnerHref(ad.href) ? ad.href : '#');
  const external = /^https?:\/\//i.test(href);

  return (
    <section className="portal-home-ad-section" aria-labelledby="portal-home-ad-title">
      <div className="container">
        <div className="portal-home-ad-heading">
          <p className="eyebrow">PROMOSI PILIHAN</p>
          <h2 id="portal-home-ad-title">{page.title}</h2>
          <p>{page.description}</p>
        </div>
        <div className={`portal-ad-display${animationsEnabled ? '' : ' portal-ad-motion-off'}`} aria-label="Iklan partner Aurora Media">
          <div className={`portal-ad-listings portal-ad-layout-${page.layout || 'grid'}`}>
            <a className={`portal-ad-listing portal-ad-format-${ad.format || 'card'} portal-ad-animation-${ad.animation || 'fade'}`} href={href} key={key} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} style={{ '--portal-ad-image-width': `${Number(ad.imageWidth) || 40}%`, '--portal-ad-image-height': `${Number(ad.imageHeight) || 240}px` }}>
              {ad.image ? <img src={ad.image} alt="" loading="lazy" /> : null}
              <span className="portal-ad-listing-copy">
                <small>{ad.label || 'PARTNER AURORA MEDIA'}</small>
                <strong>{ad.title || 'Jelajahi website partner'}</strong>
                {ad.description ? <span className="portal-ad-listing-description">{ad.description}</span> : null}
                <span>Lihat website <span aria-hidden="true">↗</span></span>
              </span>
              <span className="portal-ad-listing-index">{String(activeIndex + 1).padStart(2, '0')} / {String(advertisements.length).padStart(2, '0')}</span>
            </a>
          </div>
          {advertisements.length > 1 ? (
            <div className="portal-ads-controls">
              <button type="button" onClick={() => setActiveIndex((activeIndex + advertisements.length - 1) % advertisements.length)} aria-label="Iklan sebelumnya">←</button>
              <span>{String(activeIndex + 1).padStart(2, '0')} / {String(advertisements.length).padStart(2, '0')}</span>
              <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % advertisements.length)} aria-label="Iklan berikutnya">→</button>
              <button type="button" onClick={() => setRotationPaused((paused) => !paused)}>{rotationPaused ? 'Lanjutkan rotasi' : 'Jeda rotasi'}</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const PortalHome = () => {
  const [portalData, setPortalData] = useState(() => normalizePortalData(loadData(storage.portal, defaultPortalData)));
  const [menuOpen, setMenuOpen] = useState(false);
  const portalRef = useRef(null);
  const { theme } = portalData;

  useEffect(() => {
    let active = true;
    siteContactApi.get('portal')
      .then((result) => {
        const nextContact = result?.contact ?? result;
        if (active && nextContact) {
          setPortalData((current) => normalizePortalData(mergeSiteContact(current, nextContact)));
        }
      })
      .catch((error) => { console.error('Kontak publik portal gagal dimuat dari API:', error); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    portalAdsApi.publicConfig()
      .then((result) => {
        if (active && result?.ads) {
          setPortalData((current) => normalizePortalData({ ...current, ads: result.ads }));
        }
      })
      .catch((error) => { console.error('Konfigurasi iklan Aurora Media gagal dimuat:', error); });
    return () => { active = false; };
  }, []);

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

  useEffect(() => {
    const root = portalRef.current;
    if (!root || theme.animations === false || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return undefined;
    if (typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    root.classList.add('portal-entrances-ready');
    root.querySelectorAll('[data-portal-reveal]').forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      root.classList.remove('portal-entrances-ready');
    };
  }, [theme.animations]);

  const presetClass = `portal-preset-${(theme.preset || portalPresets[5].id).replace(/[^a-z0-9-]/g, '')}`;
  const navLinks = [
    { href: '/', label: 'Beranda', icon: 'home' },
    { href: '/beriklan', label: 'Beriklan', icon: 'advertise' },
    { href: '/iklan', label: 'Iklan', icon: 'advertise' },
    { href: '/kontak', label: 'Kontak', icon: 'contact' },
    { href: '/faq', label: 'FAQ', icon: 'faq' },
  ];
  const socialLinks = [
    ['Instagram', portalData.socialLinks.instagram, 'ig'],
    ['TikTok', portalData.socialLinks.tiktok, '♪'],
    ['YouTube', portalData.socialLinks.youtube, '▶'],
  ].filter(([, href]) => isValidPortalPartnerHref(href) && /^https?:\/\//i.test(href));
  const phoneHref = `tel:${String(portalData.contact.phone || '').replace(/[^\d+]/g, '')}`;
  const whatsappHref = createWhatsAppUrl(portalData.whatsapp.number, portalData.whatsapp.message, portalData.siteName, 'Beranda > Kontak');

  const renderAd = (key, className) => {
    const slot = portalData.ads[key];
    if (!slot?.enabled) return null;
    const rawHref = isValidPortalPartnerHref(slot.href) || slot.href?.startsWith('#') ? slot.href : '#contact';
    const href = resolveBrandHref(rawHref);
    const external = /^https?:\/\//i.test(href);
    return (
      <a className={`portal-ad-slot ${className}`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
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

  return (
    <div ref={portalRef} className={`site-shell theme-portal portal-home ${presetClass} ${theme.animations === false ? 'portal-motion-off' : ''} ${theme.elementAnimations?.hero === false ? 'portal-hero-motion-off' : ''} ${theme.elementAnimations?.brandCards === false ? 'portal-card-motion-off' : ''} ${theme.elementAnimations?.ads === false ? 'portal-ad-motion-off' : ''}`} style={portalStyle} data-preset={theme.preset}>
      <SeoHead siteId="portal" title={portalData.seo.title} description={portalData.seo.description} keywords={portalData.seo.keywords} image={portalData.hero.image} siteName={portalData.siteName} noIndex={portalData.seo.noIndex} canonicalUrl={portalData.seo.canonicalUrl} />
      <header className="topbar portal-topbar">
        <div className="container nav-wrap portal-nav-wrap">
          <a className="brand portal-brand" href="/">
            <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span>
            <span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span>
          </a>
          <button className="portal-menu-toggle" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} aria-controls="portal-navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <nav id="portal-navigation" className={`nav-links portal-nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} onClick={(event) => {
                event.preventDefault();
                setMenuOpen(false);
                navigate(item.href);
              }}>
                <svg className={`portal-nav-icon portal-nav-icon-${item.icon}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  {item.icon === 'home' ? <path d="M3 9.2 10 3l7 6.2v7.3h-5v-4.8H8v4.8H3V9.2Z" /> : null}
                  {item.icon === 'advertise' ? <path d="m3 8 12-4v12L3 12V8Zm0 0H2v4h1m2 .8 1.5 4.2h3L8 13.8M15 8.2c1.4.4 2.2 1.1 2.2 1.8s-.8 1.4-2.2 1.8" /> : null}
                  {item.icon === 'contact' ? <path d="M3 5.5h14v9H3v-9Zm.5.5 6.5 5 6.5-5" /> : null}
                  {item.icon === 'faq' ? <path d="M10 17v-.5c0-1.6 3.5-2 3.5-5.3A3.5 3.5 0 0 0 6.6 9.8M10 20h.01" /> : null}
                </svg>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="portal-home-hero">
          <div className="container portal-home-hero-grid">
            <div className="portal-home-hero-copy" data-portal-reveal>
              <p className="eyebrow">{portalData.hero.eyebrow}</p>
              <h1>{portalData.hero.title}</h1>
              <p className="portal-home-hero-description">{portalData.hero.subtitle}</p>
              <div className="portal-hero-actions">
                <a className="primary-btn" href="#brands">{portalData.hero.cta}<span aria-hidden="true"> →</span></a>
              </div>
            </div>
            <div className="portal-home-hero-image" data-portal-reveal>
              <img src={portalData.hero.image} alt={portalData.hero.imageAlt || 'Momen perayaan yang dirancang dengan indah'} loading="eager" />
              <span>AURORA MEDIA <i /> CURATED FOR YOUR MOMENTS</span>
            </div>
          </div>
        </section>

        <section id="brands" className="portal-home-brands">
          <div className="container">
            <div className="portal-home-section-heading" data-portal-reveal>
              <p className="eyebrow">OUR PARTNERS · PARTNER PILIHAN</p>
              <h2>Kolaborasi untuk Momen Berkesan</h2>
            </div>
            <div className="portal-showcase-grid">
              {portalData.services.filter((service) => service.active !== false).map((service, index) => (
                <article className={`portal-showcase-card portal-showcase-card-${index + 1}`} key={`${service.name}-${index}`} style={{ '--brand-accent': service.accent || '#59416F', '--brand-heading-font': `'${service.headingFont || theme.headingFont}', Georgia, serif`, '--brand-body-font': `'${service.bodyFont || theme.bodyFont}', sans-serif` }} data-portal-reveal>
                  <a className="portal-showcase-image" href={isValidPortalPartnerHref(service.href) ? resolveBrandHref(service.href) : '#brands'} target="_blank" rel="noopener noreferrer" aria-label={`Kunjungi ${service.name}`}>
                    {service.image ? <img src={service.image} alt={`Visual ${service.name}`} loading="lazy" /> : <span className="portal-image-fallback" aria-hidden="true">P.</span>}
                    <span>0{index + 1} <i /> {String(Math.max(portalData.services.filter((item) => item.active !== false).length, 1)).padStart(2, '0')}</span>
                  </a>
                  <span className="portal-partner-mark" aria-hidden="true">
                    {service.category?.toLowerCase().includes('music') ? 'M' : service.category?.toLowerCase().includes('invitation') ? '✉' : '♡'}
                  </span>
                  <div className="portal-showcase-copy">
                    <span className="portal-partner-category">{service.category || 'CREATIVE PARTNER'}</span>
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                    <a className="portal-showcase-link" href={isValidPortalPartnerHref(service.href) ? resolveBrandHref(service.href) : '#brands'} target="_blank" rel="noopener noreferrer">{service.button || 'Kunjungi Website'}<span aria-hidden="true">↗</span></a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <PortalHomeAdCarousel ads={portalData.ads} animationsEnabled={theme.animations !== false && theme.elementAnimations?.ads !== false} />
        <PortalPartnerTestimonials />
      </main>

      <footer id="contact" className="portal-home-footer">
        <div className="container portal-footer-inner">
          <a className="brand portal-brand" href="#top">
            <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span>
            <span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span>
          </a>
          <p className="portal-footer-slogan">{portalData.footer}<span aria-hidden="true">♥</span></p>
          <div className="portal-social-links" aria-label="Kontak dan media sosial">
            <a href={phoneHref} aria-label={`Hubungi kami langsung di ${portalData.contact.phone}`}>{portalData.contact.phone}</a>
            <a href={`mailto:${portalData.contact.email}`} aria-label={`Email ${portalData.contact.email}`}>✉</a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Hubungi melalui WhatsApp">◉</a>
            {socialLinks.map(([label, href, icon]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>{icon}</a>)}
          </div>
        </div>
      </footer>

    </div>
  );
};

const portalFaqSections = [
  {
    title: 'A. Tentang Aurora Media',
    questions: [
      ['Apa itu Aurora Media?', 'Aurora Media adalah platform creative collective yang menghubungkan berbagai brand dan layanan kreatif dalam satu portal. Kami menghadirkan pilihan partner di bidang wedding, musik, hiburan, dan undangan digital untuk membantu Anda menemukan layanan yang sesuai dengan kebutuhan.'],
      ['Apa tujuan Aurora Media?', 'Aurora Media hadir untuk mempermudah masyarakat menemukan partner kreatif terpercaya sekaligus membantu brand memperluas jangkauan dan memperkenalkan layanan mereka kepada audiens yang lebih luas.'],
      ['Apakah Aurora Media menyediakan layanan secara langsung?', 'Aurora Media berperan sebagai platform informasi, promosi, dan penghubung antara pengunjung dengan brand partner. Pemesanan dan transaksi layanan dilakukan langsung melalui masing-masing partner, sesuai ketentuan mereka.'],
    ],
  },
  {
    title: 'B. Partner Aurora Media',
    questions: [
      ['Brand apa saja yang tersedia di Aurora Media?', 'Saat ini Aurora Media menghadirkan beberapa partner pilihan, antara lain Nunuy Nadhifa Wedding – Wedding Organizer dan layanan pernikahan; Entertainment Musik – musik, hiburan, dan kebutuhan entertainment; serta Undangan Digital – layanan undangan digital modern. Daftar partner dapat berkembang sesuai kolaborasi terbaru.'],
      ['Bagaimana cara mengunjungi website partner?', 'Anda cukup memilih kartu brand yang tersedia, kemudian klik tombol "Kunjungi Website". Anda akan diarahkan ke website resmi partner yang bersangkutan.'],
      ['Apakah saya bisa menghubungi partner secara langsung?', 'Ya. Setiap partner memiliki informasi kontak atau kanal komunikasi masing-masing. Anda dapat menghubungi mereka untuk mendapatkan informasi layanan, harga, dan pemesanan.'],
      ['Apakah harga layanan partner ditentukan oleh Aurora Media?', 'Tidak. Harga, paket layanan, promo, dan ketentuan pemesanan ditentukan langsung oleh masing-masing partner.'],
    ],
  },
  {
    title: 'C. Promosi dan Kerja Sama',
    questions: [
      ['Apakah brand saya bisa bergabung dengan Aurora Media?', 'Tentu. Aurora Media terbuka untuk kolaborasi dengan brand, bisnis, penyedia jasa, dan pelaku industri kreatif yang ingin memperluas jangkauan melalui platform kami.'],
      ['Bagaimana cara mendaftarkan brand untuk menjadi partner?', 'Anda dapat menghubungi tim Aurora Media melalui halaman Kontak atau WhatsApp. Sampaikan nama brand, kategori bisnis, deskripsi layanan, dan alamat website atau media sosial.'],
      ['Apakah Aurora Media menyediakan layanan iklan dan promosi?', 'Ya. Aurora Media membuka peluang promosi brand melalui penempatan banner, spotlight partner, dan bentuk kolaborasi promosi lainnya sesuai paket kerja sama yang tersedia.'],
      ['Apakah promosi di Aurora Media berbayar?', 'Biaya promosi bergantung pada jenis penempatan, durasi, dan kesepakatan kerja sama. Silakan hubungi tim kami untuk mendapatkan informasi paket promosi.'],
    ],
  },
  {
    title: 'D. Pemesanan dan Keamanan',
    questions: [
      ['Bagaimana cara melakukan pemesanan layanan?', 'Pilih partner yang Anda inginkan, kunjungi website atau kanal kontak mereka, kemudian ikuti prosedur pemesanan yang disediakan oleh partner tersebut.'],
      ['Apakah Aurora Media bertanggung jawab atas transaksi dengan partner?', 'Aurora Media berfungsi sebagai media penghubung dan promosi. Transaksi, pembayaran, kontrak, serta pelaksanaan layanan menjadi tanggung jawab pengunjung dan partner terkait sesuai kesepakatan masing-masing.'],
      ['Bagaimana jika saya mengalami kendala dengan layanan partner?', 'Silakan hubungi partner secara langsung melalui kontak resmi mereka. Jika kendala berkaitan dengan informasi atau penayangan brand di Aurora Media, Anda dapat menghubungi tim Aurora Media.'],
    ],
  },
  {
    title: 'E. Kontak dan Informasi',
    questions: [
      ['Bagaimana cara menghubungi Aurora Media?', 'Anda dapat menghubungi tim kami melalui halaman Kontak, email resmi, WhatsApp, atau media sosial Aurora Media.'],
      ['Bagaimana jika saya ingin mengajukan kerja sama khusus?', 'Kami terbuka terhadap berbagai bentuk kolaborasi kreatif. Kirimkan proposal atau gambaran kerja sama Anda kepada tim Aurora Media untuk dibahas lebih lanjut.'],
    ],
  },
];

const PortalInfoPage = ({ page }) => {
  const portalData = useMemo(() => normalizePortalData(loadData(storage.portal, defaultPortalData)), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme } = portalData;
  const isAdvertisePage = page === 'advertise';
  const isContactPage = page === 'contact';
  const menuName = isAdvertisePage ? 'Beriklan' : isContactPage ? 'Kontak' : 'FAQ';
  const whatsappMessage = isAdvertisePage ? 'Halo, saya tertarik untuk bekerja sama dan beriklan di Aurora Media.' : portalData.whatsapp.message;
  const whatsappHref = createWhatsAppUrl(portalData.whatsapp.number, whatsappMessage, portalData.siteName, menuName);
  const title = isAdvertisePage ? `Beriklan — ${portalData.siteName}` : isContactPage ? `Kontak — ${portalData.siteName}` : `FAQ — ${portalData.siteName}`;
  const description = isAdvertisePage
    ? portalData.promotion.description
    : isContactPage
      ? `Hubungi ${portalData.siteName} melalui WhatsApp, email, atau telepon untuk pertanyaan dan kerja sama.`
      : 'Temukan jawaban atas pertanyaan seputar layanan, partner, promosi, dan peluang kerja sama bersama Aurora Media.';
  const portalStyle = {
    '--primary': theme.primary,
    '--accent': theme.accent,
    '--portal-surface': theme.secondary,
    '--portal-background': theme.background,
    '--portal-radius': `${theme.radius}px`,
    '--portal-gap': `${theme.spacing}px`,
    '--portal-heading-font': `'${theme.headingFont}', Georgia, serif`,
    '--portal-body-font': `'${theme.bodyFont}', sans-serif`,
  };
  const socialLinks = [
    ['Instagram', portalData.socialLinks.instagram],
    ['TikTok', portalData.socialLinks.tiktok],
    ['YouTube', portalData.socialLinks.youtube],
  ].filter(([, href]) => isValidPortalPartnerHref(href) && /^https?:\/\//i.test(href));
  const phoneHref = `tel:${String(portalData.contact.phone || '').replace(/[^\d+]/g, '')}`;

  return (
    <div className={`site-shell theme-portal portal-home portal-info-page portal-preset-${(theme.preset || portalPresets[5].id).replace(/[^a-z0-9-]/g, '')}`} style={portalStyle}>
      <SeoHead siteId="portal" isHomePage={false} title={title} description={description || portalData.seo.description} keywords={portalData.seo.keywords} image={portalData.hero.image} siteName={portalData.siteName} noIndex={portalData.seo.noIndex} canonicalUrl={portalData.seo.canonicalUrl} />
      <header className="topbar portal-topbar">
        <div className="container nav-wrap portal-nav-wrap">
          <a className="brand portal-brand" href="/">
            <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span>
            <span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span>
          </a>
          <button className="portal-menu-toggle" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} aria-controls="portal-navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <nav id="portal-navigation" className={`nav-links portal-nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
            <a href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>Beranda</a>
            <a href="/beriklan" aria-current={isAdvertisePage ? 'page' : undefined} onClick={(event) => { event.preventDefault(); setMenuOpen(false); navigate('/beriklan'); }}>Beriklan</a>
            <a href="/iklan" onClick={(event) => { event.preventDefault(); setMenuOpen(false); navigate('/iklan'); }}>Iklan</a>
            <a href="/kontak" aria-current={isContactPage ? 'page' : undefined} onClick={(event) => { event.preventDefault(); setMenuOpen(false); navigate('/kontak'); }}>Kontak</a>
            <a href="/faq" aria-current={!isAdvertisePage && !isContactPage ? 'page' : undefined} onClick={(event) => { event.preventDefault(); setMenuOpen(false); navigate('/faq'); }}>FAQ</a>
          </nav>
        </div>
      </header>

      <main id="top" className="portal-info-main">
        {isAdvertisePage ? (
          <>
            <section className="portal-info-hero">
              <div className="container portal-info-hero-grid">
                <div>
                  <p className="eyebrow">{portalData.promotion.eyebrow}</p>
                  <h1>{portalData.promotion.title}</h1>
                  <p>{portalData.promotion.description}</p>
                  <a className="portal-info-primary" href={whatsappHref} target="_blank" rel="noopener noreferrer">{portalData.promotion.button}<span aria-hidden="true"> ↗</span></a>
                </div>
                <div className="portal-info-art" aria-hidden="true"><span>AURORA MEDIA</span><strong>Creative<br />connections.</strong><i>✳</i></div>
              </div>
            </section>
            <section className="portal-info-details">
              <div className="container">
                <div className="portal-info-heading">
                  <p className="eyebrow">GROW WITH AURORA MEDIA</p>
                  <h2>Jangkau audiens yang tepat, bersama partner kreatif.</h2>
                </div>
                <div className="portal-info-benefits">
                  <article><span>01</span><h3>Profil brand</h3><p>Tampilkan layanan dan cerita brand Anda kepada pengunjung Aurora Media.</p></article>
                  <article><span>02</span><h3>Ruang promosi</h3><p>Diskusikan penempatan promosi yang sesuai dengan kebutuhan brand.</p></article>
                  <article><span>03</span><h3>Kolaborasi kreatif</h3><p>Temukan peluang kolaborasi di bidang wedding, musik, hiburan, dan undangan.</p></article>
                </div>
              </div>
            </section>
          </>
        ) : isContactPage ? (
          <>
            <section className="portal-info-hero portal-contact-hero">
              <div className="container portal-info-hero-grid">
                <div>
                  <p className="eyebrow">KAMI SIAP TERHUBUNG</p>
                  <h1>Ada cerita atau rencana yang ingin Anda wujudkan?</h1>
                  <p>Hubungi tim Aurora Media untuk pertanyaan, rekomendasi partner, maupun peluang kerja sama. Kami akan senang mendengar dari Anda.</p>
                </div>
                <div className="portal-info-art" aria-hidden="true"><span>LET'S TALK</span><strong>Every good<br />idea starts<br />with a hello.</strong><i>✳</i></div>
              </div>
            </section>
            <section className="portal-info-details">
              <div className="container">
                <div className="portal-info-heading">
                  <p className="eyebrow">KONTAK AURORA MEDIA</p>
                  <h2>Mari mulai percakapan.</h2>
                </div>
                <div className="portal-contact-grid">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer"><span>WHATSAPP</span><strong>{portalData.contact.phone}</strong><small>Kirim pesan kepada tim kami ↗</small></a>
                  <a href={`mailto:${portalData.contact.email}`}><span>EMAIL</span><strong>{portalData.contact.email}</strong><small>Kirim pertanyaan melalui email ↗</small></a>
                  <a href={phoneHref}><span>TELEPON</span><strong>{portalData.contact.phone}</strong><small>Hubungi kami langsung ↗</small></a>
                  <div className="portal-contact-address"><span>LOKASI</span><strong>{portalData.contact.address}</strong><small>Indonesia</small></div>
                </div>
                {socialLinks.length > 0 ? (
                  <div className="portal-contact-socials">
                    <span>Ikuti kami</span>
                    {socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}
                  </div>
                ) : null}
                <a className="portal-info-secondary" href="/beriklan">Ingin mempromosikan brand Anda? <strong>Pelajari cara beriklan ↗</strong></a>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="portal-faq-hero">
              <div className="container">
                <p className="eyebrow">AURORA MEDIA — CREATIVE COLLECTIVE</p>
                <h1>Frequently Asked Questions <span>(FAQ)</span></h1>
                <p>Selamat datang di Aurora Media. Temukan jawaban atas pertanyaan seputar layanan, partner, promosi, dan peluang kerja sama bersama kami.</p>
              </div>
            </section>
            <section className="portal-faq-content">
              <div className="container">
                {portalFaqSections.map((section) => (
                  <section className="portal-faq-group" key={section.title}>
                    <h2>{section.title}</h2>
                    <div className="portal-faq-list">
                      {section.questions.map(([question, answer], index) => (
                        <details key={question}>
                          <summary><span>{String(portalFaqSections.slice(0, portalFaqSections.indexOf(section)).reduce((total, item) => total + item.questions.length, 0) + index + 1).padStart(2, '0')}</span>{question}</summary>
                          <p>{answer}</p>
                        </details>
                      ))}
                    </div>
                  </section>
                ))}
                <div className="portal-faq-cta">
                  <p className="eyebrow">AURORA MEDIA — CREATIVE COLLECTIVE</p>
                  <h2>Masih Ada Pertanyaan?</h2>
                  <p>Kami siap membantu Anda menemukan partner kreatif yang tepat atau membuka peluang kolaborasi bersama Aurora Media.</p>
                  <a className="portal-info-primary" href="/kontak">Hubungi tim kami <span aria-hidden="true">→</span></a>
                  <p className="portal-faq-tagline"><strong>{portalData.siteName} – Creative Collective</strong><br /><em>Creative Brands. One Portal. Endless Possibilities.</em></p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="portal-home-footer">
        <div className="container portal-footer-inner">
          <a className="brand portal-brand" href="/">
            <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span>
            <span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span>
          </a>
          <p className="portal-footer-slogan">{portalData.footer}<span aria-hidden="true">♥</span></p>
          <div className="portal-social-links" aria-label="Kontak dan media sosial">
            <a href={`mailto:${portalData.contact.email}`} aria-label={`Email ${portalData.contact.email}`}>✉</a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Hubungi melalui WhatsApp">◉</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PortalAdsPage = () => {
  const [portalData, setPortalData] = useState(() => normalizePortalData(loadData(storage.portal, defaultPortalData)));
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const { theme } = portalData;
  const page = portalData.ads.page;
  const advertisements = useMemo(() => Object.entries(portalData.ads).filter(([key, ad]) => key !== 'page' && ad.enabled), [portalData.ads]);
  const activeAdvertisement = advertisements.length ? advertisements[activeIndex % advertisements.length] : null;
  const portalStyle = {
    '--primary': theme.primary,
    '--accent': theme.accent,
    '--portal-surface': theme.secondary,
    '--portal-background': theme.background,
    '--portal-radius': `${theme.radius}px`,
    '--portal-gap': `${theme.spacing}px`,
    '--portal-heading-font': `'${theme.headingFont}', Georgia, serif`,
    '--portal-body-font': `'${theme.bodyFont}', sans-serif`,
  };

  useEffect(() => {
    let active = true;
    portalAdsApi.publicConfig()
      .then((result) => {
        if (active && result?.ads) {
          setPortalData((current) => normalizePortalData({ ...current, ads: result.ads }));
        }
      })
      .catch((error) => { console.error('Konfigurasi iklan Aurora Media gagal dimuat:', error); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (rotationPaused || advertisements.length < 2 || !activeAdvertisement) return undefined;
    const duration = Math.min(120, Math.max(1, Number(activeAdvertisement[1].duration) || 8));
    const timer = window.setTimeout(() => setActiveIndex((index) => (index + 1) % advertisements.length), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [activeAdvertisement, advertisements.length, rotationPaused]);

  const showAdvertisement = (index) => {
    setActiveIndex((index + advertisements.length) % advertisements.length);
  };

  return (
    <div className={`site-shell theme-portal portal-home portal-info-page portal-ads-page portal-preset-${(theme.preset || portalPresets[5].id).replace(/[^a-z0-9-]/g, '')} ${theme.animations === false || theme.elementAnimations?.ads === false ? 'portal-ad-motion-off' : ''}`} style={portalStyle}>
      <SeoHead siteId="portal" isHomePage={false} title={`${page.title} | ${portalData.siteName}`} description={page.description || portalData.seo.description} keywords={portalData.seo.keywords} image={portalData.hero.image} siteName={portalData.siteName} noIndex={portalData.seo.noIndex} canonicalUrl={portalData.seo.canonicalUrl} />
      <header className="topbar portal-topbar">
        <div className="container nav-wrap portal-nav-wrap">
          <a className="brand portal-brand" href="/">
            <span className="logo-mark">{portalData.logoImage ? <img src={portalData.logoImage} alt="" /> : portalData.logo}</span>
            <span>{portalData.siteName}<small>CREATIVE COLLECTIVE</small></span>
          </a>
          <button className="portal-menu-toggle" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} aria-controls="portal-navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <nav id="portal-navigation" className={`nav-links portal-nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Navigasi utama">
            <a href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>Beranda</a>
            <a href="/beriklan" onClick={(event) => { event.preventDefault(); navigate('/beriklan'); }}>Beriklan</a>
            <a href="/iklan" aria-current="page">Iklan</a>
            <a href="/kontak" onClick={(event) => { event.preventDefault(); navigate('/kontak'); }}>Kontak</a>
            <a href="/faq" onClick={(event) => { event.preventDefault(); navigate('/faq'); }}>FAQ</a>
          </nav>
        </div>
      </header>
      <main className="portal-ads-main">
        <section className="portal-ads-hero">
          <div className="container">
            <p className="eyebrow">PARTNER &amp; REKOMENDASI</p>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </div>
        </section>
        <section className="container portal-ad-display" aria-label="Iklan Aurora Media">
          {activeAdvertisement ? (
            <>
              <div className={`portal-ad-listings portal-ad-layout-${page.layout || 'grid'}`}>
                {(() => {
                  const [key, ad] = activeAdvertisement;
                  const rawHref = isValidPortalPartnerHref(ad.href) ? ad.href : '#';
                  const href = resolveBrandHref(rawHref);
                  const external = /^https?:\/\//i.test(href);
                  return (
                    <a className={`portal-ad-listing portal-ad-format-${ad.format || 'card'} portal-ad-animation-${ad.animation || 'fade'}`} href={href} key={key} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} style={{ '--portal-ad-image-width': `${Number(ad.imageWidth) || 40}%`, '--portal-ad-image-height': `${Number(ad.imageHeight) || 240}px` }}>
                      {ad.image ? <img src={ad.image} alt="" loading="lazy" /> : null}
                      <span className="portal-ad-listing-copy">
                        <small>{ad.label || 'PARTNER AURORA MEDIA'}</small>
                        <strong>{ad.title || 'Jelajahi website partner'}</strong>
                        {ad.description ? <span className="portal-ad-listing-description">{ad.description}</span> : null}
                        <span>Lihat website <span aria-hidden="true">↗</span></span>
                      </span>
                      <span className="portal-ad-listing-index">{String(activeIndex + 1).padStart(2, '0')} / {String(advertisements.length).padStart(2, '0')}</span>
                    </a>
                  );
                })()}
              </div>
              {advertisements.length > 1 ? (
                <div className="portal-ads-controls">
                  <button type="button" onClick={() => showAdvertisement(activeIndex - 1)} aria-label="Iklan sebelumnya">←</button>
                  <span>{String(activeIndex + 1).padStart(2, '0')} / {String(advertisements.length).padStart(2, '0')}</span>
                  <button type="button" onClick={() => showAdvertisement(activeIndex + 1)} aria-label="Iklan berikutnya">→</button>
                  <button type="button" onClick={() => setRotationPaused((paused) => !paused)}>{rotationPaused ? 'Lanjutkan rotasi' : 'Jeda rotasi'}</button>
                </div>
              ) : null}
            </>
          ) : <p className="portal-ads-empty">Belum ada iklan aktif saat ini.</p>}
        </section>
      </main>
      <footer className="portal-home-footer">
        <div className="container portal-footer-inner">
          <a className="brand portal-brand" href="/">{portalData.siteName}</a>
          <a className="portal-ads-footer-link" href="/beriklan">Promosikan brand Anda ↗</a>
        </div>
      </footer>
    </div>
  );
};

const portalTestimonialSources = [
  { site: 'portal', label: 'Aurora Media', href: '/', key: storage.portal, defaults: defaultPortalData },
  { site: 'nunuy', label: 'Nunuy Nadhifa Wedding', href: '/nunuy-nadhifa-wedding', key: storage.nunuy, defaults: defaultNunuyData },
  { site: 'gibrig', label: 'Entertainment Musik', href: '/gibrig', key: storage.gibrig, defaults: defaultGibrigData },
  { site: 'invitation', label: 'Undangan Digital', href: '/undangan', key: storage.invitation, defaults: defaultInvitationData },
];

const PortalPartnerTestimonials = () => {
  const [publishedItems, setPublishedItems] = useState([]);
  const [sourceErrors, setSourceErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingErrors, setRatingErrors] = useState({});
  const [ratingMessages, setRatingMessages] = useState({});
  const [submittingSite, setSubmittingSite] = useState('');
  const [selectedRatings, setSelectedRatings] = useState({});
  const configuredItems = useMemo(() => portalTestimonialSources.flatMap((source) => {
    const data = mergeDataDefaults(source.defaults, loadData(source.key, source.defaults));
    const entries = source.site === 'nunuy' ? data.testimonials?.items : data.testimonials;
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((item) => item?.active !== false && item?.name && (item.text || item.message || item.quote))
      .map((item, index) => ({
        id: `${source.site}-cms-${item.id || index}`,
        site: source.site,
        name: item.name,
        message: item.text || item.message || item.quote,
        event: item.event || item.eventType || '',
        rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
        source: source.label,
      }));
  }), []);

  useEffect(() => {
    let active = true;
    Promise.allSettled(portalTestimonialSources.map(async (source) => ({
      source,
      items: await testimonialsApi.listPublic(source.site),
    })))
      .then((results) => {
        if (!active) return;
        const nextItems = [];
        const nextErrors = [];
        results.forEach((result, index) => {
          const source = portalTestimonialSources[index];
          if (result.status === 'rejected') {
            nextErrors.push(`Testimoni ${source.label} belum dapat dimuat: ${result.reason.message}`);
            return;
          }
          if (!Array.isArray(result.value.items)) {
            nextErrors.push(`Data testimoni ${source.label} tidak valid.`);
            return;
          }
          result.value.items.forEach((item) => {
            const message = item.message || item.text || item.quote || '';
            const kind = item.kind || 'testimonial';
            if (!item.name || (kind !== 'rating' && !message)) return;
            nextItems.push({
              id: `${source.site}-${item.id}`,
              site: source.site,
              kind,
              name: item.name,
              message,
              event: item.event || item.eventType || '',
              rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
              source: source.label,
            });
          });
        });
        setPublishedItems(nextItems);
        setSourceErrors(nextErrors);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setSourceErrors([`Testimoni partner belum dapat dimuat: ${error.message}`]);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const items = [...configuredItems, ...publishedItems].filter((item, index, allItems) => {
    if (item.kind === 'rating') return true;
    const key = `${item.site}-${item.name.trim().toLocaleLowerCase()}-${item.message.trim().toLocaleLowerCase()}`;
    return allItems.findIndex((candidate) => `${candidate.site}-${candidate.name.trim().toLocaleLowerCase()}-${candidate.message.trim().toLocaleLowerCase()}` === key) === index;
  });
  const testimonials = items.filter((item) => item.message);

  const selectRating = (event) => {
    const { site, rating } = event.currentTarget.dataset;
    setSelectedRatings((current) => ({ ...current, [site]: Number(rating) }));
  };

  const submitRating = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const site = form.dataset.site;
    const rating = selectedRatings[site];
    if (!rating) return;
    setRatingErrors((current) => ({ ...current, [site]: '' }));
    setRatingMessages((current) => ({ ...current, [site]: '' }));
    setSubmittingSite(site);
    try {
      await testimonialsApi.createPublic({
        site,
        kind: 'rating',
        rating,
        message: new FormData(form).get('message')?.toString().trim() || null,
      });
      setRatingMessages((current) => ({ ...current, [site]: 'Terima kasih! Rating Anda menunggu persetujuan.' }));
      form.reset();
      setSelectedRatings((current) => ({ ...current, [site]: 0 }));
    } catch (error) {
      setRatingErrors((current) => ({ ...current, [site]: `Rating gagal dikirim: ${error.message}` }));
    } finally {
      setSubmittingSite('');
    }
  };

  return (
    <section className="portal-partner-testimonials" aria-labelledby="portal-partner-testimonials-title">
      <div className="container portal-partner-testimonials-inner">
        <div className="portal-partner-testimonials-heading">
          <p className="eyebrow">CERITA DARI PARTNER KAMI</p>
          <h2 id="portal-partner-testimonials-title">Momen berkesan, diceritakan langsung.</h2>
          <p>Testimoni ditampilkan dari website partner Aurora Media yang terhubung dan telah dipublikasikan.</p>
        </div>
        {testimonials.length > 0 ? (
          <div className="portal-partner-testimonial-grid">
            {testimonials.map((item) => (
              <article className="portal-partner-testimonial-card" key={item.id}>
                <span className="portal-partner-testimonial-stars" aria-label={`Rating ${item.rating} dari 5`}>{'★'.repeat(item.rating)}</span>
                <blockquote>“{item.message}”</blockquote>
                <strong>{item.kind === 'rating' ? 'Pengunjung' : item.name}</strong>
                {item.event ? <small>{item.kind === 'rating' ? 'Rating website' : item.event}</small> : null}
                <a className="portal-partner-testimonial-source" href={portalTestimonialSources.find((source) => source.label === item.source)?.href || '/'} target="_blank" rel="noopener noreferrer">{item.source} ↗</a>
              </article>
            ))}
          </div>
        ) : (
          <p className="portal-partner-testimonial-empty">{loading ? 'Memuat testimoni partner…' : 'Belum ada testimoni partner yang dipublikasikan.'}</p>
        )}
        {sourceErrors.map((error) => <p className="portal-partner-testimonial-error" role="status" key={error}>{error}</p>)}
        <div className="portal-website-ratings">
          <div className="portal-website-ratings-heading">
            <p className="eyebrow">RATING WEBSITE</p>
            <h3>Bagikan penilaian Anda</h3>
            <p>Pilih website yang pernah Anda gunakan. Penilaian ditampilkan setelah ditinjau admin.</p>
          </div>
          <div className="portal-website-rating-grid">
            {portalTestimonialSources.map((source) => {
              const reviews = items.filter((item) => item.site === source.site);
              const averageRating = reviews.length
                ? reviews.reduce((total, item) => total + item.rating, 0) / reviews.length
                : 0;
              return (
                <article className="portal-website-rating-card" key={source.site}>
                  <a className="portal-website-rating-name" href={source.href}>{source.label}</a>
                  {reviews.length ? (
                    <p className="portal-website-rating-summary">
                      <span aria-label={`Rata-rata ${averageRating.toFixed(1)} dari 5`}>{'★'.repeat(Math.round(averageRating))}</span>
                      <strong>{averageRating.toFixed(1)}</strong>
                      <small>{reviews.length} penilaian</small>
                    </p>
                  ) : <p className="portal-website-rating-empty">{loading ? 'Memuat penilaian…' : 'Belum ada penilaian'}</p>}
                  {testimonials.length > 0 ? <small className="portal-website-rating-review-count">{testimonials.length} testimoni</small> : null}
                  <div className="portal-website-rating-stars" role="group" aria-label={`Beri rating untuk ${source.label}`}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        aria-pressed={selectedRatings[source.site] === rating}
                        aria-label={`Beri rating ${rating} dari 5 untuk ${source.label}`}
                        data-site={source.site}
                        data-rating={rating}
                        className={rating <= selectedRatings[source.site] ? 'is-selected' : ''}
                        disabled={submittingSite === source.site}
                        onClick={selectRating}
                      >★</button>
                    ))}
                  </div>
                  <span className="portal-website-rating-hint">{selectedRatings[source.site] ? `${selectedRatings[source.site]} dari 5 bintang` : 'Pilih bintang untuk menilai'}</span>
                  {selectedRatings[source.site] ? (
                    <form className="portal-website-rating-submit" data-site={source.site} onSubmit={submitRating}>
                      <label className="portal-website-rating-message-label" htmlFor={`rating-message-${source.site}`}>Pesan <span>opsional</span></label>
                      <textarea id={`rating-message-${source.site}`} name="message" maxLength={1000} rows={2} placeholder="Bagikan pengalaman singkat Anda (opsional)" />
                      <button type="submit" disabled={submittingSite === source.site}>{submittingSite === source.site ? 'Mengirim…' : 'Kirim rating'}</button>
                    </form>
                  ) : null}
                  {ratingMessages[source.site] ? <p className="portal-rating-feedback" role="status">{ratingMessages[source.site]}</p> : null}
                  {ratingErrors[source.site] ? <p className="portal-rating-feedback portal-rating-error" role="alert">{ratingErrors[source.site]}</p> : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const gibrigPages = [
  { slug: '', label: 'Beranda', title: 'Beranda' },
  { slug: 'tentang', label: 'Tentang & Artis', title: 'Tentang & Artis' },
  { slug: 'entertainment', label: 'Entertainment', title: 'Entertainment' },
  { slug: 'paket', label: 'Paket', title: 'Paket Hiburan' },
  { slug: 'galeri', label: 'Galeri', title: 'Galeri' },
  { slug: 'testimoni', label: 'Testimoni', title: 'Testimoni' },
];

const GibrigHome = ({ path }) => {
  const [data, setData] = useState(() => {
    const saved = loadData(storage.gibrig, defaultGibrigData);
    return {
      ...mergeDataDefaults(defaultGibrigData, saved),
      logoImage: saved.logoImage || defaultGibrigData.logoImage,
    };
  });
  const [previewImage, setPreviewImage] = useState(null);
  const previewTriggerRef = useRef(null);
  const previewCloseRef = useRef(null);
  const activePage = gibrigPages.find((page) => page.slug === path.replace(/^\/gibrig\/?/, '')) || gibrigPages[0];

  useEffect(() => {
    let active = true;
    siteContactApi.get('gibrig')
      .then((result) => {
        const nextContact = result?.contact ?? result;
        if (active && nextContact) {
          setData((current) => mergeSiteContact(current, nextContact));
        }
      })
      .catch((error) => { console.error('Kontak publik Entertainment Musik gagal dimuat dari API:', error); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!previewImage) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setPreviewImage(null);
      previewTriggerRef.current?.focus();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    previewCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewImage]);
  const openImagePreview = (event, src, alt) => {
    previewTriggerRef.current = event.currentTarget;
    setPreviewImage({ src, alt });
  };
  const closeImagePreview = () => {
    setPreviewImage(null);
    previewTriggerRef.current?.focus();
  };
  const artists = Array.isArray(data.artists) ? data.artists : [];
  const packages = Array.isArray(data.packages) ? data.packages : [];
  const gallery = Array.isArray(data.gallery) ? data.gallery : [];
  const socialData = data.social || {};
  const socialLinks = [
    { name: 'TikTok', value: socialData.tiktok || data.socials?.[0], base: 'https://www.tiktok.com/' },
    { name: 'YouTube', value: socialData.youtube || data.socials?.[1], base: 'https://www.youtube.com/' },
    { name: 'Instagram', value: socialData.instagram || data.socials?.[2], base: 'https://www.instagram.com/' },
  ].filter((item) => item.value);
  const socialHref = (base, value) => {
    const profile = String(value).trim();
    let url;
    try {
      url = new URL(profile);
    } catch {}
    if (url && ['http:', 'https:'].includes(url.protocol)) return url.toString();
    const handle = profile.replace(/^@/, '');
    return `${base}${base.includes('instagram.com') ? handle : `@${handle}`}`;
  };
  const phoneDigits = String(data.contact?.phone || data.whatsapp?.number || '').replace(/\D/g, '');
  const whatsappNumber = String(data.whatsapp?.number || phoneDigits).replace(/\D/g, '');
  const whatsappMessage = data.whatsapp?.message || `Halo ${data.siteName}, saya ingin bertanya mengenai hiburan untuk acara.`;
  const whatsappMenuName = activePage.label || 'Beranda';

  return (
    <div className={`site-shell gibrig-shell theme-layout-${data.theme?.layout || 'editorial'} theme-preset-${data.theme?.preset || 'default'}`} style={themeStyle(data.theme)}>
      <SeoHead siteId="gibrig" siteBasePath="/gibrig" isHomePage={!activePage.slug} title={activePage.slug ? `${activePage.title} | ${data.siteName}` : data.seo.title} description={data.seo.description} keywords={data.seo.keywords} image={data.hero.image} siteName={data.siteName} noIndex={data.seo.noIndex} canonicalUrl={data.seo.canonicalUrl} faviconUrl="/musik-id-favicon.png" />
      <header className="topbar gibrig-topbar">
        <div className="container nav-wrap gibrig-nav-wrap">
          <a className="brand gibrig-brand" href="/gibrig" aria-label={`${data.siteName}, beranda`}>
            {data.logoImage ? <img className="gibrig-brand-logo" src={data.logoImage} alt={`${data.siteName} logo`} /> : <span className="logo-mark">{data.logo || 'G'}</span>}
            <span className="gibrig-brand-copy"><strong>Entertainment Musik</strong><small>{data.siteName}</small></span>
          </a>
          <nav className="nav-links gibrig-nav" aria-label="Navigasi utama">
            {gibrigPages.map((page) => (
              <a
                key={page.slug || 'home'}
                href={page.slug ? `/gibrig/${page.slug}` : '/gibrig'}
                aria-current={activePage.slug === page.slug ? 'page' : undefined}
              >
                {page.label}
              </a>
            ))}
            <a href="#social-media">Sosial Media</a>
            <a href={getSiteUrl('aurora')}>Aurora Media</a>
          </nav>
          <a
            className="gibrig-contact-cta"
            href={createWhatsAppUrl(whatsappNumber, whatsappMessage, 'Entertainment Musik', `${whatsappMenuName} > Hubungi Kami`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ◉ <span>Hubungi Kami</span>
          </a>
        </div>
      </header>

      <main>
        {activePage.slug === '' ? <section id="home" className="hero-section hero-compact gibrig-hero">
          <div className="gibrig-music-notes" aria-hidden="true"><span>♫</span><span>♪</span><span>♫</span><span>♪</span></div>
          <div className="container hero-grid gibrig-hero-grid">
            <div className="gibrig-hero-copy">
              <p className="eyebrow">{data.hero.eyebrow || data.tagline}</p>
              <h1>{data.hero.title}</h1>
              <h2 className="gibrig-hero-subheading">Artist Performance &amp; Entertainment Studio</h2>
              <p>{data.hero.subtitle}</p>
              <a className="primary-btn gibrig-hero-cta" href="/gibrig/paket">{data.hero.cta} <span aria-hidden="true">›</span></a>
            </div>
            <div className="hero-visual gibrig-visual">
              {data.hero.image ? (
                <button type="button" className="gibrig-image-trigger gibrig-hero-image-trigger" aria-label="Perbesar gambar utama" onClick={(event) => openImagePreview(event, data.hero.image, `${data.siteName} performance`)}>
                  <img className="site-hero-image" src={data.hero.image} alt={`${data.siteName} performance`} loading="eager" />
                </button>
              ) : <div className="gibrig-hero-placeholder" aria-hidden="true">♫</div>}
              <div className="gibrig-hero-shade" />
              {artists[0] ? <div className="hero-panel gibrig-hero-panel"><span>{artists[0].category}</span><strong>{artists[0].name}</strong></div> : null}
            </div>
          </div>
        </section> : null}

        {activePage.slug === '' || activePage.slug === 'tentang' ? <section id="about" className={`section-wrap gibrig-about${activePage.slug ? ' gibrig-inner-page' : ''}`}>
          {activePage.slug ? <div className="container">
            <div className="section-head">
              <p className="eyebrow">Tentang Kami</p>
              <h1>Tentang &amp; Artis</h1>
              {data.about ? <p className="gibrig-about-description">{data.about}</p> : null}
            </div>
          </div> : null}
          <div className="container">
            <div id="artists" className="gibrig-artist-list">
              {artists.map((artist, index) => (
                <article key={`${artist.name}-${index}`} className="gibrig-artist-profile" id={index === 0 ? 'entertainment-profile' : undefined}>
                  <div className="gibrig-artist-portrait">
                    {artist.image ? (
                      <button type="button" className="gibrig-image-trigger gibrig-artist-image-trigger" aria-label={`Perbesar foto ${artist.name}`} onClick={(event) => openImagePreview(event, artist.image, artist.name)}>
                        <img src={artist.image} alt={artist.name} loading="lazy" />
                      </button>
                    ) : <span aria-hidden="true">{artist.name?.charAt(0) || '♫'}</span>}
                  </div>
                  <div className="gibrig-artist-copy">
                    <p className="eyebrow">{activePage.slug ? 'ARTIS' : 'ABOUT'} <span /></p>
                    <h2>{artist.name}</h2>
                    <strong className="gibrig-artist-category">{artist.category}</strong>
                    <p>{artist.description}</p>
                    {!activePage.slug && data.about ? <p className="gibrig-about-summary">{data.about}</p> : null}
                    {artist.price && String(artist.price).trim().toLowerCase() !== 'menyesuaikan lokasi' ? <p className="gibrig-artist-price">{artist.price}</p> : null}
                    <button className="gibrig-pill-button" onClick={() => openWhatsApp(whatsappNumber, `${whatsappMessage} Saya ingin berkonsultasi tentang penampilan ${artist.name}. Mohon informasikan pilihan paket dan harga.`, 'Entertainment Musik', `${whatsappMenuName} > Artis ${artist.name}`)}>
                      Mengenal Lebih Dekat <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section> : null}

        {activePage.slug === 'entertainment' ? <section id="entertainment" className="section-wrap gibrig-entertainment">
          <div className="container gibrig-entertainment-layout">
            <div className="gibrig-entertainment-copy">
              <p className="eyebrow">Gibrig Entertainment</p>
              <h1>Artist Performance &amp; Entertainment Studio</h1>
              <p>{data.hero.subtitle}</p>
              <p>{data.about}</p>
              <a className="gibrig-pill-button" href="/gibrig/paket">Lihat pilihan paket <span aria-hidden="true">›</span></a>
            </div>
            {data.hero.image ? (
              <button type="button" className="gibrig-image-trigger gibrig-entertainment-image-trigger" aria-label="Perbesar gambar hiburan live" onClick={(event) => openImagePreview(event, data.hero.image, `${data.siteName} — hiburan live`)}>
                <img src={data.hero.image} alt={`${data.siteName} — hiburan live`} loading="lazy" />
              </button>
            ) : null}
          </div>
        </section> : null}

        {activePage.slug === '' || activePage.slug === 'paket' ? <section id="packages" className={`section-wrap gibrig-packages${activePage.slug ? ' gibrig-inner-page' : ''}`}>
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Paket <span /></p>
              <h2>Event packages</h2>
            </div>
            <div className="pricing-grid">
              {packages.map((pkg, index) => (
                <article key={`${pkg.name}-${index}`} className="price-card gibrig-package-card">
                  {pkg.image ? (
                    <button type="button" className="gibrig-image-trigger gibrig-package-image-trigger" aria-label={`Perbesar gambar ${pkg.name}`} onClick={(event) => openImagePreview(event, pkg.image, `${pkg.name} — ${pkg.label || 'paket hiburan'}`)}>
                      <img src={pkg.image} alt={`${pkg.name} — ${pkg.label || 'paket hiburan'}`} loading="lazy" />
                    </button>
                  ) : <div className="gibrig-package-placeholder" aria-hidden="true">♫</div>}
                  <div className="gibrig-package-heading"><span>{pkg.label || `Pilihan ${index + 1}`}</span><h3>{pkg.name}</h3></div>
                  {pkg.price && String(pkg.price).trim().toLowerCase() !== 'menyesuaikan lokasi' ? <strong>{pkg.price}</strong> : null}
                  <p>{pkg.description}</p>
                  {Array.isArray(pkg.items) && <ul>{pkg.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>}
                  <button className="gibrig-pill-button" onClick={() => openWhatsApp(whatsappNumber, `${whatsappMessage} Saya ingin menanyakan harga ${pkg.name}${pkg.label ? ` (${pkg.label})` : ''}. Mohon kirimkan rincian fasilitas paket tersebut.`, 'Entertainment Musik', `${whatsappMenuName} > Tanya Paket ${pkg.name}`)}>Tanya Paket <span aria-hidden="true">→</span></button>
                </article>
              ))}
            </div>
          </div>
        </section> : null}

        {activePage.slug === '' || activePage.slug === 'galeri' ? <section id="gallery" className={`section-wrap muted-bg gibrig-gallery${activePage.slug ? ' gibrig-inner-page' : ''}`}>
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Galeri <span /></p>
              <h2>Momen di atas panggung</h2>
            </div>
            <div className="portal-gallery-grid">
              {gallery.map((item, index) => (
                <figure key={`${item.src}-${index}`} className="gibrig-gallery-item">
                  <button type="button" className="gibrig-image-trigger gibrig-gallery-image-trigger" aria-label={`Perbesar gambar: ${item.caption || `momen panggung ${index + 1}`}`} onClick={(event) => openImagePreview(event, item.src, item.caption || `${data.siteName} — momen panggung ${index + 1}`)}>
                    <img src={item.src} alt={item.caption || `${data.siteName} — momen panggung ${index + 1}`} loading="lazy" />
                  </button>
                  <figcaption>{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section> : null}

        {activePage.slug === '' || activePage.slug === 'testimoni' ? (
          <PublicTestimonials
            site="gibrig"
            initialItems={data.testimonials}
            sectionId="testimonials"
            eyebrow="Testimoni"
            title={activePage.slug === 'testimoni' ? 'Kesan pelanggan' : 'Cerita dari keluarga dan klien'}
            className={`gibrig-testimonials${activePage.slug ? ' gibrig-inner-page' : ''}`}
          />
        ) : null}

        <section id="contact" className="section-wrap gibrig-contact">
          <div className="container gibrig-footer-content">
            <div className="gibrig-footer-brand">
              <a className="brand gibrig-brand" href="/gibrig">
                {data.logoImage ? <img className="gibrig-brand-logo" src={data.logoImage} alt={`${data.siteName} logo`} /> : <span className="logo-mark">{data.logo || 'G'}</span>}
                <span className="gibrig-brand-copy"><strong>Entertainment Musik</strong><small>{data.siteName}</small></span>
              </a>
              <p>{data.about}</p>
              <div className="gibrig-social-links" id="social-media">
                <strong>Sosial Media</strong>
                {socialLinks.map((item) => (
                  <a key={item.name} href={socialHref(item.base, item.value)} target="_blank" rel="noopener noreferrer">
                    <span className={`gibrig-social-icon gibrig-social-icon-${item.name.toLowerCase()}`} aria-hidden="true">
                      {item.name === 'YouTube' ? '▶' : item.name === 'Instagram' ? '◎' : '♪'}
                    </span>
                    <span className="gibrig-social-details">
                      <span>{item.name}</span>
                      <span>{String(item.value).startsWith('@') ? item.value : `@${item.value}`}</span>
                    </span>
                    <span className="gibrig-social-external" aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </div>
            <nav className="gibrig-footer-nav" aria-label="Navigasi footer">
              <strong>Navigasi</strong>
              {gibrigPages.map((page) => <a key={page.slug || 'home'} href={page.slug ? `/gibrig/${page.slug}` : '/gibrig'}>{page.label}</a>)}
              <a href={getSiteUrl('aurora')}>Aurora Media</a>
            </nav>
            <div className="gibrig-footer-contact">
              <strong>Hubungi Kami</strong>
              {data.contact?.phone ? <a href={`tel:${String(data.contact.phone).replace(/[^\d+]/g, '')}`}><span>{data.contact.phone}</span></a> : null}
              {data.contact?.email ? <a href={`mailto:${data.contact.email}`}>✉ <span>{data.contact.email}</span></a> : null}
              {data.contact?.address ? <p>{data.contact.address}</p> : null}
              {whatsappNumber ? <a href={createWhatsAppUrl(whatsappNumber, whatsappMessage, 'Entertainment Musik', 'Footer > WhatsApp')} target="_blank" rel="noopener noreferrer"><span>WhatsApp</span></a> : null}
            </div>
          </div>
          <div className="container gibrig-copyright"><p>{data.footer}</p><a href={getSiteUrl('aurora')} aria-label="Kembali ke Aurora Media">↑</a></div>
        </section>
      </main>
      {previewImage ? (
        <div className="gibrig-image-viewer" role="dialog" aria-modal="true" aria-label="Pratinjau gambar" onClick={(event) => {
          if (event.target === event.currentTarget) closeImagePreview();
        }}>
          <button ref={previewCloseRef} type="button" className="gibrig-image-viewer-close" aria-label="Tutup pratinjau gambar" onClick={closeImagePreview}>×</button>
          <img src={previewImage.src} alt={previewImage.alt} />
        </div>
      ) : null}
      <WhatsAppContact siteName="Entertainment Musik" number={whatsappNumber} message={whatsappMessage} menuName={`${whatsappMenuName} > Kontak cepat`} />
    </div>
  );
};

const NunuyHome = ({ path }) => {
  const [data, setData] = useState(() => {
    const saved = loadData(storage.nunuy, defaultNunuyData);
    return {
      ...mergeDataDefaults(defaultNunuyData, saved),
      logoImage: saved.logoImage || defaultNunuyData.logoImage,
    };
  });

  useEffect(() => {
    let active = true;
    siteContactApi.get('nunuy')
      .then((result) => {
        const nextContact = result?.contact ?? result;
        if (!active || !nextContact) return;
        setData((current) => mergeSiteContact(current, nextContact));
      })
      .catch((error) => { console.error('Kontak publik Nunuy gagal dimuat dari API:', error); });
    return () => { active = false; };
  }, []);
  return (
    <NunuyWedding
      data={data}
      whatsappNumber={data.whatsapp?.number}
      whatsappMessage={data.whatsapp?.message}
      phoneNumber={data.contact?.phone}
      path={path}
    />
  );
};

const invitationPages = {
  '/undangan': {
    label: 'Beranda',
    eyebrow: 'Nuansa Invite',
    title: 'Undangan digital yang merangkai cerita Anda.',
    description: 'Temukan cara yang lebih praktis dan personal untuk mengundang keluarga serta sahabat ke momen istimewa.',
  },
  '/undangan/keunggulan': {
    label: 'Keunggulan',
    eyebrow: 'Dirancang untuk momen Anda',
    title: 'Keunggulan yang membuat setiap undangan lebih bermakna.',
    description: 'Semua fitur penting untuk menyiapkan, membagikan, dan mengelola undangan dalam satu tempat.',
  },
  '/undangan/template': {
    label: 'Katalog Template',
    eyebrow: 'Katalog desain',
    title: 'Pilih desain yang terasa seperti cerita Anda.',
    description: 'Jelajahi koleksi template untuk berbagai jenis acara dan buka pratinjau undangan sebelum memilih.',
  },
  '/undangan/harga': {
    label: 'Paket Harga',
    eyebrow: 'Paket & harga',
    title: 'Pilih paket sesuai kebutuhan acara Anda.',
    description: 'Bandingkan fasilitas setiap paket dan lanjutkan dengan membuat akun Nuansa Invite.',
  },
  '/undangan/testimoni': {
    label: 'Testimoni',
    eyebrow: 'Cerita dari pengguna',
    title: 'Momen istimewa, cerita yang selalu dikenang.',
    description: 'Baca pengalaman pengguna dan bagikan cerita Anda. Testimoni akan ditinjau sebelum ditampilkan.',
  },
  '/undangan/faq': {
    label: 'FAQ',
    eyebrow: 'Bantuan Nuansa Invite',
    title: 'Pertanyaan seputar undangan digital.',
    description: 'Temukan jawaban tentang pembuatan undangan, template, RSVP, dan fitur yang tersedia.',
  },
};

const InvitationFeatureGrid = ({ features }) => (
  <div className="feature-grid invitation-feature-grid">
    {features.map((feature, index) => (
      <article key={feature.title} className="feature-card invitation-feature-card">
        <div className="feature-icon" aria-hidden="true">{['✦', '↗', '▦', '⌖'][index % 4]}</div>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </article>
    ))}
  </div>
);

const InvitationHome = ({ path = '/undangan' }) => {
  const [data, setData] = useState(() => {
    const saved = loadData(storage.invitation, defaultInvitationData);
    return normalizeInvitationBrand({
      ...mergeDataDefaults(defaultInvitationData, saved),
      logoImage: saved.logoImage || defaultInvitationData.logoImage,
    });
  });
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsError, setAdvertisementsError] = useState('');
  const page = invitationPages[path] || invitationPages['/undangan'];
  const isHome = path === '/undangan';
  const openAuth = (mode) => navigate(`/undangan-auth?mode=${mode}`);

  useEffect(() => {
    let active = true;
    siteContactApi.get('invitation')
      .then((result) => {
        const nextContact = result?.contact ?? result;
        if (active && nextContact) {
          setData((current) => mergeSiteContact(current, nextContact));
        }
      })
      .catch((error) => { console.error('Kontak publik Nuansa Invite gagal dimuat dari API:', error); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isHome) return undefined;
    let active = true;
    advertisementsApi.listPublic()
      .then((items) => { if (active) setAdvertisements(items); })
      .catch((error) => { if (active) setAdvertisementsError(error.message); });
    return () => { active = false; };
  }, [isHome]);

  return (
    <div className={`site-shell invitation-shell theme-layout-${data.theme?.layout || 'editorial'} theme-preset-${data.theme?.preset || 'default'}`} style={themeStyle(data.theme)}>
      <SeoHead siteId="invitation" siteBasePath="/undangan" title={data.seo.title} description={data.seo.description} keywords={data.seo.keywords} image={data.hero.image} siteName={data.siteName} noIndex={data.seo.noIndex} canonicalUrl={data.seo.canonicalUrl} faviconUrl="/undangan-favicon.svg" />
      <Navbar
        siteName={data.siteName}
        logo={data.logo}
        logoImage={data.logoImage}
        activePath={path}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
      />

      <main>
        {isHome ? (
          <section className="hero-section invitation-hero invitation-home-hero">
            <div className="container hero-grid">
              <div className="invitation-hero-copy">
                <p className="eyebrow invitation-hero-eyebrow"><span aria-hidden="true" />{data.hero.eyebrow}</p>
                <h1>{data.hero.title}</h1>
                <p>{data.hero.subtitle}</p>
                <div className="cta-row">
                  <button className="primary-btn" onClick={() => openAuth('register')}>
                    {data.hero.cta}<span aria-hidden="true"> ↗</span>
                  </button>
                  <a className="secondary-btn" href="/undangan/template">{data.hero.secondary}</a>
                </div>
                <div className="hero-micro" aria-label="Fitur undangan">
                  <span>✓ RSVP dan buku tamu</span>
                  <span>✓ Link mudah dibagikan</span>
                  <span>✓ Kelola dari dashboard</span>
                </div>
              </div>
              <div className="hero-visual invitation-visual">
                <img className="site-hero-image" src={data.hero.image} alt={`${data.siteName} undangan digital`} />
                <div className="hero-panel">
                  <span>YOUR STORY, BEAUTIFULLY TOLD</span>
                  <strong>{data.siteName}</strong>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="invitation-page-hero">
            <div className="container">
              <p className="eyebrow">{page.eyebrow}</p>
              <h1>{page.title}</h1>
              <p>{page.description}</p>
            </div>
          </section>
        )}

        {isHome && (advertisements.length || advertisementsError) ? (
          <section className="section-wrap affiliate-advertisements" aria-labelledby="affiliate-advertisements-title">
            <div className="container">
              <div className="section-head">
                <p className="eyebrow">Rekomendasi partner</p>
                <h2 id="affiliate-advertisements-title">Pilihan dari mitra Nuansa Invite</h2>
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

        {(isHome || path === '/undangan/keunggulan') ? (
          <section className={`section-wrap invitation-features-section${isHome ? '' : ' muted-bg'}`} id="features">
            <div className="container">
              <div className="section-head invitation-section-head">
                <p className="eyebrow">{isHome ? 'Kenapa Nuansa Invite' : 'Keunggulan platform'}</p>
                <h2>{isHome ? 'Semua kebutuhan undangan dalam satu platform.' : 'Fitur yang membantu setiap langkah persiapan.'}</h2>
                <p>{isHome ? 'Rancang undangan, bagikan kepada tamu, lalu kelola konfirmasi kehadiran dengan lebih praktis.' : page.description}</p>
              </div>
              <InvitationFeatureGrid features={data.features} />
              {isHome ? (
                <a className="invitation-text-link" href="/undangan/keunggulan">Jelajahi semua keunggulan <span aria-hidden="true">↗</span></a>
              ) : (
                <div className="invitation-inline-cta">
                  <p>Siap mulai menyiapkan undangan Anda?</p>
                  <button className="primary-btn" onClick={() => openAuth('register')}>Buat Undangan</button>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {isHome ? (
          <>
            <section className="section-wrap muted-bg invitation-template-teaser">
              <div className="container">
                <div className="section-head invitation-section-head">
                  <p className="eyebrow">Katalog template</p>
                  <h2>Koleksi desain untuk berbagai momen.</h2>
                  <p>Pilih kategori acara dan lihat pratinjau sebelum membuat undangan.</p>
                </div>
                <div className="invitation-template-preview-grid">
                  {data.templates.filter((template) => template.active !== false).slice(0, 3).map((template) => (
                    <a className={`invitation-template-preview template-${template.palette}`} href="/undangan/template" key={template.name}>
                      <span className="invitation-template-preview-art" aria-hidden="true">✦</span>
                      <span className="template-tag">{template.category}</span>
                      <strong>{template.name}</strong>
                      <span>{template.description}</span>
                    </a>
                  ))}
                </div>
                <a className="invitation-text-link" href="/undangan/template">Lihat seluruh katalog <span aria-hidden="true">↗</span></a>
              </div>
            </section>
            <section className="invitation-promo">
              <div className="container invitation-promo-inner">
                <div>
                  <p className="eyebrow">Momen Anda, cara Anda</p>
                  <h2>Mulai merangkai undangan yang personal.</h2>
                  <p>Pilih desain, lengkapi detail acara, dan bagikan undangan kepada orang-orang terdekat.</p>
                </div>
                <button className="primary-btn" onClick={() => openAuth('register')}>Mulai Sekarang <span aria-hidden="true">↗</span></button>
              </div>
            </section>
            <section className="section-wrap invitation-home-cta">
              <div className="container auth-panel">
                <div>
                  <p className="eyebrow">Login & registrasi</p>
                  <h2>Kelola undangan Anda dalam satu dashboard.</h2>
                  <p>Atur detail acara, daftar tamu, RSVP, dan statistik setelah masuk ke akun Nuansa Invite.</p>
                </div>
                <div className="login-box">
                  <button className="primary-btn" onClick={() => openAuth('register')}>Daftar Sekarang</button>
                  <button className="secondary-btn" onClick={() => openAuth('login')}>Masuk</button>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {path === '/undangan/template' ? (
          <Templates templates={data.templates} demos={data.demoItems} categories={data.categories} />
        ) : null}

        {path === '/undangan/harga' ? (
          <Pricing plans={data.pricingPlans} onChoose={() => openAuth('register')} />
        ) : null}

        {(isHome || path === '/undangan/testimoni') ? (
          <PublicTestimonials
            site="invitation"
            initialItems={data.testimonials}
            eyebrow={isHome ? 'Apa kata mereka?' : 'Apa kata mereka?'}
            title={isHome ? 'Cerita dari keluarga dan klien' : 'Cerita dari keluarga dan klien'}
            description="Bagikan pengalaman menggunakan Nuansa Invite. Testimoni ditampilkan setelah ditinjau."
            className="invitation-page-testimonials"
            sectionId="testimoni"
          />
        ) : null}

        {path === '/undangan/faq' ? (
          <section id="faq" className="section-wrap invitation-faq-section">
            <div className="container faq-grid">
              <div className="invitation-faq-intro">
                <p className="eyebrow">FAQ</p>
                <h2>Jawaban untuk persiapan Anda.</h2>
                <p>Belum menemukan jawaban? Hubungi kami melalui WhatsApp.</p>
                <a href={createWhatsAppUrl(data.whatsapp.number, data.whatsapp.message, data.siteName, 'FAQ > Tanya melalui WhatsApp')} target="_blank" rel="noopener noreferrer">Tanya melalui WhatsApp ↗</a>
              </div>
              <div className="faq-list">
                {data.faq.map((item, index) => (
                  <details key={item.q} className="faq-item invitation-faq-item" open={index === 0}>
                    <summary>{item.q}<span aria-hidden="true">+</span></summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {isHome ? (
          <Blog articles={data.articles} onOpen={(slug) => navigate(`/undangan-blog/${slug}`)} />
        ) : null}
      </main>

      <Footer
        siteName={data.siteName}
        phone={data.contact.phone}
        email={data.contact.email}
        whatsappNumber={data.whatsapp.number}
        whatsappMessage={data.whatsapp.message}
      />
      <WhatsAppContact siteName={data.siteName} number={data.whatsapp.number} message={data.whatsapp.message} menuName="Nuansa Invite > Kontak cepat" />
    </div>
  );
};

function App() {
  const path = useWindowPath().replace(/\/+$/, '') || '/';
  const adminScope = getAdminScope();
  const superAdminAuthenticated = adminScope === 'all';
  const canManageSite = (site) => superAdminAuthenticated || adminScope === site;
  const logoutSuperAdmin = () => {
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    navigate('/setia-creative-admin');
  };

  if (path === '/undangan-auth') {
    const nextPath = new URLSearchParams(window.location.search).get('next');
    return <Auth onBack={() => navigate('/undangan')} onSuccess={() => navigate(nextPath || '/undangan-dashboard')} />;
  }

  if (path === '/undangan-dashboard') {
    const requestedPath = `${window.location.pathname}${window.location.search}`;
    return <Dashboard onSignIn={() => navigate(`/undangan-auth?mode=login&next=${encodeURIComponent(requestedPath)}`)} />;
  }
  if (path.startsWith('/i/') && window.location.hash === '#rsvp') {
    const invitationSlug = path.slice(3);
    const guestbookUrl = createOwnerGuestbookUrl(invitationSlug);
    return (
      <Dashboard
        requestedGuestbookSlug={invitationSlug}
        onSignIn={() => navigate(`/undangan-auth?mode=login&next=${encodeURIComponent(guestbookUrl)}`)}
      />
    );
  }
  if (path.startsWith('/undangan-ticket/')) return <GuestTicket ticketToken={path.slice('/undangan-ticket/'.length)} />;
  if (path === '/setia-creative-admin') return <SuperAdminHome onLogin={(targetPath) => { if (targetPath) navigate(targetPath); }} />;
  if (path === '/setia-creative-admin/seo') {
    return superAdminAuthenticated
      ? <SuperAdminSeo />
      : <SuperAdminHome onLogin={(targetPath) => navigate(targetPath || path)} />;
  }
  if (path === '/undangan-website-admin') {
    if (!canManageSite('invitation')) return <SuperAdminHome onLogin={(targetPath) => navigate(targetPath || path)} />;
    return (
      <AdminPanel
        site="invitation"
        label="Nuansa Invite Website Admin"
        dataKey={storage.invitation}
        defaultData={defaultInvitationData}
        description="Kelola konten website publik Nuansa Invite, nomor kontak, logo, hero, tema, template, dan media."
        adminScope={adminScope}
        superAdminAuthenticated={superAdminAuthenticated}
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }
  if (path === '/setia-creative-admin/billing' || path === '/undangan-admin') {
    return superAdminAuthenticated
      ? <AdminBilling onLogout={() => navigate('/setia-creative-admin')} />
      : <SuperAdminHome onLogin={(targetPath) => navigate(targetPath || path)} />;
  }
  if (path.startsWith('/i/')) return <PublicInvitation slug={path.slice(3)} />;

  if (path.startsWith('/undangan-blog/')) {
    const data = loadData(storage.invitation, defaultInvitationData);
    const slug = path.split('/').pop();
    return <BlogDetail articles={data.articles} slug={slug} onBack={() => navigate('/undangan')} />;
  }

  if (path.startsWith('/undangan-preview/')) {
    const templateSlug = path.slice('/undangan-preview/'.length).split('/')[0];
    const template = defaultInvitationData.templates.find((item) => slugify(item.name) === templateSlug);
    if (template) return <PublicInvitation invitation={createPreviewInvitation(template)} slug={`demo-${templateSlug}`} />;
  }

  if (path === '/portal-admin' || path === '/admin') {
    if (!superAdminAuthenticated) return <SuperAdminHome onLogin={(targetPath) => navigate(targetPath || path)} />;
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
    if (!canManageSite('gibrig')) return <SuperAdminHome onLogin={(targetPath) => navigate(targetPath || path)} />;
    return (
      <AdminPanel
        site="gibrig"
        label="Gibrig Admin"
        dataKey={storage.gibrig}
        defaultData={defaultGibrigData}
        description="Ubah isi utama Gibrig Entertainment, artist, event, testimonial, contact, SEO, dan media."
        adminScope={adminScope}
        superAdminAuthenticated={superAdminAuthenticated}
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }

  if (path === '/nunuy-admin') {
    if (!canManageSite('nunuy')) return <SuperAdminHome onLogin={(targetPath) => navigate(targetPath || path)} />;
    return (
      <AdminPanel
        site="nunuy"
        label="Nunuy Admin"
        dataKey={storage.nunuy}
        defaultData={defaultNunuyData}
        description="Kelola layanan, paket, galeri, artikel, testimoni, FAQ, konsultasi, kontak, SEO, dan gambar Nunuy Nadhifa Wedding."
        adminScope={adminScope}
        superAdminAuthenticated={superAdminAuthenticated}
        onSuperAdminLogout={logoutSuperAdmin}
      />
    );
  }

  if (path === '/gibrig' || path.startsWith('/gibrig/')) return <GibrigHome path={path} />;
  if (path === '/nunuy-nadhifa-wedding' || path.startsWith('/nunuy-nadhifa-wedding/')) return <NunuyHome path={path} />;
  if (Object.hasOwn(invitationPages, path)) return <InvitationHome path={path} />;
  if (path === '/beriklan') return <PortalInfoPage page="advertise" />;
  if (path === '/iklan') return <PortalAdsPage />;
  if (path === '/kontak') return <PortalInfoPage page="contact" />;
  if (path === '/faq') return <PortalInfoPage page="faq" />;

  return <PortalHome />;
}

export default App;
