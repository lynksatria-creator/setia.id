export default function Navbar({ siteName, onAdmin, onLogin, onRegister }) {
  return (
    <header className="topbar invitation-topbar">
      <div className="container nav-wrap invitation-nav-wrap">
        <a className="brand" href="/undangan"><span className="logo-mark">U</span>{siteName}</a>
        <nav className="nav-links" aria-label="Navigasi Undangan.id">
          <a href="#templates">Template</a>
          <a href="#categories">Kategori</a>
          <a href="#blog">Artikel</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="invitation-nav-actions">
          <button className="invitation-login-link" onClick={onLogin}>Masuk</button>
          <button className="primary-btn" onClick={onRegister}>Buat Undangan</button>
          <button className="invitation-admin-link" onClick={onAdmin}>Admin</button>
        </div>
      </div>
    </header>
  );
}
