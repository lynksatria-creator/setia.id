import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExcelJS from 'exceljs';
import App from './App';
import { AuthProvider } from './context/AuthContext';

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
  localStorage.setItem('admin-session', JSON.stringify({ loggedIn: true, username: 'admin' }));
  window.history.pushState({}, '', '/admin');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /content studio/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /glassmorphism luxury/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /elastic spring motion/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /ekspor json/i })).toBeDefined();
  expect(screen.getByText(/impor json/i)).toBeDefined();
  localStorage.removeItem('admin-session');
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
    user: { id: 'user-1', full_name: 'Test User', email: 'test@example.com', is_test_account: false },
  }));
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    const path = new URL(url, window.location.origin).pathname;
    const payload = path.endsWith('/auth/me')
      ? { user: { id: 'user-1', full_name: 'Test User', email: 'test@example.com', is_test_account: false } }
      : path.endsWith('/billing/config')
        ? { plans: [{ id: planId, name: planId, price: 599000, duration_days: 365 }], payment_methods: [] }
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

test('shows the server-authenticated admin login page', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Admin Undangan.id' })).toBeDefined();
  expect(screen.getByLabelText('Email admin')).toBeDefined();
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
