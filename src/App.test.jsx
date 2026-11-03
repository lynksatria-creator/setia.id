import { expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExcelJS from 'exceljs';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import Auth from './pages/Auth';
import { SUPER_ADMIN_SESSION_KEY } from './lib/adminSession';
import { getThemeCatalog } from './lib/themeCatalog';
import { createOwnerGuestbookUrl } from './lib/ownerGuestbookUrl';
import { normalizePortalAds } from './lib/portalAds';
import { regionalInvitationTemplates } from './lib/regionalInvitationTemplates';
import AdminBilling from './pages/AdminBilling';
import PublicInvitation from './pages/PublicInvitation';
import { createPreviewInvitation } from './pages/Templates';
import { PublicTestimonials, TestimonialModeration } from './components/PublicTestimonials';
import NunuyConsultationAdmin from './components/NunuyConsultationAdmin';

const renderApp = () => render(<AuthProvider><App /></AuthProvider>);
const SUPER_ADMIN_TEST_TOKEN = 'header.eyJyb2xlIjoiYWRtaW4iLCJzY29wZSI6ImFsbCJ9.signature';

test('renders the Aurora Media reference landing page with working partner links', () => {
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getAllByText(/Aurora Media/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: /temukan partner terbaik/i })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Kolaborasi untuk Momen Berkesan' })).toBeDefined();
  expect(document.querySelector('.portal-partner-mark')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Nunuy Nadhifa Wedding' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Entertainment Musik' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Undangan Digital' })).toBeDefined();
  expect(screen.getByRole('navigation', { name: 'Navigasi utama' }).querySelectorAll('a')).toHaveLength(5);
  expect(screen.getByRole('link', { name: 'Beriklan' }).getAttribute('href')).toBe('/beriklan');
  expect(screen.getByRole('link', { name: 'Iklan' }).getAttribute('href')).toBe('/iklan');
  expect(screen.getByRole('link', { name: 'Kontak' }).getAttribute('href')).toBe('/kontak');
  expect(screen.getByRole('link', { name: 'FAQ' }).getAttribute('href')).toBe('/faq');
  expect(screen.queryByRole('heading', { name: /menghubungkan kreativitas/i })).toBeNull();
  expect(screen.queryByRole('heading', { name: /brand anda layak dikenal lebih luas/i })).toBeNull();
  const weddingLink = screen.getAllByRole('link', { name: /kunjungi website/i })[0];
  expect(weddingLink.getAttribute('href')).toBe('https://wediing.auroramedia.online/nunuy-nadhifa-wedding');
  expect(weddingLink.getAttribute('target')).toBe('_blank');
  expect(weddingLink.getAttribute('rel')).toBe('noopener noreferrer');
  expect(document.title).toBe('Aurora Media | Wedding, Musik & Undangan Digital');
});

test('Aurora homepage shows its rotating ad carousel immediately after partner cards', async () => {
  const previousPortalConfig = localStorage.getItem('portal-cms');
  localStorage.removeItem('portal-cms');
  const ads = {
    page: { title: 'Sponsor Beranda', description: 'Partner pilihan Aurora Media.', layout: 'featured' },
    top: { enabled: true, label: 'SPONSOR 1', title: 'Studio Momen', image: 'https://example.com/poster.jpg', href: 'https://studio.example', duration: 30, format: 'banner', animation: 'fade', imageWidth: 62, imageHeight: 420 },
    midFeed: { enabled: true, label: 'SPONSOR 2', title: 'Ruang Cerita', href: 'https://cerita.example', duration: 5, format: 'card', animation: 'rise' },
  };
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = new URL(url, window.location.origin).pathname;
    const payload = path === '/api/public/portal-ads'
      ? { ads }
      : path.startsWith('/api/public/testimonials/')
        ? []
        : path.startsWith('/api/public/seo/')
          ? { seo: null }
          : { contact: null };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => payload };
  }));
  window.history.pushState({}, '', '/');
  const page = render(<App />);

  expect(await screen.findByText('Studio Momen')).toBeDefined();
  expect(page.container.querySelector('#brands').nextElementSibling.classList.contains('portal-home-ad-section')).toBe(true);
  expect(screen.getByRole('heading', { name: 'Sponsor Beranda' })).toBeDefined();
  const homepageAd = page.container.querySelector('.portal-home-ad-section .portal-ad-listing');
  expect(homepageAd.querySelector('.portal-ad-listing-copy').getAttribute('href')).toBe('https://studio.example');
  expect(homepageAd.style.getPropertyValue('--portal-ad-image-width')).toBe('62%');
  expect(homepageAd.style.getPropertyValue('--portal-ad-image-height')).toBe('420px');
  fireEvent.click(screen.getByRole('button', { name: 'Lihat foto penuh Studio Momen' }));
  const imageDialog = screen.getByRole('dialog', { name: 'Foto penuh Studio Momen' });
  expect(imageDialog.querySelector('img').getAttribute('src')).toBe('https://example.com/poster.jpg');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Foto penuh Studio Momen' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Iklan berikutnya' }));
  expect(await screen.findByText('Ruang Cerita', {}, { timeout: 2500 })).toBeDefined();

  page.unmount();
  if (previousPortalConfig === null) localStorage.removeItem('portal-cms');
  else localStorage.setItem('portal-cms', previousPortalConfig);
  vi.unstubAllGlobals();
});

test('Aurora Media rotates enabled advertisements after each configured duration', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ ads: null, seo: null }),
  })));
  localStorage.setItem('portal-cms', JSON.stringify({
    ads: {
      page: { title: 'Partner Pilihan', description: 'Brand untuk momen istimewa.', layout: 'featured' },
      top: { enabled: true, label: 'PARTNER PILIHAN', title: 'Studio Momen', description: 'Musik live untuk acara spesial.', image: 'https://example.com/banner.jpg', href: 'https://studio.example', format: 'banner', animation: 'rise', duration: 2, imageWidth: 65, imageHeight: 420 },
      midFeed: { enabled: true, label: 'REKOMENDASI', title: 'Ruang Cerita', href: 'https://cerita.example', format: 'card', animation: 'fade', duration: 5 },
    },
  }));
  window.history.pushState({}, '', '/iklan');
  const page = render(<App />);

  expect(screen.getByRole('heading', { name: 'Partner Pilihan' })).toBeDefined();
  expect(screen.getByText('Studio Momen')).toBeDefined();
  const banner = page.container.querySelector('.portal-ad-listing');
  expect(banner.getAttribute('href')).toBe('https://studio.example');
  expect(banner.getAttribute('target')).toBe('_blank');
  expect(banner.getAttribute('rel')).toBe('noopener noreferrer');
  expect(banner.className).toContain('portal-ad-format-banner');
  expect(banner.className).toContain('portal-ad-animation-rise');
  expect(banner.style.getPropertyValue('--portal-ad-image-width')).toBe('65%');
  expect(banner.style.getPropertyValue('--portal-ad-image-height')).toBe('420px');
  expect(screen.getByText('Musik live untuk acara spesial.')).toBeDefined();

  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(screen.getByText('Ruang Cerita')).toBeDefined();
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(screen.getByText('Studio Momen')).toBeDefined();

  page.unmount();
  localStorage.removeItem('portal-cms');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('super admin SEO dashboard saves independent website metadata to the backend', async () => {
  const requests = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    const path = new URL(url, window.location.origin).pathname;
    requests.push({ path, options });
    const site = path.split('/').pop();
    const payload = options.method === 'PUT'
      ? { site, seo: JSON.parse(options.body) }
      : { site, seo: site === 'portal' ? { ogImage: '' } : null };
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => payload,
    };
  }));
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/setia-creative-admin/seo');
  renderApp();

  expect(await screen.findByRole('heading', { name: /kelola pencarian untuk setiap website/i })).toBeDefined();
  await waitFor(() => expect(requests.filter((request) => request.path.startsWith('/api/admin/seo/'))).toHaveLength(4));
  await screen.findByLabelText(/^SEO title/);
  expect(screen.getByText(/Deskripsi antara 90–160 karakter/).closest('li')).toHaveClass('is-complete');
  expect(screen.getByText(/Gambar pratinjau sosial tersedia/).closest('li')).toHaveClass('is-complete');
  expect(screen.getByRole('link', { name: 'Google Search Console ↗' }).getAttribute('href'))
    .toBe('https://search.google.com/search-console?resource_id=sc-domain%3Aauroramedia.online');
  expect(screen.getByRole('link', { name: 'https://auroramedia.online/sitemap-aurora-media.xml' }).getAttribute('href'))
    .toBe('https://auroramedia.online/sitemap-aurora-media.xml');
  expect(screen.getByRole('link', { name: 'https://entertainment.musik.auroramedia.online/sitemap-gibrig.xml' }).getAttribute('href'))
    .toBe('https://entertainment.musik.auroramedia.online/sitemap-gibrig.xml');
  expect(screen.getByRole('link', { name: 'https://wediing.auroramedia.online/sitemap-nunuy.xml' }).getAttribute('href'))
    .toBe('https://wediing.auroramedia.online/sitemap-nunuy.xml');
  expect(screen.getByRole('link', { name: 'https://invite.auroramedia.online/sitemap-nuansa-invite.xml' }).getAttribute('href'))
    .toBe('https://invite.auroramedia.online/sitemap-nuansa-invite.xml');
  fireEvent.click(screen.getByRole('button', { name: /Gibrig Entertainment \/ Entertainment Musik/i }));
  await screen.findByLabelText(/^SEO title/);
  fireEvent.change(screen.getByLabelText(/^SEO title/), { target: { value: 'Gibrig Entertainment | Musik Live Garut' } });
  fireEvent.change(screen.getByLabelText(/^Meta description/), {
    target: { value: 'Sewa musik live, penyanyi, MC, dan paket hiburan untuk wedding serta acara keluarga di Garut bersama Gibrig Entertainment.' },
  });
  fireEvent.change(screen.getByLabelText(/^Frasa pencarian target/), {
    target: { value: 'musik live Garut, hiburan wedding Garut, Gibrig Entertainment' },
  });
  fireEvent.change(screen.getByLabelText('Gambar Open Graph (HTTPS)'), {
    target: { value: 'https://portal.id/gibrig-share.jpg' },
  });
  fireEvent.click(screen.getByRole('button', { name: /simpan seo gibrig entertainment/i }));

  expect(await screen.findByText(/SEO Gibrig Entertainment \/ Entertainment Musik berhasil disimpan/i)).toBeDefined();
  const update = requests.find((request) => request.path === '/api/admin/seo/gibrig' && request.options.method === 'PUT');
  expect(JSON.parse(update.options.body)).toMatchObject({
    title: 'Gibrig Entertainment | Musik Live Garut',
    ogImage: 'https://portal.id/gibrig-share.jpg',
    noIndex: false,
  });
  expect(update.options.headers.get('Authorization')).toBe(`Bearer ${SUPER_ADMIN_TEST_TOKEN}`);
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
  vi.unstubAllGlobals();
});

test('public homepage applies SEO settings saved in backend', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        site: 'portal',
        seo: {
          title: 'Portal SEO Pilihan Wedding',
          description: 'Panduan mencari partner wedding dan acara terbaik.',
          keywords: 'partner wedding, rekomendasi vendor acara',
          canonicalUrl: 'https://portal.id/',
          ogImage: 'https://portal.id/share.jpg',
          noIndex: false,
        },
      }),
    };
  }));
  window.history.pushState({}, '', '/');
  render(<App />);

  await waitFor(() => expect(document.title).toBe('Portal SEO Pilihan Wedding'));
  expect(document.head.querySelector('meta[name="description"]').content).toBe('Panduan mencari partner wedding dan acara terbaik.');
  expect(document.head.querySelector('meta[name="keywords"]').content).toBe('partner wedding, rekomendasi vendor acara');
  expect(document.head.querySelector('meta[name="robots"]').content).toBe('index,follow');
  expect(document.head.querySelector('meta[property="og:image"]').content).toBe('https://portal.id/share.jpg');
  vi.unstubAllGlobals();
});

test('advertising page explains partnership options and opens a WhatsApp inquiry', () => {
  window.history.pushState({}, '', '/beriklan');
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Brand Anda Layak Dikenal Lebih Luas.' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Jangkau audiens yang tepat, bersama partner kreatif.' })).toBeDefined();
  const whatsappLink = screen.getByRole('link', { name: /mulai kerja sama/i });
  expect(whatsappLink.getAttribute('href')).toContain('https://wa.me/6281234567890?text=');
  expect(whatsappLink.getAttribute('target')).toBe('_blank');
});

test('contact page exposes working email, phone, and WhatsApp links', () => {
  window.history.pushState({}, '', '/kontak');
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Mari mulai percakapan.' })).toBeDefined();
  expect(screen.getByRole('link', { name: /^email hello@portaliklan\.com$/i }).getAttribute('href')).toBe('mailto:hello@portaliklan.com');
  expect(screen.getByRole('link', { name: /hubungi kami langsung/i }).getAttribute('href')).toBe('tel:+6281234567890');
  expect(screen.getByRole('link', { name: /kirim pesan kepada tim kami/i }).getAttribute('href')).toContain('https://wa.me/6281234567890?text=');
});

