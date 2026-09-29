import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

const ADMIN_SESSION_KEY = 'undangan.id.admin.session';
const dateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminBilling() {
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [contentText, setContentText] = useState('');
  const [activeUntil, setActiveUntil] = useState('');
  const [activeTab, setActiveTab] = useState('billing');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboard = async (authToken) => {
    setIsLoading(true);
    setError('');
    try {
      const [nextConfig, nextInvitations, nextPayments] = await Promise.all([
        adminApi.billingConfig(authToken),
        adminApi.invitations(authToken),
        adminApi.payments(authToken),
      ]);
      setConfig(nextConfig);
      setInvitations(nextInvitations);
      setPayments(nextPayments);
    } catch (requestError) {
      setError(requestError.message);
      if (/sesi admin/i.test(requestError.message)) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadDashboard(token);
  }, [token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await adminApi.login({ email, password });
      sessionStorage.setItem(ADMIN_SESSION_KEY, result.access_token);
      setToken(result.access_token);
      setPassword('');
    } catch (requestError) {
      setError(requestError.message);
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setToken(null);
    setConfig(null);
    setInvitations([]);
    setPayments([]);
  };

  const updatePlan = (planId, field, value) => {
    setConfig((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === planId ? { ...plan, [field]: value } : plan),
    }));
  };

  const updateMethod = (methodId, field, value) => {
    setConfig((current) => ({
      ...current,
      payment_methods: current.payment_methods.map((method) => method.id === methodId
        ? { ...method, [field]: value, ...(field === 'provider' && value === 'midtrans' && !method.payment_code ? { payment_code: 'gopay' } : {}) }
        : method),
    }));
  };

  const addManualMethod = () => {
    const id = `manual-${Date.now().toString(36)}`;
    setConfig((current) => ({
      ...current,
      payment_methods: [...current.payment_methods, {
        id,
        name: 'Transfer bank baru',
        provider: 'manual',
        payment_code: null,
        enabled: true,
        bank_name: '',
        account_name: '',
        account_number: '',
        instructions: 'Transfer sesuai nominal, lalu kirim referensi transfer.',
      }],
    }));
  };

  const saveBilling = async () => {
    setError('');
    setMessage('');
    try {
      const saved = await adminApi.updateBillingConfig(token, {
        plans: config.plans,
        payment_methods: config.payment_methods,
      });
      setConfig(saved);
      setMessage('Harga, masa aktif, link paket, dan metode pembayaran tersimpan.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const reviewInvitation = (invitation) => {
    setSelectedInvitation(invitation);
    setContentText(JSON.stringify(invitation.content || {}, null, 2));
    setActiveUntil(dateTimeLocal(invitation.active_until));
    setError('');
    setMessage('');
  };

  const saveInvitation = async () => {
    if (!selectedInvitation) return;
    setError('');
    try {
      const content = JSON.parse(contentText);
      await adminApi.updateInvitation(token, selectedInvitation.id, {
        title: selectedInvitation.title,
        slug: selectedInvitation.slug,
        content,
        plan_id: selectedInvitation.plan_id,
      });
      const activeUntilIso = activeUntil ? new Date(activeUntil).toISOString() : null;
      await adminApi.updateActivation(token, selectedInvitation.id, {
        status: selectedInvitation.status,
        active_until: activeUntilIso,
      });
      await loadDashboard(token);
      setMessage('Konten lengkap dan masa aktif undangan tersimpan.');
    } catch (requestError) {
      setError(requestError instanceof SyntaxError ? 'Konten harus berupa JSON yang valid.' : requestError.message);
    }
  };

  const approvePayment = async (payment) => {
    setError('');
    try {
      await adminApi.approvePayment(token, payment.id);
      await loadDashboard(token);
      setMessage(`Pembayaran ${payment.order_id} disetujui dan masa aktif diperbarui.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!token) {
    return (
      <main className="billing-admin-login">
        <a className="brand" href="/undangan"><span className="logo-mark">U</span>Undangan.id</a>
        <form className="billing-admin-login-card" onSubmit={handleLogin}>
          <p className="eyebrow">Panel khusus</p><h1>Admin Undangan.id</h1>
          <p>Login menggunakan akun admin yang dikonfigurasi di backend.</p>
          <label>Email admin<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Kata sandi<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-btn" disabled={isLoading}>{isLoading ? 'Memeriksa…' : 'Masuk ke panel'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="billing-admin-shell">
      <header className="billing-admin-header"><a className="brand" href="/undangan"><span className="logo-mark">U</span>Undangan.id <small>ADMIN</small></a><div><span>{config?.gateway_ready ? 'Midtrans siap' : 'Midtrans belum dikonfigurasi'}</span><button onClick={() => loadDashboard(token)}>Muat ulang</button><button onClick={logout}>Keluar</button></div></header>
      <div className="billing-admin-layout">
        <aside className="billing-admin-sidebar"><p className="eyebrow">Pengelolaan</p><button className={activeTab === 'billing' ? 'active' : ''} onClick={() => setActiveTab('billing')}>Paket & pembayaran</button><button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>Verifikasi pembayaran <span>{payments.filter((payment) => payment.status === 'pending' && payment.provider === 'manual').length}</span></button><button className={activeTab === 'invitations' ? 'active' : ''} onClick={() => setActiveTab('invitations')}>Undangan aktif <span>{invitations.length}</span></button></aside>
        <section className="billing-admin-content">
          <div className="billing-admin-title"><div><p className="eyebrow">Admin workspace</p><h1>{activeTab === 'billing' ? 'Paket & metode pembayaran' : activeTab === 'payments' ? 'Verifikasi pembayaran' : 'Undangan pengguna'}</h1></div></div>
          {message ? <p className="account-message" role="status">{message}</p> : null}
          {error ? <p className="form-error account-error" role="alert">{error}</p> : null}
          {isLoading && !config ? <p>Memuat data admin…</p> : null}

          {activeTab === 'billing' && config ? (
            <>
              <section className="account-panel admin-config-panel"><div className="account-panel-heading"><div><span className="eyebrow">Hak akses dan waktu tayang</span><h2>Konfigurasi paket</h2></div><span className="gateway-state">{config.gateway_ready ? 'Server key tersedia' : 'Isi MIDTRANS_SERVER_KEY di backend/.env'}</span></div>
                <div className="billing-plan-list">{config.plans.map((plan) => <article className="billing-plan-editor" key={plan.id}>
                  <div className="billing-plan-heading"><strong>{plan.name}</strong><label className="toggle-label"><input type="checkbox" checked={plan.enabled} onChange={(event) => updatePlan(plan.id, 'enabled', event.target.checked)} />Aktif</label></div>
                  <div className="billing-plan-fields"><label>Nama<input value={plan.name} onChange={(event) => updatePlan(plan.id, 'name', event.target.value)} /></label><label>Harga (Rp)<input type="number" min="1" value={plan.price} onChange={(event) => updatePlan(plan.id, 'price', Number(event.target.value))} /></label><label>Masa aktif (hari)<input type="number" min="1" max="3650" value={plan.duration_days} onChange={(event) => updatePlan(plan.id, 'duration_days', Number(event.target.value))} /></label><label>Maks. undangan<input type="number" min="1" max="1000" value={plan.max_invitations || 1} onChange={(event) => updatePlan(plan.id, 'max_invitations', Number(event.target.value))} /></label><label>Jenis link<select value={plan.slug_mode} onChange={(event) => updatePlan(plan.id, 'slug_mode', event.target.value)}><option value="generated">Otomatis</option><option value="custom">Pilihan pemilik</option></select></label></div>
                  <label>Fitur paket, satu baris per fitur<textarea rows={3} value={(plan.features || []).join('\n')} onChange={(event) => updatePlan(plan.id, 'features', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} /></label>
                </article>)}</div>
              </section>
              <section className="account-panel admin-config-panel"><div className="account-panel-heading"><div><span className="eyebrow">Gateway dan pembayaran manual</span><h2>Metode pembayaran</h2></div><button className="secondary-btn" onClick={addManualMethod}>Tambah rekening / metode</button></div>
                <div className="billing-method-list">{config.payment_methods.map((method) => <article className="billing-method-editor" key={method.id}>
                  <div className="billing-plan-heading"><label>Nama metode<input value={method.name} onChange={(event) => updateMethod(method.id, 'name', event.target.value)} /></label><label className="toggle-label"><input type="checkbox" checked={method.enabled} onChange={(event) => updateMethod(method.id, 'enabled', event.target.checked)} />Tersedia</label></div>
                  <div className="billing-plan-fields"><label>Jenis<select value={method.provider} onChange={(event) => updateMethod(method.id, 'provider', event.target.value)}><option value="midtrans">Midtrans checkout</option><option value="manual">Manual / transfer</option></select></label>{method.provider === 'midtrans' ? <label>Metode gateway<select value={method.payment_code || 'gopay'} onChange={(event) => updateMethod(method.id, 'payment_code', event.target.value)}><option value="gopay">GoPay</option><option value="qris">QRIS</option><option value="bank_transfer">Virtual account</option></select></label> : <><label>Bank / penyedia<input value={method.bank_name || ''} onChange={(event) => updateMethod(method.id, 'bank_name', event.target.value)} /></label><label>Nama pemilik<input value={method.account_name || ''} onChange={(event) => updateMethod(method.id, 'account_name', event.target.value)} /></label><label>Nomor rekening / tujuan<input value={method.account_number || ''} onChange={(event) => updateMethod(method.id, 'account_number', event.target.value)} /></label></>}</div>
                  {method.provider === 'manual' ? <label>Instruksi transfer<textarea rows={2} value={method.instructions || ''} onChange={(event) => updateMethod(method.id, 'instructions', event.target.value)} /></label> : <p className="form-hint">Server key Midtrans disimpan di backend/.env dan tidak dikirim ke browser.</p>}
                  <button className="text-button danger-text" onClick={() => setConfig((current) => ({ ...current, payment_methods: current.payment_methods.filter((item) => item.id !== method.id) }))}>Hapus metode</button>
                </article>)}</div>
                <button className="primary-btn" onClick={saveBilling} disabled={!config.payment_methods.length}>Simpan seluruh konfigurasi</button>
              </section>
            </>
          ) : null}

          {activeTab === 'payments' ? <section className="account-panel"><div className="account-panel-heading"><div><span className="eyebrow">Manual settlement</span><h2>Transfer menunggu verifikasi</h2></div></div><div className="admin-record-list">{payments.filter((payment) => payment.provider === 'manual' && payment.status === 'pending').map((payment) => <article className="admin-record" key={payment.id}><div><strong>{payment.order_id}</strong><p>Nominal Rp {Number(payment.amount).toLocaleString('id-ID')} · {payment.payment_method}</p><p>Referensi: {payment.transfer_reference || 'Belum dikirim'}</p><small>Invitation {payment.invitation_id}</small></div><button className="primary-btn" disabled={!payment.transfer_reference} onClick={() => approvePayment(payment)}>Setujui & aktifkan</button></article>)}{!payments.some((payment) => payment.provider === 'manual' && payment.status === 'pending') ? <p className="form-hint">Tidak ada transfer yang menunggu verifikasi.</p> : null}</div></section> : null}

          {activeTab === 'invitations' ? <section className="account-panel"><div className="account-panel-heading"><div><span className="eyebrow">Konten pengguna</span><h2>Semua undangan dan status aktif</h2></div></div><div className="admin-invitation-layout"><div className="admin-record-list">{invitations.map((invitation) => <button className={`admin-invitation-select ${selectedInvitation?.id === invitation.id ? 'selected' : ''}`} key={invitation.id} onClick={() => reviewInvitation(invitation)}><strong>{invitation.title}</strong><span>{invitation.status} · {invitation.slug}</span><small>Aktif sampai {invitation.active_until ? new Date(invitation.active_until).toLocaleString('id-ID') : 'belum aktif'}</small></button>)}{!invitations.length ? <p className="form-hint">Belum ada undangan.</p> : null}</div>
              {selectedInvitation ? <div className="admin-invitation-editor"><label>Judul<input value={selectedInvitation.title} onChange={(event) => setSelectedInvitation({ ...selectedInvitation, title: event.target.value })} /></label><label>Link publik<input value={selectedInvitation.slug} onChange={(event) => setSelectedInvitation({ ...selectedInvitation, slug: event.target.value })} /></label><label>Status<select value={selectedInvitation.status} onChange={(event) => setSelectedInvitation({ ...selectedInvitation, status: event.target.value })}><option value="draft">Draft</option><option value="active">Aktif</option><option value="published">Published</option><option value="expired">Expired</option></select></label><label>Masa aktif sampai<input type="datetime-local" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} /></label><label>Seluruh konten undangan (JSON)<textarea className="admin-content-json" value={contentText} onChange={(event) => setContentText(event.target.value)} rows={18} spellCheck="false" /></label><button className="primary-btn" onClick={saveInvitation}>Simpan edit dan status</button></div> : <p className="form-hint">Pilih undangan untuk mengedit semua konten, link, dan masa aktif.</p>}</div></section> : null}
        </section>
      </div>
    </main>
  );
}
