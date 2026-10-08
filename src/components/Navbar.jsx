export default function Navbar({ siteName, logo = 'U', logoImage, onLogin, onRegister }) {
  return (
    <header className="topbar invitation-topbar">
      <div className="container nav-wrap invitation-nav-wrap">
        <a className="brand" href="/undangan">{logoImage ? <img className="site-logo-image" src={logoImage} alt={`${siteName} logo`} /> : <span className="logo-mark">{logo}</span>}{siteName}</a>
        <nav className="nav-links" aria-label="Navigasi Undangan.id">
          <a href="/">Beranda</a>
          <a href="#templates">Template</a>
          <a href="#categories">Kategori</a>
          <a href="#blog">Artikel</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="invitation-nav-actions">
          <button className="invitation-login-link" onClick={onLogin}>Masuk</button>
          <button className="primary-btn" onClick={onRegister}>Buat Undangan</button>
        </div>
      </div>
    </header>
  );
}