test('FAQ page renders all five sections and provides a contact link', () => {
  window.history.pushState({}, '', '/faq');
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Frequently Asked Questions (FAQ)' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'A. Tentang Aurora Media' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'E. Kontak dan Informasi' })).toBeDefined();
  expect(screen.getByText(/Aurora Media adalah platform creative collective yang menghubungkan berbagai brand/)).toBeDefined();
  expect(screen.getByRole('link', { name: /hubungi tim kami/i }).getAttribute('href')).toBe('/kontak');
  expect(screen.getByRole('navigation', { name: 'Navigasi utama' }).querySelectorAll('a')).toHaveLength(5);
});

test('mobile navigation opens and closes from its accessible toggle', () => {
  window.innerWidth = 390;
  window.dispatchEvent(new Event('resize'));
  window.history.pushState({}, '', '/');
  render(<App />);

  const toggle = screen.getByRole('button', { name: 'Buka menu' });
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Tutup menu' }).getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('link', { name: 'Beriklan' }));
  expect(screen.getByRole('button', { name: 'Buka menu' }).getAttribute('aria-expanded')).toBe('false');
  window.innerWidth = 1024;
  window.dispatchEvent(new Event('resize'));
});

test.each([
  ['/undangan', /ciptakan momen istimewa berkelas & elegan/i, 'Beranda'],
  ['/undangan/keunggulan', /keunggulan yang membuat setiap undangan lebih bermakna/i, 'Keunggulan'],
  ['/undangan/template', /pilih desain yang terasa seperti cerita anda/i, 'Katalog Template'],
  ['/undangan/harga', /pilih paket sesuai kebutuhan acara anda/i, 'Paket Harga'],
  ['/undangan/testimoni', /momen istimewa, cerita yang selalu dikenang/i, 'Testimoni'],
  ['/undangan/faq', /pertanyaan seputar undangan digital/i, 'FAQ'],
])('opens the Nuansa Invite %s page from its matching menu', (path, heading, menuLabel) => {
  window.history.pushState({}, '', path);
  renderApp();

  expect(screen.getByRole('heading', { level: 1, name: heading })).toBeDefined();
  const navigation = screen.getByRole('navigation', { name: 'Navigasi Nuansa Invite' });
  const activeLink = navigation.querySelector('[aria-current="page"]');
  expect(activeLink.textContent).toBe(menuLabel);
  expect(activeLink.getAttribute('href')).toBe(path);
  expect(navigation.querySelector('a[href="https://auroramedia.online/"]').textContent).toBe('Aurora Media');
  if (path === '/undangan') {
    expect(screen.queryByText('RSVP online')).toBeNull();
    expect(screen.queryByText('Personal & elegan')).toBeNull();
  }
});

test('replaces the previous brand in saved invitation website content', () => {
  const storageKey = 'invitation-cms';
  const previousValue = localStorage.getItem(storageKey);
  localStorage.setItem(storageKey, JSON.stringify({
    siteName: 'Undangan.id',
    hero: { title: 'Buat undangan dengan Undangan.id' },
    contact: { email: 'hello@undangan.id' },
  }));
  window.history.pushState({}, '', '/undangan');
  const app = render(<App />);

  try {
    expect(screen.getByRole('navigation', { name: 'Navigasi Nuansa Invite' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Buat undangan dengan Nuansa Invite' })).toBeDefined();
    expect(localStorage.getItem(storageKey)).toContain('hello@undangan.id');
  } finally {
    app.unmount();
    if (previousValue === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, previousValue);
  }
});

test('portal admin can add, edit, publish, and remove advertised websites', async () => {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/admin');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /content studio/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /glassmorphism luxury/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /elastic spring motion/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /ekspor json/i })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Tambah website' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Social media Aurora Media' })).toBeDefined();
  expect(screen.getByText(/impor json/i)).toBeDefined();
  fireEvent.change(screen.getAllByLabelText('URL website partner')[0], { target: { value: 'https://nunuy.example' } });
  fireEvent.change(screen.getAllByLabelText('Kategori')[0], { target: { value: 'WEDDING ORGANIZER · PILIHAN' } });
  fireEvent.click(screen.getAllByLabelText('Tampilkan partner')[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Tambah website' }));
  expect(screen.getAllByRole('button', { name: 'Hapus partner' })).toHaveLength(4);
  fireEvent.click(screen.getAllByRole('button', { name: 'Hapus partner' })[3]);
  expect(screen.getAllByRole('button', { name: 'Hapus partner' })).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  const saved = JSON.parse(localStorage.getItem('portal-cms'));
  expect(saved.services).toHaveLength(3);
  expect(saved.services[0]).toMatchObject({
    href: 'https://nunuy.example',
    category: 'WEDDING ORGANIZER · PILIHAN',
    active: false,
  });
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}, 30000);

test('normalizes portal ad fields to API limits', () => {
  const normalized = normalizePortalAds({
    page: { title: 'Iklan' },
    top: { title: 'A'.repeat(181), imageWidth: 140 },
    midFeed: { title: 'Promo', imageWidth: 0 },
  });

  expect(normalized.top.title).toHaveLength(180);
  expect(normalized.top.imageWidth).toBe(100);
  expect(normalized.midFeed.imageWidth).toBe(20);
});

test('shows a helpful message when the Nuansa Invite API is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-auth?mode=login');
  renderApp();

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'tester@undangan.id' } });
  fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'Tester12345!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toMatch(/backend berjalan di port 8000 dan MongoDB tersedia/i);
  vi.unstubAllGlobals();
});

test('shows active affiliate advertisements on the Nuansa Invite homepage', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = new URL(url, window.location.origin).pathname;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => path.endsWith('/billing/config') ? { plans: [] } : [{
        id: 'affiliate-1',
        title: 'Promo undangan',
        description: 'Diskon untuk undangan premium.',
        url: 'https://example.com/promo',
        image: 'https://example.com/promo.jpg',
        advertiser: 'Mitra Undangan',
      }],
    };
  }));
  window.history.pushState({}, '', '/undangan');
  const app = renderApp();

  try {
    const link = await screen.findByRole('link', { name: /kunjungi website/i });
    expect(screen.getByRole('heading', { name: 'Pilihan dari mitra Nuansa Invite' })).toBeDefined();
    expect(link.getAttribute('href')).toBe('https://example.com/promo');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  } finally {
    app.unmount();
    vi.unstubAllGlobals();
  }
});

test('shows a scannable QR code for an invitation template', () => {
  window.history.pushState({}, '', '/undangan');
  renderApp();

  fireEvent.click(screen.getAllByRole('button', { name: /lihat qr/i })[0]);

  expect(screen.getByTitle(/qr untuk template/i)).toBeDefined();
});

test('opens a guest-facing preview beside a template card', () => {
  window.history.pushState({}, '', '/undangan');
  renderApp();

  const previewLink = screen.getAllByRole('link', { name: /preview undangan/i })[0];
  expect(previewLink.getAttribute('href')).toMatch(/\/undangan-preview\//);

  window.history.pushState({}, '', '/undangan-preview/lilac-romance/tambahan%20tamu%20undangan');
  const { container } = renderApp();
  expect(screen.getByRole('button', { name: /buka undangan/i })).toBeDefined();
  expect(container.querySelector('.wedding-invite-qr svg')).toBeNull();
});

test('shows the personalized recipient name on the invitation cover before opening', async () => {
  const ticketToken = `01${'t'.repeat(41)}`;
  const playMock = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = new URL(url, window.location.origin).pathname;
    const payload = path.includes('/invitation-tickets/')
      ? { name: 'Nadia Putri', invitation_title: 'Hari Bahagia', slug: 'hari-bahagia' }
      : path.endsWith('/guestbook') ? [] : {
        title: 'Hari Bahagia',
        slug: 'hari-bahagia',
        content: { couple_names: 'Aulia & Farhan', event_date: '2026-10-07' },
      };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => payload,
    };
  }));
  window.history.pushState({}, '', `/i/hari-bahagia?ticket=${ticketToken}`);
  const { container } = renderApp();

  expect(await screen.findByText('Nadia Putri')).toBeDefined();
  expect(screen.getByText('Kepada Yth.')).toBeDefined();
  expect(screen.getByRole('button', { name: /buka undangan/i })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: /buka undangan/i }));
  expect(await screen.findByRole('heading', { name: 'QR kehadiran Nadia Putri' })).toBeDefined();
  expect(container.querySelector('.wedding-invite-qr svg')).not.toBeNull();
  expect(screen.getByRole('link', { name: 'BUKA TIKET QR' }).getAttribute('href')).toBe(`${window.location.origin}/undangan-ticket/${ticketToken}`);
  vi.unstubAllGlobals();
  playMock.mockRestore();
});

test('renders a unique QR ticket page for a guest', async () => {
  const ticketToken = `01${'t'.repeat(41)}`;
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => ({
      name: 'Nadia Putri',
      invitation_title: 'Hari Bahagia',
      slug: 'hari-bahagia',
      event_date: '2026-10-07',
      event_time: '10:00',
      venue: 'Gedung Acara',
    }),
  })));
  window.history.pushState({}, '', `/undangan-ticket/${ticketToken}`);
  const { container } = renderApp();

  expect(await screen.findByText('Nadia Putri')).toBeDefined();
  expect(screen.getByText('Tunjukkan barcode unik ini kepada panitia saat tiba.')).toBeDefined();
  expect(container.querySelector('.guest-ticket-qr svg')).not.toBeNull();
  expect(container.querySelector('.guest-ticket-qr svg').getAttribute('width')).toBe('320');
  vi.unstubAllGlobals();
});

test('provides distinct invitation designs for all 38 Indonesian provinces', () => {
  expect(regionalInvitationTemplates).toHaveLength(38);
  expect(new Set(regionalInvitationTemplates.map((template) => template.province)).size).toBe(38);
  expect(new Set(regionalInvitationTemplates.map((template) => template.id)).size).toBe(38);
  expect(regionalInvitationTemplates.every((template) => template.description.includes(template.province))).toBe(true);
});

test('shows the formal invitation cover, named guest, regional design, and cover video', () => {
  window.history.pushState({}, '', '/i/demo?to=Keluarga%20Bapak%20Andi');
  const invitation = {
    id: 'demo-birthday',
    title: 'Ulang Tahun Nara',
    slug: 'ulang-tahun-nara',
    content: {
      event_type: 'Ulang Tahun Anak',
      honoree_name: 'Nara',
      province: 'Bali',
      template_id: 'regional-bali',
      event_date: '2026-12-12',
      video_url: 'https://example.com/party.mp4',
    },
  };
  const { container } = render(<PublicInvitation invitation={invitation} />);

  expect(screen.getAllByText('UNDANGAN RESMI')).toHaveLength(2);
  expect(screen.getByText('Keluarga Bapak Andi')).toBeDefined();
  expect(screen.getAllByRole('heading', { name: 'Nara' }).length).toBeGreaterThan(0);
  expect(screen.getByText('Template · Bali · Endek Bali')).toBeDefined();
  expect(container.querySelector('.wedding-cover-video').getAttribute('src')).toBe('https://example.com/party.mp4');
  expect(container.querySelector('.wedding-couple')).toBeNull();
  expect(container.querySelector('.wedding-honoree')).not.toBeNull();
});

test('opens the invitation and scrolls to RSVP when the link includes the RSVP fragment', async () => {
  window.history.pushState({}, '', '/i/aulia-farhan-6bcd575#rsvp');
  const scrollIntoView = vi.fn();
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  const invitation = {
    id: 'aulia-farhan',
    title: 'Aulia & Farhan',
    slug: 'aulia-farhan-6bcd575',
    content: { event_type: 'Pernikahan', couple_names: 'Aulia & Farhan' },
  };
  const { container } = render(<PublicInvitation invitation={invitation} />);

  expect(await screen.findByRole('heading', { name: 'Konfirmasi kehadiran' })).toBeDefined();
  expect(container.querySelector('.wedding-content').getAttribute('aria-hidden')).toBe('false');
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
  else delete HTMLElement.prototype.scrollIntoView;
});

test('renders saved template frame, motion, and photo crop settings', () => {
  const invitation = {
    id: 'customized-template',
    title: 'Pernikahan Aulia & Farhan',
    slug: 'aulia-farhan',
    content: {
      event_type: 'Pernikahan',
      template_id: 'luxury-gold',
      frame_style: 'botanical',
      animation_preset: 'none',
      cover_image: 'https://example.com/cover.jpg',
      cover_position_x: 25,
      cover_position_y: 75,
      cover_zoom: 125,
      gallery: ['https://example.com/gallery.jpg'],
      gallery_position_x: 30,
      gallery_position_y: 65,
    },
  };
  const { container } = render(<PublicInvitation invitation={invitation} />);

  expect(container.querySelector('.wedding-frame-botanical')).not.toBeNull();
  expect(container.querySelector('.wedding-motion-none')).not.toBeNull();
  expect(container.querySelector('.wedding-cover-image').style.objectPosition).toBe('25% 75%');
  expect(container.querySelector('.wedding-cover-image').style.transform).toBe('scale(1.25)');
  expect(container.querySelector('.wedding-gallery img').style.objectPosition).toBe('30% 65%');
});

