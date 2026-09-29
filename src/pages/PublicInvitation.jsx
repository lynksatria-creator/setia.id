import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';

const defaultStory = [
  { title: 'Pertama Bertemu', date: '2019', text: 'Sebuah pertemuan sederhana yang menjadi awal dari perjalanan panjang kami.' },
  { title: 'Mulai Bersama', date: '2021', text: 'Kami belajar tumbuh, saling menjaga, dan merayakan setiap langkah bersama.' },
  { title: 'Lamaran', date: '2025', text: 'Dengan doa keluarga, kami mengikat niat untuk melangkah ke jenjang berikutnya.' },
  { title: 'Pernikahan', date: 'Hari ini', text: 'Dua hati, satu janji, dan perjalanan baru yang kami mulai bersama.' },
];

const defaultSchedule = [
  { time: '08.00 WIB', title: 'Akad Nikah' },
  { time: '10.00 WIB', title: 'Sesi Foto' },
  { time: '11.00 WIB', title: 'Resepsi' },
  { time: '14.00 WIB', title: 'Acara Selesai' },
];

const formatCountdown = (target) => {
  const distance = Math.max(0, target - Date.now());
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
};

const calendarUrl = (content, invitation) => {
  const eventDate = content.event_date || new Date().toISOString().slice(0, 10);
  const start = `${eventDate.replaceAll('-', '')}T${(content.event_time || '10:00').replace(':', '')}00`;
  const title = encodeURIComponent(`Pernikahan ${content.couple_names || invitation.title}`);
  const details = encodeURIComponent(content.opening_text || 'Undangan pernikahan');
  const location = encodeURIComponent(`${content.venue || ''} ${content.address || ''}`.trim());
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${start}&details=${details}&location=${location}`;
};

const videoEmbedUrl = (url) => {
  if (!url) return '';
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/i);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
};

export default function PublicInvitation({ slug, invitation: initialInvitation = null }) {
  const [invitation, setInvitation] = useState(initialInvitation);
  const [error, setError] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedImage, setSelectedImage] = useState(null);
  const musicRef = useRef(null);

  useEffect(() => {
    if (initialInvitation) {
      setInvitation(initialInvitation);
      return undefined;
    }
    let active = true;
    apiRequest(`/public/invitations/${encodeURIComponent(slug)}`)
      .then((result) => { if (active) setInvitation(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [initialInvitation, slug]);

  useEffect(() => {
    if (!invitation) return undefined;
    const content = invitation.content || {};
    const target = new Date(`${content.event_date || new Date().toISOString().slice(0, 10)}T${content.event_time || '10:00'}`).getTime();
    const update = () => setCountdown(formatCountdown(target));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [invitation]);

  if (error) return <main className="public-invitation-state"><p className="eyebrow">Undangan tidak tersedia</p><h1>Link ini belum aktif atau sudah berakhir.</h1><a href="/undangan">Kunjungi Undangan.id</a></main>;
  if (!invitation) return <main className="public-invitation-state"><p>Memuat undangan…</p></main>;

  const content = invitation.content || {};
  const gallery = Array.isArray(content.gallery) ? content.gallery : [];
  const story = Array.isArray(content.love_story) && content.love_story.length ? content.love_story : defaultStory;
  const schedule = Array.isArray(content.schedule) && content.schedule.length ? content.schedule : defaultSchedule;
  const coupleNames = content.couple_names || invitation.title;
  const [groomName, brideName] = coupleNames.split(/\s*&\s*/);
  const defaultEvents = content.event_type === 'Akad & Resepsi'
    ? [
      { title: 'AKAD NIKAH', date: content.event_date, time: content.event_time, venue: content.venue, address: content.address, maps_url: content.maps_url },
      { title: 'RESEPSI', date: content.reception_date || content.event_date, time: content.reception_time || content.event_time, venue: content.reception_venue || content.venue, address: content.reception_address || content.address, maps_url: content.reception_maps_url || content.maps_url },
    ]
    : [{ title: (content.event_type || 'ACARA PERNIKAHAN').toUpperCase(), date: content.event_date, time: content.event_time, venue: content.venue, address: content.address, maps_url: content.maps_url }];
  const eventItems = (Array.isArray(content.events) ? content.events : defaultEvents).filter((event) => event.date || event.venue || event.address);
  const templateClass = content.custom_design ? 'custom' : content.template_id || 'luxury-gold';
  const customStyle = content.custom_design ? {
    '--public-primary': content.custom_primary || '#294b3e',
    '--public-accent': content.custom_accent || '#995c49',
    '--public-background': content.custom_background || '#f8f5ee',
  } : undefined;

  const openInvitation = () => {
    setIsOpened(true);
    musicRef.current?.play().catch(() => {});
  };

  return (
    <main className={`public-invitation-page public-template-${templateClass} ${isOpened ? 'is-opened' : ''}`} style={customStyle}>
      <section className="wedding-cover" style={content.cover_image ? { backgroundImage: `linear-gradient(180deg, rgba(20, 16, 12, 0.18), rgba(20, 16, 12, 0.76)), url("${content.cover_image}")` } : undefined}>
        <div className="wedding-ornament wedding-ornament-top">✦</div>
        <div className="wedding-cover-inner"><p className="wedding-kicker">THE WEDDING OF</p><h1>{groomName || content.honoree_name || invitation.title}<span>&amp;</span>{brideName || ''}</h1><p className="wedding-cover-date">{content.event_date ? new Date(content.event_date).toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Save the date'}{content.event_time ? ` · ${content.event_time}` : ''}</p><button className="wedding-open-button" onClick={openInvitation}>BUKA UNDANGAN</button></div>
        <div className="wedding-ornament wedding-ornament-bottom">❦</div>
      </section>

      <audio ref={musicRef} className="wedding-audio" loop preload="metadata" src={content.music_url || undefined} controls={isOpened}>Browser Anda belum mendukung audio.</audio>

      <div className="wedding-content" aria-hidden={!isOpened}>
        <section className="wedding-section wedding-greeting"><p className="wedding-eyebrow">Assalamu'alaikum Warahmatullahi Wabarakatuh</p><p>{content.opening_text || 'Atas rahmat dan ridho Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada acara pernikahan kami.'}</p><span className="gold-divider">✦</span></section>

        <section className="wedding-section wedding-quote"><p>“Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu mendapatkan ketenangan hati dan dijadikan-Nya kasih sayang di antara kamu.”</p><strong>QS. Ar-Rum: 21</strong></section>

        <section className="wedding-section wedding-couple"><p className="wedding-eyebrow">THE HAPPY COUPLE</p><h2>Mempelai</h2><div className="wedding-couple-grid"><div className="wedding-person"><img src={content.groom_photo || content.cover_image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=85'} alt={groomName || 'Mempelai pria'} /><h3>{groomName || 'Nama Mempelai Pria'}</h3><p>Putra dari<br />{content.groom_parents || 'Bapak Nama Ayah & Ibu Nama Ibu'}</p>{content.groom_instagram ? <a href={`https://instagram.com/${content.groom_instagram.replace('@', '')}`} target="_blank" rel="noreferrer">{content.groom_instagram}</a> : null}</div><span className="wedding-ampersand">&amp;</span><div className="wedding-person"><img src={content.bride_photo || content.cover_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=85'} alt={brideName || 'Mempelai wanita'} /><h3>{brideName || 'Nama Mempelai Wanita'}</h3><p>Putri dari<br />{content.bride_parents || 'Bapak Nama Ayah & Ibu Nama Ibu'}</p>{content.bride_instagram ? <a href={`https://instagram.com/${content.bride_instagram.replace('@', '')}`} target="_blank" rel="noreferrer">{content.bride_instagram}</a> : null}</div></div></section>

        <section className="wedding-section wedding-countdown"><p className="wedding-eyebrow">MENUJU HARI BAHAGIA</p><h2>Our special day</h2><div className="countdown-grid">{Object.entries(countdown).map(([label, value]) => <div key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}</div><a className="wedding-calendar-button" href={calendarUrl(content, invitation)} target="_blank" rel="noreferrer">TAMBAHKAN KE KALENDER</a></section>

        <section className="wedding-section wedding-story"><p className="wedding-eyebrow">OUR LOVE STORY</p><h2>Perjalanan kami</h2><div className="love-story-timeline">{story.map((item, index) => <article key={`${item.title}-${index}`}><span>{item.date}</span><div><h3>{item.title}</h3><p>{item.text}</p>{item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : null}</div></article>)}</div></section>

        {eventItems.length ? <section className="wedding-section wedding-events"><p className="wedding-eyebrow">SAVE THE DATE</p><h2>Detail acara</h2><div className="wedding-event-grid">{eventItems.map((event) => <article className="wedding-event-card" key={event.title}><p className="wedding-eyebrow">{event.title}</p><h3>{event.date ? new Date(event.date).toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Tanggal acara'}</h3><strong>{event.time || 'Waktu acara'} WIB</strong><p>{event.venue || 'Nama tempat'}<br />{event.address || 'Alamat lengkap'}</p>{event.maps_url ? <a href={event.maps_url} target="_blank" rel="noreferrer">LIHAT LOKASI ↗</a> : null}</article>)}</div></section> : null}

        <section className="wedding-section wedding-schedule"><p className="wedding-eyebrow">SUSUNAN ACARA</p><h2>Rangkaian momen</h2><div className="schedule-list">{schedule.map((item, index) => <div key={`${item.time}-${index}`}><strong>{item.time}</strong><span>{item.title}</span></div>)}</div></section>

        {gallery.length ? <section className="wedding-section wedding-gallery"><p className="wedding-eyebrow">MOMENTS</p><h2>Our beautiful moments</h2><div className="wedding-gallery-grid">{gallery.map((image, index) => <button key={`${image}-${index}`} onClick={() => setSelectedImage(image)}><img src={image} alt={`Momen acara ${index + 1}`} loading="lazy" /></button>)}</div></section> : null}

        {content.video_url ? <section className="wedding-section wedding-video"><p className="wedding-eyebrow">OUR BEAUTIFUL MOMENTS</p><h2>Film kisah kami</h2><iframe src={videoEmbedUrl(content.video_url)} title="Video prewedding" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></section> : null}

        <section className="wedding-section wedding-rsvp"><p className="wedding-eyebrow">YOUR PRESENCE IS A GIFT</p><h2>Konfirmasi kehadiran</h2><p>Mohon konfirmasi kehadiran dan titipkan doa terbaik untuk perjalanan kami.</p>{content.rsvp_url ? <a className="wedding-calendar-button" href={content.rsvp_url} target="_blank" rel="noreferrer">KONFIRMASI RSVP</a> : null}</section>
        <section className="wedding-section wedding-closing"><p>Terima kasih atas doa dan kasih yang mengiringi langkah kami.</p><h2>{coupleNames}</h2><span>Dengan penuh cinta</span></section>
      </div>

      {selectedImage ? <div className="wedding-lightbox" role="dialog" aria-label="Preview foto" onClick={() => setSelectedImage(null)}><button onClick={() => setSelectedImage(null)} aria-label="Tutup preview">×</button><img src={selectedImage} alt="Preview momen acara" /></div> : null}
    </main>
  );
}
