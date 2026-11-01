import { invitationNavigation } from './Navbar';

export default function Footer({ siteName, phone, email, whatsappNumber, whatsappMessage }) {
  const whatsappDigits = String(whatsappNumber || '').replace(/\D/g, '');

  return (
    <footer id="contact" className="site-footer invitation-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand">
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 8.5 8.2 4h7.6L20 8.5 12 20 4 8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M4.5 8.5h15M8.2 4l3.8 4.5L15.8 4M8.5 8.5 12 20l3.5-11.5" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
              </svg>
            </span>
            {siteName}
          </div>
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
          <h4>Jelajahi</h4>
          {invitationNavigation.map((item) => <p key={item.href}><a href={item.href}>{item.label}</a></p>)}
          <p><a href="/">Aurora Media</a></p>
        </div>
      </div>
    </footer>
  );
}
