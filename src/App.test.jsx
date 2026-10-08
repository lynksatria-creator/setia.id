import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExcelJS from 'exceljs';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SUPER_ADMIN_SESSION_KEY } from './lib/adminSession';
import { getThemeCatalog } from './lib/themeCatalog';
import { createOwnerGuestbookUrl } from './lib/ownerGuestbookUrl';
import { regionalInvitationTemplates } from './lib/regionalInvitationTemplates';
import PublicInvitation from './pages/PublicInvitation';

const renderApp = () => render(<AuthProvider><App /></AuthProvider>);

test('renders the main portal marketing homepage', () => {
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getAllByText(/portal\.id/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: /temukan partner terbaik/i })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'NUNUY NADHIFA WEDDING' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Musik.id' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Undangan.id' })).toBeDefined();
  expect(screen.getByText('PARTNER SPOTLIGHT')).toBeDefined();
  expect(screen.getByText('DIREKOMENDASIKAN')).toBeDefined();
});

test('portal admin exposes the preset catalog and JSON configuration actions', async () => {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
  window.history.pushState({}, '', '/admin');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /content studio/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /glassmorphism luxury/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /elastic spring motion/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /ekspor json/i })).toBeDefined();
  expect(screen.getByText(/impor json/i)).toBeDefined();
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
});