test('public invitation hides empty event details and shows the Google Maps link when configured', () => {
  const invitation = {
    id: 'event-details',
    title: 'Pernikahan Aulia & Farhan',
    slug: 'aulia-farhan',
    content: { event_type: 'Pernikahan' },
  };
  const { container, rerender } = render(<PublicInvitation invitation={invitation} />);

  expect(container.querySelector('.wedding-events')).toBeNull();
  expect(container.querySelector('.wedding-countdown')).toBeNull();
  expect(container.querySelector('.wedding-couple')).toBeNull();
  expect(container.querySelector('.wedding-story')).toBeNull();
  expect(container.querySelector('.wedding-schedule')).toBeNull();
  expect(screen.queryByText(/Nama tempat|Alamat lengkap|Waktu acara|Tanggal acara/)).toBeNull();

  rerender(<PublicInvitation invitation={{
    ...invitation,
    content: {
      event_type: 'Pernikahan',
      venue: 'Gedung Melati',
      maps_url: 'https://maps.google.com/?q=gedung-melati',
    },
  }} />);

  expect(screen.getByText('Gedung Melati')).toBeDefined();
  expect(container.querySelector('.wedding-events a').getAttribute('href')).toBe('https://maps.google.com/?q=gedung-melati');
  expect(container.querySelector('.wedding-events iframe').getAttribute('src')).toContain('output=embed');
  expect(container.querySelector('.wedding-events h3')).toBeNull();
  expect(screen.queryByText(/Nama tempat|Alamat lengkap|Waktu acara|Tanggal acara/)).toBeNull();
});

test('anniversary invitations use the honoree layout instead of wedding couple details', () => {
  const invitation = {
    id: 'demo-anniversary',
    title: 'Anniversary Aulia & Farhan',
    slug: 'anniversary-aulia-farhan',
    content: {
      event_type: 'Anniversary',
      honoree_name: 'Aulia & Farhan',
      template_id: 'anniversary',
    },
  };
  const { container } = render(<PublicInvitation invitation={invitation} />);

  expect(container.querySelector('.public-template-anniversary')).not.toBeNull();
  expect(container.querySelector('.wedding-couple')).toBeNull();
  expect(container.querySelector('.wedding-honoree h2').textContent).toBe('Aulia & Farhan');
  expect(screen.getByRole('heading', { name: 'Aulia & Farhan' })).toBeDefined();
});

test('public invitations display only enabled digital envelope methods', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const invitation = {
    id: 'demo-envelope',
    title: 'Pernikahan Aulia & Farhan',
    slug: 'aulia-farhan',
    content: {
      event_type: 'Pernikahan',
      digital_envelope: {
        bank: { enabled: true, name: 'BCA', account_name: 'Aulia Putri', account_number: '001234567' },
        e_wallet: { enabled: false, provider: 'DANA', account_name: 'Aulia Putri', account_number: '089999999' },
        qris: { enabled: false, image_url: 'https://example.com/disabled-qris.png', instructions: 'Jangan tampilkan' },
      },
    },
  };
  try {
    const { container } = render(<PublicInvitation invitation={invitation} />);

    expect(container.querySelector('.wedding-digital-envelope')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'BUKA UNDANGAN' }));
    expect(screen.getByRole('heading', { name: /transfer bank · bca/i })).toBeDefined();
    expect(screen.getByText('001234567')).toBeDefined();
    expect(screen.queryByText('089999999')).toBeNull();
    expect(container.querySelector('img[src="https://example.com/disabled-qris.png"]')).toBeNull();
  } finally {
    play.mockRestore();
  }
});

test('attempts invitation music automatically and explains when browser playback is blocked', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('Autoplay blocked'));
  const invitation = {
    id: 'music-demo',
    title: 'Khitanan Rafi',
    slug: 'khitanan-rafi',
    content: { event_type: 'Khitanan', honoree_name: 'Rafi', music_url: 'https://example.com/music.mp3' },
  };
  try {
    render(<PublicInvitation invitation={invitation} />);

    expect(play).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'BUKA UNDANGAN' }));
    expect((await screen.findByRole('status')).textContent).toMatch(/tekan “Putar musik”/i);
    expect(play).toHaveBeenCalled();
  } finally {
    play.mockRestore();
  }
});

test('filters Nuansa Invite templates by category and can show all categories', () => {
  window.history.pushState({}, '', '/undangan');
  const { container } = renderApp();

  expect(container.querySelectorAll('.template-card')).toHaveLength(6);
  expect(screen.getByRole('heading', { name: 'Desain undangan yang siap Anda gunakan' })).toBeDefined();
  expect(screen.getByRole('button', { name: /Pernikahan/ })).toBeDefined();
  expect(screen.queryByRole('button', { name: /Khitanan/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /Aqiqah/ }));
  expect(container.querySelectorAll('.template-card')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Template Aqiqah' })).toBeDefined();
  expect(container.querySelector('.template-card .template-tag').textContent).toBe('Aqiqah');

  fireEvent.click(screen.getByRole('button', { name: /Semua/ }));
  expect(container.querySelectorAll('.template-card')).toHaveLength(6);
  expect(screen.getByRole('heading', { name: 'Desain undangan yang siap Anda gunakan' })).toBeDefined();
});

test('template preview content follows its selected event category', () => {
  const previews = [
    ['Pernikahan', 'Pernikahan', 'Aulia & Farhan'],
    ['Engagement', 'Engagement', 'Dina & Reza'],
    ['Lamaran', 'Lamaran', 'Dina & Reza'],
    ['Aqiqah', 'Aqiqah', 'Naira'],
    ['Khitanan', 'Khitanan', 'Rafi'],
    ['Tasyakuran', 'Tasyakuran', 'Keluarga Bahagia'],
    ['Corporate Event', 'Corporate Event', 'Peresmian Kantor Baru'],
    ['Ulang Tahun', 'Ulang Tahun', 'Naira'],
  ];

  previews.forEach(([category, expectedType, expectedName]) => {
    const { content, title } = createPreviewInvitation({ name: `${category} Demo`, category });
    expect(content.event_type).toBe(expectedType);
    expect(content.couple_names || content.honoree_name).toBe(expectedName);
    expect(title).toBeTruthy();
  });
});

test('renders the registration form on the register route', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-auth?mode=register');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Buat akun' })).toBeDefined();
  expect(screen.getByLabelText('Nama lengkap')).toBeDefined();
});

test('requires email OTP verification before completing Nuansa Invite registration', async () => {
  sessionStorage.clear();
  const fetchMock = vi.fn(async (url, options) => {
    const path = new URL(url, window.location.origin).pathname;
    const payload = path.endsWith('/auth/register')
      ? { message: 'Kode OTP telah dikirim ke email Anda.' }
      : {
        access_token: 'verified-registration-token',
        token_type: 'bearer',
        user: { id: 'user-1', full_name: 'Test User', email: 'test@example.com', role: 'user' },
      };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => payload,
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', '/undangan-auth?mode=register');
  const onSuccess = vi.fn();
  render(<AuthProvider><Auth onBack={vi.fn()} onSuccess={onSuccess} /></AuthProvider>);

  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'Password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Daftar' }));

  expect(await screen.findByRole('heading', { name: 'Masukkan kode OTP' })).toBeDefined();
  expect(screen.getByText('Kode OTP telah dikirim ke email Anda.')).toBeDefined();
  expect(sessionStorage.getItem('undangan.id.session')).toBeNull();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
  });

  fireEvent.change(screen.getByLabelText(/^Kode OTP/), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verifikasi email' }));

  await waitFor(() => {
    expect(JSON.parse(sessionStorage.getItem('undangan.id.session'))).toMatchObject({
      access_token: 'verified-registration-token',
      user: { email: 'test@example.com' },
    });
  });
  expect(onSuccess).toHaveBeenCalledOnce();
  expect(new URL(fetchMock.mock.calls[1][0], window.location.origin).pathname).toBe('/api/auth/register/verify');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ email: 'test@example.com', code: '123456' });
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('shows password strength and keeps symbols optional during signup', async () => {
  sessionStorage.clear();
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => ({ message: 'Kode OTP telah dikirim ke email Anda.' }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', '/undangan-auth?mode=register');
  render(<AuthProvider><Auth onBack={vi.fn()} onSuccess={vi.fn()} /></AuthProvider>);

  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
  const passwordInput = screen.getByLabelText('Kata sandi');
  const strengthMeter = screen.getByRole('meter', { name: 'Kekuatan kata sandi' });

  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  expect(strengthMeter.getAttribute('aria-valuetext')).toBe('Lemah');
  fireEvent.click(screen.getByRole('button', { name: 'Daftar' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/huruf kecil, huruf besar, dan angka/i);
  expect(fetchMock).not.toHaveBeenCalled();

  fireEvent.change(passwordInput, { target: { value: 'Password123' } });
  expect(strengthMeter.getAttribute('aria-valuetext')).toBe('Cukup');
  expect(screen.getByText('Simbol (opsional)')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Daftar' }));
  expect(await screen.findByRole('heading', { name: 'Masukkan kode OTP' })).toBeDefined();
  expect(fetchMock).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('renders a blog detail route for a published article', () => {
  window.history.pushState({}, '', '/undangan-blog/tips-memilih-template-undangan-digital-yang-sesuai-tema-acara');
  renderApp();

  expect(screen.getByRole('heading', { name: /tips memilih template undangan digital/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /kembali ke artikel/i })).toBeDefined();
});

test('protects the user dashboard when no account is signed in', async () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-dashboard');
  renderApp();

  expect(await screen.findByRole('heading', { name: /masuk untuk mengelola undangan/i })).toBeDefined();
});

test('test account does not select a package while filling invitation details', async () => {
  sessionStorage.setItem('undangan.id.session', JSON.stringify({
    access_token: 'test-token',
    user: {
      id: 'tester-1',
      full_name: 'Tester',
      email: 'tester@example.com',
      role: 'user',
      is_test_account: true,
      test_access_until: '2027-05-10T00:00:00+00:00',
    },
  }));
  const plans = ['basic', 'premium', 'business'].map((id) => ({
    id,
    name: id,
    price: 599000,
    duration_days: 365,
    slug_mode: id === 'basic' ? 'generated' : 'custom',
  }));
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = new URL(url, window.location.origin).pathname;
    const payload = path.endsWith('/auth/me')
      ? { user: { id: 'tester-1', full_name: 'Tester', email: 'tester@example.com', role: 'user', is_test_account: true, test_access_until: '2027-05-10T00:00:00+00:00' } }
      : path.endsWith('/billing/config')
        ? { plans, payment_methods: [] }
        : path.endsWith('/dashboard-admins')
          ? { eligible: false, max_admins: 3, admins: [] }
          : path.endsWith('/affiliate-program')
            ? { eligible: false, program: null, combinations: [], affiliates: [] }
            : [];
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => payload,
    };
  }));
  window.history.pushState({}, '', '/undangan-dashboard');
  const { container } = renderApp();

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.change(await screen.findByLabelText('Kelompok acara'), { target: { value: 'Pernikahan' } });
  fireEvent.change(screen.getByLabelText('Jenis acara'), { target: { value: 'Pernikahan' } });
  expect(screen.getByText('Template untuk Pernikahan')).toBeDefined();
  expect([...container.querySelectorAll('.setup-template-card strong')].some((item) => item.textContent === 'Royal Gold')).toBe(true);

  fireEvent.change(screen.getByLabelText('Kelompok acara'), { target: { value: 'Acara Islami & Keluarga' } });
  fireEvent.change(screen.getByLabelText('Jenis acara'), { target: { value: 'Khitanan' } });
  expect([...container.querySelectorAll('.setup-template-card strong')].map((item) => item.textContent)).toContain('Khitanan Royal');
  expect([...container.querySelectorAll('.setup-template-card strong')].map((item) => item.textContent)).not.toContain('Royal Gold');

  fireEvent.change(screen.getByLabelText('Kelompok acara'), { target: { value: 'Pernikahan' } });
  fireEvent.change(screen.getByLabelText('Jenis acara'), { target: { value: 'Akad & Resepsi' } });
  fireEvent.click(container.querySelector('.setup-template-card'));
  fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan ke isi data' }));
  expect(screen.queryByLabelText('Paket')).toBeNull();
  expect(screen.getByText(/akses semua paket tanpa pembayaran hingga/)).toBeDefined();

  fireEvent.change(screen.getByLabelText('Undangan ini untuk acara apa?'), { target: { value: 'Akad & Resepsi' } });
  expect(screen.getByLabelText('Tanggal resepsi')).toBeDefined();
  fireEvent.change(screen.getByLabelText('Undangan ini untuk acara apa?'), { target: { value: 'Khitanan' } });
  expect(screen.getByLabelText('Nama khitanan / yang dirayakan')).toBeDefined();
  expect(screen.queryByLabelText('Nama pasangan')).toBeNull();
  expect(container.querySelector('.template-choice.selected strong').textContent).toBe('Khitanan Royal');
  fireEvent.click(container.querySelector('.template-picker .template-demo-button'));
  expect(container.querySelector('.template-demo-viewport .wedding-cover h1').textContent).toBe('Khitanan');

  fireEvent.change(screen.getByLabelText('Inspirasi daerah'), { target: { value: 'Jawa Barat' } });
  expect(container.querySelector('.template-choice.selected strong').textContent).toBe('Jawa Barat · Mega Mendung');
  fireEvent.change(screen.getByLabelText('Undangan ini untuk acara apa?'), { target: { value: 'Anniversary' } });
  expect(screen.getByLabelText('Inspirasi daerah').value).toBe('');
  expect(container.querySelector('.template-choice.selected strong').textContent).toBe('Anniversary');
  expect(screen.getByLabelText('Nama pasangan yang merayakan')).toBeDefined();
  expect(screen.queryByLabelText('Orang tua mempelai pria')).toBeNull();
  expect(screen.queryByLabelText('Orang tua mempelai wanita')).toBeNull();
});

const mountPublishedInvitationDashboard = (planId, settings = {}) => {
  const invitation = {
    id: 'invitation-1',
    title: 'Hari Bahagia',
    slug: 'hari-bahagia',
    plan_id: planId,
    ...(settings.packageEntitlements ? { package_entitlements: settings.packageEntitlements } : {}),
    status: settings.status || 'published',
    active_until: settings.activeUntil === undefined ? '9999-12-31T23:59:59+00:00' : settings.activeUntil,
    content: settings.content || {},
  };
  sessionStorage.setItem('undangan.id.session', JSON.stringify({
    access_token: 'test-token',
    user: { id: 'user-1', full_name: 'Test User', email: 'test@example.com', role: 'user', is_test_account: false },
  }));
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    const path = new URL(url, window.location.origin).pathname;
    const payload = path.endsWith('/auth/me')
      ? { user: { id: 'user-1', full_name: 'Test User', email: 'test@example.com', role: 'user', is_test_account: false } }
      : path.endsWith('/billing/config')
        ? { plans: settings.billingPlans || [{ id: planId, name: planId, price: 599000, duration_days: 365, slug_mode: planId === 'basic' ? 'generated' : 'custom', ...(settings.planConfig || {}) }], payment_methods: settings.paymentMethods || [] }
        : path.endsWith('/dashboard-admins')
          ? { eligible: true, max_admins: 3, admins: [] }
          : path.endsWith('/affiliate-program')
            ? { eligible: true, program: null, combinations: [], affiliates: [] }
        : path.endsWith('/guestbook')
              ? settings.guestbookEntries || []
        : path.endsWith('/tickets') && options.method === 'POST'
          ? { tickets: JSON.parse(options.body).recipients.map((recipient, index) => ({
            ...recipient,
            token: `${String(index + 1).padStart(2, '0')}${'t'.repeat(41)}`,
          })) }
          : path.endsWith('/tickets')
            ? { tickets: settings.invitationTickets || [] }
          : path.endsWith('/payments')
            ? { id: 'payment-1', amount: 249000, manual_details: { bank_name: 'Bank' } }
          : [invitation];
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => payload,
    };
  }));
  window.history.pushState({}, '', '/undangan-dashboard');
  renderApp();
};

