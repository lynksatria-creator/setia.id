export default function Footer({ siteName, phone, email, whatsappNumber, whatsappMessage }) {
  const whatsappDigits = String(whatsappNumber || '').replace(/\D/g, '');

  return (
    <footer id="contact" className="site-footer invitation-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand"><span className="logo-mark">U</span>{siteName}</div>
          <p>Platform undangan digital premium untuk momen spesial Anda.</p>
        </div>
        <div>
          <h4>Kontak</h4>
          <p>{email}</p>
          <p><a href={`tel:${String(phone || '').replace(/[^\d+]/g, '')}`}>{phone}</a></p>
        </div>
        <div>
          <h4>Temukan kami</h4>
          <p>Instagram</p>
          {whatsappDigits ? <p><a href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappMessage || '')}`} target="_blank" rel="noopener noreferrer">Chat WhatsApp</a></p> : null}
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