test('shows a helpful message when the Undangan.id API is unavailable', async () => {
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

test('shows active affiliate advertisements on the Undangan.id homepage', async () => {
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
    const link = await screen.findByRole('link', { name: 'Lihat penawaran' });
    expect(screen.getByRole('heading', { name: 'Pilihan dari mitra Undangan.id' })).toBeDefined();
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

  window.history.pushState({}, '', new URL(previewLink.href).pathname);
  renderApp();
  expect(screen.getByRole('button', { name: /buka undangan/i })).toBeDefined();
});

test('shows the personalized recipient name on the invitation cover before opening', async () => {
  const ticketToken = `01${'t'.repeat(41)}`;
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
  renderApp();

  expect(await screen.findByText('Nadia Putri')).toBeDefined();
  expect(screen.getByText('Kepada Yth.')).toBeDefined();
  expect(screen.getByRole('button', { name: /buka undangan/i })).toBeDefined();
  vi.unstubAllGlobals();
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
  expect(screen.getByText(/Bali · Inspirasi Endek Bali/)).toBeDefined();
  expect(container.querySelector('.wedding-cover-video').getAttribute('src')).toBe('https://example.com/party.mp4');
  expect(container.querySelector('.wedding-couple')).toBeNull();
  expect(container.querySelector('.wedding-honoree')).not.toBeNull();
});

test('filters Undangan.id templates by category and can show all categories', () => {
  window.history.pushState({}, '', '/undangan');
  const { container } = renderApp();

  expect(container.querySelectorAll('.template-card')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Template Pernikahan' })).toBeDefined();
  expect(screen.queryByRole('button', { name: /Khitanan/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /Aqiqah/ }));
  expect(container.querySelectorAll('.template-card')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Template Aqiqah' })).toBeDefined();
  expect(container.querySelector('.template-card .template-tag').textContent).toBe('Aqiqah');

  fireEvent.click(screen.getByRole('button', { name: /Semua/ }));
  expect(container.querySelectorAll('.template-card')).toHaveLength(6);
  expect(screen.getByRole('heading', { name: 'Desain undangan yang siap Anda gunakan' })).toBeDefined();
});

test('renders the registration form on the register route', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-auth?mode=register');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Buat akun' })).toBeDefined();
  expect(screen.getByLabelText('Nama lengkap')).toBeDefined();
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

test('test account can select each package and sees its access expiry', async () => {
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

  fireEvent.change(await screen.findByLabelText('Kelompok acara'), { target: { value: 'Pernikahan' } });
  fireEvent.change(screen.getByLabelText('Jenis acara'), { target: { value: 'Pernikahan' } });
  fireEvent.click(container.querySelector('.setup-template-card'));
  fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan ke isi data' }));
  const packageSelect = await screen.findByLabelText('Paket');
  expect(packageSelect.disabled).toBe(false);
  expect([...packageSelect.options].map((option) => option.value)).toEqual(['basic', 'premium', 'business']);
  expect(screen.getByText(/akses semua paket tanpa pembayaran hingga/)).toBeDefined();
  fireEvent.change(packageSelect, { target: { value: 'premium' } });
  expect(packageSelect.value).toBe('premium');
});

const mountPublishedInvitationDashboard = (planId) => {
  const invitation = {
    id: 'invitation-1',
    title: 'Hari Bahagia',
    slug: 'hari-bahagia',
    plan_id: planId,
    status: 'published',
    active_until: '9999-12-31T23:59:59+00:00',
    content: {},
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
        ? { plans: [{ id: planId, name: planId, price: 599000, duration_days: 365 }], payment_methods: [] }
        : path.endsWith('/dashboard-admins')
          ? { eligible: true, max_admins: 3, admins: [] }
          : path.endsWith('/affiliate-program')
            ? { eligible: true, program: null, combinations: [], affiliates: [] }
        : path.endsWith('/tickets')
          ? { tickets: JSON.parse(options.body).recipients.map((recipient, index) => ({
            ...recipient,
            token: `${String(index + 1).padStart(2, '0')}${'t'.repeat(41)}`,
          })) }
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

test('Basic package sends to one WhatsApp recipient at a time', async () => {
  mountPublishedInvitationDashboard('basic');

  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
  expect(screen.getByLabelText(/nama penerima undangan/i)).toBeDefined();
  expect(screen.getByLabelText(/nomor whatsapp penerima/i)).toBeDefined();
  expect(screen.queryByRole('button', { name: /download template/i })).toBeNull();
  expect(screen.queryByLabelText(/daftar nomor penerima/i)).toBeNull();
  fireEvent.change(screen.getByLabelText(/nama penerima undangan/i), { target: { value: 'Dewi Lestari' } });
  fireEvent.change(screen.getByLabelText(/nomor whatsapp penerima/i), { target: { value: '081234567890' } });
  fireEvent.click(screen.getByRole('button', { name: /buat tiket barcode/i }));
  const whatsappLink = await screen.findByRole('link', { name: /buka whatsapp/i });
  expect(decodeURIComponent(new URL(whatsappLink.href).searchParams.get('text'))).toContain('Yth. Dewi Lestari,');
  expect(decodeURIComponent(new URL(whatsappLink.href).searchParams.get('text'))).toContain('/undangan-ticket/');
});

test('Premium package imports an XLSX recipient list and advances after manual confirmation', async () => {
  mountPublishedInvitationDashboard('premium');

  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
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
  expect(decodeURIComponent(firstRecipientUrl.searchParams.get('text'))).toContain('Yth. Tamu 1,');
  expect(decodeURIComponent(firstRecipientUrl.searchParams.get('text'))).toContain('/undangan-ticket/');
  fireEvent.click(screen.getByRole('button', { name: /sudah terkirim, lanjut/i }));
  const secondRecipientUrl = new URL(screen.getByRole('link', { name: /buka chat whatsapp/i }).href);
  expect(secondRecipientUrl.pathname).toBe('/6281298765432');
  expect(decodeURIComponent(secondRecipientUrl.searchParams.get('text'))).toContain('Yth. Tamu 2,');
  expect(screen.getByText(/Penerima 2 dari 2/)).toBeDefined();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('the event dashboard opens a camera scanner in its guestbook', async () => {
  mountPublishedInvitationDashboard('basic');

  fireEvent.click(await screen.findByRole('button', { name: /rsvp & buku tamu/i }));
  expect(await screen.findByRole('heading', { name: /scan tiket barcode tamu/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /scan barcode dengan kamera/i })).toBeDefined();
});

test('Business package prepares WhatsApp recipients in sequence', async () => {
  mountPublishedInvitationDashboard('business');

  fireEvent.click(await screen.findByRole('button', { name: /kirim via whatsapp/i }));
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

test.each([
  ['/gibrig', /artist performance & entertainment studio/i],
  ['/nunuy-nadhifa-wedding', /wedding experience that feels like a fairytale/i],
  ['/undangan', /buat undangan digital premium/i],
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
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
  window.history.pushState({}, '', '/setia-creative-admin');
  renderApp();

  expect(screen.getByRole('link', { name: /portal admin/i }).getAttribute('href')).toBe('/portal-admin');
  expect(screen.getByRole('link', { name: /gibrig admin/i }).getAttribute('href')).toBe('/gibrig-admin');
  expect(screen.getByRole('link', { name: /nunuy wedding admin/i }).getAttribute('href')).toBe('/nunuy-admin');
  expect(screen.getByRole('link', { name: /undangan.id website admin/i }).getAttribute('href')).toBe('/undangan-website-admin');
  expect(screen.getByRole('link', { name: /undangan.id admin/i }).getAttribute('href')).toBe('/undangan-admin');
  expect(screen.getByRole('link', { name: 'Nunuy Nadhifa Wedding' }).getAttribute('href')).toBe('/nunuy-nadhifa-wedding');
  sessionStorage.clear();
});

test('opens Undangan.id admin from its own direct link after one super admin login', () => {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
  window.history.pushState({}, '', '/undangan-admin');
  renderApp();

  expect(screen.getByRole('navigation', { name: 'Navigasi super admin' })).toBeDefined();
  expect(screen.getAllByRole('link', { name: 'Undangan.id', exact: true }).map((link) => link.getAttribute('href'))).toContain('/undangan-admin');
  expect(window.location.pathname).toBe('/undangan-admin');
  sessionStorage.clear();
});

test('keeps the previous Portal admin URL as an alias', () => {
  sessionStorage.clear();
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
  window.history.pushState({}, '', '/admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Portal Admin' })).toBeDefined();
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
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
  window.history.pushState({}, '', '/portal-admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Portal Admin' })).toBeDefined();
  expect(screen.getByRole('navigation', { name: 'Navigasi super admin' })).toBeDefined();
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
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
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

test.each([
  ['admin', '/portal-admin', '/', 'portal-cms'],
  ['gibrig', '/gibrig-admin', '/gibrig', 'gibrig-cms'],
  ['nunuy', '/nunuy-admin', '/nunuy-nadhifa-wedding', 'nunuy-cms'],
  ['invitation', '/undangan-website-admin', '/undangan', 'invitation-cms'],
])('publishes an independent phone and WhatsApp contact for %s', (site, adminPath, publicPath, storageKey) => {
  const phone = '+62 811-2233-4455';
  const whatsapp = '+62 811-9988-7766';
  localStorage.removeItem(storageKey);
  sessionStorage.clear();
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'test-admin-token');
  window.history.pushState({}, '', adminPath);
  const admin = render(<App />);

  fireEvent.change(screen.getByLabelText('Nomor HP publik'), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText('Nomor WhatsApp'), { target: { value: whatsapp } });
  fireEvent.change(screen.getByLabelText('Pesan pembuka WhatsApp'), { target: { value: `Halo dari ${site}` } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

  const saved = JSON.parse(localStorage.getItem(storageKey));
  expect(saved.contact.phone).toBe(phone);
  expect(saved.whatsapp.number).toBe(whatsapp);
  expect(saved.whatsapp.message).toBe(`Halo dari ${site}`);

  admin.unmount();
  window.history.pushState({}, '', publicPath);
  const publicSite = render(<App />);
  const contactLink = publicSite.container.querySelector('.whatsapp-contact-link');
  expect(contactLink.getAttribute('href')).toBe('https://wa.me/6281199887766?text=Halo%20dari%20' + site);
  expect(contactLink.textContent).toContain(whatsapp);
  expect(publicSite.getByText(phone)).toBeDefined();

  publicSite.unmount();
  localStorage.removeItem(storageKey);
  sessionStorage.clear();
}, 15000);

test.each([
  ['/gibrig', /artist performance & entertainment studio/i],
  ['/nunuy-nadhifa-wedding', /wedding experience that feels like a fairytale/i],
  ['/undangan', /buat undangan digital premium/i],
])('provides a Beranda link to Portal Iklan on %s', (path, heading) => {
  window.history.pushState({}, '', path);
  renderApp();

  expect(screen.getByRole('heading', { name: heading })).toBeDefined();
  expect(screen.getByRole('link', { name: 'Beranda' }).getAttribute('href')).toBe('/');
});

test('renders the Gibrig public homepage and connects booking inquiry', () => {
  window.history.pushState({}, '', '/gibrig');
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Hiburan Berkualitas, Momen Tak Terlupakan' })).toBeDefined();
  fireEvent.click(screen.getAllByRole('button', { name: /booking inquiry/i })[0]);
  expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank', 'noopener,noreferrer');
  openSpy.mockRestore();
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