test('package is selected only when activating an invitation', async () => {
  mountPublishedInvitationDashboard('basic', {
    status: 'draft',
    activeUntil: null,
    billingPlans: [
      { id: 'basic', name: 'Basic', price: 99000, duration_days: 30, enabled: true },
      { id: 'premium', name: 'Premium', price: 249000, duration_days: 365, enabled: true },
    ],
    paymentMethods: [{ id: 'bank', name: 'Transfer bank', provider: 'manual', enabled: true }],
  });

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  expect(screen.queryByLabelText('Paket')).toBeNull();
  const activationPackage = screen.getByLabelText('Paket aktivasi');
  expect(activationPackage.value).toBe('basic');
  fireEvent.change(activationPackage, { target: { value: 'premium' } });
  fireEvent.click(screen.getByRole('button', { name: 'Bayar & aktifkan · Rp 249.000' }));

  await screen.findByText('Menunggu transfer');
  const paymentRequest = globalThis.fetch.mock.calls.find(([url]) => new URL(url, window.location.origin).pathname.endsWith('/payments'));
  expect(JSON.parse(paymentRequest[1].body)).toEqual({
    payment_method_id: 'bank',
    plan_id: 'premium',
  });
});

test('buyer dashboard shows guests, attendance responses, and greetings', async () => {
  mountPublishedInvitationDashboard('basic', {
    guestbookEntries: [{
      id: 'guest-1',
      name: 'Dewi Lestari',
      attendance: 'attending',
      guests: 2,
      message: 'Semoga acaranya lancar dan penuh kebahagiaan.',
      created_at: '2026-05-01T09:30:00+00:00',
    }],
  });

  expect(await screen.findByText('Dewi Lestari')).toBeDefined();
  expect(screen.getByText(/Hari Bahagia · Akan hadir · 2 tamu/)).toBeDefined();
  expect(screen.getByText('Semoga acaranya lancar dan penuh kebahagiaan.')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Unduh RSVP .xlsx' })).toBeDefined();
  const managementRequests = globalThis.fetch.mock.calls.filter(([url]) => {
    const path = new URL(url, window.location.origin).pathname;
    return path.endsWith('/dashboard-admins') || path.endsWith('/affiliate-program');
  });
  expect(managementRequests).toHaveLength(2);
  expect(managementRequests.every(([, options]) => options.headers.get('Authorization') === 'Bearer test-token')).toBe(true);
});

test('guestbook separates RSVP responses from the full ticket recipient list', async () => {
  mountPublishedInvitationDashboard('business', {
    guestbookEntries: [
      {
        id: 'guest-rsvp',
        name: 'Alya',
        attendance: 'attending',
        guests: 2,
        message: 'Sampai bertemu.',
        created_at: '2026-10-01T09:00:00+00:00',
      },
      {
        id: 'guest-checkin',
        ticket_id: 'ticket-scanned',
        source: 'barcode_check_in',
        name: 'Alya',
        attendance: 'attending',
        guests: 1,
        message: 'Check-in kehadiran melalui barcode undangan.',
        checked_in_at: '2026-10-11T16:00:00+00:00',
      },
    ],
    invitationTickets: [
      { id: 'ticket-scanned', name: 'Alya', phone: '6281234567890', checked_in_at: '2026-10-11T16:00:00+00:00' },
      { id: 'ticket-not-scanned', name: 'Bima', phone: '6289876543210', checked_in_at: null },
    ],
  });

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /rsvp & buku tamu/i }));

  expect(await screen.findByRole('table')).toBeDefined();
  expect(screen.getByText('Daftar tamu undangan')).toBeDefined();
  expect(screen.getByText('Check-in kehadiran melalui barcode undangan.')).toBeDefined();
  expect(screen.getByText('Bima')).toBeDefined();
  expect(screen.getByText('Hadir')).toBeDefined();
  expect(screen.getAllByText('Sampai bertemu.').length).toBeGreaterThan(0);
});

test('owner can copy the generated RSVP link and edit a premium invitation slug', async () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  mountPublishedInvitationDashboard('premium');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  const ownerGuestbookUrl = createOwnerGuestbookUrl('hari-bahagia');
  expect(screen.getByText(`Dashboard RSVP: ${ownerGuestbookUrl}`)).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Salin link dashboard RSVP' }));
  expect(writeText).toHaveBeenCalledWith(ownerGuestbookUrl);

  fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
  expect(screen.getByLabelText('Link dashboard RSVP otomatis').value).toBe(ownerGuestbookUrl);
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete navigator.clipboard;
  sessionStorage.clear();
});

