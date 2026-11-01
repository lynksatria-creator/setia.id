import { useEffect, useMemo, useState } from 'react';
import { testimonialsApi } from '../lib/api';

const formatTestimonial = (item) => ({
  id: item.id,
  kind: item.kind || 'testimonial',
  name: item.name,
  event: item.event || item.eventType || '',
  message: item.message || item.text || item.quote || '',
  rating: Number(item.rating) || 5,
  image: item.image || '',
});

export function PublicTestimonials({
  site,
  initialItems = [],
  eyebrow = 'Testimoni',
  title = 'Cerita dari keluarga dan klien',
  description = '',
  className = '',
  sectionId,
  carousel = false,
}) {
  const [publishedItems, setPublishedItems] = useState([]);
  const [carouselPage, setCarouselPage] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingError, setRatingError] = useState('');
  const [ratingMessage, setRatingMessage] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const configuredItems = useMemo(() => initialItems.map(formatTestimonial), [initialItems]);

  useEffect(() => {
    let active = true;
    testimonialsApi.listPublic(site)
      .then((items) => {
        if (active) {
          setPublishedItems(items.map(formatTestimonial));
          setLoadError('');
        }
      })
      .catch((error) => {
        if (active) setLoadError(`Testimoni belum dapat dimuat: ${error.message}`);
      });
    return () => { active = false; };
  }, [site]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitMessage('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await testimonialsApi.createPublic({
        site,
        name: values.get('name'),
        event: values.get('event'),
        message: values.get('message'),
        rating: Number(values.get('rating')),
      });
      form.reset();
      setSubmitMessage('Terima kasih! Testimoni Anda akan ditampilkan setelah disetujui admin.');
    } catch (error) {
      setSubmitError(`Testimoni gagal dikirim: ${error.message}`);
    }
  };

  const submitRating = async (event) => {
    event.preventDefault();
    if (!selectedRating) return;
    setRatingError('');
    setRatingMessage('');
    setSubmittingRating(true);
    const form = event.currentTarget;
    try {
      await testimonialsApi.createPublic({
        site,
        kind: 'rating',
        rating: selectedRating,
        message: new FormData(form).get('message')?.toString().trim() || null,
      });
      form.reset();
      setSelectedRating(0);
      setRatingMessage('Terima kasih! Rating Anda menunggu persetujuan admin.');
    } catch (error) {
      setRatingError(`Rating gagal dikirim: ${error.message}`);
    } finally {
      setSubmittingRating(false);
    }
  };

  const ratings = publishedItems.filter((item) => item.kind === 'rating');
  const averageRating = ratings.length
    ? ratings.reduce((total, item) => total + item.rating, 0) / ratings.length
    : 0;
  const items = [...publishedItems, ...configuredItems].filter((item) => item.kind !== 'rating');
  const carouselPageSize = 3;
  const carouselPageCount = Math.ceil(items.length / carouselPageSize);
  const visibleItems = carousel
    ? items.slice(carouselPage * carouselPageSize, (carouselPage + 1) * carouselPageSize)
    : items;

  return (
    <section id={sectionId} className={`public-testimonials ${className}`}>
      <div className="public-testimonials-inner">
        <div className="section-head public-testimonials-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description ? <p className="public-testimonials-description">{description}</p> : null}
        </div>
        {items.length ? (
          <>
            {carousel && carouselPageCount > 1 ? (
              <div className="public-testimonial-carousel-controls" aria-label="Navigasi testimoni">
                <button type="button" aria-label="Testimoni sebelumnya" onClick={() => setCarouselPage((page) => (page - 1 + carouselPageCount) % carouselPageCount)}>←</button>
                <span>{carouselPage + 1} / {carouselPageCount}</span>
                <button type="button" aria-label="Testimoni berikutnya" onClick={() => setCarouselPage((page) => (page + 1) % carouselPageCount)}>→</button>
              </div>
            ) : null}
            <div className={`public-testimonial-grid${carousel ? ' is-carousel' : ''}`}>
              {visibleItems.map((item, index) => (
                <article className="public-testimonial-card" key={item.id || `${item.name}-${index}`}>
                  {item.image ? <img className="public-testimonial-image" src={item.image} alt={item.name} loading="lazy" /> : null}
                  <div className="public-testimonial-rating" aria-label={`Rating ${item.rating} dari 5`}>
                    {'★'.repeat(item.rating)}
                  </div>
                  <blockquote>“{item.message}”</blockquote>
                  <strong>{item.name}</strong>
                  {item.event ? <small>{item.event}</small> : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="public-testimonial-empty">Belum ada testimoni terverifikasi. Jadilah yang pertama berbagi cerita.</p>
        )}
        {loadError ? <p className="public-testimonial-error" role="status">{loadError}</p> : null}
        <div className="public-website-rating">
          <div className="public-website-rating-summary">
            <h3>Penilaian website</h3>
            {ratings.length ? (
              <p>
                <span aria-label={`${averageRating.toFixed(1)} dari 5 bintang`}>{'★'.repeat(Math.round(averageRating))}</span>
                <strong>{averageRating.toFixed(1)}</strong>
                <small>{ratings.length} penilaian</small>
              </p>
            ) : <small>{loadError ? 'Rating belum dapat dimuat.' : 'Belum ada penilaian'}</small>}
          </div>
          <form className="public-website-rating-form" onSubmit={submitRating}>
            <div className="public-website-rating-stars" role="group" aria-label={`Beri rating untuk website ini`}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  aria-pressed={selectedRating === rating}
                  aria-label={`Beri rating ${rating} dari 5`}
                  className={rating <= selectedRating ? 'is-selected' : ''}
                  disabled={submittingRating}
                  onClick={() => setSelectedRating(rating)}
                >★</button>
              ))}
            </div>
            {selectedRating ? (
              <>
                <label htmlFor={`public-rating-message-${site}`}>Pesan <span>opsional</span></label>
                <textarea id={`public-rating-message-${site}`} name="message" maxLength={1000} rows={2} placeholder="Bagikan pengalaman singkat Anda (opsional)" />
                <button className="public-website-rating-submit" type="submit" disabled={submittingRating}>
                  {submittingRating ? 'Mengirim…' : 'Kirim rating'}
                </button>
              </>
            ) : null}
            {ratingMessage ? <p className="public-testimonial-success" role="status">{ratingMessage}</p> : null}
            {ratingError ? <p className="public-testimonial-error" role="alert">{ratingError}</p> : null}
          </form>
        </div>
        <form className="public-testimonial-form" onSubmit={submit}>
          <h3>Bagikan cerita Anda</h3>
          <p>Testimoni akan diperiksa admin sebelum ditampilkan di website.</p>
          <label>Nama <input name="name" required minLength={2} maxLength={80} /></label>
          <label>Acara atau layanan <input name="event" required minLength={2} maxLength={120} placeholder="Contoh: Pernikahan · Bandung" /></label>
          <label>Rating
            <select name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} dari 5 bintang</option>)}
            </select>
          </label>
          <label>Cerita Anda <textarea name="message" required minLength={10} maxLength={1000} rows={4} /></label>
          <button type="submit">Kirim testimoni</button>
          {submitMessage ? <p className="public-testimonial-success" role="status">{submitMessage}</p> : null}
          {submitError ? <p className="public-testimonial-error" role="alert">{submitError}</p> : null}
        </form>
      </div>
    </section>
  );
}

