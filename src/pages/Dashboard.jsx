import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { billingApi, dashboardManagementApi, guestbookApi, invitationsApi, paymentsApi, resellerApi } from '../lib/api';
import GuestbookScanner from '../components/GuestbookScanner';
import PublicInvitation from './PublicInvitation';
import { createOwnerGuestbookUrl } from '../lib/ownerGuestbookUrl';
import { regionalInvitationTemplates } from '../lib/regionalInvitationTemplates';
import { createTicketCheckInMessage } from '../lib/ticketCheckInMessage';

const emptyForm = {
  title: '',
  plan_id: 'basic',
  slug: '',
  event_type: 'Pernikahan',
  province: '',
  template_id: 'luxury-gold',
  custom_design: false,
  custom_primary: '#294b3e',
  custom_accent: '#995c49',
  custom_background: '#f8f5ee',
  frame_style: '',
  animation_preset: '',
  cover_position_x: 50,
  cover_position_y: 50,
  cover_zoom: 100,
  gallery_position_x: 50,
  gallery_position_y: 50,
  gallery_zoom: 100,
  couple_names: '',
  honoree_name: '',
  groom_parents: '',
  bride_parents: '',
  groom_instagram: '',
  bride_instagram: '',
  cover_image: '',
  event_date: '',
  event_time: '',
  reception_date: '',
  reception_time: '',
  reception_venue: '',
  reception_address: '',
  reception_maps_url: '',
  venue: '',
  address: '',
  maps_url: '',
  story: '',
  opening_text: '',
  music_url: '',
  music_catalog_id: '',
  video_url: '',
  rsvp_url: '',
  gallery: '',
  digital_envelope: {
    bank: { enabled: false, name: '', account_name: '', account_number: '' },
    e_wallet: { enabled: false, provider: '', account_name: '', account_number: '' },
    qris: { enabled: false, image_url: '', instructions: '' },
  },
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
  { id: 'gen-z-editorial', name: 'Gen Z Editorial', category: 'Gen Z', description: 'Gradient pop, sticker mood, dan tipografi editorial', colors: ['#7c3aed', '#ffb4d9'] },
];

const eventGroups = [
  { label: 'Pernikahan', options: ['Pernikahan', 'Akad Nikah', 'Resepsi', 'Akad & Resepsi', 'Lamaran', 'Tunangan', 'Walimatul Ursy'] },
  { label: 'Acara Islami & Keluarga', options: ['Aqiqah', 'Khitanan', 'Walimatul Khitan', 'Tasyakuran', 'Pengajian', 'Haul', 'Syukuran', 'Milad'] },
  { label: 'Perayaan', options: ['Anniversary', 'Ulang Tahun Anak', 'Ulang Tahun Dewasa', 'Baby Shower', 'Gender Reveal'] },
  { label: 'Pendidikan & Komunitas', options: ['Wisuda', 'Kelulusan', 'Reuni'] },
  { label: 'Acara Umum', options: ['Gathering', 'Family Gathering', 'Halal Bihalal', 'Seminar', 'Workshop', 'Meeting', 'Grand Opening', 'Event', 'Acara Komunitas', 'Custom Event'] },
];

const weddingEventTypes = ['Pernikahan', 'Akad Nikah', 'Resepsi', 'Akad & Resepsi', 'Lamaran', 'Tunangan', 'Walimatul Ursy'];
const organizerEventTypes = ['Reuni', 'Gathering', 'Family Gathering', 'Halal Bihalal', 'Seminar', 'Workshop', 'Meeting', 'Grand Opening', 'Event', 'Acara Komunitas', 'Custom Event'];
const eWalletProviders = ['GoPay', 'DANA', 'OVO', 'ShopeePay', 'LinkAja'];
const musicCatalog = [
  { id: 'piano-romantis', genre: 'Romantis', name: 'Piano Romantis', url: '/music/piano-romantis.wav' },
  { id: 'akustik-hangat', genre: 'Akustik', name: 'Akustik Hangat', url: '/music/akustik-hangat.wav' },
  { id: 'instrumental-tenang', genre: 'Instrumental', name: 'Instrumental Tenang', url: '/music/instrumental-tenang.wav' },
  { id: 'nusantara-pentatonik', genre: 'Nusantara', name: 'Nusantara Pentatonik', url: '/music/nusantara-pentatonik.wav' },
];

const eventTemplateRecommendations = {
  Pernikahan: { categories: ['Pernikahan', 'Gen Z'] },
  'Akad Nikah': { categories: ['Islami', 'Nusantara'] },
  Resepsi: { categories: ['Pernikahan', 'Gen Z'] },
  'Akad & Resepsi': { categories: ['Pernikahan', 'Islami', 'Nusantara'] },
  Lamaran: { templateIds: ['engagement', 'rose-gold-romance', 'floral-elegant', 'classic-wedding'] },
  Tunangan: { templateIds: ['engagement', 'rose-gold-romance', 'floral-elegant', 'classic-wedding'] },
  'Walimatul Ursy': { categories: ['Islami', 'Nusantara'] },
  Anniversary: { templateIds: ['anniversary', 'rose-gold-romance', 'luxury-maroon'] },
  Aqiqah: { templateIds: ['aqiqah-elegant', 'islamic-gold', 'islamic-emerald', 'islamic-white'] },
  Khitanan: { templateIds: ['khitanan-royal', 'islamic-gold', 'islamic-emerald'] },
  'Walimatul Khitan': { templateIds: ['khitanan-royal', 'islamic-gold', 'islamic-emerald'] },
  Tasyakuran: { templateIds: ['tasyakuran', 'islamic-gold', 'islamic-emerald', 'traditional-jawa'] },
  Pengajian: { categories: ['Islami', 'Nusantara'] },
  Haul: { categories: ['Islami', 'Nusantara'] },
  Syukuran: { templateIds: ['tasyakuran', 'islamic-gold', 'islamic-emerald', 'traditional-jawa'] },
  Milad: { templateIds: ['birthday-luxury', 'islamic-gold', 'islamic-emerald'] },
  'Ulang Tahun Anak': { templateIds: ['birthday-kids', 'baby-shower'] },
  'Ulang Tahun Dewasa': { templateIds: ['birthday-luxury', 'anniversary', 'gen-z-editorial'] },
  'Baby Shower': { templateIds: ['baby-shower', 'aqiqah-elegant'] },
  'Gender Reveal': { templateIds: ['baby-shower', 'aqiqah-elegant'] },
  Wisuda: { templateIds: ['graduation-gold', 'corporate-event'] },
  Kelulusan: { templateIds: ['graduation-gold', 'corporate-event'] },
  Reuni: { templateIds: ['corporate-event', 'gen-z-editorial'] },
  Gathering: { templateIds: ['corporate-event', 'gen-z-editorial'] },
  'Family Gathering': { templateIds: ['corporate-event', 'gen-z-editorial'] },
  'Halal Bihalal': { templateIds: ['islamic-gold', 'islamic-emerald', 'traditional-jawa'] },
  Seminar: { templateIds: ['corporate-event', 'gen-z-editorial'] },
  Workshop: { templateIds: ['corporate-event', 'gen-z-editorial'] },
  Meeting: { templateIds: ['corporate-event'] },
  'Grand Opening': { templateIds: ['corporate-event', 'gen-z-editorial'] },
  Event: { categories: ['Umum', 'Custom', 'Gen Z'] },
  'Acara Komunitas': { templateIds: ['corporate-event', 'gen-z-editorial'] },
  'Custom Event': { categories: ['Umum', 'Custom', 'Gen Z'] },
};

const getTemplatesForEvent = (templates, eventType) => {
  const recommendation = eventTemplateRecommendations[eventType];
  if (!recommendation) return [];
  const prioritized = (recommendation.templateIds || [])
    .map((id) => templates.find((template) => template.id === id))
    .filter(Boolean);
  const prioritizedIds = new Set(prioritized.map((template) => template.id));
  return [
    ...prioritized,
    ...templates.filter((template) => recommendation.categories?.includes(template.category) && !prioritizedIds.has(template.id)),
  ];
};

const displayDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Belum aktif';
const normalizeWhatsAppPhone = (phone) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
};
const buildWhatsAppUrl = (phone, message, invitationUrl) => {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits || !message.trim() || !invitationUrl) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(`${message.trim()}\n\n${invitationUrl}`)}`;
};
const buildTicketUrl = (ticketToken) => `${window.location.origin}/undangan-ticket/${encodeURIComponent(ticketToken)}`;
const getPackageEntitlements = (invitation, plan) => {
  const bulkUploadEnabled = invitation.package_entitlements?.bulk_upload_enabled
    ?? plan?.bulk_upload_enabled
    ?? ['premium', 'business'].includes(plan?.id);
  return {
    bulkUploadEnabled,
    maxRecipients: invitation.package_entitlements?.max_recipients
      ?? plan?.max_recipients
      ?? (bulkUploadEnabled ? 1000 : 1),
  };
};
const personalizeWhatsAppMessage = (message, name) => {
  const recipientName = name.trim();
  if (!recipientName) return '';
  if (message.includes('{{nama}}')) return message.replaceAll('{{nama}}', recipientName);
  return `Yth. ${recipientName},\n\n${message}`;
};
const WHATSAPP_GREETING_PREFIX = 'Yth. {{nama}},\n\n';
const parseRecipientRows = (rows) => {
  const headers = (rows[0]?.values || []).map((header) => String(header).trim().toLowerCase().replace(/[\s_-]/g, ''));
  const phoneHeaders = new Set(['nohp', 'nomorhp', 'phone', 'phonenumber', 'mobile', 'whatsapp', 'nowhatsapp']);
  const nameHeaders = new Set(['nama', 'namapenerima', 'name', 'recipient', 'recipientname']);
  const phoneColumn = headers.findIndex((header) => phoneHeaders.has(header));
  const nameColumn = headers.findIndex((header) => nameHeaders.has(header));
  const startRow = phoneColumn >= 0 ? 1 : 0;
  const columnIndex = phoneColumn >= 0 ? phoneColumn : 0;
  const recipients = [];
  const invalidRows = [];
  const missingNameRows = [];

  for (let index = startRow; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.values.every((cell) => !String(cell ?? '').trim())) continue;
    const rawNumber = String(row.values[columnIndex] ?? '').trim();
    const normalized = normalizeWhatsAppPhone(rawNumber);
    const recipientName = String(row.values[nameColumn >= 0 ? nameColumn : columnIndex + 1] ?? '').trim();
    if (!normalized) {
      invalidRows.push(row.rowNumber);
      continue;
    }
    if (!recipientName) {
      missingNameRows.push(row.rowNumber);
      continue;
    }
    if (!recipients.some((recipient) => recipient.phone === normalized && recipient.name.toLowerCase() === recipientName.toLowerCase())) {
      recipients.push({ phone: normalized, name: recipientName });
    }
  }

  return { recipients, invalidRows, missingNameRows };
};
const readWorkbook = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('File Excel tidak dapat dibaca.'));
  reader.onload = () => resolve(reader.result);
  reader.readAsArrayBuffer(file);
});
const loadOwnerGuestbookEntries = async (token, invitations) => {
  const allEntries = [];
  for (let index = 0; index < invitations.length; index += 5) {
    const batch = invitations.slice(index, index + 5);
    const entriesByInvitation = await Promise.all(batch.map(async (invitation) => {
      const entries = await guestbookApi.listOwner(token, invitation.id);
      return entries.map((entry) => ({
        ...entry,
        invitation_id: invitation.id,
        invitation_title: invitation.title,
      })).filter((entry) => entry.source !== 'barcode_check_in');
    }));
    allEntries.push(...entriesByInvitation.flat());
  }
  return allEntries.sort((left, right) => (
    new Date(right.created_at || right.checked_in_at || 0) - new Date(left.created_at || left.checked_in_at || 0)
  ));
};
const copyTextToClipboard = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Tautan tidak dapat disalin. Silakan salin secara manual.');
};
const downloadGuestbookSpreadsheet = async (entries, filename, tickets = null) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('RSVP & Buku Tamu');
  sheet.columns = [
    { header: 'Nama tamu', key: 'name', width: 28 },
    { header: 'Konfirmasi kehadiran', key: 'attendance', width: 24 },
    { header: 'Jumlah tamu', key: 'guests', width: 14 },
    { header: 'Ucapan', key: 'message', width: 60 },
    { header: 'Nama undangan', key: 'invitation_title', width: 30 },
    { header: 'Waktu RSVP', key: 'created_at', width: 25 },
  ];
  sheet.addRows(entries.filter((entry) => entry.source !== 'barcode_check_in').map((entry) => ({
    ...entry,
    attendance: entry.attendance === 'attending'
      ? 'Akan hadir'
      : entry.attendance === 'not_attending'
        ? 'Belum bisa hadir'
        : entry.attendance === 'maybe' ? 'Masih tentatif' : entry.attendance || '',
    created_at: entry.created_at ? new Date(entry.created_at).toLocaleString('id-ID') : '',
  })));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (tickets) {
    const ticketSheet = workbook.addWorksheet('Daftar Undangan');
    ticketSheet.columns = [
      { header: 'Nama tamu', key: 'name', width: 28 },
      { header: 'Nomor WhatsApp', key: 'phone', width: 22 },
      { header: 'Konfirmasi kehadiran', key: 'attendance', width: 24 },
      { header: 'Keterangan', key: 'note', width: 48 },
      { header: 'Waktu check-in', key: 'checked_in_at', width: 25 },
    ];
    ticketSheet.addRows(tickets.map((ticket) => ({
      ...ticket,
      attendance: ticket.checked_in_at ? 'Hadir' : '',
      note: ticket.checked_in_at ? 'Check-in kehadiran melalui barcode undangan.' : '',
      checked_in_at: ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString('id-ID') : '',
    })));
    ticketSheet.getRow(1).font = { bold: true };
    ticketSheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  const content = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([content], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function Dashboard({ onSignIn, requestedGuestbookSlug = '' }) {
  const { user, token, isChecking, logout } = useAuth();
  const [billing, setBilling] = useState({ plans: [], payment_methods: [] });
  const [invitations, setInvitations] = useState([]);
  const [buyerMenu, setBuyerMenu] = useState('dashboard');
  const [previewInvitation, setPreviewInvitation] = useState(null);
  const [guestbookInvitation, setGuestbookInvitation] = useState(null);
  const [ownerGuestbook, setOwnerGuestbook] = useState([]);
  const [invitationTickets, setInvitationTickets] = useState([]);
  const [ticketScanStatus, setTicketScanStatus] = useState('');
  const [dashboardGuestbook, setDashboardGuestbook] = useState([]);
  const [isLoadingDashboardGuestbook, setIsLoadingDashboardGuestbook] = useState(false);
  const [demoTemplate, setDemoTemplate] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupGroup, setSetupGroup] = useState('');
  const [setupProvince, setSetupProvince] = useState('');
  const [setupEventType, setSetupEventType] = useState('');
  const [setupTemplateId, setSetupTemplateId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [activationPlanSelections, setActivationPlanSelections] = useState({});
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentMobile, setPaymentMobile] = useState('');
  const [activePayment, setActivePayment] = useState(null);
  const [transferReference, setTransferReference] = useState('');
  const [whatsAppInvitationId, setWhatsAppInvitationId] = useState(null);
  const [shareDialogInvitationId, setShareDialogInvitationId] = useState(null);
  const [shareDialogType, setShareDialogType] = useState('whatsapp');
  const [whatsAppSendMode, setWhatsAppSendMode] = useState('choice');
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppName, setWhatsAppName] = useState('');
  const [whatsAppRecipients, setWhatsAppRecipients] = useState('');
  const [whatsAppQueue, setWhatsAppQueue] = useState([]);
  const [whatsAppQueueIndex, setWhatsAppQueueIndex] = useState(0);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [isImportingRecipients, setIsImportingRecipients] = useState(false);
  const [isPreparingTickets, setIsPreparingTickets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recipientNames, setRecipientNames] = useState({});
  const [recipientPhones, setRecipientPhones] = useState({});
  const [personalizedTickets, setPersonalizedTickets] = useState({});
  const [preparingPersonalizedTicketId, setPreparingPersonalizedTicketId] = useState('');
  const [qrInvitationId, setQrInvitationId] = useState('');
  const openedGuestbookSlug = useRef('');
  const autoOpenedScanInvitationId = useRef('');
  const [dashboardAdmins, setDashboardAdmins] = useState({ eligible: false, max_admins: 3, admins: [] });
  const [affiliateProgram, setAffiliateProgram] = useState({ eligible: false, program: null, combinations: [], affiliates: [] });
  const [selectedAffiliateCombination, setSelectedAffiliateCombination] = useState('');
  const [affiliateQuotaEdits, setAffiliateQuotaEdits] = useState({});
  const [resellerDashboard, setResellerDashboard] = useState({
    customers: [], orders: [], commissions: [], max_customers: 0, max_markup_percent: 0, commission_percent: 0,
  });
  const [resellerOrderForm, setResellerOrderForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '', plan_id: 'basic', selling_price: '',
  });
  const [resellerCheckout, setResellerCheckout] = useState(null);
  const [dashboardAdminForm, setDashboardAdminForm] = useState({ full_name: '', email: '', password: '' });
  const [affiliateForm, setAffiliateForm] = useState({
    full_name: '', email: '', password: '', basic_quota: 0, premium_quota: 0,
  });

  useEffect(() => {
    if (!shareDialogInvitationId) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setShareDialogInvitationId(null);
      setWhatsAppInvitationId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [shareDialogInvitationId]);

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

    if (user?.role === 'user') {
      Promise.all([dashboardManagementApi.admins(token), dashboardManagementApi.affiliateProgram(token)])
        .then(([adminResult, affiliateResult]) => {
          if (!active) return;
          setDashboardAdmins(adminResult);
          setAffiliateProgram(affiliateResult);
          setSelectedAffiliateCombination(affiliateResult.program?.combination_id || '');
        })
        .catch((requestError) => { if (active) setError(requestError.message); });
    }
    if (user?.role === 'affiliate') {
      resellerApi.dashboard(token)
        .then((result) => { if (active) setResellerDashboard(result); })
        .catch((requestError) => { if (active) setError(requestError.message); });
    }
    return () => { active = false; };
  }, [token, user?.role]);

  const selectedPlan = billing.plans.find((plan) => plan.id === form.plan_id);
  const editingInvitation = editingId ? invitations.find((invitation) => invitation.id === editingId) : null;
  const selectedPaymentMethod = billing.payment_methods.find((method) => method.id === paymentMethodId);
  const checkInInvitations = invitations.filter((invitation) => (
    invitation.status === 'published' && new Date(invitation.active_until) > new Date()
  ));
  const showBuyerDashboard = user?.role !== 'user' || buyerMenu === 'dashboard';
  const showBuyerInvitations = user?.role !== 'user' || buyerMenu === 'invitations';
  const showBuyerGuide = user?.role !== 'user' || buyerMenu === 'guide';
  const affiliatePlanCounts = {
    basic: invitations.filter((invitation) => invitation.plan_id === 'basic').length,
    premium: invitations.filter((invitation) => invitation.plan_id === 'premium').length,
  };
  const availablePlans = user?.role === 'affiliate'
    ? billing.plans.filter((plan) => ['basic', 'premium'].includes(plan.id)
      && affiliatePlanCounts[plan.id] < (user[`${plan.id}_quota`] || 0))
    : user?.is_demo
      ? billing.plans.filter((plan) => plan.id === user.demo_plan_id)
    : billing.plans;

  useEffect(() => {
    if (user?.role === 'affiliate' && !editingId && !availablePlans.some((plan) => plan.id === form.plan_id) && availablePlans[0]) {
      setForm((current) => ({ ...current, plan_id: availablePlans[0].id }));
    }
  }, [availablePlans, editingId, form.plan_id, user?.role]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateEnvelopeField = (method, field, value) => {
    setForm((current) => ({
      ...current,
      digital_envelope: {
        ...emptyForm.digital_envelope,
        ...(current.digital_envelope || {}),
        [method]: {
          ...emptyForm.digital_envelope[method],
          ...(current.digital_envelope?.[method] || {}),
          [field]: value,
        },
      },
    }));
  };

  const refreshDashboardGuestbook = async () => {
    setIsLoadingDashboardGuestbook(true);
    setError('');
    try {
      setDashboardGuestbook(await loadOwnerGuestbookEntries(token, invitations));
    } catch (requestError) {
      setError(`Daftar tamu belum dapat dimuat: ${requestError.message}`);
    } finally {
      setIsLoadingDashboardGuestbook(false);
    }
  };

  const refreshInvitations = async () => {
    setInvitations(await invitationsApi.list(token));
  };

  const refreshBusinessManagement = async () => {
    const [admins, program] = await Promise.all([
      dashboardManagementApi.admins(token),
      dashboardManagementApi.affiliateProgram(token),
    ]);
    setDashboardAdmins(admins);
    setAffiliateProgram(program);
    setSelectedAffiliateCombination(program.program?.combination_id || '');
  };

  const createDashboardAdmin = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await dashboardManagementApi.createAdmin(token, dashboardAdminForm);
      setDashboardAdminForm({ full_name: '', email: '', password: '' });
      await refreshBusinessManagement();
      setMessage('Admin dashboard berhasil dibuat. Berikan email dan kata sandi secara aman kepada admin tersebut.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleDashboardAdmin = async (admin) => {
    setError('');
    try {
      await dashboardManagementApi.setAdminActive(token, admin.id, !admin.active);
      await refreshBusinessManagement();
      setMessage(`Akses ${admin.full_name} ${admin.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveAffiliateCombination = async () => {
    setError('');
    const selected = affiliateProgram.combinations.find((combination) => combination.id === selectedAffiliateCombination);
    if (!selected) {
      setError('Pilih kombinasi kuota yang tersedia.');
      return;
    }
    if (!window.confirm(
      `Anda memilih ${selected.name}: ${selected.basic} Basic dan ${selected.premium} Premium untuk seluruh jaringan affiliate.\n\nPERINGATAN: setelah dikonfirmasi, kombinasi paket ini tidak dapat diubah. Apakah Anda bersedia memilih paket ini?`,
    )) return;
    try {
      await dashboardManagementApi.selectAffiliateCombination(token, selectedAffiliateCombination);
      await refreshBusinessManagement();
      setMessage('Kombinasi kuota affiliate disimpan.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createAffiliate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await dashboardManagementApi.createAffiliate(token, {
        ...affiliateForm,
        basic_quota: Number(affiliateForm.basic_quota),
        premium_quota: Number(affiliateForm.premium_quota),
      });
      setAffiliateForm({
        full_name: '', email: '', password: '', basic_quota: 0, premium_quota: 0,
      });
      await refreshBusinessManagement();
      setMessage('Affiliate berhasil didaftarkan. Semua penjualan dan pembayaran tetap tercatat pada pemilik paket Business.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateAffiliateAccess = async (affiliate, changes) => {
    setError('');
    try {
      await dashboardManagementApi.updateAffiliate(token, affiliate.id, changes);
      await refreshBusinessManagement();
      setMessage('Akses dan pengaturan affiliate diperbarui.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveAffiliateQuota = async (affiliate) => {
    const quota = affiliateQuotaEdits[affiliate.id] || {};
    setError('');
    try {
      await dashboardManagementApi.updateAffiliate(token, affiliate.id, {
        basic_quota: Number(quota.basic ?? affiliate.basic_quota),
        premium_quota: Number(quota.premium ?? affiliate.premium_quota),
      });
      setAffiliateQuotaEdits((current) => {
        const next = { ...current };
        delete next[affiliate.id];
        return next;
      });
      await refreshBusinessManagement();
      setMessage(`Kuota affiliate ${affiliate.full_name} diperbarui.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createResellerOrder = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setResellerCheckout(null);
    const selectedPlan = billing.plans.find((plan) => plan.id === resellerOrderForm.plan_id);
    if (!selectedPlan) {
      setError('Paket yang ditawarkan tidak tersedia.');
      return;
    }
    try {
      const order = await resellerApi.createOrder(token, {
        ...resellerOrderForm,
        selling_price: Number(resellerOrderForm.selling_price || selectedPlan.price),
      });
      setResellerCheckout(order);
      const refreshed = await resellerApi.dashboard(token);
      setResellerDashboard(refreshed);
      setResellerOrderForm({ customer_name: '', customer_email: '', customer_phone: '', plan_id: 'basic', selling_price: '' });
      setMessage(`Pesanan ${order.order_id} dibuat. Pembeliannya hanya tercatat setelah pembayaran terverifikasi.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSetupComplete(false);
    setSetupGroup('');
    setSetupProvince('');
    setSetupEventType('');
    setSetupTemplateId('');
    setForm({ ...emptyForm, plan_id: user?.is_demo
      ? user.demo_plan_id
      : user?.is_test_account && billing.plans.some((plan) => plan.id === 'business')
        ? 'business'
        : billing.plans[0]?.id || 'basic' });
  };

  const setupTemplates = setupProvince
    ? regionalInvitationTemplates.filter((template) => template.province === setupProvince)
    : getTemplatesForEvent(invitationTemplates, setupEventType);
  const editorTemplates = form.province
    ? regionalInvitationTemplates.filter((template) => template.province === form.province)
    : getTemplatesForEvent(invitationTemplates, form.event_type);
  const provinceGroups = [...new Set(regionalInvitationTemplates.map((template) => template.islandGroup))];

  const demoInvitation = demoTemplate ? {
    id: `demo-${demoTemplate.id}`,
    title: form.title || form.event_type,
    slug: 'template-demo',
    content: {
      event_type: form.event_type,
      province: demoTemplate.province || '',
      demo_template: true,
      template_id: demoTemplate.id,
      template_name: demoTemplate.name,
      couple_names: weddingEventTypes.includes(form.event_type) ? form.couple_names || 'Aulia & Farhan' : '',
      honoree_name: weddingEventTypes.includes(form.event_type) ? '' : form.honoree_name || form.title || form.event_type,
      groom_parents: weddingEventTypes.includes(form.event_type) ? form.groom_parents : '',
      bride_parents: weddingEventTypes.includes(form.event_type) ? form.bride_parents : '',
      groom_instagram: weddingEventTypes.includes(form.event_type) ? form.groom_instagram : '',
      bride_instagram: weddingEventTypes.includes(form.event_type) ? form.bride_instagram : '',
      cover_image: form.cover_image,
      frame_style: form.frame_style,
      animation_preset: form.animation_preset,
      cover_position_x: form.cover_position_x,
      cover_position_y: form.cover_position_y,
      cover_zoom: form.cover_zoom,
      gallery_position_x: form.gallery_position_x,
      gallery_position_y: form.gallery_position_y,
      gallery_zoom: form.gallery_zoom,
      event_date: form.event_date || '2026-12-12',
      event_time: form.event_time || '10:00',
      reception_date: form.reception_date,
      reception_time: form.reception_time,
      reception_venue: form.reception_venue,
      reception_address: form.reception_address,
      reception_maps_url: form.reception_maps_url,
      venue: form.venue || 'The Grand Ballroom',
      address: form.address || 'Jakarta Selatan, Indonesia',
      maps_url: form.maps_url,
      opening_text: form.opening_text,
      story: form.story,
      music_url: form.music_url,
      music_catalog_id: form.music_catalog_id,
      video_url: form.video_url,
      rsvp_url: form.rsvp_url,
      digital_envelope: form.digital_envelope,
      gallery: form.gallery.trim() ? form.gallery.split('\n').map((url) => url.trim()).filter(Boolean) : [
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=85',
      ],
    },
  } : null;

  const beginInvitation = () => {
    if (user.is_demo && invitations.length >= 2) {
      setError('Akun demo hanya dapat membuat maksimal 2 undangan.');
      return;
    }
    if (user.role === 'affiliate' && availablePlans.length === 0) {
      setError('Kuota undangan reseller sudah habis. Hubungi pemilik paket.');
      return;
    }
    if (!setupGroup || !setupEventType || !setupTemplateId) {
      setError('Pilih kelompok acara, jenis acara, dan template terlebih dahulu.');
      return;
    }
    setError('');
    setForm((current) => ({ ...current, event_type: setupEventType, province: setupProvince, template_id: setupTemplateId, custom_design: false }));
    setSetupComplete(true);
  };

  const editInvitation = (invitation) => {
    const content = invitation.content || {};
    const eventGroup = eventGroups.find((group) => group.options.includes(content.event_type || 'Pernikahan'))?.label || 'Pernikahan';
    setEditingId(invitation.id);
    setSetupComplete(true);
    setSetupGroup(eventGroup);
    setSetupProvince(content.province || '');
    setSetupEventType(content.event_type || 'Pernikahan');
    setSetupTemplateId(content.template_id || 'luxury-gold');
    setForm({
      ...emptyForm,
      title: invitation.title || '',
      plan_id: invitation.plan_id,
      slug: invitation.slug || '',
      event_type: content.event_type || 'Pernikahan',
      province: content.province || '',
      template_id: content.template_id || 'luxury-gold',
      custom_design: Boolean(content.custom_design),
      custom_primary: content.custom_primary || '#294b3e',
      custom_accent: content.custom_accent || '#995c49',
      custom_background: content.custom_background || '#f8f5ee',
      frame_style: content.frame_style || '',
      animation_preset: content.animation_preset || '',
      cover_position_x: Number.isFinite(Number(content.cover_position_x)) ? Number(content.cover_position_x) : 50,
      cover_position_y: Number.isFinite(Number(content.cover_position_y)) ? Number(content.cover_position_y) : 50,
      cover_zoom: Number.isFinite(Number(content.cover_zoom)) ? Number(content.cover_zoom) : 100,
      gallery_position_x: Number.isFinite(Number(content.gallery_position_x)) ? Number(content.gallery_position_x) : 50,
      gallery_position_y: Number.isFinite(Number(content.gallery_position_y)) ? Number(content.gallery_position_y) : 50,
      gallery_zoom: Number.isFinite(Number(content.gallery_zoom)) ? Number(content.gallery_zoom) : 100,
      couple_names: content.couple_names || '',
      honoree_name: content.honoree_name || '',
      groom_parents: content.groom_parents || '',
      bride_parents: content.bride_parents || '',
      groom_instagram: content.groom_instagram || '',
      bride_instagram: content.bride_instagram || '',
      digital_envelope: {
        ...emptyForm.digital_envelope,
        ...(content.digital_envelope || {}),
        bank: { ...emptyForm.digital_envelope.bank, ...(content.digital_envelope?.bank || {}) },
        e_wallet: { ...emptyForm.digital_envelope.e_wallet, ...(content.digital_envelope?.e_wallet || {}) },
        qris: { ...emptyForm.digital_envelope.qris, ...(content.digital_envelope?.qris || {}) },
      },
      cover_image: content.cover_image || '',
      event_date: content.event_date || '',
      event_time: content.event_time || '',
      reception_date: content.reception_date || '',
      reception_time: content.reception_time || '',
      reception_venue: content.reception_venue || '',
      reception_address: content.reception_address || '',
      reception_maps_url: content.reception_maps_url || '',
      venue: content.venue || '',
      address: content.address || '',
      maps_url: content.maps_url || '',
      story: content.story || '',
      opening_text: content.opening_text || '',
      music_url: content.music_url || '',
      music_catalog_id: content.music_catalog_id || musicCatalog.find((track) => track.url === content.music_url)?.id || '',
      video_url: content.video_url || '',
      rsvp_url: content.rsvp_url || '',
      gallery: Array.isArray(content.gallery) ? content.gallery.join('\n') : '',
    });
    setError('');
    setMessage('Mode edit aktif. Simpan untuk menerapkan perubahan.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMusicUpload = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Pilih file musik dengan format audio yang didukung.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Ukuran musik maksimal 8 MB. Gunakan URL musik untuk file yang lebih besar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, music_url: reader.result, music_catalog_id: '' }));
      setMessage('Musik berhasil dimuat. Simpan draft untuk menerapkannya.');
    };
    reader.onerror = () => setError('File musik tidak dapat dibaca.');
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    if (!['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
      setError('Gunakan video MP4, WebM, atau Ogg.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Ukuran video maksimal 4 MB. Gunakan tautan video untuk file yang lebih besar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField('video_url', reader.result);
      setMessage('Video berhasil dimuat. Simpan draft untuk menerapkannya.');
    };
    reader.onerror = () => setError('File video tidak dapat dibaca.');
    reader.readAsDataURL(file);
  };

  const readImageFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleQrisUpload = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File QRIS harus berupa gambar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar QRIS maksimal 5 MB.');
      return;
    }
    setError('');
    try {
      const imageUrl = await readImageFile(file);
      updateEnvelopeField('qris', 'image_url', imageUrl);
      setMessage('Gambar QRIS berhasil dimuat. Simpan undangan untuk menerapkannya.');
    } catch {
      setError('Gambar QRIS tidak dapat dibaca.');
    }
  };

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

  useEffect(() => {
    if (guestbookInvitation) {
      const guestbookPanel = document.querySelector('.guestbook-management-panel');
      if (typeof guestbookPanel?.scrollIntoView === 'function') {
        guestbookPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [guestbookInvitation]);

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
    if (user.is_demo && !editingId && invitations.length >= 2) {
      setError('Akun demo hanya dapat membuat maksimal 2 undangan.');
      return;
    }
    const envelope = form.digital_envelope || emptyForm.digital_envelope;
    if (envelope.bank.enabled && (!envelope.bank.name.trim() || !envelope.bank.account_name.trim() || !envelope.bank.account_number.trim())) {
      setError('Lengkapi nama bank, nama pemilik rekening, dan nomor rekening sebelum mengaktifkan transfer bank.');
      return;
    }
    if (envelope.e_wallet.enabled && (!envelope.e_wallet.provider.trim() || !envelope.e_wallet.account_name.trim() || !envelope.e_wallet.account_number.trim())) {
      setError('Lengkapi penyedia e-wallet, nama pemilik akun, dan nomor akun sebelum mengaktifkan e-wallet.');
      return;
    }
    if (envelope.qris.enabled && !envelope.qris.image_url.trim()) {
      setError('Tambahkan URL gambar QRIS sebelum mengaktifkan QRIS.');
      return;
    }
    setError('');
    setMessage('');
    setIsSaving(true);
    const content = {
      event_type: form.event_type,
      province: form.province,
      template_id: form.template_id,
      template_name: editorTemplates.find((template) => template.id === form.template_id)?.name || form.template_id,
      custom_design: form.custom_design,
      custom_primary: form.custom_primary,
      custom_accent: form.custom_accent,
      custom_background: form.custom_background,
      honoree_name: weddingEventTypes.includes(form.event_type) ? '' : form.honoree_name,
      groom_parents: weddingEventTypes.includes(form.event_type) ? form.groom_parents : '',
      bride_parents: weddingEventTypes.includes(form.event_type) ? form.bride_parents : '',
      groom_instagram: weddingEventTypes.includes(form.event_type) ? form.groom_instagram : '',
      bride_instagram: weddingEventTypes.includes(form.event_type) ? form.bride_instagram : '',
      cover_image: form.cover_image,
      frame_style: form.frame_style,
      animation_preset: form.animation_preset,
      cover_position_x: Number(form.cover_position_x),
      cover_position_y: Number(form.cover_position_y),
      cover_zoom: Number(form.cover_zoom),
      gallery_position_x: Number(form.gallery_position_x),
      gallery_position_y: Number(form.gallery_position_y),
      gallery_zoom: Number(form.gallery_zoom),
      couple_names: weddingEventTypes.includes(form.event_type) ? form.couple_names : '',
      event_date: form.event_date,
      event_time: form.event_time,
      reception_date: form.reception_date,
      reception_time: form.reception_time,
      reception_venue: form.reception_venue,
      reception_address: form.reception_address,
      reception_maps_url: form.reception_maps_url,
      venue: form.venue,
      address: form.address,
      maps_url: form.maps_url,
      story: form.story,
      opening_text: form.opening_text,
      music_url: form.music_url,
      video_url: form.video_url,
      rsvp_url: form.rsvp_url,
      gallery: form.gallery.split('\n').map((url) => url.trim()).filter(Boolean),
      digital_envelope: {
        bank: {
          ...envelope.bank,
          name: envelope.bank.name.trim(),
          account_name: envelope.bank.account_name.trim(),
          account_number: envelope.bank.account_number.trim(),
        },
        e_wallet: {
          ...envelope.e_wallet,
          provider: envelope.e_wallet.provider.trim(),
          account_name: envelope.e_wallet.account_name.trim(),
          account_number: envelope.e_wallet.account_number.trim(),
        },
        qris: {
          ...envelope.qris,
          image_url: envelope.qris.image_url.trim(),
          instructions: envelope.qris.instructions.trim(),
        },
      },
    };
    const plan = selectedPlan;
    const planId = user.is_test_account ? 'business' : form.plan_id;
    const payload = { title: form.title, content };
    if (!editingId) {
      payload.plan_id = planId;
      if (plan?.id !== 'basic' && form.slug.trim()) payload.slug = form.slug;
    } else if (plan?.id !== 'basic' && form.slug.trim()) {
      payload.slug = form.slug;
    }

    try {
      const saved = editingId
        ? await invitationsApi.update(token, editingId, payload)
        : await invitationsApi.create(token, payload);
      await refreshInvitations();
      setEditingId(saved.id);
      setMessage(editingId
        ? 'Perubahan undangan tersimpan.'
        : user.is_test_account
          ? 'Undangan mendapat akses Business tanpa batas dan sudah aktif selamanya. Tekan Publish agar dapat dibagikan.'
        : user.is_demo
          ? 'Undangan demo aktif. Anda dapat membagikannya selama masa uji coba.'
          : 'Draft dibuat. Lanjutkan pembayaran untuk mengaktifkan masa tayang.');
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
    const planId = activationPlanSelections[invitation.id] || invitation.plan_id;
    try {
      const payment = await paymentsApi.create(token, invitation.id, paymentMethodId, paymentMobile, planId);
      setActivePayment(payment);
      if (payment.redirect_url) window.location.assign(payment.redirect_url);
      else setMessage('Instruksi transfer siap. Setelah transfer, kirim referensi untuk verifikasi admin.');
      await refreshInvitations();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const copyInvitationLink = async (invitation, section = '') => {
    const link = section === '#rsvp'
      ? createOwnerGuestbookUrl(invitation.slug)
      : `${window.location.origin}/i/${encodeURIComponent(invitation.slug)}${section}`;
    try {
      await copyTextToClipboard(link);
      setMessage(section === '#rsvp' ? 'Link dashboard RSVP berhasil disalin.' : 'Link undangan berhasil disalin.');
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const shareInvitation = async (invitation) => {
    const link = `${window.location.origin}/i/${encodeURIComponent(invitation.slug)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: invitation.title, text: 'Undangan acara', url: link });
        return;
      }
      await copyTextToClipboard(link);
      setMessage('Link undangan disalin agar dapat dibagikan.');
      setError('');
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setError(requestError.message || 'Undangan tidak dapat dibagikan.');
    }
  };

  const exportGuestbook = async (entries, filename, tickets = null) => {
    setError('');
    try {
      await downloadGuestbookSpreadsheet(entries, filename, tickets);
      setMessage(tickets ? 'Data RSVP dan daftar undangan berhasil diunduh dalam format .xlsx.' : 'Data RSVP berhasil diunduh dalam format .xlsx.');
    } catch (requestError) {
      setError(requestError.message || 'Data RSVP tidak dapat diekspor.');
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

  const prepareWhatsAppQueue = async (invitationId, recipientList = null) => {
    setError('');
    const recipientRows = whatsAppRecipients.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    const recipients = [];
    const invalidRows = [];
    const missingNameRows = [];
    recipientRows.forEach((row, index) => {
      const hasNameSeparator = /[|\t]/.test(row);
      const entries = hasNameSeparator ? [row] : row.split(/[\s,;]+/).filter(Boolean);
      entries.forEach((entry) => {
        const [rawPhone, ...nameParts] = entry.split(/[|\t]/);
        const phone = normalizeWhatsAppPhone(rawPhone.trim());
        const name = nameParts.join('|').trim();
        if (!phone) invalidRows.push(index + 1);
        else if (!name) missingNameRows.push(index + 1);
        else if (!recipients.some((recipient) => recipient.phone === phone)) recipients.push({ phone, name });
      });
    });
    if (invalidRows.length) {
      setError(`Periksa nomor WhatsApp yang tidak valid pada baris ${[...new Set(invalidRows)].join(', ')}.`);
      return;
    }
    if (missingNameRows.length) {
      setError(`Nama penerima wajib diisi pada baris ${[...new Set(missingNameRows)].join(', ')}. Gunakan format nomor_hp | nama_penerima.`);
      return;
    }
    if (!recipients.length) {
      setError('Masukkan setidaknya satu nomor WhatsApp penerima.');
      return;
    }
    await issueInvitationTickets(invitationId, recipients);
  };

  const issueInvitationTickets = async (invitationId, recipients) => {
    setError('');
    const invitation = invitations.find((item) => item.id === invitationId);
    const plan = billing.plans.find((item) => item.id === invitation?.plan_id);
    const { bulkUploadEnabled: hasBulkUploadEntitlement, maxRecipients } = getPackageEntitlements(invitation || {}, plan);
    const bulkUploadEnabled = ['premium', 'business'].includes(invitation?.plan_id) && hasBulkUploadEntitlement;
    if (!bulkUploadEnabled && recipients.length > 1) {
      setError('Paket ini tidak mengaktifkan upload massal dan hanya dapat membuat satu tiket per permintaan.');
      return;
    }
    if (recipients.length > maxRecipients) {
      setError(`Paket ini membatasi maksimal ${maxRecipients} penerima per bulk upload.`);
      return;
    }
    setIsPreparingTickets(true);
    try {
      const result = await guestbookApi.createTickets(token, invitationId, recipients);
      setWhatsAppQueue(result.tickets);
      setWhatsAppQueueIndex(0);
      setMessage(`${result.tickets.length} tiket barcode unik siap dibagikan.`);
      return result.tickets;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setIsPreparingTickets(false);
    }
  };

  const prepareBasicWhatsAppTicket = async (invitationId) => {
    const phone = normalizeWhatsAppPhone(whatsAppPhone);
    if (!phone || !whatsAppName.trim()) {
      setError('Isi nama dan nomor WhatsApp penerima yang valid sebelum membuat tiket.');
      return;
    }
    const whatsappWindow = window.open('about:blank', '_blank');
    if (whatsappWindow) whatsappWindow.opener = null;
    const tickets = await issueInvitationTickets(invitationId, [{ name: whatsAppName.trim(), phone }]);
    const ticket = tickets?.[0];
    const invitation = invitations.find((item) => item.id === invitationId);
    if (!ticket?.token || !invitation) {
      whatsappWindow?.close();
      return;
    }

    const personalizedInvitationUrl = `${window.location.origin}/i/${invitation.slug}?ticket=${encodeURIComponent(ticket.token)}`;
    const whatsappUrl = buildWhatsAppUrl(
      ticket.phone,
      personalizeWhatsAppMessage(whatsAppMessage, ticket.name),
      personalizedInvitationUrl,
    );
    if (!whatsappUrl) {
      whatsappWindow?.close();
      setError('Tautan WhatsApp tidak dapat dibuat. Periksa nomor penerima dan coba kembali.');
      return;
    }
    if (whatsappWindow) {
      whatsappWindow.location.href = whatsappUrl;
    } else {
      setMessage(`QR untuk ${ticket.name} berhasil dibuat. Pop-up WhatsApp diblokir; gunakan tombol Buka WhatsApp.`);
    }
  };

  const preparePersonalizedInvitation = async (invitation) => {
    const recipientName = (recipientNames[invitation.id] || '').trim();
    const phone = normalizeWhatsAppPhone(recipientPhones[invitation.id] || '');
    if (!recipientName || !phone) {
      setError('Isi nama dan nomor WhatsApp tamu yang valid untuk membuat tiket QR unik.');
      return;
    }
    setError('');
    setMessage('');
    setPreparingPersonalizedTicketId(invitation.id);
    try {
      const { tickets } = await guestbookApi.createTickets(token, invitation.id, [{ name: recipientName, phone }]);
      const [ticket] = tickets;
      if (!ticket?.token) throw new Error('Tiket QR tamu tidak berhasil dibuat. Silakan coba kembali.');
      setPersonalizedTickets((current) => ({ ...current, [invitation.id]: ticket }));
      setMessage(`Tiket QR unik untuk ${ticket.name} siap dibagikan.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPreparingPersonalizedTicketId('');
    }
  };

  const handleTicketScan = async (scannedValue) => {
    setError('');
    setMessage('');
    setTicketScanStatus('QR terbaca, sedang mencatat check-in…');
    if (!guestbookInvitation) {
      const selectionError = 'Pilih undangan terlebih dahulu sebelum memindai tiket.';
      setError(selectionError);
      setTicketScanStatus(selectionError);
      return;
    }
    let ticketToken = '';
    try {
      const ticketUrl = new URL(scannedValue, window.location.origin);
      const ticketPath = ticketUrl.pathname.match(/^\/undangan-ticket\/([A-Za-z0-9_-]{32,64})$/);
      if (!['http:', 'https:'].includes(ticketUrl.protocol) || !ticketPath) {
        throw new Error('QR yang dipindai bukan tiket barcode Nuansa Invite.');
      }
      ticketToken = ticketPath[1];
      const result = await guestbookApi.checkInTicket(token, guestbookInvitation.id, ticketToken);
      if (result.entry) {
        setOwnerGuestbook((current) => [result.entry, ...current.filter((entry) => entry.id !== result.entry.id)]);
        setInvitationTickets((current) => current.map((ticket) => (
          ticket.id === result.entry.ticket_id
            ? { ...ticket, checked_in_at: result.entry.checked_in_at || result.entry.created_at }
            : ticket
        )));
      }
      const resultMessage = createTicketCheckInMessage(result);
      setMessage(resultMessage);
      setTicketScanStatus(resultMessage);
    } catch (requestError) {
      setError(requestError.message);
      setTicketScanStatus(requestError.message);
    }
  };

  const downloadRecipientTemplate = async () => {
    setError('');
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Penerima');
      sheet.columns = [
        { header: 'nomor_hp', key: 'nomor_hp', width: 24 },
        { header: 'nama_penerima', key: 'nama_penerima', width: 32 },
      ];
      sheet.getCell('A1').numFmt = '@';
      const content = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-nomor-penerima.xlsx';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (requestError) {
      setError(requestError.message || 'Template Excel tidak dapat dibuat.');
    }
  };

  const importWhatsAppRecipients = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError('Ukuran file maksimal 1 MB.');
      return;
    }

    setError('');
    setIsImportingRecipients(true);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Format belum didukung. Unggah file Excel .xlsx.');
      const [content, { default: ExcelJS }] = await Promise.all([readWorkbook(file), import('exceljs')]);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(content);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('File Excel tidak memiliki sheet untuk daftar nomor.');
      const rows = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rows.push({ rowNumber, values: row.values.slice(1) });
      });
      const { recipients, invalidRows, missingNameRows } = parseRecipientRows(rows);
      if (invalidRows.length) {
        const rowList = invalidRows.slice(0, 10).join(', ');
        const suffix = invalidRows.length > 10 ? ', …' : '';
        throw new Error(`Nomor tidak valid pada baris ${rowList}${suffix}. Perbaiki file lalu unggah kembali.`);
      }
      if (missingNameRows.length) {
        const rowList = missingNameRows.slice(0, 10).join(', ');
        const suffix = missingNameRows.length > 10 ? ', …' : '';
        throw new Error(`Nama penerima wajib diisi pada baris ${rowList}${suffix}. Isi kolom nama_penerima lalu unggah kembali.`);
      }
      if (!recipients.length) throw new Error('File belum berisi nomor HP. Isi kolom nomor_hp lalu unggah kembali.');
      const invitation = invitations.find((item) => item.id === whatsAppInvitationId);
      const plan = billing.plans.find((item) => item.id === invitation?.plan_id);
      const { maxRecipients } = getPackageEntitlements(invitation || {}, plan);
      if (recipients.length > maxRecipients) {
        throw new Error(`Paket ini membatasi maksimal ${maxRecipients} penerima per bulk upload.`);
      }
      setWhatsAppRecipients(recipients.map(({ phone, name }) => `${phone} | ${name}`).join('\n'));
      setWhatsAppQueue([]);
      setWhatsAppQueueIndex(0);
      const tickets = await issueInvitationTickets(whatsAppInvitationId, recipients);
      if (tickets) setMessage(`${tickets.length} tiket barcode unik berhasil dibuat dari file.`);
    } catch (requestError) {
      setError(requestError.message || 'File penerima tidak dapat dibaca.');
    } finally {
      setIsImportingRecipients(false);
    }
  };

  const openGuestbook = async (invitation) => {
    setGuestbookInvitation(invitation);
    setOwnerGuestbook([]);
    setInvitationTickets([]);
    setTicketScanStatus('');
    if (user?.role === 'user') setBuyerMenu('scan');
    try {
      const [entries, { tickets }] = await Promise.all([
        guestbookApi.listOwner(token, invitation.id),
        guestbookApi.listTickets(token, invitation.id),
      ]);
      setOwnerGuestbook(entries);
      setInvitationTickets(tickets);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    if (!token || !invitations.length) return;
    const requestedSlug = requestedGuestbookSlug || new URLSearchParams(window.location.search).get('guestbook');
    if (!requestedSlug || openedGuestbookSlug.current === requestedSlug) return;
    const requestedInvitation = invitations.find((invitation) => invitation.slug === requestedSlug);
    if (!requestedInvitation) return;
    openedGuestbookSlug.current = requestedSlug;
    openGuestbook(requestedInvitation);
  }, [invitations, requestedGuestbookSlug, token]);

  useEffect(() => {
    if (user?.role !== 'user' || buyerMenu !== 'scan') {
      autoOpenedScanInvitationId.current = '';
      return;
    }
    if (checkInInvitations.length !== 1) {
      autoOpenedScanInvitationId.current = '';
      return;
    }

    const [invitation] = checkInInvitations;
    if (guestbookInvitation?.id === invitation.id) {
      autoOpenedScanInvitationId.current = invitation.id;
      return;
    }
    if (autoOpenedScanInvitationId.current === invitation.id) return;

    autoOpenedScanInvitationId.current = invitation.id;
    openGuestbook(invitation);
  }, [buyerMenu, guestbookInvitation, invitations, user?.role]);

  useEffect(() => {
    if (user?.role !== 'user' || !invitations.length) {
      setDashboardGuestbook([]);
      setIsLoadingDashboardGuestbook(false);
      return undefined;
    }

    let active = true;
    setIsLoadingDashboardGuestbook(true);
    loadOwnerGuestbookEntries(token, invitations)
      .then((entries) => {
        if (active) setDashboardGuestbook(entries);
      })
      .catch((requestError) => {
        if (active) setError(`Daftar tamu belum dapat dimuat: ${requestError.message}`);
      })
      .finally(() => {
        if (active) setIsLoadingDashboardGuestbook(false);
      });

    return () => { active = false; };
  }, [invitations, token, user?.role]);

  const moderateGuestbook = async (entry, status) => {
    try {
      await guestbookApi.moderate(token, guestbookInvitation.id, entry.id, status);
      setOwnerGuestbook((current) => current.map((item) => item.id === entry.id ? { ...item, status } : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeGuestbook = async (entry) => {
    try {
      await guestbookApi.remove(token, guestbookInvitation.id, entry.id);
      setOwnerGuestbook((current) => current.filter((item) => item.id !== entry.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (isChecking || isLoading) return <main className="account-page container"><p>Memuat dashboard…</p></main>;
  if (!user || !token) {
    return (
      <main className="account-page container account-locked">
        <p className="eyebrow">Dashboard Nuansa Invite</p>
        <h1>Masuk untuk mengelola undangan</h1>
        <button className="primary-btn" onClick={onSignIn}>Masuk / Daftar</button>
      </main>
    );
  }

  return (
    <main className="account-page">
      <header className="account-topbar">
        <a className="brand" href="/undangan"><span className="logo-mark">N</span>Nuansa Invite</a>
        <div><span>{user.full_name}</span><button onClick={() => { logout(); onSignIn(); }}>Keluar</button></div>
      </header>
      <div className={`account-layout container ${user.role !== 'user' ? 'account-layout-restricted' : ''}`}>
        <section className="account-main-column">
          <div className="account-heading">
            <div><p className="eyebrow">Ruang undangan Anda</p><h1>Rancang cerita hari istimewa.</h1><p>{user.is_test_account ? 'Pilih paket Basic, Premium, atau Business selama masa akses tester.' : 'Buat draft, edit detail acara, lalu aktifkan setelah pembayaran dikonfirmasi.'}</p></div>
          </div>
          {user.role === 'user' ? (
            <>
              <nav className="buyer-dashboard-nav" aria-label="Menu akun pembeli">
                <button type="button" aria-current={buyerMenu === 'dashboard' ? 'page' : undefined} onClick={() => setBuyerMenu('dashboard')}>Dashboard</button>
                <button type="button" aria-current={buyerMenu === 'invitations' ? 'page' : undefined} onClick={() => setBuyerMenu('invitations')}>Undangan</button>
                <button type="button" aria-current={buyerMenu === 'guide' ? 'page' : undefined} onClick={() => setBuyerMenu('guide')}>Cara penggunaan</button>
                <button type="button" aria-current={buyerMenu === 'scan' ? 'page' : undefined} onClick={() => setBuyerMenu('scan')}>Scan QR</button>
              </nav>
              <section className="buyer-dashboard-overview buyer-dashboard-view" hidden={!showBuyerDashboard}>
                <div>
                  <span className="eyebrow">Dashboard pembeli</span>
                  <h2>Semua kebutuhan undangan, dalam satu tempat.</h2>
                  <p>Pantau undangan Anda, lanjutkan rancangan, dan bagikan momen istimewa dengan mudah.</p>
                </div>
                <div className="buyer-dashboard-stats">
                  <article><strong>{invitations.length}</strong><span>Total undangan</span></article>
                  <article><strong>{invitations.filter((invitation) => invitation.status === 'published').length}</strong><span>Sudah dipublikasikan</span></article>
                  <article><strong>{invitations.filter((invitation) => invitation.status !== 'published').length}</strong><span>Draft / belum tayang</span></article>
                </div>
                <button type="button" className="primary-btn" onClick={() => setBuyerMenu('invitations')}>Buat atau lanjutkan undangan</button>
              </section>
              <section className="account-panel buyer-dashboard-guestbook buyer-dashboard-view" hidden={!showBuyerDashboard}>
                <div className="account-panel-heading">
                  <div><span className="eyebrow">RSVP & ucapan</span><h2>Daftar tamu dan pesan terbaru</h2></div>
                  <div className="account-card-actions">
                    <button type="button" className="secondary-btn" onClick={() => exportGuestbook(dashboardGuestbook, 'rsvp-semua-undangan.xlsx')} disabled={!dashboardGuestbook.length}>Unduh RSVP .xlsx</button>
                    <button type="button" className="text-button" onClick={refreshDashboardGuestbook} disabled={isLoadingDashboardGuestbook}>
                      {isLoadingDashboardGuestbook ? 'Memuat…' : 'Muat ulang'}
                    </button>
                  </div>
                </div>
                <p className="form-hint">Konfirmasi kehadiran dan ucapan dari seluruh undangan Anda ditampilkan di sini.</p>
                {isLoadingDashboardGuestbook && !dashboardGuestbook.length ? <p role="status">Memuat daftar tamu…</p> : null}
                {!isLoadingDashboardGuestbook && !dashboardGuestbook.length ? <p className="form-hint">Belum ada RSVP atau ucapan dari tamu.</p> : null}
                <div className="owner-guestbook-list">
                  {dashboardGuestbook.map((entry) => (
                    <article key={`${entry.invitation_id}-${entry.id}`}>
                      <strong>{entry.name}</strong>
                      <span>{entry.invitation_title} · {entry.attendance === 'attending' ? 'Akan hadir' : entry.attendance === 'maybe' ? 'Masih tentatif' : 'Belum bisa hadir'}{entry.guests > 1 ? ` · ${entry.guests} tamu` : ''}</span>
                      <p>{entry.message}</p>
                      <span>{entry.created_at ? new Date(entry.created_at).toLocaleString('id-ID') : 'Waktu belum tersedia'}</span>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}
          {user.is_test_account ? <p className="account-message buyer-dashboard-view" hidden={!showBuyerDashboard} role="status">Akun tester · akses semua paket tanpa pembayaran hingga {user.test_access_until ? new Date(user.test_access_until).toLocaleDateString('id-ID') : 'masa akses berakhir'}. Undangan aktif mengikuti batas masa akses akun.</p> : null}
          {user.is_demo ? <section className="account-panel demo-account-notice buyer-dashboard-view" hidden={!showBuyerDashboard} role="status"><strong>Akun demo · Paket {user.demo_plan_id}</strong><p>Akses berakhir {new Date(user.demo_until).toLocaleString('id-ID')}. Akun demo hanya dapat mengirim maksimal 2 undangan{user.demo_plan_id === 'business' ? ' untuk seluruh jaringan akun' : ''} dan tidak dapat melakukan pembayaran.</p><span>{invitations.length}/2 undangan digunakan</span></section> : null}

          {user.role === 'user' ? (
            <section className="account-panel dashboard-admin-management buyer-dashboard-view" hidden={!showBuyerDashboard}>
              <div className="account-panel-heading"><div><span className="eyebrow">Tim acara</span><h2>Admin dashboard buku tamu</h2></div><strong>{dashboardAdmins.admins.length}/{dashboardAdmins.max_admins}</strong></div>
              <p className="form-hint">Buat maksimal tiga akun admin tambahan. Mereka dapat melihat QR undangan dan membaca buku tamu, tetapi tidak dapat mengedit atau mengelola pembayaran.</p>
              {!dashboardAdmins.eligible ? <p className="form-hint">Kelola admin tersedia setelah Anda memiliki undangan dengan paket aktif.</p> : null}
              {dashboardAdmins.eligible && dashboardAdmins.admins.length < dashboardAdmins.max_admins ? (
                <form className="affiliate-create-form" onSubmit={createDashboardAdmin}>
                  <label>Nama admin<input required minLength={2} value={dashboardAdminForm.full_name} onChange={(event) => setDashboardAdminForm({ ...dashboardAdminForm, full_name: event.target.value })} /></label>
                  <label>Email login<input type="email" required value={dashboardAdminForm.email} onChange={(event) => setDashboardAdminForm({ ...dashboardAdminForm, email: event.target.value })} /></label>
                  <label>Kata sandi awal<input type="password" minLength={8} required value={dashboardAdminForm.password} onChange={(event) => setDashboardAdminForm({ ...dashboardAdminForm, password: event.target.value })} /></label>
                  <button className="primary-btn">Buat admin</button>
                </form>
              ) : null}
              {dashboardAdmins.admins.map((admin) => (
                <article className="managed-account-row" key={admin.id}>
                  <div><strong>{admin.full_name}</strong><span>{admin.email}</span></div>
                  <span className={`status-label ${admin.active ? 'status-active' : 'status-expired'}`}>{admin.active ? 'Aktif' : 'Nonaktif'}</span>
                  <button className="secondary-btn" onClick={() => toggleDashboardAdmin(admin)}>{admin.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                </article>
              ))}
            </section>
          ) : null}

          {user.role === 'affiliate' ? (
            <section className="account-panel affiliate-management-panel">
              <div className="account-panel-heading">
                <div><span className="eyebrow">Portal reseller</span><h2>Pelanggan, pesanan & komisi</h2></div>
                <span className="status-label status-active">{resellerDashboard.customers.length}/{resellerDashboard.max_customers} pelanggan</span>
              </div>
              <p className="form-hint">
                Harga jual mengikuti batas pemilik paket (maks. markup {resellerDashboard.max_markup_percent}%). Komisi {resellerDashboard.commission_percent}% dari harga dasar paket dicatat setelah pembayaran terverifikasi.
              </p>
              {!resellerDashboard.sales_enabled ? <p className="form-hint">Pembuatan pesanan pelanggan belum diaktifkan oleh pemilik paket.</p> : (
                <form className="affiliate-create-form" onSubmit={createResellerOrder}>
                  <h3>Buat pesanan pelanggan</h3>
                  <label>Nama pelanggan<input required minLength={2} value={resellerOrderForm.customer_name} onChange={(event) => setResellerOrderForm({ ...resellerOrderForm, customer_name: event.target.value })} /></label>
                  <label>Email pelanggan<input type="email" required value={resellerOrderForm.customer_email} onChange={(event) => setResellerOrderForm({ ...resellerOrderForm, customer_email: event.target.value })} /></label>
                  <label>WhatsApp pelanggan<input type="tel" required value={resellerOrderForm.customer_phone} onChange={(event) => setResellerOrderForm({ ...resellerOrderForm, customer_phone: event.target.value })} /></label>
                  <label>Paket undangan<select value={resellerOrderForm.plan_id} onChange={(event) => setResellerOrderForm({ ...resellerOrderForm, plan_id: event.target.value, selling_price: '' })}>
                    {billing.plans.filter((plan) => ['basic', 'premium'].includes(plan.id) && plan.enabled !== false).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · Rp {Number(plan.price).toLocaleString('id-ID')} dasar</option>)}
                  </select></label>
                  <label>Harga jual pelanggan (Rp)<input type="number" required min="1" value={resellerOrderForm.selling_price} placeholder={String(billing.plans.find((plan) => plan.id === resellerOrderForm.plan_id)?.price || '')} onChange={(event) => setResellerOrderForm({ ...resellerOrderForm, selling_price: event.target.value })} /></label>
                  <button className="primary-btn" disabled={!resellerDashboard.sales_enabled}>Buat pesanan & invoice</button>
                </form>
              )}
              {resellerCheckout?.redirect_url ? <p className="account-message" role="status">Invoice pesanan {resellerCheckout.order_id} siap: <a href={resellerCheckout.redirect_url} target="_blank" rel="noreferrer">Buka checkout Mayar</a></p> : null}
              <div className="affiliate-list">
                <h3>Pesanan pelanggan</h3>
                {resellerDashboard.orders.map((order) => <article className="managed-account-row" key={order.id}>
                  <div><strong>{order.customer_name} · {order.plan_name}</strong><span>{order.order_id} · Rp {Number(order.selling_price).toLocaleString('id-ID')}</span><small>Komisi Rp {Number(order.commission_amount).toLocaleString('id-ID')} · {order.status}</small></div>
                  {order.status === 'pending' && order.redirect_url ? <a className="secondary-btn" href={order.redirect_url} target="_blank" rel="noreferrer">Buka invoice</a> : null}
                </article>)}
                {!resellerDashboard.orders.length ? <p className="form-hint">Belum ada pesanan reseller.</p> : null}
              </div>
              <div className="affiliate-list">
                <h3>Komisi terverifikasi</h3>
                {resellerDashboard.commissions.map((commission) => <article className="managed-account-row" key={commission.id}>
                  <div><strong>{commission.order_id}</strong><span>Rp {Number(commission.amount).toLocaleString('id-ID')} · {commission.commission_percent}%</span><small>{commission.status === 'paid' ? `Dibayar · ${commission.payout_reference || ''}` : 'Menunggu pembayaran komisi oleh Super Admin'}</small></div>
                  <span className={`status-label ${commission.status === 'paid' ? 'status-active' : 'status-pending'}`}>{commission.status}</span>
                </article>)}
                {!resellerDashboard.commissions.length ? <p className="form-hint">Komisi muncul setelah pembayaran pelanggan diverifikasi.</p> : null}
              </div>
              <div className="affiliate-list">
                <h3>Pelanggan terdaftar</h3>
                {resellerDashboard.customers.map((customer) => <article className="managed-account-row" key={customer.id}>
                  <div><strong>{customer.full_name}</strong><span>{customer.email} · {customer.phone}</span></div>
                </article>)}
                {!resellerDashboard.customers.length ? <p className="form-hint">Belum ada pelanggan.</p> : null}
              </div>
            </section>
          ) : null}

          {user.role === 'user' && affiliateProgram.eligible ? (
            <section className="account-panel affiliate-management-panel buyer-dashboard-view" hidden={!showBuyerDashboard}>
              <div className="account-panel-heading"><div><span className="eyebrow">Paket dengan fitur reseller</span><h2>Kelola reseller & iklan</h2></div><span className="status-label status-active">Akun {affiliateProgram.affiliates.length}/{affiliateProgram.max_resellers}</span></div>
              <p className="form-hint">Atur kombinasi kuota undangan untuk jaringan reseller. Batas jumlah akun mengikuti konfigurasi paket dari Super Admin.</p>
              <div className="affiliate-program-controls">
                <label>Kombinasi kuota reseller<select value={selectedAffiliateCombination} disabled={Boolean(affiliateProgram.program?.combination_id)} onChange={(event) => setSelectedAffiliateCombination(event.target.value)}><option value="">Pilih kombinasi</option>{affiliateProgram.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name} · {combination.basic} Basic / {combination.premium} Premium</option>)}</select></label>
                {affiliateProgram.program?.combination_id
                  ? <p className="form-hint affiliate-lock-warning">Kombinasi ini sudah dikunci dan tidak dapat diganti.</p>
                  : <button className="secondary-btn" type="button" disabled={!selectedAffiliateCombination} onClick={saveAffiliateCombination}>Konfirmasi kuota reseller</button>}
              </div>
              {selectedAffiliateCombination ? (
                <>
                  {affiliateProgram.affiliates.length < affiliateProgram.max_resellers ? <form className="affiliate-create-form" onSubmit={createAffiliate}>
                    <h3>Daftarkan reseller</h3>
                    <label>Nama lengkap<input required minLength={2} value={affiliateForm.full_name} onChange={(event) => setAffiliateForm({ ...affiliateForm, full_name: event.target.value })} /></label>
                    <label>Email login<input type="email" required value={affiliateForm.email} onChange={(event) => setAffiliateForm({ ...affiliateForm, email: event.target.value })} /></label>
                    <label>Kata sandi awal<input type="password" minLength={8} required value={affiliateForm.password} onChange={(event) => setAffiliateForm({ ...affiliateForm, password: event.target.value })} /></label>
                    <label>Kuota Basic<input type="number" min="0" value={affiliateForm.basic_quota} onChange={(event) => setAffiliateForm({ ...affiliateForm, basic_quota: Number(event.target.value) })} /></label>
                    <label>Kuota Premium<input type="number" min="0" value={affiliateForm.premium_quota} onChange={(event) => setAffiliateForm({ ...affiliateForm, premium_quota: Number(event.target.value) })} /></label>
                    <button className="primary-btn">Daftarkan reseller</button>
                  </form> : <p className="form-hint">Batas {affiliateProgram.max_resellers} akun reseller pada paket aktif sudah tercapai.</p>}
                  <div className="affiliate-list">
                    {affiliateProgram.affiliates.map((affiliate) => (
                      <article className="managed-account-row affiliate-account-row" key={affiliate.id}>
                        <div><strong>{affiliate.full_name}</strong><span>{affiliate.email}</span><small>{affiliate.basic_used}/{affiliate.basic_quota} Basic · {affiliate.premium_used}/{affiliate.premium_quota} Premium</small></div>
                        <label>Basic<input type="number" min={affiliate.basic_used} max="1000" value={affiliateQuotaEdits[affiliate.id]?.basic ?? affiliate.basic_quota} onChange={(event) => setAffiliateQuotaEdits((current) => ({ ...current, [affiliate.id]: { ...current[affiliate.id], basic: Number(event.target.value) } }))} /></label>
                        <label>Premium<input type="number" min={affiliate.premium_used} max="1000" value={affiliateQuotaEdits[affiliate.id]?.premium ?? affiliate.premium_quota} onChange={(event) => setAffiliateQuotaEdits((current) => ({ ...current, [affiliate.id]: { ...current[affiliate.id], premium: Number(event.target.value) } }))} /></label>
                        <button className="secondary-btn" onClick={() => saveAffiliateQuota(affiliate)}>Simpan kuota</button>
                        <span className={`status-label ${affiliate.active ? 'status-active' : 'status-expired'}`}>{affiliate.active ? 'Aktif' : 'Nonaktif'}</span>
                        <button className="secondary-btn" onClick={() => updateAffiliateAccess(affiliate, { active: !affiliate.active })}>{affiliate.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      </article>
                    ))}
                    {!affiliateProgram.affiliates.length ? <p className="form-hint">Belum ada affiliate yang didaftarkan.</p> : null}
                  </div>
                </>
              ) : <p className="form-hint">Pilih kombinasi kuota untuk mulai mendaftarkan affiliate.</p>}
            </section>
          ) : null}

          {user.role === 'dashboard_admin' ? (
            <section className="account-panel"><p className="eyebrow">Akses admin buku tamu</p><h2>Anda dapat melihat undangan dan RSVP pemilik.</h2><p>Pengaturan paket, pembayaran, dan perubahan undangan hanya tersedia bagi pemilik paket.</p></section>
          ) : !setupComplete ? <section className="account-panel invitation-setup-panel buyer-invitations-view" hidden={!showBuyerInvitations}>
            <div id="buyer-invitations" className="buyer-section-anchor" />
            <div className="account-panel-heading"><div><span className="eyebrow">Langkah 1 dari 3</span><h2>Mulai rancangan undangan</h2></div></div>
            <p className="setup-intro">Pilih kelompok acara, jenis undangan, dan template agar form berikutnya menyesuaikan kebutuhan Anda.</p>
            <div className="setup-grid">
              <label>Kelompok acara<select value={setupGroup} onChange={(event) => { setSetupGroup(event.target.value); setSetupProvince(''); setSetupEventType(''); setSetupTemplateId(''); }}><option value="">Pilih kelompok</option>{eventGroups.map((group) => <option key={group.label} value={group.label}>{group.label}</option>)}</select></label>
              <label>Jenis acara<select value={setupEventType} disabled={!setupGroup} onChange={(event) => { const eventType = event.target.value; setSetupProvince(''); setSetupEventType(eventType); setSetupTemplateId(getTemplatesForEvent(invitationTemplates, eventType)[0]?.id || ''); }}><option value="">Pilih jenis acara</option>{eventGroups.find((group) => group.label === setupGroup)?.options.map((option) => <option key={option}>{option}</option>)}</select></label>
            </div>
            <label className="province-select-field">Inspirasi daerah (opsional)<select value={setupProvince} disabled={!setupEventType} onChange={(event) => { const province = event.target.value; setSetupProvince(province); setSetupTemplateId(province ? regionalInvitationTemplates.find((template) => template.province === province)?.id || '' : getTemplatesForEvent(invitationTemplates, setupEventType)[0]?.id || ''); }}><option value="">Tanpa inspirasi daerah</option>{provinceGroups.map((group) => <optgroup key={group} label={group}>{regionalInvitationTemplates.filter((template) => template.islandGroup === group).map((template) => <option key={template.province} value={template.province}>{template.province}</option>)}</optgroup>)}</select><small className="form-hint">Tersedia inspirasi visual untuk seluruh 38 provinsi Indonesia.</small></label>
            <div className="setup-template-section"><span className="form-label">{setupProvince ? `Template daerah · ${setupProvince}` : setupEventType ? `Template untuk ${setupEventType}` : 'Template acara'}</span><div className="setup-template-grid">{setupTemplates.map((template) => <button type="button" key={template.id} className={`setup-template-card ${setupTemplateId === template.id ? 'selected' : ''}`} onClick={() => setSetupTemplateId(template.id)}><span className="template-choice-swatch" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }} /><strong>{template.name}</strong><small>{template.province ? `${template.islandGroup} · ${template.inspiration}` : `${template.category} · Cocok untuk ${setupEventType}`}</small></button>)}</div></div>
            {setupEventType ? <p className="form-hint">Menampilkan {setupTemplates.length} template yang disesuaikan untuk acara {setupEventType}{setupProvince ? ` dengan inspirasi ${setupProvince}` : ''}.</p> : null}
            <button className="primary-btn setup-continue-button" onClick={beginInvitation}>Lanjutkan ke isi data</button>
          </section> : <section className="account-panel invitation-editor-panel buyer-invitations-view" hidden={!showBuyerInvitations}>
            <div id="buyer-invitations" className="buyer-section-anchor" />
            <div className="account-panel-heading"><div><span className="eyebrow">{editingId ? 'Edit undangan' : 'Undangan baru'}</span><h2>{editingId ? 'Perbarui detail acara' : 'Mulai dengan detail acara'}</h2></div>{editingId ? <button className="text-button" onClick={resetForm}>Buat draft baru</button> : null}</div>
            <form className="invitation-editor-form" onSubmit={saveInvitation}>
              <label>Nama acara<input value={form.title} onChange={(event) => updateField('title', event.target.value)} required maxLength={120} placeholder="Pernikahan Aulia & Farhan" /></label>
              {user.role === 'affiliate' ? <label>Paket kuota<select value={selectedPlan?.id || form.plan_id} disabled={Boolean(editingId)} onChange={(event) => updateField('plan_id', event.target.value)}>{availablePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · kuota tersisa {(user[`${plan.id}_quota`] || 0) - affiliatePlanCounts[plan.id]}</option>)}</select></label> : null}
              {selectedPlan?.id !== 'basic' ? <label>Link undangan (opsional, dapat diedit)<input value={form.slug} onChange={(event) => updateField('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} minLength={3} maxLength={64} placeholder={form.title ? form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'nama-acara'} /><small>Kosongkan untuk membuat link otomatis saat disimpan. Anda tetap dapat mengubah link ini nanti.</small></label> : <p className="form-hint">Paket Basic menggunakan link otomatis yang dibuat sistem.</p>}
              <div className="generated-rsvp-link">
                <label>Link dashboard RSVP otomatis<input readOnly value={editingInvitation ? createOwnerGuestbookUrl(editingInvitation.slug) : 'Link dashboard RSVP dibuat setelah draft disimpan'} /></label>
                {editingInvitation ? <button className="secondary-btn" type="button" onClick={() => copyInvitationLink(editingInvitation, '#rsvp')}>Salin link dashboard RSVP</button> : null}
                <small className="form-hint">Tautan ini membuka pengelolaan RSVP dan buku tamu di dashboard pemilik. Tamu mengisi RSVP melalui link undangan.</small>
              </div>
              <label>Undangan ini untuk acara apa?<select value={form.event_type} onChange={(event) => { const eventType = event.target.value; const group = eventGroups.find((item) => item.options.includes(eventType))?.label || ''; const recommendedTemplate = getTemplatesForEvent(invitationTemplates, eventType)[0]; setSetupGroup(group); setForm((current) => ({ ...current, event_type: eventType, province: '', template_id: recommendedTemplate?.id || current.template_id, custom_design: false })); }} >{eventGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((option) => <option key={option}>{option}</option>)}</optgroup>)}</select></label>
              <label>Inspirasi daerah<select value={form.province} onChange={(event) => { const province = event.target.value; const regionalTemplate = regionalInvitationTemplates.find((template) => template.province === province); const recommendedTemplate = getTemplatesForEvent(invitationTemplates, form.event_type)[0]; setForm((current) => ({ ...current, province, template_id: regionalTemplate?.id || recommendedTemplate?.id || current.template_id, custom_design: false })); }}><option value="">Tidak memakai gaya daerah khusus</option>{provinceGroups.map((group) => <optgroup key={group} label={group}>{regionalInvitationTemplates.filter((template) => template.islandGroup === group).map((template) => <option key={template.province} value={template.province}>{template.province} · {template.inspiration}</option>)}</optgroup>)}</select></label>
              <div className="template-picker-field">
                <span className="form-label">Pilih template {form.province ? `· ${form.province}` : `· ${form.event_type}`}</span>
                <div className="template-picker">
                  {editorTemplates.map((template) => (
                    <article key={template.id} className={`template-choice ${form.template_id === template.id && !form.custom_design ? 'selected' : ''}`}>
                      <button type="button" className="template-choice-select" onClick={() => setForm((current) => ({ ...current, province: template.province || '', template_id: template.id, custom_design: false }))}>
                        <span className="template-choice-swatch" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }} />
                        <strong>{template.name}</strong>
                        <small>{template.province ? `${template.islandGroup} · ${template.inspiration} · ` : `${template.category} · Untuk ${form.event_type} · `}{template.description}</small>
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
                {demoTemplate ? <div className="template-demo-panel"><div className="template-demo-heading"><div><p className="eyebrow">Demo {form.event_type} · {demoTemplate.category}</p><h3>{demoTemplate.name}</h3><p>{demoTemplate.description}</p></div><div><button type="button" className="secondary-btn" onClick={() => setDemoTemplate(null)}>Tutup Demo</button><button type="button" className="primary-btn" onClick={() => { setForm((current) => ({ ...current, province: demoTemplate.province || '', template_id: demoTemplate.id, custom_design: false })); setDemoTemplate(null); }}>Gunakan Template</button></div></div><div className="template-demo-viewport"><PublicInvitation invitation={demoInvitation} slug="template-demo" /></div></div> : null}
                {form.custom_design ? <div className="custom-design-fields"><label>Warna utama<input type="color" value={form.custom_primary} onChange={(event) => updateField('custom_primary', event.target.value)} /></label><label>Warna aksen<input type="color" value={form.custom_accent} onChange={(event) => updateField('custom_accent', event.target.value)} /></label><label>Warna latar<input type="color" value={form.custom_background} onChange={(event) => updateField('custom_background', event.target.value)} /></label></div> : null}
              </div>
              {weddingEventTypes.includes(form.event_type) ? (
                <>
                  <label>Nama pasangan<input value={form.couple_names} onChange={(event) => updateField('couple_names', event.target.value)} placeholder="Aulia & Farhan" /></label>
                  <div className="account-form-row">
                    <label>Orang tua mempelai pria<input value={form.groom_parents} onChange={(event) => updateField('groom_parents', event.target.value)} placeholder="Bapak ... & Ibu ..." /></label>
                    <label>Orang tua mempelai wanita<input value={form.bride_parents} onChange={(event) => updateField('bride_parents', event.target.value)} placeholder="Bapak ... & Ibu ..." /></label>
                  </div>
                  <div className="account-form-row">
                    <label>Instagram mempelai pria<input value={form.groom_instagram} onChange={(event) => updateField('groom_instagram', event.target.value)} placeholder="@username (opsional)" /></label>
                    <label>Instagram mempelai wanita<input value={form.bride_instagram} onChange={(event) => updateField('bride_instagram', event.target.value)} placeholder="@username (opsional)" /></label>
                  </div>
                </>
              ) : form.event_type === 'Anniversary' ? (
                <label>Nama pasangan yang merayakan
                  <input value={form.honoree_name} onChange={(event) => updateField('honoree_name', event.target.value)} placeholder="Contoh: Aulia & Farhan" />
                </label>
              ) : (
                <label>{organizerEventTypes.includes(form.event_type) ? 'Nama penyelenggara / komunitas' : `Nama ${form.event_type.toLowerCase()} / yang dirayakan`}
                  <input value={form.honoree_name} onChange={(event) => updateField('honoree_name', event.target.value)} placeholder={organizerEventTypes.includes(form.event_type) ? 'Contoh: Komunitas ...' : `Contoh: nama ${form.event_type.toLowerCase()}`} />
                </label>
              )}
              <div className="account-form-row"><label>Tanggal acara<input type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} /></label><label>Waktu acara<input type="time" value={form.event_time} onChange={(event) => updateField('event_time', event.target.value)} /></label></div>
              <div className="account-panel event-location-fields">
                <h3>Lokasi acara & Google Maps</h3>
                <p className="form-hint">Isi lokasi agar tamu dapat melihat peta dan petunjuk arah di undangan. Peta dibuat otomatis dari venue/alamat; Anda juga dapat menempel link Google Maps.</p>
                <label>Nama venue<input value={form.venue} onChange={(event) => updateField('venue', event.target.value)} placeholder="The Glass House" /></label>
                <label>Alamat lengkap<textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} rows={2} placeholder="Jalan, nomor, kelurahan, kota" /></label>
                <label>Link Google Maps (opsional)<input type="url" value={form.maps_url} onChange={(event) => updateField('maps_url', event.target.value)} placeholder="Tempel link berbagi dari Google Maps" /></label>
                {form.event_type === 'Akad & Resepsi' ? (
                  <div className="account-panel event-secondary-details">
                    <h3>Lokasi resepsi</h3>
                    <div className="account-form-row"><label>Tanggal resepsi<input type="date" value={form.reception_date} onChange={(event) => updateField('reception_date', event.target.value)} /></label><label>Waktu resepsi<input type="time" value={form.reception_time} onChange={(event) => updateField('reception_time', event.target.value)} /></label></div>
                    <label>Nama venue resepsi<input value={form.reception_venue} onChange={(event) => updateField('reception_venue', event.target.value)} placeholder="Nama tempat resepsi" /></label>
                    <label>Alamat resepsi<textarea value={form.reception_address} onChange={(event) => updateField('reception_address', event.target.value)} rows={2} placeholder="Alamat lengkap lokasi resepsi" /></label>
                    <label>Link Google Maps resepsi (opsional)<input type="url" value={form.reception_maps_url} onChange={(event) => updateField('reception_maps_url', event.target.value)} placeholder="Tempel link berbagi dari Google Maps" /></label>
                  </div>
                ) : null}
              </div>
              <div className="media-upload-field"><label>Foto sampul<input type="file" accept="image/*" onChange={handleCoverUpload} /></label><label>Atau paste URL foto sampul<input type="url" value={form.cover_image.startsWith('data:') ? '' : form.cover_image} onChange={(event) => updateField('cover_image', event.target.value)} placeholder="https://..." /></label><small className="form-hint">Maksimal 5 MB untuk upload foto.</small></div>
              <div className="account-panel template-display-controls">
                <h3>Atur tampilan template</h3>
                <div className="account-form-row">
                  <label>Bingkai undangan
                    <select value={form.frame_style} onChange={(event) => updateField('frame_style', event.target.value)}>
                      <option value="">Ikuti bingkai template</option>
                      <option value="ornate-gold">Ornamen gold</option><option value="black-corner">Sudut hitam gold</option>
                      <option value="maroon">Maroon</option><option value="classic">Klasik</option><option value="ivory">Ivory</option>
                      <option value="rose">Rose</option><option value="emerald">Emerald</option><option value="navy">Navy</option>
                      <option value="botanical">Botanical</option><option value="floral">Floral</option><option value="minimal">Minimal</option>
                      <option value="modern">Modern</option><option value="islamic">Islami</option><option value="traditional">Nusantara</option>
                      <option value="playful">Playful</option><option value="soft">Lembut</option><option value="celebration">Perayaan</option>
                      <option value="academic">Akademik</option><option value="heart">Hati</option><option value="geometric">Geometris</option>
                      <option value="custom">Custom</option><option value="genz">Editorial</option><option value="regional">Regional</option>
                    </select>
                  </label>
                  <label>Gaya animasi
                    <select value={form.animation_preset} onChange={(event) => updateField('animation_preset', event.target.value)}>
                      <option value="">Ikuti template</option><option value="none">Tanpa animasi</option>
                      <option value="subtle">Lembut</option><option value="romantic">Romantis</option><option value="festive">Meriah</option>
                    </select>
                  </label>
                </div>
                <div className="account-form-row">
                  <label>Posisi foto sampul horizontal: {form.cover_position_x}%
                    <input type="range" min="0" max="100" value={form.cover_position_x} onChange={(event) => updateField('cover_position_x', Number(event.target.value))} />
                  </label>
                  <label>Posisi foto sampul vertikal: {form.cover_position_y}%
                    <input type="range" min="0" max="100" value={form.cover_position_y} onChange={(event) => updateField('cover_position_y', Number(event.target.value))} />
                  </label>
                </div>
                <label>Zoom foto sampul: {form.cover_zoom}%
                  <input type="range" min="100" max="160" value={form.cover_zoom} onChange={(event) => updateField('cover_zoom', Number(event.target.value))} />
                </label>
                <div className="account-form-row">
                  <label>Posisi foto galeri horizontal: {form.gallery_position_x}%
                    <input type="range" min="0" max="100" value={form.gallery_position_x} onChange={(event) => updateField('gallery_position_x', Number(event.target.value))} />
                  </label>
                  <label>Posisi foto galeri vertikal: {form.gallery_position_y}%
                    <input type="range" min="0" max="100" value={form.gallery_position_y} onChange={(event) => updateField('gallery_position_y', Number(event.target.value))} />
                  </label>
                </div>
                <label>Zoom foto galeri: {form.gallery_zoom}%
                  <input type="range" min="100" max="160" value={form.gallery_zoom} onChange={(event) => updateField('gallery_zoom', Number(event.target.value))} />
                </label>
                <p className="form-hint">Perubahan langsung terlihat di pratinjau dan tersimpan saat undangan disimpan.</p>
              </div>
              <label>Salam pembuka<textarea value={form.opening_text} onChange={(event) => updateField('opening_text', event.target.value)} rows={2} placeholder="Dengan penuh sukacita kami mengundang..." /></label>
              <label>{weddingEventTypes.includes(form.event_type) ? 'Cerita pasangan' : `Cerita ${form.event_type.toLowerCase()}`}<textarea value={form.story} onChange={(event) => updateField('story', event.target.value)} rows={4} placeholder={weddingEventTypes.includes(form.event_type) ? 'Tuliskan cerita pasangan...' : `Tuliskan cerita tentang ${form.event_type.toLowerCase()}...`} /></label>
              <div className="music-input-field">
                <label>Musik pilihan berdasarkan genre
                  <select
                    value={form.music_catalog_id || (form.music_url && !form.music_url.startsWith('/music/') ? 'custom' : '')}
                    onChange={(event) => {
                      const track = musicCatalog.find((item) => item.id === event.target.value);
                      if (track) setForm((current) => ({ ...current, music_catalog_id: track.id, music_url: track.url }));
                      else if (event.target.value === 'custom') setForm((current) => ({ ...current, music_catalog_id: '' }));
                      else setForm((current) => ({ ...current, music_catalog_id: '', music_url: '' }));
                    }}
                  >
                    <option value="">Pilih musik katalog</option>
                    {musicCatalog.map((track) => <option key={track.id} value={track.id}>{track.genre} · {track.name}</option>)}
                    <option value="custom">Gunakan link atau upload sendiri</option>
                  </select>
                </label>
                <label>Link musik eksternal<input type="text" value={form.music_url.startsWith('data:') || form.music_url.startsWith('/music/') ? '' : form.music_url} onChange={(event) => setForm((current) => ({ ...current, music_url: event.target.value, music_catalog_id: '' }))} placeholder="https://..." /></label>
                <label>Atau upload musik<input type="file" accept="audio/*" onChange={handleMusicUpload} /></label>
                <small className="form-hint">Katalog berisi loop instrumental orisinal. Upload langsung maksimal 8 MB. Musik mulai diputar saat undangan dibuka; browser mungkin meminta tamu menekan tombol Putar.</small>
              </div>
              <div className="media-upload-field">
                <label>{weddingEventTypes.includes(form.event_type) ? 'Video prewedding / cerita pasangan' : `Video ${form.event_type.toLowerCase()}`}
                  <input type="url" value={form.video_url.startsWith('data:') ? '' : form.video_url} onChange={(event) => updateField('video_url', event.target.value)} placeholder="YouTube, Vimeo, atau URL MP4/WebM" />
                </label>
                <label>Atau upload video<input type="file" accept="video/mp4,video/webm,video/ogg" onChange={handleVideoUpload} /></label>
                {form.video_url.startsWith('data:video/') ? <video className="media-upload-preview" src={form.video_url} controls preload="metadata" /> : null}
                <small className="form-hint">Video YouTube/Vimeo atau tautan langsung didukung. Upload MP4, WebM, atau Ogg maksimal 4 MB.</small>
              </div>
              <label>Link RSVP<input type="url" value={form.rsvp_url} onChange={(event) => updateField('rsvp_url', event.target.value)} placeholder="https://forms.google.com/..." /></label>
              <div className="media-upload-field"><label>Link galeri, satu URL per baris<textarea value={form.gallery} onChange={(event) => updateField('gallery', event.target.value)} rows={3} placeholder="https://foto-1.jpg\nhttps://foto-2.jpg" /></label><label>Atau upload foto galeri<input type="file" accept="image/*" multiple onChange={handleGalleryUpload} /></label><small className="form-hint">Pilih beberapa foto sekaligus. Maksimal 5 MB per foto.</small></div>
              <section className="digital-envelope-editor">
                <div><span className="eyebrow">Amplop digital</span><h3>Atur cara tamu mengirim hadiah</h3><p className="form-hint">Aktifkan metode yang ingin ditampilkan. Detail metode yang tidak aktif tidak akan dibagikan kepada tamu.</p></div>
                <fieldset>
                  <legend>Transfer bank</legend>
                  <label className="digital-envelope-toggle"><input type="checkbox" checked={form.digital_envelope.bank.enabled} onChange={(event) => updateEnvelopeField('bank', 'enabled', event.target.checked)} /> Tampilkan rekening bank</label>
                  {form.digital_envelope.bank.enabled ? <div className="account-form-row">
                    <label>Nama bank<input value={form.digital_envelope.bank.name} onChange={(event) => updateEnvelopeField('bank', 'name', event.target.value)} placeholder="BCA" /></label>
                    <label>Nama pemilik rekening<input value={form.digital_envelope.bank.account_name} onChange={(event) => updateEnvelopeField('bank', 'account_name', event.target.value)} /></label>
                    <label>Nomor rekening<input inputMode="numeric" value={form.digital_envelope.bank.account_number} onChange={(event) => updateEnvelopeField('bank', 'account_number', event.target.value)} /></label>
                  </div> : null}
                </fieldset>
                <fieldset>
                  <legend>E-wallet</legend>
                  <label className="digital-envelope-toggle"><input type="checkbox" checked={form.digital_envelope.e_wallet.enabled} onChange={(event) => updateEnvelopeField('e_wallet', 'enabled', event.target.checked)} /> Tampilkan e-wallet</label>
                  {form.digital_envelope.e_wallet.enabled ? <div className="account-form-row">
                    <label>Penyedia e-wallet<select value={form.digital_envelope.e_wallet.provider} onChange={(event) => updateEnvelopeField('e_wallet', 'provider', event.target.value)} required>
                      <option value="">Pilih penyedia</option>
                      {form.digital_envelope.e_wallet.provider && !eWalletProviders.includes(form.digital_envelope.e_wallet.provider) ? <option value={form.digital_envelope.e_wallet.provider}>{form.digital_envelope.e_wallet.provider}</option> : null}
                      {eWalletProviders.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                    </select></label>
                    <label>Nama pemilik akun<input value={form.digital_envelope.e_wallet.account_name} onChange={(event) => updateEnvelopeField('e_wallet', 'account_name', event.target.value)} /></label>
                    <label>Nomor akun / telepon<input inputMode="tel" value={form.digital_envelope.e_wallet.account_number} onChange={(event) => updateEnvelopeField('e_wallet', 'account_number', event.target.value)} /></label>
                  </div> : null}
                </fieldset>
                <fieldset>
                  <legend>QRIS</legend>
                  <label className="digital-envelope-toggle"><input type="checkbox" checked={form.digital_envelope.qris.enabled} onChange={(event) => updateEnvelopeField('qris', 'enabled', event.target.checked)} /> Tampilkan QRIS</label>
                  {form.digital_envelope.qris.enabled ? <div className="qris-editor-fields">
                    <label>URL gambar QRIS (opsional)<input type="url" value={form.digital_envelope.qris.image_url.startsWith('data:') ? '' : form.digital_envelope.qris.image_url} onChange={(event) => updateEnvelopeField('qris', 'image_url', event.target.value)} placeholder="https://..." /></label>
                    <label>Atau upload QRIS milik Anda<input type="file" accept="image/*" onChange={handleQrisUpload} /></label>
                    {form.digital_envelope.qris.image_url ? <img className="qris-editor-preview" src={form.digital_envelope.qris.image_url} alt="Pratinjau QRIS yang akan ditampilkan" /> : null}
                    <label>Keterangan QRIS (opsional)<input value={form.digital_envelope.qris.instructions} onChange={(event) => updateEnvelopeField('qris', 'instructions', event.target.value)} placeholder="Contoh: Pindai QR untuk mengirim hadiah" /></label>
                    <small className="form-hint">Unggah gambar QRIS (maksimal 5 MB) atau masukkan URL gambar. Keterangan akan tampil di bawah QR pada undangan.</small>
                  </div> : null}
                </fieldset>
              </section>
              <button className="primary-btn" type="submit" disabled={isSaving || (user.role === 'affiliate' && !availablePlans.some((plan) => plan.id === form.plan_id))}>{isSaving ? 'Menyimpan…' : editingId ? 'Simpan semua perubahan' : 'Simpan draft'}</button>
            </form>
          </section>}

          {activePayment?.manual_details ? (
            <section className="account-panel manual-payment-panel buyer-invitations-view" hidden={!showBuyerInvitations}>
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

          <section className="account-panel buyer-invitations-view" id="buyer-invitation-list" hidden={!showBuyerInvitations}>
            <div className="account-panel-heading"><div><span className="eyebrow">Koleksi Anda</span><h2>Undangan dan masa aktif</h2></div><button className="text-button" onClick={() => refreshInvitations().catch((requestError) => setError(requestError.message))}>Muat ulang</button></div>
            {!invitations.length ? <p className="form-hint">Belum ada draft. Isi form di atas untuk memulai.</p> : (
              <div className="account-invitation-list">
                {invitations.map((invitation) => {
                  const plan = billing.plans.find((item) => item.id === invitation.plan_id);
                  const activationPlanId = activationPlanSelections[invitation.id] || invitation.plan_id;
                  const activationPlan = billing.plans.find((item) => item.id === activationPlanId && item.enabled !== false) || plan;
                  const active = user.is_test_account || (['active', 'published'].includes(invitation.status) && new Date(invitation.active_until) > new Date());
                  const invitationUrl = `${window.location.origin}/i/${invitation.slug}`;
                  const { bulkUploadEnabled } = getPackageEntitlements(invitation, plan);
                  const supportsBulkUpload = ['premium', 'business'].includes(invitation.plan_id) && bulkUploadEnabled;
                  const isSingleRecipientPlan = !supportsBulkUpload;
                  const maxRecipients = getPackageEntitlements(invitation, plan).maxRecipients;
                  const currentTicket = whatsAppQueue[whatsAppQueueIndex];
                  const recipientInvitationUrl = currentTicket
                    ? `${invitationUrl}?ticket=${encodeURIComponent(currentTicket.token)}`
                    : invitationUrl;
                  const whatsAppUrl = buildWhatsAppUrl(
                    whatsAppInvitationId === invitation.id ? currentTicket?.phone || '' : '',
                    personalizeWhatsAppMessage(whatsAppMessage, currentTicket?.name || ''),
                    recipientInvitationUrl,
                  );
                  const personalizedTicket = personalizedTickets[invitation.id];
                  const personalizedTicketUrl = personalizedTicket ? buildTicketUrl(personalizedTicket.token) : '';
                  const personalizedInvitationUrl = personalizedTicket
                    ? `${invitationUrl}?ticket=${encodeURIComponent(personalizedTicket.token)}`
                    : '';
                  const personalizedWhatsAppUrl = personalizedTicket
                    ? buildWhatsAppUrl(
                      personalizedTicket.phone,
                      personalizeWhatsAppMessage(`Kami mengundang Anda ke acara ${invitation.title}.`, personalizedTicket.name),
                      personalizedInvitationUrl,
                    )
                    : '';
                  return (
                    <article className="account-invitation-card" key={invitation.id}>
                      <div><span className={`status-label status-${invitation.status}`}>{invitation.status}</span><h3>{invitation.title}</h3><p>{user.is_test_account ? 'Business · aktif selamanya' : `${plan?.name || invitation.plan_id} · aktif sampai ${displayDate(invitation.active_until)}`}</p><p className="invitation-link-label">{active ? `${window.location.origin}/i/${invitation.slug}` : 'Link share terbuka setelah pembayaran dan publish.'}</p>{invitation.status === 'published' ? <p className="invitation-link-label">Dashboard RSVP: {createOwnerGuestbookUrl(invitation.slug)}</p> : null}</div>
                      <div className="account-card-actions">
                        <button className="secondary-btn" onClick={() => setPreviewInvitation(invitation)}>Preview</button>
                        <button className="secondary-btn" onClick={() => openGuestbook(invitation)}>RSVP & Buku Tamu</button>
                        {user.role === 'user' ? <button className="secondary-btn" onClick={() => editInvitation(invitation)}>Edit</button> : null}
                        {user.role === 'user' && active && invitation.status !== 'published' ? <button className="primary-btn" onClick={() => publishInvitation(invitation)}>Publish</button> : null}
                        {user.role === 'user' && active && invitation.status === 'published' ? <button className="secondary-btn" onClick={() => { setWhatsAppInvitationId(invitation.id); setShareDialogInvitationId(invitation.id); setShareDialogType('whatsapp'); setWhatsAppSendMode('choice'); setWhatsAppPhone(''); setWhatsAppName(''); setWhatsAppRecipients(''); setWhatsAppQueue([]); setWhatsAppQueueIndex(0); setWhatsAppMessage(`${WHATSAPP_GREETING_PREFIX}Kami mengundang Anda ke acara ${invitation.title}.`); setError(''); setMessage(''); }}>Kirim via WhatsApp</button> : null}
                        {user.role === 'user' && !active ? <>
                          <label className="payment-method-select">Paket aktivasi<select value={activationPlan?.id || ''} onChange={(event) => setActivationPlanSelections((current) => ({ ...current, [invitation.id]: event.target.value }))}>{billing.plans.filter((item) => item.enabled !== false).map((item) => <option key={item.id} value={item.id}>{item.name} · Rp {Number(item.price).toLocaleString('id-ID')} · {item.duration_days} hari</option>)}</select></label>
                          <label className="payment-method-select">Metode<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}>{billing.payment_methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
                          {selectedPaymentMethod?.provider === 'mayar' ? <label className="payment-method-select">Nomor ponsel untuk invoice Mayar<input type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={paymentMobile} onChange={(event) => setPaymentMobile(event.target.value)} /></label> : null}
                          <button className="primary-btn" disabled={!activationPlan || !paymentMethodId || (selectedPaymentMethod?.provider === 'mayar' && !paymentMobile.trim())} onClick={() => beginPayment(invitation)}>Bayar & aktifkan · Rp {Number(activationPlan?.price || 0).toLocaleString('id-ID')}</button>
                        </> : null}
                        {invitation.status === 'published' ? <a className="secondary-btn invitation-share-button" href={`/i/${invitation.slug}`} target="_blank" rel="noreferrer">Buka link ↗</a> : null}
                        {user.role === 'user' && invitation.status === 'published' ? <>
                          <button className="secondary-btn" type="button" onClick={() => copyInvitationLink(invitation, '#rsvp')}>Salin link dashboard RSVP</button>
                          <button className="secondary-btn" type="button" onClick={() => { setShareDialogInvitationId(invitation.id); setShareDialogType('invitation'); }}>Bagikan undangan</button>
                        </> : null}
                        {shareDialogInvitationId === invitation.id ? (
                          shareDialogType === 'invitation' ? (
                          <div className="invitation-share-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShareDialogInvitationId(null); }}>
                            <section className="invitation-share-modal" role="dialog" aria-modal="true" aria-labelledby={`share-dialog-title-${invitation.id}`}>
                              <button className="invitation-share-modal-close" type="button" aria-label="Tutup" onClick={() => { setShareDialogInvitationId(null); setWhatsAppInvitationId(null); }}>×</button>
                              <h3 id={`share-dialog-title-${invitation.id}`}>Bagikan undangan</h3>
                              <div className="personalized-invitation-share">
                            <label>
                              Nama calon tamu
                              <input
                                value={recipientNames[invitation.id] || ''}
                                onChange={(event) => {
                                  setRecipientNames((current) => ({ ...current, [invitation.id]: event.target.value }));
                                  setPersonalizedTickets((current) => {
                                    const next = { ...current };
                                    delete next[invitation.id];
                                    return next;
                                  });
                                }}
                                placeholder="Contoh: Bapak Andi sekeluarga"
                              />
                            </label>
                            <label>
                              Nomor WhatsApp calon tamu
                              <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={recipientPhones[invitation.id] || ''}
                                onChange={(event) => {
                                  setRecipientPhones((current) => ({ ...current, [invitation.id]: event.target.value }));
                                  setPersonalizedTickets((current) => {
                                    const next = { ...current };
                                    delete next[invitation.id];
                                    return next;
                                  });
                                }}
                                placeholder="08xxxxxxxxxx"
                              />
                            </label>
                            {personalizedTicket ? (
                              <div className="personalized-ticket-card">
                                <QRCodeSVG
                                  value={personalizedTicketUrl}
                                  size={240}
                                  level="M"
                                  title={`Tiket QR buku tamu untuk ${personalizedTicket.name}`}
                                />
                                <span>QR unik untuk {personalizedTicket.name}</span>
                                <a className="secondary-btn" href={personalizedTicketUrl} target="_blank" rel="noopener noreferrer">Lihat / cetak QR tamu</a>
                                <a className="primary-btn" href={personalizedWhatsAppUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!personalizedWhatsAppUrl}>Buka WhatsApp berisi undangan + QR</a>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={preparingPersonalizedTicketId === invitation.id}
                                onClick={() => preparePersonalizedInvitation(invitation)}
                              >
                                {preparingPersonalizedTicketId === invitation.id ? 'Membuat tiket QR…' : 'Buat QR & siapkan WhatsApp'}
                              </button>
                            )}
                            <p className="form-hint">Tiket QR dibuat khusus untuk nama dan nomor ini. Link undangan dan barcode unik langsung disertakan dalam pesan WhatsApp.</p>
                            <button className="secondary-btn" type="button" onClick={() => shareInvitation(invitation)}>Bagikan link undangan</button>
                              </div>
                            </section>
                          </div>
                          ) : null
                        ) : null}
                        <div className="invitation-owner-qr">
                          <button
                            className="secondary-btn"
                            type="button"
                            aria-expanded={qrInvitationId === invitation.id}
                            onClick={() => setQrInvitationId((current) => current === invitation.id ? '' : invitation.id)}
                          >
                            {qrInvitationId === invitation.id ? 'Tutup QR buku tamu' : 'QR buku tamu'}
                          </button>
                          {qrInvitationId === invitation.id ? (
                            <div className="invitation-owner-qr-panel">
                              <QRCodeSVG
                                value={createOwnerGuestbookUrl(invitation.slug)}
                                size={180}
                                level="H"
                                title={`QR pemilik buku tamu ${invitation.title}`}
                              />
                              <strong>{invitation.title}</strong>
                              <span>Scan untuk masuk ke dashboard pemilik dan membuka buku tamu.</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {whatsAppInvitationId === invitation.id ? (
                        <div className="invitation-share-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setWhatsAppInvitationId(null); setShareDialogInvitationId(null); } }}>
                          <section className="invitation-share-modal" role="dialog" aria-modal="true" aria-labelledby={`share-dialog-title-${invitation.id}`}>
                            <button className="invitation-share-modal-close" type="button" aria-label="Tutup" onClick={() => { setWhatsAppInvitationId(null); setShareDialogInvitationId(null); }}>×</button>
                            <div className="invitation-whatsapp-form">
                        <h3 id={`share-dialog-title-${invitation.id}`}>{whatsAppSendMode === 'choice' ? 'Pilih cara mengirim undangan' : whatsAppSendMode === 'bulk' ? 'Kirim undangan secara bulk' : 'Kirim WhatsApp ke satu penerima'}</h3>
                        {whatsAppSendMode === 'choice' ? <div className="whatsapp-send-mode-options">
                          <p>Pilih cara mengirim undangan ke tamu:</p>
                          <button type="button" className="secondary-btn" onClick={() => { setWhatsAppSendMode('single'); setWhatsAppQueue([]); setWhatsAppQueueIndex(0); }}>1. Kirim ke satu orang</button>
                          {supportsBulkUpload ? <button type="button" className="secondary-btn" onClick={() => { setWhatsAppSendMode('bulk'); setWhatsAppQueue([]); setWhatsAppQueueIndex(0); }}>2. Kirim bulk · upload daftar tamu</button> : <p className="form-hint">Bulk upload tersedia pada paket Premium dan Business.</p>}
                          <button type="button" className="secondary-btn" onClick={() => { setWhatsAppInvitationId(null); setShareDialogInvitationId(null); }}>Tutup</button>
                        </div> : <>
                        {whatsAppSendMode === 'single' || isSingleRecipientPlan ? <><label>Nama penerima undangan<input type="text" autoComplete="name" value={whatsAppName} onChange={(event) => { setWhatsAppName(event.target.value); setWhatsAppQueue([]); }} placeholder="Nama penerima" /></label><label>Nomor WhatsApp penerima <span>Gunakan nomor Indonesia seperti 081234567890.</span><input type="tel" inputMode="tel" autoComplete="tel" value={whatsAppPhone} onChange={(event) => { setWhatsAppPhone(event.target.value); setWhatsAppQueue([]); }} placeholder="08xxxxxxxxxx" /></label></> : <div className="whatsapp-recipient-import">
                          <div><button type="button" className="whatsapp-template-download" onClick={downloadRecipientTemplate}>Download template .xlsx</button><span>Isi kolom nomor_hp dan nama_penerima untuk tiap tamu.</span></div>
                          <label>Upload daftar nomor (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importWhatsAppRecipients} disabled={isImportingRecipients} /></label>
                          {isImportingRecipients ? <span className="form-hint">Memproses file…</span> : null}
                          <label>Daftar penerima <span>Maks. {maxRecipients} penerima per permintaan. Satu penerima per baris dengan format nomor_hp | nama_penerima.</span><textarea rows={4} value={whatsAppRecipients} onChange={(event) => { setWhatsAppRecipients(event.target.value); setWhatsAppQueue([]); setWhatsAppQueueIndex(0); }} placeholder={'081234567890 | Andi\n081298765432 | Siti'} /></label>
                          {whatsAppQueue.length ? <p className="form-hint">{whatsAppQueue.length} nomor siap di antrean.</p> : null}
                        </div>}
                        <label>Pesan <span>Sapaan Yth. {'{{nama}}'}, tidak dapat dihapus. Tulis isi undangan setelah sapaan.</span><div className="whatsapp-message-editor"><div className="whatsapp-message-greeting" aria-hidden="true">Yth. {'{{nama}}'},</div><textarea aria-label="Isi pesan undangan" rows={3} maxLength={1000 - WHATSAPP_GREETING_PREFIX.length} value={whatsAppMessage.startsWith(WHATSAPP_GREETING_PREFIX) ? whatsAppMessage.slice(WHATSAPP_GREETING_PREFIX.length) : ''} onChange={(event) => setWhatsAppMessage(`${WHATSAPP_GREETING_PREFIX}${event.target.value}`)} /></div></label>
                        <p className="form-hint">Setiap penerima mendapatkan tautan undangan dan tiket barcode unik. Panitia dapat memindai tiket untuk mencatat kehadiran. Setelah mengirim pesan di WhatsApp, kembali ke dashboard dan konfirmasi untuk membuka chat berikutnya.</p>
                        <div className="whatsapp-bulk-actions">
                          {supportsBulkUpload && whatsAppSendMode !== 'single' ? <>
                            {whatsAppRecipients.trim() && !whatsAppQueue.length ? <button type="button" className="secondary-btn" disabled={isPreparingTickets} onClick={() => prepareWhatsAppQueue(invitation.id)}>{isPreparingTickets ? 'Membuat tiket…' : 'Buat tiket & siapkan antrean'}</button> : null}
                            {whatsAppQueue.length ? <><span>Penerima {whatsAppQueueIndex + 1} dari {whatsAppQueue.length} · {whatsAppQueue[whatsAppQueueIndex]?.name}</span><a className={`primary-btn ${!whatsAppUrl ? 'is-disabled' : ''}`} href={whatsAppUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!whatsAppUrl}>Buka chat WhatsApp</a>{whatsAppQueueIndex < whatsAppQueue.length - 1 ? <button type="button" className="secondary-btn" onClick={() => setWhatsAppQueueIndex((index) => index + 1)}>Sudah terkirim, lanjut</button> : <span>Antrean selesai. Pastikan pesan untuk penerima terakhir sudah dikirim.</span>}</> : null}
                          </> : <>
                            {!whatsAppQueue.length && whatsAppName.trim() && normalizeWhatsAppPhone(whatsAppPhone) ? <button type="button" className="primary-btn" disabled={isPreparingTickets} onClick={() => prepareBasicWhatsAppTicket(invitation.id)}>{isPreparingTickets ? 'Membuat QR & membuka WhatsApp…' : 'Kirim WhatsApp'}</button> : null}
                            {whatsAppQueue.length ? <><span>Tiket unik untuk {currentTicket?.name}</span><a className={`primary-btn ${!whatsAppUrl ? 'is-disabled' : ''}`} href={whatsAppUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!whatsAppUrl}>Buka WhatsApp</a></> : null}
                          </>}
                          <button type="button" className="secondary-btn" onClick={() => { setWhatsAppSendMode('choice'); setWhatsAppQueue([]); setWhatsAppQueueIndex(0); setError(''); }}>Ganti cara kirim</button>
                          <button type="button" className="secondary-btn" onClick={() => { setWhatsAppInvitationId(null); setShareDialogInvitationId(null); }}>Tutup</button>
                        </div>
                        </>}
                            </div>
                          </section>
                          </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          {user.role === 'user' ? (
            <section className="account-panel buyer-usage-guide buyer-guide-view" id="buyer-guide" hidden={!showBuyerGuide}>
              <div className="account-panel-heading">
                <div><span className="eyebrow">Panduan singkat</span><h2>Cara menggunakan undangan</h2></div>
              </div>
              <p className="form-hint">Ikuti langkah berikut untuk menyiapkan undangan dan membagikannya kepada tamu.</p>
              <ol>
                <li><strong>Pilih acara dan template.</strong><span>Tentukan jenis acara dan pilih desain yang sesuai. Formulir akan menyesuaikan dengan acara Anda.</span></li>
                <li><strong>Lengkapi detail undangan.</strong><span>Isi nama, waktu, lokasi, peta, foto, dan informasi lain yang ingin dibagikan kepada tamu.</span></li>
                <li><strong>Simpan lalu periksa preview.</strong><span>Simpan rancangan sebagai draft, kemudian gunakan tombol Preview untuk memastikan semua informasi sudah benar.</span></li>
                <li><strong>Aktifkan dan publikasikan.</strong><span>Selesaikan pembayaran paket bila diperlukan, lalu pilih Publish agar tautan undangan dapat dibuka oleh tamu.</span></li>
                <li><strong>Bagikan dan pantau tamu.</strong><span>Kirim tautan undangan melalui WhatsApp. Buka RSVP & Buku Tamu untuk membaca konfirmasi kehadiran atau memindai tiket barcode saat acara.</span></li>
              </ol>
              <button type="button" className="secondary-btn" onClick={() => setBuyerMenu('invitations')}>Mulai kelola undangan</button>
            </section>
          ) : null}

          {(user.role === 'user' && buyerMenu === 'scan') || (user.role !== 'user' && guestbookInvitation) ? (
            <section className="account-panel guestbook-management-panel buyer-scan-view">
              <div className="account-panel-heading">
                <div>
                  <span className="eyebrow">Tamu undangan</span>
                  <h2>Scan QR & buku tamu</h2>
                  {guestbookInvitation ? <p>{guestbookInvitation.title}</p> : null}
                </div>
                {guestbookInvitation ? <button className="text-button" onClick={() => setGuestbookInvitation(null)}>Tutup buku tamu</button> : null}
              </div>
              {user.role === 'user' ? (
                <label className="scan-invitation-select">
                  Pilih undangan yang akan dipindai
                  <select
                    value={guestbookInvitation?.id || ''}
                    onChange={(event) => {
                      const invitation = checkInInvitations.find((item) => item.id === event.target.value);
                      if (invitation) openGuestbook(invitation);
                      else {
                        setGuestbookInvitation(null);
                        setOwnerGuestbook([]);
                        setTicketScanStatus('');
                      }
                    }}
                  >
                    <option value="">Pilih undangan aktif</option>
                    {checkInInvitations.map((invitation) => <option key={invitation.id} value={invitation.id}>{invitation.title}</option>)}
                  </select>
                  {!checkInInvitations.length ? (
                    <span>Belum ada undangan aktif yang dapat dipindai. Aktifkan dan publikasikan undangan terlebih dahulu.</span>
                  ) : null}
                </label>
              ) : null}
              {guestbookInvitation ? (
                <>
                <div className="account-card-actions guestbook-export-actions">
                  <button className="secondary-btn" type="button" onClick={() => copyInvitationLink(guestbookInvitation, '#rsvp')}>Salin link dashboard RSVP</button>
                  <button className="secondary-btn" type="button" onClick={() => exportGuestbook(ownerGuestbook, `rsvp-${guestbookInvitation.slug}.xlsx`, invitationTickets)} disabled={!ownerGuestbook.length && !invitationTickets.length}>Unduh RSVP .xlsx</button>
                </div>
                <div className="guestbook-summary">
                    <strong>{ownerGuestbook.filter((entry) => entry.source !== 'barcode_check_in' && entry.attendance === 'attending').length}</strong><span>akan hadir</span>
                    <strong>{invitationTickets.filter((ticket) => ticket.checked_in_at).length}</strong><span>check-in barcode</span>
                    <strong>{ownerGuestbook.filter((entry) => entry.source !== 'barcode_check_in').length}</strong><span>total RSVP</span>
                  </div>
                  <div className="guestbook-checkin">
                    <h3>Scan tiket QR tamu</h3>
                    <p>Pilih undangan di atas, lalu arahkan kamera ke QR tiket tamu untuk mencatat check-in. Tiket terhubung langsung ke buku tamu undangan ini dan tidak dapat digunakan dua kali.</p>
                    {ticketScanStatus ? <p className="guestbook-scan-result" role="status">{ticketScanStatus}</p> : null}
                    <GuestbookScanner onScan={handleTicketScan} autoStart={user.role === 'user' && checkInInvitations.length === 1} />
                  </div>
                  <section className="invitation-recipient-roster">
                    <h3>Daftar tamu undangan</h3>
                    <p className="form-hint">Semua tamu yang sudah dibuatkan tiket undangan. Konfirmasi hadir dan keterangan check-in hanya terisi setelah tiket dipindai.</p>
                    {invitationTickets.length ? <div className="invitation-recipient-table-wrap"><table className="invitation-recipient-table">
                      <thead><tr><th>Nama tamu</th><th>Nomor WhatsApp</th><th>Konfirmasi kehadiran</th><th>Keterangan</th><th>Waktu check-in</th></tr></thead>
                      <tbody>{invitationTickets.map((ticket) => <tr key={ticket.id}>
                        <td>{ticket.name}</td>
                        <td>{ticket.phone}</td>
                        <td>{ticket.checked_in_at ? 'Hadir' : ''}</td>
                        <td>{ticket.checked_in_at ? 'Check-in kehadiran melalui barcode undangan.' : ''}</td>
                        <td>{ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString('id-ID') : ''}</td>
                      </tr>)}</tbody>
                    </table></div> : <p className="form-hint">Belum ada tiket tamu yang dibuat untuk undangan ini.</p>}
                  </section>
                  <div className="owner-guestbook-list">
                    {ownerGuestbook.filter((entry) => entry.source !== 'barcode_check_in').length ? ownerGuestbook.filter((entry) => entry.source !== 'barcode_check_in').map((entry) => (
                      <article key={entry.id} className={entry.status === 'hidden' ? 'is-hidden' : ''}>
                        <div>
                          <strong>{entry.name}</strong>
                          <span>{`${entry.attendance} · ${entry.guests} tamu`}</span>
                          <p>{entry.message}</p>
                        </div>
                        {user.role === 'user' ? (
                          <div>
                            <button onClick={() => moderateGuestbook(entry, entry.status === 'visible' ? 'hidden' : 'visible')}>{entry.status === 'visible' ? 'Sembunyikan' : 'Tampilkan'}</button>
                            <button className="danger-text" onClick={() => removeGuestbook(entry)}>Hapus</button>
                          </div>
                        ) : null}
                      </article>
                    )) : <p className="form-hint">Belum ada RSVP atau ucapan untuk undangan ini.</p>}
                  </div>
                </>
              ) : user.role === 'user' ? (
                <p className="form-hint">Pilih salah satu undangan aktif untuk menampilkan RSVP, buku tamu, dan pemindai QR.</p>
              ) : null}
            </section>
          ) : null}

          {previewInvitation ? (
            <section className="account-panel invitation-preview-panel buyer-invitations-view" hidden={!showBuyerInvitations}>
              <div className="account-panel-heading"><div><span className="eyebrow">Preview untuk calon undangan</span><h2>{previewInvitation.title}</h2></div><button className="text-button" onClick={() => setPreviewInvitation(null)}>Tutup preview</button></div>
              <div className="invitation-preview-viewport"><PublicInvitation invitation={previewInvitation} slug={previewInvitation.slug} /></div>
            </section>
          ) : null}
        </section>
        {user.role === 'user' ? <aside className="account-side-column buyer-dashboard-view" hidden={!showBuyerDashboard}><section className="account-panel"><span className="eyebrow">{user.is_test_account ? 'Akses akun tester' : user.is_demo ? 'Akun demo' : 'Pilihan paket'}</span><h2>{user.is_test_account ? 'Semua fitur, tanpa batas waktu.' : user.is_demo ? `Paket ${user.demo_plan_id} · akses sementara.` : 'Waktu tayang dan link mengikuti paket.'}</h2>{user.is_test_account ? <div className="account-plan-row"><strong>Business · QA</strong><span>Selamanya</span><small>Undangan tanpa batas · semua fitur aktif · tanpa pembayaran</small><b>AKTIF</b></div> : (user.is_demo ? billing.plans.filter((plan) => plan.id === user.demo_plan_id) : billing.plans).map((plan) => <div className="account-plan-row" key={plan.id}><strong>{plan.name}</strong><span>{plan.duration_days} hari</span><small>{plan.id === 'basic' ? 'Link otomatis' : 'Link otomatis · bisa diedit'} · maks. {plan.max_invitations || 1} undangan</small><b>{user.is_demo ? 'DEMO' : `Rp ${Number(plan.price).toLocaleString('id-ID')}`}</b></div>)}</section>{user.is_test_account || user.is_demo ? null : <p className="account-secure-note">Pembayaran gateway divalidasi server. Undangan tidak bisa dibagikan sebelum pembayaran terkonfirmasi.</p>}</aside> : null}
      </div>
    </main>
  );
}
