import { useEffect } from 'react';
import './InvitationUnderDevelopment.css';

export default function InvitationUnderDevelopment() {
  useEffect(() => {
    document.title = 'Nuansa Invite - Under Development';
    return () => { document.title = 'Aurora Media | Wedding, Musik & Undangan Digital'; };
  }, []);

  return (
    <main className="invitation-under-development">
      <section className="invitation-development-banner" aria-labelledby="invitation-development-title">
        <div className="invitation-development-badge">
          <span className="invitation-development-dot" aria-hidden="true" />
          Nuansa Invite
        </div>
        <p className="invitation-development-kicker">Digital Invitation</p>
        <h1 id="invitation-development-title">Peluncuran Resmi Platform</h1>
        <h2>MASIH DALAM PROSES PENGEMBANGAN</h2>
        <p className="invitation-development-description">
          Kami sedang menyempurnakan platform undangan digital eksklusif untuk memberikan pengalaman terbaik pada momen bahagia Anda. Sampai jumpa segera!
        </p>
      </section>
    </main>
  );
}