test('routes an RSVP fragment to the owner dashboard and preserves its guestbook through login', async () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/i/aulia-farhan-6bcd575#rsvp');
  renderApp();

  expect(await screen.findByRole('heading', { name: 'Masuk untuk mengelola undangan' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Masuk / Daftar' }));

  const nextPath = new URLSearchParams(window.location.search).get('next');
  expect(window.location.pathname).toBe('/undangan-auth');
  expect(nextPath).toBe(createOwnerGuestbookUrl('aulia-farhan-6bcd575'));
  sessionStorage.clear();
});

test('owner can choose catalog music and upload a video file', async () => {
  mountPublishedInvitationDashboard('premium');
  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));

  fireEvent.change(screen.getByLabelText('Musik pilihan berdasarkan genre'), { target: { value: 'akustik-hangat' } });
  const videoFile = new File(['sample video'], 'story.mp4', { type: 'video/mp4' });
  fireEvent.change(screen.getByLabelText('Atau upload video'), { target: { files: [videoFile] } });
  expect(await screen.findByText('Video berhasil dimuat. Simpan draft untuk menerapkannya.')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Simpan semua perubahan' }));

  expect(await screen.findByText('Perubahan undangan tersimpan.')).toBeDefined();
  const updateCall = globalThis.fetch.mock.calls.find(([url, options]) => (
    new URL(url, window.location.origin).pathname.endsWith('/invitations/invitation-1')
    && options.method === 'PATCH'
  ));
  const savedContent = JSON.parse(updateCall[1].body).content;
  expect(savedContent.music_url).toBe('/music/akustik-hangat.wav');
  expect(savedContent.music_catalog_id).toBe('akustik-hangat');
  expect(savedContent.video_url).toMatch(/^data:video\/mp4;base64,/);
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('buyer can independently configure digital envelope methods for an invitation', async () => {
  mountPublishedInvitationDashboard('basic');

  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  try {
    fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
    fireEvent.click(screen.getByLabelText('Tampilkan rekening bank'));
    fireEvent.change(screen.getByLabelText('Nama bank'), { target: { value: 'BCA' } });
    fireEvent.change(screen.getByLabelText('Nama pemilik rekening'), { target: { value: 'Aulia Putri' } });
    fireEvent.change(screen.getByLabelText('Nomor rekening'), { target: { value: '001234567' } });
    fireEvent.click(screen.getByLabelText('Tampilkan e-wallet'));
    fireEvent.change(screen.getByLabelText('Penyedia e-wallet'), { target: { value: 'DANA' } });
    fireEvent.change(screen.getByLabelText('Nama pemilik akun'), { target: { value: 'Aulia Putri' } });
    fireEvent.change(screen.getByLabelText('Nomor akun / telepon'), { target: { value: '08987654321' } });
    fireEvent.click(screen.getByLabelText('Tampilkan QRIS'));
    const qrisFile = new File(['QR image'], 'qris.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Atau upload QRIS milik Anda'), { target: { files: [qrisFile] } });
    expect(await screen.findByText('Gambar QRIS berhasil dimuat. Simpan undangan untuk menerapkannya.')).toBeDefined();
    expect(screen.getByAltText('Pratinjau QRIS yang akan ditampilkan')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Keterangan QRIS (opsional)'), { target: { value: 'Pindai untuk mengirim hadiah.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan semua perubahan' }));

    expect(await screen.findByText('Perubahan undangan tersimpan.')).toBeDefined();
    const updateCall = globalThis.fetch.mock.calls.find(([url, options]) => (
      new URL(url, window.location.origin).pathname.endsWith('/invitations/invitation-1')
      && options.method === 'PATCH'
    ));
    expect(updateCall).toBeDefined();
    expect(JSON.parse(updateCall[1].body).content.digital_envelope).toEqual({
      bank: { enabled: true, name: 'BCA', account_name: 'Aulia Putri', account_number: '001234567' },
      e_wallet: { enabled: true, provider: 'DANA', account_name: 'Aulia Putri', account_number: '08987654321' },
      qris: { enabled: true, image_url: expect.stringMatching(/^data:image\/png;base64,/), instructions: 'Pindai untuk mengirim hadiah.' },
    });
  } finally {
    scrollTo.mockRestore();
  }
});

test('Basic package sends to one WhatsApp recipient at a time', async () => {
  const whatsappWindow = { location: { href: '' }, opener: null, close: vi.fn() };
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(whatsappWindow);
  mountPublishedInvitationDashboard('basic');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
  expect(screen.getByRole('dialog', { name: /pilih cara mengirim undangan/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /1\. kirim ke satu orang/i })).toBeDefined();
  expect(screen.queryByRole('button', { name: /2\. kirim bulk/i })).toBeNull();
  expect(screen.queryByLabelText(/nama penerima undangan/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /1\. kirim ke satu orang/i }));
  expect(screen.getByLabelText(/nama penerima undangan/i)).toBeDefined();
  expect(screen.getByLabelText(/nomor whatsapp penerima/i)).toBeDefined();
  expect(screen.getByText('Yth. {{nama}},')).toBeDefined();
  fireEvent.change(screen.getByLabelText('Isi pesan undangan'), {
    target: { value: 'Sampai bertemu di hari bahagia kami.' },
  });
  expect(screen.getByText('Yth. {{nama}},')).toBeDefined();
  expect(screen.queryByRole('button', { name: /download template/i })).toBeNull();
  expect(screen.queryByLabelText(/daftar nomor penerima/i)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Kirim WhatsApp' })).toBeNull();
  fireEvent.change(screen.getByLabelText(/nama penerima undangan/i), { target: { value: 'Dewi Lestari' } });
  fireEvent.change(screen.getByLabelText(/nomor whatsapp penerima/i), { target: { value: '081234567890' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim WhatsApp' }));
  const whatsappLink = await screen.findByRole('link', { name: /buka whatsapp/i });
  await waitFor(() => expect(whatsappWindow.location.href).toBe(whatsappLink.href));
  expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
  const whatsappMessage = decodeURIComponent(new URL(whatsappLink.href).searchParams.get('text'));
  expect(whatsappMessage).toContain('Yth. Dewi Lestari,');
  expect(whatsappMessage).toContain('Sampai bertemu di hari bahagia kami.');
  expect(whatsappMessage).toContain('/i/hari-bahagia?ticket=');
  expect(whatsappMessage).toContain('Website: Nuansa Invite');
  expect(whatsappMessage).toContain('Menu: Dashboard Undangan > Bagikan undangan');
  expect(whatsappMessage).not.toContain('/undangan-ticket/');
  expect(whatsappMessage.match(/https?:\/\//g)).toHaveLength(1);
  openSpy.mockRestore();
});

test('Premium single-recipient mode shows the WhatsApp action after recipient details are entered', async () => {
  const whatsappWindow = { location: { href: '' }, opener: null, close: vi.fn() };
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(whatsappWindow);
  mountPublishedInvitationDashboard('premium');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /kirim via whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /1\. kirim ke satu orang/i }));

  expect(screen.queryByRole('button', { name: 'Kirim WhatsApp' })).toBeNull();
  expect(screen.queryByRole('button', { name: /buat tiket & siapkan antrean/i })).toBeNull();
  fireEvent.change(screen.getByLabelText(/nama penerima undangan/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/nomor whatsapp penerima/i), { target: { value: '087728438477' } });

  const prepareButton = screen.getByRole('button', { name: 'Kirim WhatsApp' });
  expect(prepareButton).toBeDefined();
  fireEvent.click(prepareButton);
  const whatsappLink = await screen.findByRole('link', { name: 'Buka WhatsApp' });
  await waitFor(() => expect(whatsappWindow.location.href).toBe(whatsappLink.href));
  expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
  expect(screen.getByText('Tiket unik untuk Ana')).toBeDefined();
  openSpy.mockRestore();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('configured package entitlements control bulk upload and recipient caps for Premium', async () => {
  mountPublishedInvitationDashboard('premium', {
    planConfig: { bulk_upload_enabled: true, max_recipients: 2 },
    packageEntitlements: { bulk_upload_enabled: true, max_recipients: 2 },
  });

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /2\. kirim bulk/i }));
  expect(screen.getByRole('button', { name: /download template \.xlsx/i })).toBeDefined();
  fireEvent.change(screen.getByLabelText(/daftar penerima/i), {
    target: { value: '081234567890 | Andi\n081298765432 | Siti\n081277788899 | Rina' },
  });
  fireEvent.click(screen.getByRole('button', { name: /buat tiket & siapkan antrean/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/maksimal 2 penerima/i);
  expect(globalThis.fetch.mock.calls.some(([url]) => new URL(url, window.location.origin).pathname.endsWith('/tickets'))).toBe(false);
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('personalized invitation sharing creates a unique guestbook QR before WhatsApp sharing', async () => {
  mountPublishedInvitationDashboard('basic');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  expect(screen.queryByLabelText(/nama calon tamu/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Bagikan undangan' }));
  expect(screen.getByRole('dialog', { name: 'Bagikan undangan' })).toBeDefined();
  fireEvent.change(screen.getByLabelText(/nama calon tamu/i), { target: { value: 'Dewi Lestari' } });
  fireEvent.change(screen.getByLabelText(/nomor whatsapp calon tamu/i), { target: { value: '081234567890' } });
  fireEvent.click(screen.getByRole('button', { name: /buat qr & siapkan whatsapp/i }));

  expect(await screen.findByText('QR unik untuk Dewi Lestari')).toBeDefined();
  const ticketLink = screen.getByRole('link', { name: /lihat \/ cetak qr tamu/i });
  expect(new URL(ticketLink.href).pathname).toMatch(/^\/undangan-ticket\/[A-Za-z0-9_-]{32,64}$/);
  const whatsappLink = screen.getByRole('link', { name: /buka whatsapp berisi undangan \+ qr/i });
  const whatsappUrl = new URL(whatsappLink.href);
  const whatsappMessage = decodeURIComponent(whatsappUrl.searchParams.get('text'));
  expect(whatsappUrl.pathname).toBe('/6281234567890');
  expect(whatsappMessage).toContain('/i/hari-bahagia?ticket=');
  expect(whatsappMessage).toContain('Website: Nuansa Invite');
  expect(whatsappMessage).toContain('Menu: Dashboard Undangan > Bagikan undangan');
  expect(whatsappMessage).not.toContain(ticketLink.href);
  expect(whatsappMessage.match(/https?:\/\//g)).toHaveLength(1);
  const ticketRequest = globalThis.fetch.mock.calls.find(([url]) => new URL(url, window.location.origin).pathname.endsWith('/invitations/invitation-1/tickets'));
  expect(JSON.parse(ticketRequest[1].body).recipients).toEqual([{ name: 'Dewi Lestari', phone: '6281234567890' }]);
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('Premium package imports an XLSX recipient list and advances after manual confirmation', async () => {
  mountPublishedInvitationDashboard('premium');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
  expect(screen.getByRole('button', { name: /1\. kirim ke satu orang/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /2\. kirim bulk/i })).toBeDefined();
  expect(screen.queryByLabelText(/daftar penerima/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /2\. kirim bulk/i }));
  expect(screen.getByRole('button', { name: /download template \.xlsx/i })).toBeDefined();
  expect(screen.queryByLabelText(/nomor whatsapp penerima/i)).toBeNull();
  expect(screen.getByLabelText(/daftar penerima/i).getAttribute('placeholder')).toContain('|');

  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Penerima').addRows([
    ['nomor_hp', 'nama_penerima'],
    ['081234567890', 'Tamu 1'],
    ['+6281298765432', 'Tamu 2'],
  ]);
  const recipientFile = new File([await workbook.xlsx.writeBuffer()], 'penerima.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  fireEvent.change(screen.getByLabelText(/upload daftar nomor/i), { target: { files: [recipientFile] } });
  expect(await screen.findByText(/2 tiket barcode unik berhasil dibuat dari file/i)).toBeDefined();
  expect(screen.getByText(/Penerima 1 dari 2/)).toBeDefined();
  const firstRecipientUrl = new URL(screen.getByRole('link', { name: /buka chat whatsapp/i }).href);
  expect(firstRecipientUrl.pathname).toBe('/6281234567890');
  const firstRecipientMessage = decodeURIComponent(firstRecipientUrl.searchParams.get('text'));
  expect(firstRecipientMessage).toContain('Yth. Tamu 1,');
  expect(firstRecipientMessage).toContain('/i/hari-bahagia?ticket=');
  expect(firstRecipientMessage).not.toContain('/undangan-ticket/');
  expect(firstRecipientMessage.match(/https?:\/\//g)).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /sudah terkirim, lanjut/i }));
  const secondRecipientUrl = new URL(screen.getByRole('link', { name: /buka chat whatsapp/i }).href);
  expect(secondRecipientUrl.pathname).toBe('/6281298765432');
  expect(decodeURIComponent(secondRecipientUrl.searchParams.get('text'))).toContain('Yth. Tamu 2,');
  expect(screen.getByText(/Penerima 2 dari 2/)).toBeDefined();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('buyer menu switches between dashboard, invitations, guide, and QR scanner', async () => {
  mountPublishedInvitationDashboard('basic');

  expect(await screen.findByRole('heading', { name: /semua kebutuhan undangan/i })).toBeDefined();
  expect(screen.queryByRole('heading', { name: /undangan dan masa aktif/i })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Undangan', exact: true }));
  expect(await screen.findByRole('heading', { name: /undangan dan masa aktif/i })).toBeDefined();
  expect(screen.queryByRole('heading', { name: /semua kebutuhan undangan/i })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /cara penggunaan/i }));
  expect(screen.getByRole('heading', { name: /cara menggunakan undangan/i })).toBeDefined();
  expect(screen.queryByRole('heading', { name: /undangan dan masa aktif/i })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Scan QR', exact: true }));
  expect(await screen.findByRole('heading', { name: /scan tiket qr tamu/i })).toBeDefined();
  expect(screen.getByLabelText(/pilih undangan yang akan dipindai/i).value).toBe('invitation-1');
  expect(screen.getByRole('button', { name: /scan barcode dengan kamera/i })).toBeDefined();
});

test('the event dashboard opens a camera scanner in its guestbook', async () => {
  mountPublishedInvitationDashboard('basic');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: /rsvp & buku tamu/i }));
  expect(await screen.findByRole('heading', { name: /scan tiket qr tamu/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /scan barcode dengan kamera/i })).toBeDefined();
});

test('Business package prepares WhatsApp recipients in sequence', async () => {
  mountPublishedInvitationDashboard('business');

  fireEvent.click(await screen.findByRole('button', { name: 'Undangan', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /2\. kirim bulk/i }));
  fireEvent.change(screen.getByLabelText(/daftar penerima/i), {
    target: { value: '081234567890 | Andi\n+6281298765432 | Siti' },
  });
  fireEvent.click(screen.getByRole('button', { name: /buat tiket & siapkan antrean/i }));

  const firstRecipientLink = await screen.findByRole('link', { name: /buka chat whatsapp/i });
  expect(new URL(firstRecipientLink.href).pathname).toBe('/6281234567890');
  expect(decodeURIComponent(new URL(firstRecipientLink.href).searchParams.get('text'))).toContain('Yth. Andi,');
  expect(screen.getByText(/Penerima 1 dari 2/)).toBeDefined();

  fireEvent.click(screen.getByRole('button', { name: /sudah terkirim, lanjut/i }));
  const nextRecipientLink = screen.getByRole('link', { name: /buka chat whatsapp/i });
  expect(new URL(nextRecipientLink.href).pathname).toBe('/6281298765432');
  expect(decodeURIComponent(new URL(nextRecipientLink.href).searchParams.get('text'))).toContain('Yth. Siti,');
  expect(screen.getByText(/Penerima 2 dari 2/)).toBeDefined();

  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('shows the unified super admin login page', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/setia-creative-admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Super Admin' })).toBeDefined();
  expect(screen.getByLabelText('Email admin')).toBeDefined();
});

test('super admin can review affiliate history, manage ads, and deactivate without deletion', async () => {
  const affiliate = {
    id: 'affiliate-1',
    full_name: 'Mitra Undangan',
    email: 'mitra@example.com',
    owner_name: 'Pemilik Undangan',
    owner_email: 'owner@example.com',
    basic_quota: 2,
    premium_quota: 1,
    basic_used: 1,
    premium_used: 0,
    invitation_count: 1,
    ad_title: '',
    ad_description: '',
    ad_url: '',
    ad_image: '',
    ad_active: false,
    active: true,
    created_at: '2025-01-01T00:00:00+00:00',
  };
  const responses = {
    '/api/admin/billing/config': {
      plans: [],
      payment_methods: [],
      affiliate_combinations: [],
      dashboard_admin_limit: 3,
    },
    '/api/admin/invitations': [],
    '/api/admin/payments': [],
    '/api/admin/demo-accounts': [],
    '/api/admin/affiliate-accounts': [affiliate],
  };
  const fetchMock = vi.fn(async (url) => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => responses[new URL(url, window.location.origin).pathname] ?? {},
  }));
  vi.stubGlobal('fetch', fetchMock);
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);

  render(<AdminBilling />);
  fireEvent.click(await screen.findByRole('button', { name: /affiliate & iklan/i }));

  expect(await screen.findByText(/1 undangan · 1\/2 basic · 0\/1 premium/i)).toBeDefined();
  fireEvent.change(screen.getByLabelText('Judul iklan'), { target: { value: 'Promo spesial' } });
  fireEvent.change(screen.getByLabelText('Link tujuan'), { target: { value: 'https://example.com/promo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan iklan' }));
  expect(await screen.findByText('Pengaturan iklan affiliate tersimpan.')).toBeDefined();
  expect(fetchMock.mock.calls.some(([url, options]) => (
    url.endsWith('/admin/affiliate-accounts/affiliate-1')
    && options.method === 'PATCH'
    && JSON.parse(options.body).ad_title === 'Promo spesial'
  ))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }));
  expect(await screen.findByText(/riwayat undangan dan atribusi penjualan tetap disimpan/i)).toBeDefined();
  expect(fetchMock.mock.calls.some(([url, options]) => (
    url.endsWith('/admin/affiliate-accounts/affiliate-1')
    && options.method === 'PATCH'
    && JSON.parse(options.body).active === false
  ))).toBe(true);

  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test.each([
  ['/gibrig', /artist performance & entertainment studio/i],
  ['/nunuy-nadhifa-wedding', /make your wedding unforgettable/i],
  ['/undangan', /ciptakan momen istimewa berkelas & elegan/i],
])('keeps the public website at %s free of admin buttons', (path, heading) => {
  window.history.pushState({}, '', path);
  renderApp();

  expect(screen.getByRole('heading', { name: heading })).toBeDefined();
  expect(screen.queryByRole('button', { name: /^admin$/i })).toBeNull();
});

test('keeps the unified super admin login page on a trailing-slash route', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/setia-creative-admin/');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Super Admin' })).toBeDefined();
  expect(screen.getByLabelText('Email admin')).toBeDefined();
});

test('super admin home links to all admin panels and public websites', () => {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/setia-creative-admin');
  renderApp();

  expect(screen.getByRole('link', { name: /portal admin/i }).getAttribute('href')).toBe('/portal-admin');
  expect(screen.getByRole('link', { name: /gibrig admin/i }).getAttribute('href')).toBe('/gibrig-admin');
  expect(screen.getByRole('link', { name: /nunuy wedding admin/i }).getAttribute('href')).toBe('/nunuy-admin');
  expect(screen.getByRole('link', { name: 'Google Search Console' })).toMatchObject({
    href: 'https://search.google.com/search-console?resource_id=sc-domain%3Aauroramedia.online',
    target: '_blank',
  });
  expect(screen.getByRole('link', { name: /nuansa invite website admin/i }).getAttribute('href')).toBe('/undangan-website-admin');
  expect(screen.getByRole('link', { name: /nuansa invite admin/i }).getAttribute('href')).toBe('/undangan-admin');
  expect(screen.getByRole('link', { name: 'Nunuy Nadhifa Wedding' }).getAttribute('href')).toBe('https://wediing.auroramedia.online/nunuy-nadhifa-wedding');
  sessionStorage.clear();
});

test('restricted admin login opens its assigned panel directly', async () => {
  const invitationAdminToken = `header.${btoa(JSON.stringify({ role: 'admin', scope: 'invitation' }))}.signature`;
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ access_token: invitationAdminToken }),
  })));
  sessionStorage.clear();
  window.history.pushState({}, '', '/admin');
  renderApp();

  fireEvent.change(screen.getByLabelText('Email admin'), { target: { value: 'invitation@example.com' } });
  fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

  await waitFor(() => expect(window.location.pathname).toBe('/undangan-website-admin'));
  expect(screen.queryByText('Akses panel terbatas')).toBeNull();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('opens Nuansa Invite admin from its own direct link after one super admin login', () => {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/undangan-admin');
  renderApp();

  expect(screen.getByRole('navigation', { name: 'Navigasi super admin' })).toBeDefined();
  expect(screen.getAllByRole('link', { name: 'Nuansa Invite', exact: true }).map((link) => link.getAttribute('href'))).toContain('/undangan-admin');
  expect(window.location.pathname).toBe('/undangan-admin');
  sessionStorage.clear();
});

test('keeps the previous Portal admin URL as an alias', () => {
  sessionStorage.clear();
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Portal Admin' })).toBeDefined();
  const adminNavigation = screen.getByRole('navigation', { name: 'Navigasi Portal Admin' });
  expect(adminNavigation.querySelector('a[href="#admin-dashboard"]')).not.toBeNull();
  expect(adminNavigation.querySelector('a[href="#admin-content"]')).not.toBeNull();
  expect(adminNavigation.querySelector('a[href="#admin-theme"]')).not.toBeNull();
  expect(adminNavigation.querySelector('a[href="#admin-media"]')).not.toBeNull();
  expect(adminNavigation.querySelector('a[href="/setia-creative-admin/seo"]')).not.toBeNull();
  const adsLink = adminNavigation.querySelector('a[href="#admin-ads"]');
  expect(adsLink).not.toBeNull();
  fireEvent.click(adsLink);
  expect(adsLink).toHaveClass('is-active');
  expect(document.getElementById('admin-ads')).not.toBeNull();
  expect(document.querySelectorAll('.portal-admin-ad input[type="file"]')).toHaveLength(4);
  expect(document.querySelectorAll('.portal-admin-ad input[type="number"]')).toHaveLength(12);
  expect(document.querySelectorAll('.portal-admin-ad textarea')).toHaveLength(4);
  expect(window.location.pathname).toBe('/admin');
  sessionStorage.clear();
});

test('legacy admin routes require the unified super admin session', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/gibrig-admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Super Admin' })).toBeDefined();
  expect(screen.queryByRole('heading', { name: 'Gibrig Admin' })).toBeNull();
});

test('one super admin session opens the Portal admin link', () => {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/portal-admin');
  const admin = renderApp();

  expect(screen.getByRole('heading', { name: 'Portal Admin' })).toBeDefined();
  expect(screen.getByRole('navigation', { name: 'Navigasi super admin' })).toBeDefined();
  expect(admin.container.querySelector('.portal-ad-page-settings input')).not.toBeNull();
  expect(admin.container.querySelector('.portal-ad-page-settings select').value).toBe('grid');
  expect(admin.container.querySelectorAll('.portal-admin-ad input[type="number"]')).toHaveLength(4);
  sessionStorage.clear();
});

test.each(['admin', 'gibrig', 'nunuy', 'invitation'])('provides exactly 100 original theme templates for %s', (site) => {
  const themes = getThemeCatalog(site);

  expect(themes).toHaveLength(100);
  expect(new Set(themes.map((theme) => theme.id)).size).toBe(100);
  expect(themes.every((theme) => /^#[\da-f]{6}$/i.test(theme.primary) && theme.layout && theme.font)).toBe(true);
});

test('admin edits content and applies theme settings to the public site', () => {
  sessionStorage.clear();
  localStorage.removeItem('gibrig-cms');
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/gibrig-admin');
  const admin = render(<App />);

  fireEvent.change(screen.getByLabelText('Nama Website'), { target: { value: 'Gibrig Live Studio' } });
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Panggung Hiburan Pilihan' } });
  fireEvent.change(screen.getByLabelText('Alamat gambar logo'), { target: { value: 'https://example.com/gibrig-logo.png' } });
  fireEvent.change(screen.getByLabelText('Gambar utama / hero'), { target: { value: 'https://example.com/gibrig-hero.jpg' } });
  const templates = screen.getAllByRole('button', { name: 'Terapkan template' });
  expect(templates.length).toBeGreaterThanOrEqual(100);
  fireEvent.click(templates[20]);
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

  const saved = JSON.parse(localStorage.getItem('gibrig-cms'));
  expect(saved.siteName).toBe('Gibrig Live Studio');
  expect(saved.hero.title).toBe('Panggung Hiburan Pilihan');
  expect(saved.logoImage).toBe('https://example.com/gibrig-logo.png');
  expect(saved.hero.image).toBe('https://example.com/gibrig-hero.jpg');
  expect(saved.theme.layout).toBe('centered');

  admin.unmount();
  window.history.pushState({}, '', '/gibrig');
  const publicSite = render(<App />);
  expect(publicSite.container.querySelector('.gibrig-shell').style.getPropertyValue('--theme-primary')).toBe(saved.theme.primary);
  expect(publicSite.container.querySelector('.gibrig-shell').style.getPropertyValue('--theme-logo-size')).toBe(`${saved.theme.logoSize}px`);
  expect(screen.getByRole('heading', { name: 'Panggung Hiburan Pilihan' })).toBeDefined();
  expect(screen.getByAltText('Gibrig Live Studio logo')).toBeDefined();
  expect(screen.getByAltText('Gibrig Live Studio performance').getAttribute('src')).toBe('https://example.com/gibrig-hero.jpg');

  publicSite.unmount();
  localStorage.removeItem('gibrig-cms');
  localStorage.removeItem('gibrig-themes');
  sessionStorage.clear();
}, 30000);

test('portal theme presets update the actual public website theme', () => {
  localStorage.removeItem('portal-cms');
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', '/portal-admin');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /glassmorphism luxury/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  const saved = JSON.parse(localStorage.getItem('portal-cms'));
  expect(saved.theme.primary).toBe('#52634c');

  window.history.pushState({}, '', '/');
  const publicSite = render(<App />);
  const portal = publicSite.container.querySelector('.theme-portal');
  expect(portal.style.getPropertyValue('--primary')).toBe('#52634c');
  expect(portal.className).toContain('portal-preset-glassmorphism-luxury');
  publicSite.unmount();
  localStorage.removeItem('portal-cms');
  sessionStorage.clear();
}, 15000);

test.each([
  ['admin', '/portal-admin', '/', 'portal-cms'],
  ['gibrig', '/gibrig-admin', '/gibrig', 'gibrig-cms'],
  ['nunuy', '/nunuy-admin', '/nunuy-nadhifa-wedding', 'nunuy-cms'],
  ['invitation', '/undangan-website-admin', '/undangan', 'invitation-cms'],
])('publishes an independent phone and WhatsApp contact for %s', async (site, adminPath, publicPath, storageKey) => {
  const phone = '+62 811-2233-4455';
  const whatsapp = '+62 811-9988-7766';
  const siteKey = site === 'admin' ? 'portal' : site;
  const publishedContacts = new Map();
  vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
    const pathname = new URL(url, window.location.origin).pathname;
    const contactMatch = pathname.match(/\/api\/(?:public|admin)\/site-contact\/([^/]+)/);
    let payload = [];
    if (contactMatch) {
      const requestedSite = contactMatch[1];
      if (options.method === 'PUT') publishedContacts.set(requestedSite, JSON.parse(options.body));
      payload = { site: requestedSite, contact: publishedContacts.get(requestedSite) || null };
    } else if (pathname.startsWith('/api/public/testimonials/')) {
      payload = [];
    } else if (pathname.startsWith('/api/public/seo/')) {
      payload = { seo: null };
    } else if (pathname === '/api/public/advertisements') {
      payload = [];
    } else if (pathname.endsWith('/nunuy-consultations')) {
      payload = [];
    }
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => payload };
  }));
  localStorage.removeItem(storageKey);
  sessionStorage.clear();
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, SUPER_ADMIN_TEST_TOKEN);
  window.history.pushState({}, '', adminPath);
  const admin = render(<App />);

  fireEvent.change(screen.getByLabelText('Nomor HP publik'), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText('Nomor WhatsApp'), { target: { value: whatsapp } });
  fireEvent.change(screen.getByLabelText('Pesan pembuka WhatsApp'), { target: { value: `Halo dari ${site}` } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  expect(await screen.findByText(/nomor telepon dan WhatsApp tersinkron/i)).toBeDefined();
  expect(publishedContacts.get(siteKey)).toMatchObject({
    phone,
    whatsappNumber: whatsapp,
    whatsappMessage: `Halo dari ${site}`,
  });

  const saved = JSON.parse(localStorage.getItem(storageKey));
  expect(saved.contact.phone).toBe(phone);
  expect(saved.whatsapp.number).toBe(whatsapp);
  expect(saved.whatsapp.message).toBe(`Halo dari ${site}`);

  admin.unmount();
  localStorage.removeItem(storageKey);
  window.history.pushState({}, '', publicPath);
  const publicSite = render(<App />);
  await waitFor(() => expect(publicSite.container.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href'))
    .toContain(`wa.me/${whatsapp.replace(/\D/g, '')}`));
  const contactLink = publicSite.container.querySelector(`a[href^="https://wa.me/${whatsapp.replace(/\D/g, '')}"]`);
  expect(contactLink).not.toBeNull();
  const contactUrl = new URL(contactLink.getAttribute('href'));
  const contactMessage = new URL(contactLink.getAttribute('href')).searchParams.get('text');
  const siteName = {
    admin: 'Aurora Media',
    gibrig: 'Entertainment Musik',
    nunuy: 'Nunuy Nadhifa Wedding',
    invitation: 'Nuansa Invite',
  }[site];
  expect(contactMessage).toContain(`Halo dari ${site}`);
  expect(contactMessage).toContain(`Website: ${siteName}`);
  expect(contactMessage).toContain('Menu:');
  expect(contactUrl.pathname).toBe(`/${whatsapp.replace(/\D/g, '')}`);
  expect(publicSite.container.querySelector(`a[href="tel:${phone.replace(/[^\d+]/g, '')}"]`)?.textContent).toBe(phone);

  publicSite.unmount();
  localStorage.removeItem(storageKey);
  vi.unstubAllGlobals();
  sessionStorage.clear();
}, 30000);

test.each([
  ['/gibrig', /artist performance & entertainment studio/i, '/gibrig'],
  ['/nunuy-nadhifa-wedding', /make your wedding unforgettable/i, '/nunuy-nadhifa-wedding'],
  ['/undangan', /ciptakan momen istimewa berkelas & elegan/i, '/undangan'],
])('provides a Beranda link on %s', (path, heading, href) => {
  window.history.pushState({}, '', path);
  renderApp();

  expect(screen.getByRole('heading', { name: heading })).toBeDefined();
  expect(screen.getAllByRole('link', { name: 'Beranda' }).every((link) => link.getAttribute('href') === href)).toBe(true);
  expect(screen.getAllByRole('link', { name: 'Aurora Media' }).every((link) => link.getAttribute('href') === 'https://auroramedia.online/')).toBe(true);
});

test('renders the Nunuy wedding experience with real-data disclaimers and consultation', () => {
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding');
  const { container } = renderApp();

  expect(screen.getByRole('heading', { name: /make your wedding unforgettable/i })).toBeDefined();
  expect(screen.getAllByText('Hubungi kami')).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Silver' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Gold' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Platinum' })).toBeDefined();
  const packageLinks = [...container.querySelectorAll('.nunuy-package-link')];
  expect(packageLinks).toHaveLength(3);
  ['Silver', 'Gold', 'Platinum'].forEach((packageName, index) => {
    const packageUrl = new URL(packageLinks[index].getAttribute('href'));
    expect(packageUrl.hostname).toBe('wa.me');
    expect(packageUrl.pathname).toBe('/6281277881122');
    const packageMessage = packageUrl.searchParams.get('text');
    expect(packageMessage).toContain(`paket ${packageName}`);
    expect(packageMessage).toContain('menanyakan harga');
    expect(packageMessage).toContain('Website: Nunuy Nadhifa Wedding');
    expect(packageMessage).toContain(`Menu: Paket Wedding > ${packageName}`);
    expect(packageLinks[index].getAttribute('target')).toBe('_blank');
  });
  expect(screen.getByText(/testimoni pelanggan asli akan ditampilkan/i)).toBeDefined();
  expect(screen.getByLabelText(/nama calon pengantin/i)).toBeDefined();
  expect(screen.getByLabelText(/email/i)).toBeDefined();
  expect(screen.getByRole('navigation', { name: 'Navigasi utama' }).querySelectorAll('a')).toHaveLength(10);
  expect(screen.getByRole('link', { name: 'Konsultasi Sekarang' }).getAttribute('href')).toBe('/nunuy-nadhifa-wedding/kontak#consultation');
  expect(screen.getByRole('link', { name: 'Lihat Portofolio' }).getAttribute('href')).toBe('/nunuy-nadhifa-wedding/galeri');
  expect(container.querySelector('.nunuy-floating-whatsapp').getAttribute('href')).toContain('wa.me/6281277881122');
  expect(container.querySelector('.nunuy-floating-whatsapp svg')).toBeDefined();
  expect(container.querySelector('.nunuy-floating-whatsapp').textContent).toBe('');
});

test('Nunuy uses the provided brand logo and its own favicon', async () => {
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding');
  const { container } = renderApp();

  const headerLogo = container.querySelector('.nunuy-header .nunuy-logo-image');
  expect(headerLogo.getAttribute('src')).toBe('/nunuy-nadhifa-logo.webp');
  expect(headerLogo.getAttribute('alt')).toBe('');
  expect(container.querySelector('.nunuy-header .nunuy-brand-copy strong')).toHaveTextContent('Nunuy Nadhifa Wedding');
  expect(container.querySelector('.nunuy-footer .nunuy-brand-copy strong')).toHaveTextContent('Nunuy Nadhifa Wedding');
  await waitFor(() => expect(document.head.querySelector('link[rel="icon"]').getAttribute('href')).toBe('/nunuy-nadhifa-favicon.png'));
});

test('Nunuy mobile menu exposes page links and can be closed', () => {
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding');
  renderApp();

  const toggle = screen.getByRole('button', { name: 'Buka menu' });
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Tutup menu' }).getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('link', { name: 'Testimoni' }).getAttribute('href')).toBe('/nunuy-nadhifa-wedding/testimoni');
  fireEvent.click(screen.getByRole('button', { name: 'Tutup menu' }));
  expect(screen.getByRole('button', { name: 'Buka menu' }).getAttribute('aria-expanded')).toBe('false');
});

test.each([
  ['Tentang Kami', '/tentang-kami', '.nunuy-intro'],
  ['Layanan', '/layanan', '.nunuy-services'],
  ['Paket Wedding', '/paket-wedding', '.nunuy-packages'],
  ['Galeri', '/galeri', '.nunuy-gallery'],
  ['Inspirasi', '/inspirasi', '.nunuy-journal'],
  ['Testimoni', '/testimoni', '.nunuy-testimonials'],
  ['FAQ', '/faq', '.nunuy-faq'],
  ['Kontak', '/kontak', '.nunuy-consultation'],
])('renders the Nunuy %s menu as its own page', async (menuLabel, route, pageSelector) => {
  const path = `/nunuy-nadhifa-wedding${route}`;
  window.history.pushState({}, '', path);
  const { container } = renderApp();

  expect(container.querySelector(pageSelector)).not.toBeNull();
  expect(container.querySelector('.nunuy-hero')).toBeNull();
  const currentMenuLink = screen.getByRole('navigation', { name: 'Navigasi utama' })
    .querySelector(`a[href="${path}"]`);
  expect(currentMenuLink.getAttribute('aria-current')).toBe('page');
  expect(currentMenuLink.textContent).toBe(menuLabel);
  expect(screen.getByRole('link', { name: 'Beranda' }).getAttribute('href')).toBe('/nunuy-nadhifa-wedding');
  expect(screen.getAllByRole('link', { name: 'Aurora Media' }).every((link) => link.getAttribute('href') === 'https://auroramedia.online/')).toBe(true);
  await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]').href).toContain(path));
});

test.each([
  ['wedding-organizer', 'Wedding Organizer'],
  ['entertainment-dan-musik', 'Entertainment dan Musik'],
])('Nunuy service page %s opens a contextual WhatsApp consultation', async (slug, serviceTitle) => {
  window.history.pushState({}, '', `/nunuy-nadhifa-wedding/layanan/${slug}`);
  renderApp();

  expect(screen.getByRole('heading', { name: serviceTitle })).toBeDefined();
  expect(screen.getByText(/ruang lingkup yang dibicarakan/i)).toBeDefined();
  screen.getAllByRole('link', { name: /konsultasi gratis/i }).forEach((link) => {
    const url = new URL(link.getAttribute('href'));
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe('/6281277881122');
    const serviceMessage = url.searchParams.get('text');
    expect(serviceMessage).toContain(`layanan ${serviceTitle}`);
    expect(serviceMessage).toContain(`menu: Layanan > ${serviceTitle}`);
    expect(serviceMessage).toContain('pilihan paket');
    expect(serviceMessage).toContain('Website: Nunuy Nadhifa Wedding');
    expect(serviceMessage).toContain(`Menu: Layanan > ${serviceTitle}`);
    expect(link.getAttribute('target')).toBe('_blank');
  });
  await waitFor(() => expect(document.title).toBe(`${serviceTitle} | Nunuy Nadhifa Wedding`));
  expect(document.head.querySelector('link[rel="canonical"]').href).toContain(`/nunuy-nadhifa-wedding/layanan/${slug}`);
  expect(document.head.querySelector('script[data-nunuy-seo="true"]').textContent).toContain('"@type":"LocalBusiness"');
});

test('Nunuy inspiration articles have their own route and article metadata', async () => {
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding/inspirasi/tips-memilih-wedding-organizer-yang-tepat');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Tips Memilih Wedding Organizer yang Tepat' })).toBeDefined();
  expect(screen.getByText(/Tuliskan kebutuhan utama dan hal yang paling penting/i)).toBeDefined();
  await waitFor(() => expect(document.title).toBe('Tips Memilih Wedding Organizer yang Tepat | Nunuy Nadhifa Wedding'));
  expect(document.head.querySelector('script[data-nunuy-seo="true"]').textContent).toContain('"@type":"Article"');
});

