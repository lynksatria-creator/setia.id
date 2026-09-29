import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function PublicInvitation({ slug }) {
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest(`/public/invitations/${encodeURIComponent(slug)}`)
      .then((result) => { if (active) setInvitation(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [slug]);

  if (error) return <main className="public-invitation-state"><p className="eyebrow">Undangan tidak tersedia</p><h1>Link ini belum aktif atau sudah berakhir.</h1><a href="/undangan">Kunjungi Undangan.id</a></main>;
  if (!invitation) return <main className="public-invitation-state"><p>Memuat undangan…</p></main>;

  const content = invitation.content || {};
  const gallery = Array.isArray(content.gallery) ? content.gallery : [];

  return (
    <main className="public-invitation-page">
      <article className="public-invitation-cover">
        <p className="eyebrow">The wedding of</p>
        <h1>{content.couple_names || invitation.title}</h1>
        {content.event_date ? <p>{new Date(content.event_date).toLocaleDateString('id-ID', { dateStyle: 'full' })}{content.event_time ? ` · ${content.event_time}` : ''}</p> : null}
      </article>
      <section className="public-invitation-content">
        <p className="public-invitation-opening">{content.opening_text || 'Dengan penuh sukacita, kami mengundang Anda untuk merayakan hari istimewa bersama.'}</p>
        {content.story ? <p>{content.story}</p> : null}
        {content.venue || content.address ? <div className="public-event-details"><h2>Lokasi acara</h2>{content.venue ? <strong>{content.venue}</strong> : null}{content.address ? <p>{content.address}</p> : null}{content.maps_url ? <a href={content.maps_url} target="_blank" rel="noreferrer">Buka Google Maps ↗</a> : null}</div> : null}
        {gallery.length ? <div className="public-invitation-gallery">{gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Galeri acara ${index + 1}`} loading="lazy" />)}</div> : null}
        {content.music_url ? <a className="public-music-link" href={content.music_url} target="_blank" rel="noreferrer">Dengarkan musik acara</a> : null}
      </section>
    </main>
  );
}
