import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { guestbookApi } from '../lib/api';

export default function GuestTicket({ ticketToken }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    guestbookApi.getTicket(ticketToken)
      .then((result) => { if (active) setTicket(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [ticketToken]);

  if (error) return <main className="guest-ticket-page"><p className="eyebrow">Tiket undangan</p><h1>Tiket tidak tersedia</h1><p role="alert">{error}</p></main>;
  if (!ticket) return <main className="guest-ticket-page"><p>Memuat barcode undangan…</p></main>;

  const ticketUrl = window.location.href;

  return (
    <main className="guest-ticket-page">
      <section className="guest-ticket-card">
        <p className="eyebrow">Tiket masuk resmi</p>
        <h1>{ticket.invitation_title}</h1>
        <p className="guest-ticket-recipient">Untuk <strong>{ticket.name}</strong></p>
        {ticket.event_date ? <p>{new Date(`${ticket.event_date}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'full' })}{ticket.event_time ? ` · ${ticket.event_time}` : ''}</p> : null}
        {ticket.venue ? <p>{ticket.venue}</p> : null}
        <div className="guest-ticket-qr"><QRCodeSVG value={ticketUrl} size={240} level="H" includeMargin /></div>
        {ticket.checked_in_at
          ? <p className="guest-ticket-checked" role="status">Tiket ini sudah digunakan untuk check-in.</p>
          : <p>Tunjukkan barcode unik ini kepada panitia saat tiba.</p>}
        <a href={`/i/${ticket.slug}?ticket=${encodeURIComponent(ticketToken)}`}>Buka undangan acara</a>
        <button type="button" className="secondary-btn" onClick={() => window.print()}>Cetak tiket</button>
      </section>
    </main>
  );
}
