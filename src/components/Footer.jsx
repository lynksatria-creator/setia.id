export default function Footer({ siteName }) {
  return (
    <footer id="contact" className="site-footer invitation-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand"><span className="logo-mark">U</span>{siteName}</div>
          <p>Platform undangan digital premium untuk momen spesial Anda.</p>
        </div>
        <div>
          <h4>Kontak</h4>
          <p>hello@undangan.id</p>
          <p>+62 812-3456-7890</p>
        </div>
        <div>
          <h4>Temukan kami</h4>
          <p>Instagram</p>
          <p>WhatsApp</p>
        </div>
        <div>
          <h4>Mulai di sini</h4>
          <p><a href="#templates">Pilih template</a></p>
          <p><a href="#pricing">Lihat paket</a></p>
        </div>
      </div>
    </footer>
  );
}
