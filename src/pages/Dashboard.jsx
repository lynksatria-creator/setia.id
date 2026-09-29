import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { billingApi, invitationsApi, paymentsApi } from '../lib/api';

const emptyForm = {
  title: '',
  plan_id: 'basic',
  slug: '',
  couple_names: '',
  event_date: '',
  event_time: '',
  venue: '',
  address: '',
  maps_url: '',
  story: '',
  opening_text: '',
  music_url: '',
  gallery: '',
};

const displayDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Belum aktif';

export default function Dashboard({ onSignIn }) {
  const { user, token, isChecking, logout } = useAuth();
  const [billing, setBilling] = useState({ plans: [], payment_methods: [] });
  const [invitations, setInvitations] = useState([]);
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
    setForm({ ...emptyForm, plan_id: billing.plans[0]?.id || 'basic' });
  };

  const editInvitation = (invitation) => {
    const content = invitation.content || {};
    setEditingId(invitation.id);
    setForm({
      ...emptyForm,
      title: invitation.title || '',
      plan_id: invitation.plan_id,
      slug: invitation.slug || '',
      couple_names: content.couple_names || '',
      event_date: content.event_date || '',
      event_time: content.event_time || '',
      venue: content.venue || '',
      address: content.address || '',
      maps_url: content.maps_url || '',
      story: content.story || '',
      opening_text: content.opening_text || '',
      music_url: content.music_url || '',
      gallery: Array.isArray(content.gallery) ? content.gallery.join('\n') : '',
    });
    setError('');
    setMessage('Mode edit aktif. Simpan untuk menerapkan perubahan.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveInvitation = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);
    const content = {
      couple_names: form.couple_names,
      event_date: form.event_date,
      event_time: form.event_time,
      venue: form.venue,
      address: form.address,
      maps_url: form.maps_url,
      story: form.story,
      opening_text: form.opening_text,
      music_url: form.music_url,
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

          <section className="account-panel invitation-editor-panel">
            <div className="account-panel-heading"><div><span className="eyebrow">{editingId ? 'Edit undangan' : 'Undangan baru'}</span><h2>{editingId ? 'Perbarui detail acara' : 'Mulai dengan detail acara'}</h2></div>{editingId ? <button className="text-button" onClick={resetForm}>Buat draft baru</button> : null}</div>
            <form className="invitation-editor-form" onSubmit={saveInvitation}>
              <label>Nama acara<input value={form.title} onChange={(event) => updateField('title', event.target.value)} required maxLength={120} placeholder="Pernikahan Aulia & Farhan" /></label>
              <label>Paket<select value={form.plan_id} disabled={Boolean(editingId)} onChange={(event) => updateField('plan_id', event.target.value)}>{billing.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · Rp {Number(plan.price).toLocaleString('id-ID')} · {plan.duration_days} hari</option>)}</select></label>
              {selectedPlan?.slug_mode === 'custom' ? <label>Link pilihan<input value={form.slug} onChange={(event) => updateField('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required minLength={3} maxLength={64} placeholder="aulia-farhan" /><small>URL publik: {window.location.host}/i/{form.slug || 'link-pilihan'}</small></label> : <p className="form-hint">Paket Basic memakai link otomatis setelah draft dibuat.</p>}
              <label>Nama pasangan<input value={form.couple_names} onChange={(event) => updateField('couple_names', event.target.value)} placeholder="Aulia & Farhan" /></label>
              <div className="account-form-row"><label>Tanggal acara<input type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} /></label><label>Waktu acara<input type="time" value={form.event_time} onChange={(event) => updateField('event_time', event.target.value)} /></label></div>
              <label>Nama venue<input value={form.venue} onChange={(event) => updateField('venue', event.target.value)} placeholder="The Glass House" /></label>
              <label>Alamat<textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} rows={2} /></label>
              <label>Link Google Maps<input type="url" value={form.maps_url} onChange={(event) => updateField('maps_url', event.target.value)} placeholder="https://maps.google.com/..." /></label>
              <label>Salam pembuka<textarea value={form.opening_text} onChange={(event) => updateField('opening_text', event.target.value)} rows={2} placeholder="Dengan penuh sukacita kami mengundang..." /></label>
              <label>Cerita acara<textarea value={form.story} onChange={(event) => updateField('story', event.target.value)} rows={4} /></label>
              <label>Link musik<input type="url" value={form.music_url} onChange={(event) => updateField('music_url', event.target.value)} /></label>
              <label>Link galeri, satu URL per baris<textarea value={form.gallery} onChange={(event) => updateField('gallery', event.target.value)} rows={3} /></label>
              <button className="primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan…' : editingId ? 'Simpan semua perubahan' : 'Simpan draft'}</button>
            </form>
          </section>

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
        </section>
        <aside className="account-side-column"><section className="account-panel"><span className="eyebrow">Pilihan paket</span><h2>Waktu tayang dan link mengikuti paket.</h2>{billing.plans.map((plan) => <div className="account-plan-row" key={plan.id}><strong>{plan.name}</strong><span>{plan.duration_days} hari</span><small>{plan.slug_mode === 'custom' ? 'Link pilihan' : 'Link otomatis'} · maks. {plan.max_invitations || 1} undangan</small><b>Rp {Number(plan.price).toLocaleString('id-ID')}</b></div>)}</section><p className="account-secure-note">Pembayaran gateway divalidasi server. Undangan tidak bisa dibagikan sebelum pembayaran terkonfirmasi.</p></aside>
      </div>
    </main>
  );
}
