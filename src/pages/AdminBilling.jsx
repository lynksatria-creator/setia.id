import { useEffect, useState } from 'react';
import SuperAdminNav from '../components/SuperAdminNav';
import { adminApi } from '../lib/api';
import { SUPER_ADMIN_SESSION_KEY } from '../lib/adminSession';

const dateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminBilling({ onLogout }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [affiliateAccounts, setAffiliateAccounts] = useState([]);
  const [createdDemoCredentials, setCreatedDemoCredentials] = useState(null);
  const [demoForm, setDemoForm] = useState({
    full_name: '',
    email: '',
    password: '',
    plan_id: 'business',
    combination_id: '',
    duration_days: 1,
    duration_hours: 0,
  });
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
      const [nextConfig, nextInvitations, nextPayments, nextDemoAccounts, nextAffiliateAccounts] = await Promise.all([
        adminApi.billingConfig(authToken),
        adminApi.invitations(authToken),
        adminApi.payments(authToken),
        adminApi.demoAccounts(authToken),
        adminApi.affiliateAccounts(authToken),
      ]);
      setConfig(nextConfig);
      setInvitations(nextInvitations);
      setPayments(nextPayments);
      setDemoAccounts(nextDemoAccounts);
      setAffiliateAccounts(nextAffiliateAccounts);
      setDemoForm((current) => ({
        ...current,
        combination_id: current.combination_id || nextConfig.affiliate_combinations?.[0]?.id || '',
      }));
    } catch (requestError) {
      setError(requestError.message);
      if (/sesi admin/i.test(requestError.message)) {
        sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
        setToken(null);
        onLogout?.();
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
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, result.access_token);
      setToken(result.access_token);
      setPassword('');
    } catch (requestError) {
      setError(requestError.message);
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    setToken(null);
    setConfig(null);
    setInvitations([]);
    setPayments([]);
    setDemoAccounts([]);
    setAffiliateAccounts([]);
    setCreatedDemoCredentials(null);
    onLogout?.();
  };

  const updatePlan = (planId, field, value) => {
    setConfig((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === planId ? { ...plan, [field]: value } : plan),
    }));
  };

  const updateAffiliateCombination = (combinationId, field, value) => {
    setConfig((current) => ({
      ...current,
      affiliate_combinations: current.affiliate_combinations.map((combination) => combination.id === combinationId
        ? { ...combination, [field]: value }
        : combination),
    }));
  };

  const updateMethod = (methodId, field, value) => {
    setConfig((current) => ({
      ...current,
      payment_methods: current.payment_methods.map((method) => method.id === methodId
        ? { ...method, [field]: value }
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
        dashboard_admin_limit: Number(config.dashboard_admin_limit),
        affiliate_combinations: config.affiliate_combinations,
      });
      setConfig(saved);
      setMessage('Paket, metode pembayaran, batas admin dashboard, dan kuota affiliate tersimpan.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createDemoAccount = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const account = await adminApi.createDemoAccount(token, {
        ...demoForm,
        duration_days: Number(demoForm.duration_days),
        duration_hours: Number(demoForm.duration_hours),
        combination_id: demoForm.plan_id === 'business' ? demoForm.combination_id : null,
      });
      setDemoAccounts((current) => [account, ...current]);
      setCreatedDemoCredentials({ email: account.email, password: demoForm.password });
      setDemoForm((current) => ({
        ...current,
        full_name: '',
        email: '',
        password: '',
      }));
      setMessage(`Akun demo ${account.email} berhasil dibuat. Masa akses berakhir ${new Date(account.demo_until).toLocaleString('id-ID')}. Akun dapat mengirim maksimal 2 undangan.`);
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

  const updateAffiliateAccount = async (affiliate, updates) => {
    setError('');
    try {
      await adminApi.updateAffiliateAccount(token, affiliate.id, updates);
      setAffiliateAccounts(await adminApi.affiliateAccounts(token));
      setMessage(updates.active === false
        ? `Affiliate ${affiliate.full_name} dinonaktifkan. Riwayat undangan dan atribusi penjualan tetap disimpan.`
        : 'Pengaturan iklan affiliate tersimpan.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!token) {
    return (
      <main className="billing-admin-login">
        <a className="brand" href="/setia-creative-admin"><span className="logo-mark">S</span>Super Admin</a>
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
      <header className="billing-admin-header"><a className="brand" href="/setia-creative-admin"><span className="logo-mark">S</span>Super Admin <small>UNDANGAN.ID</small></a><div><span>{config?.gateway_ready ? 'Mayar siap' : 'Mayar belum dikonfigurasi'}</span><button onClick={() => loadDashboard(token)}>Muat ulang</button><a className="super-admin-home-link" href="/setia-creative-admin">Semua panel</a><button onClick={logout}>Keluar</button></div></header>
      <SuperAdminNav />
      <div className="billing-admin-layout">
        <aside className="billing-admin-sidebar"><p className="eyebrow">Pengelolaan</p><button className={activeTab === 'billing' ? 'active' : ''} onClick={() => setActiveTab('billing')}>Paket & pembayaran</button><button className={activeTab === 'demo-accounts' ? 'active' : ''} onClick={() => setActiveTab('demo-accounts')}>Akun demo <span>{demoAccounts.length}</span></button><button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>Verifikasi pembayaran <span>{payments.filter((payment) => payment.status === 'pending' && payment.provider === 'manual').length}</span></button><button className={activeTab === 'invitations' ? 'active' : ''} onClick={() => setActiveTab('invitations')}>Undangan aktif <span>{invitations.length}</span></button><button className={activeTab === 'affiliates' ? 'active' : ''} onClick={() => setActiveTab('affiliates')}>Affiliate & iklan <span>{affiliateAccounts.length}</span></button></aside>
        <section className="billing-admin-content">
          <div className="billing-admin-title"><div><p className="eyebrow">Admin workspace</p><h1>{activeTab === 'billing' ? 'Paket & metode pembayaran' : activeTab === 'demo-accounts' ? 'Akun demo' : activeTab === 'payments' ? 'Verifikasi pembayaran' : activeTab === 'affiliates' ? 'Affiliate & iklan' : 'Undangan pengguna'}</h1></div></div>
          {message ? <p className="account-message" role="status">{message}</p> : null}
          {error ? <p className="form-error account-error" role="alert">{error}</p> : null}
          {isLoading && !config ? <p>Memuat data admin…</p> : null}

          {activeTab === 'billing' && config ? (
            <>
              <section className="account-panel admin-config-panel"><div className="account-panel-heading"><div><span className="eyebrow">Hak akses dan waktu tayang</span><h2>Konfigurasi paket</h2></div><span className="gateway-state">{config.gateway_ready ? 'API Key Mayar tersedia' : 'Konfigurasikan API Key Mayar di backend/.env'}</span></div>
                <div className="billing-plan-list">{config.plans.map((plan) => <article className="billing-plan-editor" key={plan.id}>
                  <div className="billing-plan-heading"><strong>{plan.name}</strong><label className="toggle-label"><input type="checkbox" checked={plan.enabled} onChange={(event) => updatePlan(plan.id, 'enabled', event.target.checked)} />Aktif</label></div>
                  <div className="billing-plan-fields"><label>Nama<input value={plan.name} onChange={(event) => updatePlan(plan.id, 'name', event.target.value)} /></label><label>Harga (Rp)<input type="number" min="1" value={plan.price} onChange={(event) => updatePlan(plan.id, 'price', Number(event.target.value))} /></label><label>Masa aktif (hari)<input type="number" min="1" max="3650" value={plan.duration_days} onChange={(event) => updatePlan(plan.id, 'duration_days', Number(event.target.value))} /></label><label>Maks. undangan<input type="number" min="1" max="1000" value={plan.max_invitations || 1} onChange={(event) => updatePlan(plan.id, 'max_invitations', Number(event.target.value))} /></label><label>Jenis link<select value={plan.slug_mode} onChange={(event) => updatePlan(plan.id, 'slug_mode', event.target.value)}><option value="generated">Otomatis</option><option value="custom">Pilihan pemilik</option></select></label></div>
                  <label>Fitur paket, satu baris per fitur<textarea rows={3} value={(plan.features || []).join('\n')} onChange={(event) => updatePlan(plan.id, 'features', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} /></label>
                </article>)}</div>
              </section>
              <section className="account-panel admin-config-panel">
                <div className="account-panel-heading"><div><span className="eyebrow">Akses pemilik & reseller</span><h2>Admin dashboard dan kombinasi affiliate Business</h2></div></div>
                <label className="billing-policy-limit">Maksimal admin dashboard tambahan per pemilik (maksimum 3)
                  <input type="number" min="0" max="3" value={config.dashboard_admin_limit ?? 3} onChange={(event) => setConfig((current) => ({ ...current, dashboard_admin_limit: Number(event.target.value) }))} />
                </label>
                <p className="form-hint">Atur pilihan kombinasi untuk pemilik Business dan akun demo. Setelah pemilik mengonfirmasi satu pilihan, paket tersebut dikunci permanen dan tidak dapat diganti.</p>
                <div className="affiliate-combination-list">
                  {(config.affiliate_combinations || []).map((combination) => (
                    <article className="affiliate-combination-editor" key={combination.id}>
                      <strong>{combination.name}</strong>
                      <div className="billing-plan-fields">
                        <label>Nama kombinasi<input value={combination.name} onChange={(event) => updateAffiliateCombination(combination.id, 'name', event.target.value)} /></label>
                        <label>Kuota Basic<input type="number" min="0" max="1000" value={combination.basic} onChange={(event) => updateAffiliateCombination(combination.id, 'basic', Number(event.target.value))} /></label>
                        <label>Kuota Premium<input type="number" min="0" max="1000" value={combination.premium} onChange={(event) => updateAffiliateCombination(combination.id, 'premium', Number(event.target.value))} /></label>
                      </div>
                      <button className="text-button danger-text" onClick={() => setConfig((current) => ({ ...current, affiliate_combinations: current.affiliate_combinations.filter((item) => item.id !== combination.id) }))}>Hapus kombinasi</button>
                    </article>
                  ))}
                  <button className="secondary-btn" onClick={() => {
                    const id = `custom-${Date.now().toString(36)}`;
                    setConfig((current) => ({ ...current, affiliate_combinations: [...current.affiliate_combinations, { id, name: 'Kombinasi baru', basic: 1, premium: 0 }] }));
                  }}>Tambah kombinasi</button>
                </div>
                <button className="primary-btn" onClick={saveBilling}>Simpan aturan affiliate & admin</button>
              </section>
              <section className="account-panel admin-config-panel"><div className="account-panel-heading"><div><span className="eyebrow">Gateway dan pembayaran manual</span><h2>Metode pembayaran</h2></div><button className="secondary-btn" onClick={addManualMethod}>Tambah rekening / metode</button></div>
                <div className="billing-method-list">{config.payment_methods.map((method) => <article className="billing-method-editor" key={method.id}>
                  <div className="billing-plan-heading"><label>Nama metode<input value={method.name} onChange={(event) => updateMethod(method.id, 'name', event.target.value)} /></label><label className="toggle-label"><input type="checkbox" checked={method.enabled} onChange={(event) => updateMethod(method.id, 'enabled', event.target.checked)} />Tersedia</label></div>
                  <div className="billing-plan-fields"><label>Jenis<select value={method.provider} onChange={(event) => updateMethod(method.id, 'provider', event.target.value)}><option value="mayar">Mayar checkout</option><option value="manual">Manual / transfer</option></select></label>{method.provider === 'manual' ? <><label>Bank / penyedia<input value={method.bank_name || ''} onChange={(event) => updateMethod(method.id, 'bank_name', event.target.value)} /></label><label>Nama pemilik<input value={method.account_name || ''} onChange={(event) => updateMethod(method.id, 'account_name', event.target.value)} /></label><label>Nomor rekening / tujuan<input value={method.account_number || ''} onChange={(event) => updateMethod(method.id, 'account_number', event.target.value)} /></label></> : null}</div>
                  {method.provider === 'manual' ? <label>Instruksi transfer<textarea rows={2} value={method.instructions || ''} onChange={(event) => updateMethod(method.id, 'instructions', event.target.value)} /></label> : <p className="form-hint">Checkout memakai invoice Mayar. Simpan API Key hanya di backend/.env, bukan di browser.</p>}
                  <button className="text-button danger-text" onClick={() => setConfig((current) => ({ ...current, payment_methods: current.payment_methods.filter((item) => item.id !== method.id) }))}>Hapus metode</button>
                </article>)}</div>
                <button className="primary-btn" onClick={saveBilling} disabled={!config.payment_methods.length}>Simpan seluruh konfigurasi</button>
              </section>
            </>
          ) : null}

          {activeTab === 'demo-accounts' && config ? (
            <>
              <section className="account-panel admin-config-panel">
                <div className="account-panel-heading"><div><span className="eyebrow">Akses uji coba</span><h2>Buat akun demo</h2></div></div>
                <p className="form-hint">Akun demo otomatis dinonaktifkan setelah masa akses habis dan hanya dapat membuat maksimal 2 undangan. Pilih paket yang akan dicoba.</p>
                <form className="demo-account-form" onSubmit={createDemoAccount}>
                  <label>Nama pengguna<input required minLength={2} value={demoForm.full_name} onChange={(event) => setDemoForm({ ...demoForm, full_name: event.target.value })} /></label>
                  <label>Email login<input type="email" required value={demoForm.email} onChange={(event) => setDemoForm({ ...demoForm, email: event.target.value })} /></label>
                  <label>Kata sandi awal<input type="password" minLength={8} required value={demoForm.password} onChange={(event) => setDemoForm({ ...demoForm, password: event.target.value })} /></label>
                  <label>Paket demo<select required value={demoForm.plan_id} onChange={(event) => setDemoForm({ ...demoForm, plan_id: event.target.value })}>{config.plans.filter((plan) => plan.enabled).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.duration_days} hari masa paket normal</option>)}</select></label>
                  {demoForm.plan_id === 'business' ? <label>Kombinasi kuota affiliate<select required value={demoForm.combination_id} onChange={(event) => setDemoForm({ ...demoForm, combination_id: event.target.value })}><option value="">Pilih kombinasi</option>{config.affiliate_combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name} · {combination.basic} Basic / {combination.premium} Premium</option>)}</select></label> : null}
                  <label>Lama demo (hari)<input type="number" min="0" max="3650" value={demoForm.duration_days} onChange={(event) => setDemoForm({ ...demoForm, duration_days: Number(event.target.value) })} /></label>
                  <label>Lama demo (jam)<input type="number" min="0" max="23" value={demoForm.duration_hours} onChange={(event) => setDemoForm({ ...demoForm, duration_hours: Number(event.target.value) })} /></label>
                  <button className="primary-btn">Buat akun demo</button>
                </form>
              </section>
              <section className="account-panel">
                <div className="account-panel-heading"><div><span className="eyebrow">Daftar akun</span><h2>Akun demo terdaftar</h2></div><strong>{demoAccounts.length}</strong></div>
                {createdDemoCredentials ? <p className="account-message demo-credentials" role="status">Kredensial akun demo baru — email: <strong>{createdDemoCredentials.email}</strong>, kata sandi awal: <code>{createdDemoCredentials.password}</code>. Berikan secara aman lalu <button className="text-button" onClick={() => setCreatedDemoCredentials(null)}>sembunyikan</button>.</p> : null}
                <div className="admin-record-list">{demoAccounts.map((account) => <article className="admin-record" key={account.id}><div><strong>{account.full_name}</strong><p>{account.email} · Paket {account.plan_id}</p><small>{account.expired ? 'Demo berakhir' : 'Berakhir'} {new Date(account.demo_until).toLocaleString('id-ID')}</small></div><span className={`status-label ${account.expired ? 'status-expired' : 'status-active'}`}>{account.expired ? 'Berakhir' : 'Aktif'}</span></article>)}{!demoAccounts.length ? <p className="form-hint">Belum ada akun demo.</p> : null}</div>
              </section>
            </>
          ) : null}

          {activeTab === 'payments' ? <section className="account-panel"><div className="account-panel-heading"><div><span className="eyebrow">Manual settlement</span><h2>Transfer menunggu verifikasi</h2></div></div><div className="admin-record-list">{payments.filter((payment) => payment.provider === 'manual' && payment.status === 'pending').map((payment) => <article className="admin-record" key={payment.id}><div><strong>{payment.order_id}</strong><p>Nominal Rp {Number(payment.amount).toLocaleString('id-ID')} · {payment.payment_method}</p><p>Referensi: {payment.transfer_reference || 'Belum dikirim'}</p><small>Invitation {payment.invitation_id}</small></div><button className="primary-btn" disabled={!payment.transfer_reference} onClick={() => approvePayment(payment)}>Setujui & aktifkan</button></article>)}{!payments.some((payment) => payment.provider === 'manual' && payment.status === 'pending') ? <p className="form-hint">Tidak ada transfer yang menunggu verifikasi.</p> : null}</div></section> : null}

          {activeTab === 'affiliates' ? <section className="account-panel"><div className="account-panel-heading"><div><span className="eyebrow">Pemantauan dan moderasi</span><h2>Riwayat affiliate & iklan publik</h2></div><strong>{affiliateAccounts.length}</strong></div><p className="form-hint">Akun affiliate tetap dikelola pemilik undangan. Dari sini Super Admin dapat meninjau riwayat, mengatur iklan, dan menonaktifkan akun yang melanggar ketentuan. Menonaktifkan akun tidak menghapus undangan atau atribusi penjualan.</p><div className="admin-record-list">{affiliateAccounts.map((affiliate) => <article className="admin-record admin-affiliate-record" key={affiliate.id}><div><strong>{affiliate.full_name}</strong><p>{affiliate.email} · Pemilik: {affiliate.owner_name} ({affiliate.owner_email || 'email tidak tersedia'})</p><p>{affiliate.invitation_count} undangan · {affiliate.basic_used}/{affiliate.basic_quota} Basic · {affiliate.premium_used}/{affiliate.premium_quota} Premium</p><small>Dibuat {affiliate.created_at ? new Date(affiliate.created_at).toLocaleString('id-ID') : 'tanggal tidak tersedia'}</small></div><div className="admin-invitation-editor affiliate-ad-editor"><label>Judul iklan<input value={affiliate.ad_title || ''} onChange={(event) => setAffiliateAccounts((current) => current.map((item) => item.id === affiliate.id ? { ...item, ad_title: event.target.value } : item))} /></label><label>Deskripsi iklan<textarea rows={2} value={affiliate.ad_description || ''} onChange={(event) => setAffiliateAccounts((current) => current.map((item) => item.id === affiliate.id ? { ...item, ad_description: event.target.value } : item))} /></label><label>Link tujuan<input type="url" value={affiliate.ad_url || ''} onChange={(event) => setAffiliateAccounts((current) => current.map((item) => item.id === affiliate.id ? { ...item, ad_url: event.target.value } : item))} placeholder="https://..." /></label><label>URL gambar<input type="url" value={affiliate.ad_image || ''} onChange={(event) => setAffiliateAccounts((current) => current.map((item) => item.id === affiliate.id ? { ...item, ad_image: event.target.value } : item))} placeholder="https://..." /></label><label className="toggle-label"><input type="checkbox" checked={affiliate.ad_active} onChange={(event) => setAffiliateAccounts((current) => current.map((item) => item.id === affiliate.id ? { ...item, ad_active: event.target.checked } : item))} />Tayangkan iklan</label><button className="primary-btn" onClick={() => updateAffiliateAccount(affiliate, { ad_title: affiliate.ad_title || '', ad_description: affiliate.ad_description || '', ad_url: affiliate.ad_url || '', ad_image: affiliate.ad_image || '', ad_active: affiliate.ad_active })}>Simpan iklan</button></div><span className={`status-label ${affiliate.active ? 'status-active' : 'status-expired'}`}>{affiliate.active ? 'Aktif' : 'Nonaktif'}</span><button className="secondary-btn" onClick={() => updateAffiliateAccount(affiliate, { active: !affiliate.active })}>{affiliate.active ? 'Nonaktifkan' : 'Aktifkan kembali'}</button></article>)}{!affiliateAccounts.length ? <p className="form-hint">Belum ada akun affiliate.</p> : null}</div></section> : null}

          {activeTab === 'invitations' ? <section className="account-panel"><div className="account-panel-heading"><div><span className="eyebrow">Konten pengguna</span><h2>Semua undangan dan status aktif</h2></div></div><div className="admin-invitation-layout"><div className="admin-record-list">{invitations.map((invitation) => <button className={`admin-invitation-select ${selectedInvitation?.id === invitation.id ? 'selected' : ''}`} key={invitation.id} onClick={() => reviewInvitation(invitation)}><strong>{invitation.title}</strong><span>{invitation.status} · {invitation.slug}</span><small>Aktif sampai {invitation.active_until ? new Date(invitation.active_until).toLocaleString('id-ID') : 'belum aktif'}</small></button>)}{!invitations.length ? <p className="form-hint">Belum ada undangan.</p> : null}</div>
              {selectedInvitation ? <div className="admin-invitation-editor"><label>Judul<input value={selectedInvitation.title} onChange={(event) => setSelectedInvitation({ ...selectedInvitation, title: event.target.value })} /></label><label>Link publik<input value={selectedInvitation.slug} onChange={(event) => setSelectedInvitation({ ...selectedInvitation, slug: event.target.value })} /></label><label>Status<select value={selectedInvitation.status} onChange={(event) => setSelectedInvitation({ ...selectedInvitation, status: event.target.value })}><option value="draft">Draft</option><option value="active">Aktif</option><option value="published">Published</option><option value="expired">Expired</option></select></label><label>Masa aktif sampai<input type="datetime-local" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} /></label><label>Seluruh konten undangan (JSON)<textarea className="admin-content-json" value={contentText} onChange={(event) => setContentText(event.target.value)} rows={18} spellCheck="false" /></label><button className="primary-btn" onClick={saveInvitation}>Simpan edit dan status</button></div> : <p className="form-hint">Pilih undangan untuk mengedit semua konten, link, dan masa aktif.</p>}</div></section> : null}
        </section>
      </div>
    </main>
  );
}