export function TestimonialModeration({ site, token }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await testimonialsApi.listAdmin(token, site));
    } catch (loadFailure) {
      setError(`Testimoni gagal dimuat: ${loadFailure.message}`);
    } finally {
      setLoading(false);
    }
  };

  const moderate = async (item, status) => {
    setError('');
    setMessage('');
    try {
      await testimonialsApi.moderate(token, item.id, status);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
      setMessage(status === 'visible' ? 'Testimoni disetujui dan ditampilkan.' : 'Testimoni disembunyikan.');
    } catch (moderationError) {
      setError(`Status testimoni gagal diperbarui: ${moderationError.message}`);
    }
  };

  return (
    <section className="admin-panel-block testimonial-moderation">
      <h3>Moderasi testimoni pengunjung</h3>
      <p className="muted">Tinjau testimoni dan rating pengunjung, lalu setujui kiriman yang boleh ditampilkan secara publik.</p>
      <button type="button" onClick={loadItems} disabled={loading}>{loading ? 'Memuat...' : 'Muat testimoni'}</button>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="testimonial-moderation-list">
        {items.map((item) => (
          <article key={item.id}>
            <div><strong>{item.name}</strong><span>{item.event}</span></div>
            {item.kind === 'rating' ? <p>Rating bintang tanpa ulasan tertulis.</p> : <p>{item.message}</p>}
            <small>{item.rating}/5 · {item.status === 'pending' ? 'Menunggu persetujuan' : 'Tampil di publik'}</small>
            {item.status === 'pending' ? <button type="button" onClick={() => moderate(item, 'visible')}>Setujui</button> : null}
            {item.status === 'visible' ? <button type="button" onClick={() => moderate(item, 'hidden')}>Sembunyikan</button> : null}
          </article>
        ))}
        {!loading && items.length === 0 ? <p>Belum ada testimoni yang perlu ditinjau.</p> : null}
      </div>
    </section>
  );
}