test('Nunuy admin manages consultation follow-up status', async () => {
  const fetchMock = vi.fn(async (_url, options = {}) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => options.method === 'PATCH'
      ? { id: 'consultation-1', status: 'contacted' }
      : [{
        id: 'consultation-1',
        couple: 'Alya & Bima',
        phone: '+6281234567890',
        email: 'alya@example.com',
        status: 'new',
        created_at: '2026-10-25T10:00:00+00:00',
      }],
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<NunuyConsultationAdmin token="admin-token" />);

  expect(await screen.findByText('Alya & Bima')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Tandai sudah dihubungi' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/sudah dihubungi/i);
  expect(fetchMock.mock.calls.some(([, options]) => options.method === 'PATCH')).toBe(true);
  vi.unstubAllGlobals();
});

test('uses editable Nunuy admin content on the public website', () => {
  localStorage.removeItem('nunuy-cms');
  localStorage.setItem('nunuy-cms', JSON.stringify({
    siteName: 'Nunuy CMS Test',
    hero: { title: 'A Custom Wedding Story', image: 'https://example.com/wedding.jpg' },
    uiLabels: { navigationCta: 'Atur Pertemuan' },
  }));
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding');
  renderApp();

  expect(screen.getByRole('heading', { name: /a custom wedding story/i })).toBeDefined();
  expect(screen.getByRole('link', { name: /atur pertemuan/i })).toBeDefined();
  expect(screen.getAllByText('Nunuy CMS Test')).toHaveLength(3);
  expect(document.querySelector('.nunuy-hero-image').getAttribute('style')).toContain('example.com/wedding.jpg');

  localStorage.removeItem('nunuy-cms');
});

test('filters and opens the Nunuy inspiration gallery', () => {
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding');
  const { container } = renderApp();

  fireEvent.click(screen.getByRole('button', { name: 'Engagement' }));
  expect(container.querySelectorAll('.nunuy-gallery-item')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /perbesar engagement moments/i }));
  expect(screen.getByRole('dialog', { name: 'Engagement Moments' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Tutup gambar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('stores Nunuy consultation details and provides the WhatsApp follow-up after confirmation', async () => {
  window.history.pushState({}, '', '/nunuy-nadhifa-wedding');
  const fetchMock = vi.fn(async (url, options = {}) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => String(url).includes('/public/nunuy-consultations')
      ? { id: 'consultation-1', status: 'new' }
      : [],
  }));
  vi.stubGlobal('fetch', fetchMock);
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  renderApp();

  fireEvent.change(screen.getByLabelText(/nama calon pengantin/i), { target: { value: 'Alya & Bima' } });
  fireEvent.change(screen.getByLabelText(/nomor whatsapp/i), { target: { value: '081234567890' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alya@example.com' } });
  fireEvent.change(screen.getByLabelText(/tanggal pernikahan/i), { target: { value: '2027-06-12' } });
  fireEvent.change(screen.getByLabelText(/lokasi acara/i), { target: { value: 'Bandung' } });
  fireEvent.click(screen.getByRole('button', { name: /kirim konsultasi via whatsapp/i }));

  expect(confirmSpy).toHaveBeenCalledOnce();
  expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/permintaan tersimpan/i));
  const fallbackMessage = new URL(screen.getByRole('link', { name: 'Lanjutkan ke WhatsApp' }).getAttribute('href')).searchParams.get('text');
  expect(screen.getByRole('link', { name: 'Lanjutkan ke WhatsApp' }).getAttribute('href')).toContain('wa.me/6281277881122');
  expect(fallbackMessage).toContain('Website: Nunuy Nadhifa Wedding');
  expect(fallbackMessage).toContain('Menu: Kontak > Form konsultasi');
  const submission = fetchMock.mock.calls.find(([url, options]) => String(url).includes('/public/nunuy-consultations') && options.method === 'POST');
  expect(JSON.parse(submission[1].body)).toMatchObject({
    couple: 'Alya & Bima',
    phone: '081234567890',
    email: 'alya@example.com',
    wedding_date: '2027-06-12',
    location: 'Bandung',
  });
  confirmSpy.mockRestore();
  openSpy.mockRestore();
  vi.unstubAllGlobals();
});

test('accepts public testimonials and explains they require approval', async () => {
  const fetchMock = vi.fn(async (_url, options = {}) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => options.method === 'POST' ? { id: 'testimonial-1', status: 'pending' } : [],
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<PublicTestimonials site="nunuy" />);

  fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Alya dan Bima' } });
  fireEvent.change(screen.getByLabelText('Acara atau layanan'), { target: { value: 'Pernikahan · Bandung' } });
  fireEvent.change(screen.getByLabelText('Cerita Anda'), { target: { value: 'Tim sangat membantu acara kami berjalan dengan lancar.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim testimoni' }));

  expect(await screen.findByRole('status')).toHaveTextContent(/akan ditampilkan setelah disetujui admin/i);
  const submission = fetchMock.mock.calls.find(([, options]) => options.method === 'POST');
  expect(JSON.parse(submission[1].body)).toMatchObject({
    site: 'nunuy',
    name: 'Alya dan Bima',
    event: 'Pernikahan · Bandung',
    rating: 5,
  });
  vi.unstubAllGlobals();
});

test('shares website ratings through the site-specific public API', async () => {
  const publishedRating = {
    id: 'rating-1',
    kind: 'rating',
    name: 'Pengunjung',
    event: 'Rating website',
    message: null,
    rating: 4,
  };
  const fetchMock = vi.fn(async (_url, options = {}) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => options.method === 'POST'
      ? { id: 'rating-2', status: 'pending' }
      : [publishedRating],
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<PublicTestimonials site="gibrig" />);

  expect(await screen.findByText('4.0')).toBeDefined();
  expect(screen.getByText('1 penilaian')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Beri rating 4 dari 5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kirim rating' }));

  expect(await screen.findByRole('status')).toHaveTextContent(/menunggu persetujuan/i);
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/public/testimonials/gibrig'))).toBe(true);
  const submission = fetchMock.mock.calls.find(([, options]) => options.method === 'POST');
  expect(JSON.parse(submission[1].body)).toMatchObject({
    site: 'gibrig',
    kind: 'rating',
    rating: 4,
    message: null,
  });
  vi.unstubAllGlobals();
});

test('admin can approve a submitted testimonial', async () => {
  const pendingItem = {
    id: 'testimonial-1',
    site: 'gibrig',
    name: 'Keluarga Rani',
    event: 'Acara keluarga',
    message: 'Pelayanannya sangat membantu keluarga kami.',
    rating: 5,
    status: 'pending',
  };
  const fetchMock = vi.fn(async (_url, options = {}) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => options.method === 'PATCH'
      ? { id: pendingItem.id, status: 'visible' }
      : [pendingItem],
  }));
  vi.stubGlobal('fetch', fetchMock);
  render(<TestimonialModeration site="gibrig" token="admin-token" />);

  fireEvent.click(screen.getByRole('button', { name: 'Muat testimoni' }));
  expect(await screen.findByText('Keluarga Rani')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/disetujui dan ditampilkan/i);
  expect(fetchMock.mock.calls.some(([url, options]) => (
    String(url).includes('/admin/testimonials/testimonial-1') && options.method === 'PATCH'
  ))).toBe(true);
  vi.unstubAllGlobals();
});

test.each([
  ['/', 'portal'],
  ['/gibrig', 'gibrig'],
  ['/nunuy-nadhifa-wedding', 'nunuy'],
  ['/undangan', 'invitation'],
])('offers testimonial submission on %s', async (path, site) => {
  const fetchMock = vi.fn(async (url) => {
    const pathname = new URL(url, window.location.origin).pathname;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => pathname.endsWith('/public/advertisements')
        ? []
        : pathname.endsWith('/billing/config')
          ? { plans: [], payment_methods: [] }
          : [],
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', path);
  const app = renderApp();

  try {
    if (site === 'portal') {
      expect(screen.queryByRole('heading', { name: 'Cerita dari keluarga dan klien' })).toBeNull();
      expect(await screen.findByRole('heading', { name: 'Momen berkesan, diceritakan langsung.' })).toBeDefined();
      expect(await screen.findByRole('heading', { name: 'Bagikan penilaian Anda' })).toBeDefined();
      for (const reviewSite of ['portal', 'nunuy', 'gibrig', 'invitation']) {
        expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith(`/public/testimonials/${reviewSite}`))).toBe(true);
      }
      return;
    }

    expect(await screen.findByRole('heading', { name: 'Cerita dari keluarga dan klien' })).toBeDefined();
    expect(screen.getByLabelText('Nama')).toBeDefined();
    expect(screen.getByText(/diperiksa admin sebelum ditampilkan/i)).toBeDefined();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith(`/public/testimonials/${site}`))).toBe(true);
  } finally {
    app.unmount();
    vi.unstubAllGlobals();
  }
});

