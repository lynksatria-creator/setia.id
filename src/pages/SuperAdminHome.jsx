import { useState } from 'react';
import SuperAdminNav from '../components/SuperAdminNav';
import { adminApi } from '../lib/api';
import { SUPER_ADMIN_SESSION_KEY } from '../lib/adminSession';

const adminPanels = [
  { title: 'Portal Admin', description: 'Kelola konten dan pengaturan website utama.', href: '/portal-admin' },
  { title: 'Gibrig Admin', description: 'Kelola konten Gibrig Entertainment.', href: '/gibrig-admin' },
  { title: 'Nunuy Wedding Admin', description: 'Kelola paket dan konten wedding.', href: '/nunuy-admin' },
  { title: 'Undangan.id Website Admin', description: 'Kelola konten publik, tampilan, dan kontak website Undangan.id.', href: '/undangan-website-admin' },
  { title: 'Undangan.id Admin', description: 'Kelola paket, pembayaran, dan undangan pengguna.', href: '/undangan-admin' },
];

const websites = [
  { title: 'Portal utama', href: '/' },
  { title: 'Gibrig Entertainment', href: '/gibrig' },
  { title: 'Nunuy Nadhifa Wedding', href: '/nunuy-nadhifa-wedding' },
  { title: 'Undangan.id', href: '/undangan' },
];

export default function SuperAdminHome({ onLogin }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await adminApi.login({ email, password });
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, result.access_token);
      setToken(result.access_token);
      setPassword('');
      onLogin?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    setToken(null);
  };

  if (!token) {
    return (
      <main className="billing-admin-login super-admin-login">
        <a className="brand" href="/"><span className="logo-mark">S</span>Setia Creative</a>
        <form className="billing-admin-login-card" onSubmit={handleLogin}>
          <p className="eyebrow">Satu akses untuk semua panel</p>
          <h1>Super Admin</h1>
          <p>Masuk dengan akun admin backend untuk mengelola semua panel.</p>
          <label>Email admin<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Kata sandi<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-btn" disabled={isLoading}>{isLoading ? 'Memeriksa…' : 'Masuk ke super admin'}</button>
          <a className="super-admin-public-link" href="/undangan">Kunjungi website Undangan.id</a>
        </form>
      </main>
    );
  }

  return (
    <main className="super-admin-home">
      <header className="billing-admin-header">
        <a className="brand" href="/setia-creative-admin"><span className="logo-mark">S</span>Super Admin</a>
        <div>
          <span>Sesi admin aktif</span>
          <button onClick={logout}>Keluar</button>
        </div>
      </header>
      <SuperAdminNav />
      <div className="super-admin-content">
        <section className="super-admin-intro">
          <p className="eyebrow">Setia Creative · Control center</p>
          <h1>Kelola semua panel dari satu tempat.</h1>
          <p>Sesi login yang sama berlaku untuk seluruh panel admin. Buka website publik langsung dari navigasi Website.</p>
        </section>
        <section className="super-admin-section" aria-labelledby="admin-panels-heading">
          <div className="super-admin-section-heading">
            <div><p className="eyebrow">Pengelolaan</p><h2 id="admin-panels-heading">Panel admin</h2></div>
          </div>
          <div className="super-admin-card-grid">
            {adminPanels.map((panel) => (
              <a className="super-admin-card" href={panel.href} key={panel.href}>
                <span>ADMIN PANEL</span>
                <h3>{panel.title}</h3>
                <p>{panel.description}</p>
                <strong>Buka panel <span aria-hidden="true">↗</span></strong>
              </a>
            ))}
          </div>
        </section>
        <section className="super-admin-section" aria-labelledby="websites-heading">
          <div className="super-admin-section-heading">
            <div><p className="eyebrow">Pratinjau publik</p><h2 id="websites-heading">Website</h2></div>
          </div>
          <div className="super-admin-website-links">
            {websites.map((website) => <a href={website.href} key={website.href}>{website.title}<span aria-hidden="true">↗</span></a>)}
          </div>
        </section>
      </div>
    </main>
  );
}