test('Aurora Media displays published testimonials attributed to their connected partner websites', async () => {
  const testimonials = {
    nunuy: [{ id: 'nunuy-1', name: 'Alya dan Bima', message: 'Hari pernikahan kami terasa hangat dan tertata.', rating: 5 }],
    gibrig: [{ id: 'gibrig-1', name: 'Keluarga Rani', message: 'Musiknya membuat acara kami semakin meriah.', rating: 4 }],
    invitation: [{ id: 'invitation-1', name: 'Dewi', message: 'Undangan digitalnya mudah dibagikan kepada keluarga.', rating: 5 }],
  };
  const fetchMock = vi.fn(async (url) => {
    const pathname = new URL(url, window.location.origin).pathname;
    const site = pathname.split('/').pop();
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => testimonials[site] || [],
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', '/');
  const app = renderApp();

  try {
    expect(await screen.findByText(/Hari pernikahan kami terasa hangat dan tertata\./)).toBeDefined();
    expect(screen.getByText(/Musiknya membuat acara kami semakin meriah\./)).toBeDefined();
    expect(screen.getByText(/Undangan digitalnya mudah dibagikan kepada keluarga\./)).toBeDefined();
    expect(screen.getByRole('link', { name: 'Nunuy Nadhifa Wedding ↗' }).getAttribute('href')).toBe('/nunuy-nadhifa-wedding');
    expect(screen.getByRole('link', { name: 'Entertainment Musik ↗' }).getAttribute('href')).toBe('/gibrig');
    expect(screen.getByRole('link', { name: 'Undangan Digital ↗' }).getAttribute('href')).toBe('/undangan');
    expect(screen.queryByText('Bagikan cerita Anda')).toBeNull();
    expect(screen.getAllByText('5.0').length).toBeGreaterThan(0);
  } finally {
    app.unmount();
    vi.unstubAllGlobals();
  }
});

test('visitors can submit a star rating with an optional message for admin approval', async () => {
  const fetchMock = vi.fn(async (url, options = {}) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => options.method === 'POST'
      ? { id: 'rating-1', status: 'pending' }
      : new URL(url, window.location.origin).pathname.endsWith('/public/advertisements')
        ? []
        : [],
  }));
  vi.stubGlobal('fetch', fetchMock);
  window.history.pushState({}, '', '/');
  const app = renderApp();

  try {
    const rating = screen.getByRole('button', { name: 'Beri rating 4 dari 5 untuk Aurora Media' });
    fireEvent.click(rating);
    expect(screen.getByLabelText(/pesan opsional/i)).toBeDefined();
    expect(fetchMock.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText(/pesan opsional/i), { target: { value: 'Informasi partner mudah ditemukan.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim rating' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/menunggu persetujuan/i);
    const submission = fetchMock.mock.calls.find(([, options]) => options.method === 'POST');
    expect(JSON.parse(submission[1].body)).toMatchObject({
      site: 'portal',
      kind: 'rating',
      rating: 4,
      message: 'Informasi partner mudah ditemukan.',
    });
    expect(screen.queryByLabelText('Nama')).toBeNull();
  } finally {
    app.unmount();
    vi.unstubAllGlobals();
  }
});

test('renders the Gibrig public homepage and connects booking inquiry', async () => {
  window.history.pushState({}, '', '/gibrig');
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  const { container } = render(<App />);

  expect(container.querySelector('.gibrig-topbar .gibrig-brand-logo').getAttribute('src')).toBe('/musik-id-logo.webp');
  expect(container.querySelector('.gibrig-topbar .gibrig-brand-copy strong')).toHaveTextContent('Entertainment Musik');
  expect(container.querySelector('.gibrig-footer-brand .gibrig-brand-logo').getAttribute('src')).toBe('/musik-id-logo.webp');
  expect(await waitFor(() => document.head.querySelector('link[rel="icon"]').getAttribute('href'))).toBe('/musik-id-favicon.png');
  expect(screen.getByRole('heading', { name: 'Hiburan Berkualitas, Momen Tak Terlupakan' })).toBeDefined();
  const nav = screen.getByRole('navigation', { name: 'Navigasi utama' });
  expect(nav.querySelectorAll('a')).toHaveLength(8);
  expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual([
    'Beranda', 'Tentang & Artis', 'Entertainment', 'Paket', 'Galeri', 'Testimoni', 'Sosial Media', 'Aurora Media',
  ]);
  expect(nav.querySelector('a[href="/gibrig"]').textContent).toBe('Beranda');
  expect(nav.querySelector('a[href="https://auroramedia.online/"]').textContent).toBe('Aurora Media');
  expect(nav.querySelector('a[href="#social-media"]')).not.toBeNull();
  expect(container.querySelector('.gibrig-social-links a[href="https://www.tiktok.com/@neng_syelfi_oktora_2"]')).not.toBeNull();
  expect(container.querySelector('.gibrig-social-links a[href="https://www.youtube.com/@nengsyelfioktora7310"]')).not.toBeNull();
  expect(container.querySelector('.gibrig-social-links a[href="https://www.instagram.com/nengsyelfiofficial"]')).not.toBeNull();
  expect(container.querySelector('.gibrig-visual img').getAttribute('src')).toContain('customer-assets.emergentagent.com');
  expect(container.querySelectorAll('.gibrig-package-card')).toHaveLength(3);
  expect(container.querySelectorAll('.gibrig-gallery-item')).toHaveLength(6);
  expect(container.querySelector('.gibrig-artist-profile h2').textContent).toBe('Neng Syelfi Oktora');
  expect(container.textContent.toLowerCase()).not.toContain('menyesuaikan lokasi');
  expect(container.querySelector('.whatsapp-contact-link .whatsapp-contact-icon')).not.toBeNull();
  fireEvent.click(screen.getByRole('link', { name: /hubungi kami/i }));
  const contactLink = screen.getByRole('link', { name: /hubungi kami/i });
  const contactMessage = new URL(contactLink.getAttribute('href')).searchParams.get('text');
  expect(contactLink.getAttribute('href')).toContain('wa.me/6285524752102');
  expect(contactMessage).toContain('Website: Entertainment Musik');
  expect(contactMessage).toContain('Menu: Beranda > Hubungi Kami');
  openSpy.mockRestore();
});

test('hides the old location-dependent price text from saved Gibrig content', () => {
  localStorage.setItem('gibrig-cms', JSON.stringify({
    artists: [{ name: 'Neng Syelfi Oktora', price: ' Menyesuaikan Lokasi ' }],
    packages: [{ name: 'Paket 1', price: 'Menyesuaikan Lokasi', items: [] }],
  }));
  window.history.pushState({}, '', '/gibrig');
  const { container, unmount } = render(<App />);

  expect(container.textContent.toLowerCase()).not.toContain('menyesuaikan lokasi');
  unmount();
  localStorage.removeItem('gibrig-cms');
});

test.each([
  ['/gibrig/tentang', 'Tentang & Artis', 'Neng Syelfi Oktora', '.gibrig-artist-profile'],
  ['/gibrig/entertainment', 'Artist Performance & Entertainment Studio', 'Gibrig Musik Entertainment menghadirkan musik live spektakuler', '.gibrig-entertainment-layout'],
  ['/gibrig/paket', 'Event packages', 'Paket 1', '.gibrig-package-card'],
  ['/gibrig/galeri', 'Momen di atas panggung', 'Pertunjukan live di panggung', '.gibrig-gallery-item'],
  ['/gibrig/testimoni', 'Kesan pelanggan', 'Penilaian website', '.gibrig-testimonials'],
])('renders the standalone Entertainment Musik page %s without replacing its source data', (path, heading, content, selector) => {
  window.history.pushState({}, '', path);
  const { container } = render(<App />);

  expect(screen.getByRole('heading', { name: heading })).toBeDefined();
  expect(screen.getByText(new RegExp(content, 'i'))).toBeDefined();
  expect(container.querySelector(selector)).not.toBeNull();
  if (path === '/gibrig/tentang' || path === '/gibrig/paket') {
    expect(container.textContent.toLowerCase()).not.toContain('menyesuaikan lokasi');
  }
  const mainNavigation = screen.getByRole('navigation', { name: 'Navigasi utama' });
  expect(mainNavigation.querySelectorAll('a')).toHaveLength(8);
  expect(mainNavigation.querySelector('a[href="/gibrig"]').textContent).toBe('Beranda');
  expect(mainNavigation.querySelector('a[href="https://auroramedia.online/"]').textContent).toBe('Aurora Media');
  const footerNavigation = screen.getByRole('navigation', { name: 'Navigasi footer' });
  expect(footerNavigation.querySelector('a[href="/gibrig"]').textContent).toBe('Beranda');
  expect(footerNavigation.querySelector('a[href="https://auroramedia.online/"]').textContent).toBe('Aurora Media');
  expect(screen.getByRole('link', { name: 'Kembali ke Aurora Media' }).getAttribute('href')).toBe('https://auroramedia.online/');
  expect(screen.getByRole('link', { name: /gibrig entertainment, beranda/i }).getAttribute('href')).toBe('/gibrig');
  expect(document.title).toContain('Gibrig Entertainment');
});

test('Gibrig package pages keep all saved package details and link the selected package to WhatsApp', () => {
  window.history.pushState({}, '', '/gibrig/paket');
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  const { container } = render(<App />);

  const cards = container.querySelectorAll('.gibrig-package-card');
  expect(cards).toHaveLength(3);
  expect(cards[1].textContent).toContain('Kentrung');
  expect(cards[1].textContent).toContain('Terompet');
  fireEvent.click(screen.getAllByRole('button', { name: /tanya paket/i })[1]);
  const [whatsappUrl] = openSpy.mock.calls[0];
  const message = new URL(whatsappUrl).searchParams.get('text');
  expect(whatsappUrl).toContain('Paket%202');
  expect(message).toContain('Website: Entertainment Musik');
  expect(message).toContain('Menu: Paket > Tanya Paket Paket 2');
  expect(openSpy).toHaveBeenCalledWith(whatsappUrl, '_blank', 'noopener,noreferrer');
  openSpy.mockRestore();
});

test('opens package images in a large viewer and closes it with Escape', () => {
  window.history.pushState({}, '', '/gibrig/paket');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Perbesar gambar Paket 1' }));

  const viewer = screen.getByRole('dialog', { name: 'Pratinjau gambar' });
  expect(viewer.getAttribute('aria-modal')).toBe('true');
  expect(viewer.querySelector('img').getAttribute('alt')).toBe('Paket 1 — Esensial');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Pratinjau gambar' })).toBeNull();
});

test('connects the invitation hero CTA to registration', () => {
  window.history.pushState({}, '', '/undangan');
  renderApp();

  fireEvent.click(screen.getAllByRole('button', { name: /buat undangan/i })[0]);
  expect(window.location.pathname).toBe('/undangan-auth');
  expect(window.location.search).toBe('?mode=register');
});

test('creates a QR destination that routes the owner directly to a specific invitation guestbook', () => {
  expect(createOwnerGuestbookUrl('aulia-farhan', 'https://undangan.example')).toBe(
    'https://undangan.example/undangan-dashboard?guestbook=aulia-farhan',
  );
});

test('preserves the guestbook destination through owner login', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-dashboard?guestbook=aulia-farhan');
  renderApp();

  fireEvent.click(screen.getByRole('button', { name: /masuk \/ daftar/i }));
  const nextPath = new URLSearchParams(window.location.search).get('next');
  expect(window.location.pathname).toBe('/undangan-auth');
  expect(nextPath).toBe('/undangan-dashboard?guestbook=aulia-farhan');
  sessionStorage.clear();
});
