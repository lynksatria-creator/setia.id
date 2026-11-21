import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PublicInvitation from './PublicInvitation';

export const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const templateId = (template) => {
  const name = String(template.name || '').trim().toLowerCase();
  const nameMap = {
    'luxury gold': 'luxury-gold',
    'royal black gold': 'royal-black-gold',
    'luxury maroon': 'luxury-maroon',
    'classic wedding': 'classic-wedding',
    'klasik emas': 'classic-wedding',
    'elegant white gold': 'elegant-white-gold',
    'romantic pink': 'rose-gold-romance',
    'rose gold romance': 'rose-gold-romance',
    'modern emerald': 'emerald-royal',
    'emerald royal': 'emerald-royal',
    'navy luxe': 'navy-royal',
    'royal sapphire': 'navy-royal',
    'royal sapphire & gold': 'navy-royal',
    'garden luxury': 'garden-luxury',
    'floral elegant': 'floral-elegant',
    'floral champagne': 'elegant-white-gold',
    'minimalist luxury': 'minimalist-luxury',
    'modern black': 'modern-black',
    'islamic gold': 'islamic-gold',
    'islamic emerald': 'islamic-emerald',
    'islamic white': 'islamic-white',
    'islamic maroon': 'islamic-maroon',
    'traditional sunda': 'traditional-sunda',
    'traditional jawa': 'traditional-jawa',
    'traditional nusantara': 'traditional-nusantara',
    'khitanan royal': 'khitanan-royal',
    'khitan modern': 'khitanan-royal',
    'aqiqah elegant': 'aqiqah-elegant',
    'birthday luxury': 'birthday-luxury',
    'birthday kids': 'birthday-kids',
    'birthday modern': 'birthday-kids',
    'graduation gold': 'graduation-gold',
    'wisuda': 'graduation-gold',
    'anniversary': 'anniversary',
    'engagement': 'engagement',
    'baby shower': 'baby-shower',
    'tasyakuran': 'tasyakuran',
    'corporate event': 'corporate-event',
    'custom premium': 'custom-premium',
    'lilac romance': 'custom-premium',
    'gen z editorial': 'gen-z-editorial',
  };
  return nameMap[name] || ({ gold: 'luxury-gold', pink: 'rose-gold-romance', emerald: 'emerald-royal', champagne: 'elegant-white-gold', navy: 'navy-royal', lilac: 'custom-premium' }[template.palette] || slugify(template.name));
};
const templateFamily = (template) => {
  const value = `${template.name} ${template.category} ${template.palette || ''}`.toLowerCase();
  if (value.includes('navy') || value.includes('sapphire') || value.includes('royal') && value.includes('navy')) return 'Royal Sapphire';
  if (value.includes('sunda') || value.includes('jawa') || value.includes('nusantara') || value.includes('adat')) return 'Adat & Budaya';
  if (value.includes('minimal') || value.includes('modern') || value.includes('custom')) return 'Modern Minimalis';
  if (value.includes('rose') || value.includes('pink') || value.includes('floral') || value.includes('romance')) return 'Dusty Rose';
  return 'Klasik Emas';
};

const previewDetailsByCategory = {
  pernikahan: { eventType: 'Pernikahan', title: 'Aulia & Farhan', coupleNames: 'Aulia & Farhan' },
  wedding: { eventType: 'Pernikahan', title: 'Aulia & Farhan', coupleNames: 'Aulia & Farhan' },
  engagement: { eventType: 'Engagement', title: 'Dina & Reza', coupleNames: 'Dina & Reza' },
  lamaran: { eventType: 'Lamaran', title: 'Dina & Reza', coupleNames: 'Dina & Reza' },
  tunangan: { eventType: 'Tunangan', title: 'Dina & Reza', coupleNames: 'Dina & Reza' },
  anniversary: { eventType: 'Anniversary', title: 'Dina & Reza', honoreeName: 'Dina & Reza' },
  aqiqah: { eventType: 'Aqiqah', title: 'Aqiqah Naira', honoreeName: 'Naira' },
  khitanan: { eventType: 'Khitanan', title: 'Khitanan Rafi', honoreeName: 'Rafi' },
  'ulang tahun': { eventType: 'Ulang Tahun', title: 'Ulang Tahun Naira', honoreeName: 'Naira' },
  'birthday': { eventType: 'Ulang Tahun', title: 'Ulang Tahun Naira', honoreeName: 'Naira' },
  tasyakuran: { eventType: 'Tasyakuran', title: 'Tasyakuran Keluarga', honoreeName: 'Keluarga Bahagia' },
  graduation: { eventType: 'Wisuda', title: 'Wisuda Alya', honoreeName: 'Alya' },
  wisuda: { eventType: 'Wisuda', title: 'Wisuda Alya', honoreeName: 'Alya' },
  'corporate event': { eventType: 'Corporate Event', title: 'Peresmian Kantor Baru', honoreeName: 'Peresmian Kantor Baru' },
  event: { eventType: 'Event', title: 'Acara Komunitas', honoreeName: 'Acara Komunitas' },
  'custom invitation': { eventType: 'Acara', title: 'Acara Spesial', honoreeName: 'Acara Spesial' },
};
const previewDetails = (category) => {
  const key = String(category || '').trim().toLowerCase();
  return previewDetailsByCategory[key] || {
    eventType: category || 'Acara',
    title: `Acara ${category || 'Spesial'}`,
    honoreeName: `Acara ${category || 'Spesial'}`,
  };
};

const readHashTemplate = (templates) => {
  const hash = window.location.hash.replace('#template-', '');
  return templates.find((template) => slugify(template.name) === hash) || null;
};

export const createPreviewInvitation = (template) => {
  const details = previewDetails(template.category);
  return {
    id: `template-demo-${slugify(template.name)}`,
    title: details.title,
    slug: `demo-${slugify(template.name)}`,
    content: {
      demo_template: true,
      template_id: templateId(template),
      template_name: template.name,
      event_type: details.eventType,
      couple_names: details.coupleNames || '',
      honoree_name: details.honoreeName || '',
      event_date: '2026-12-12',
      event_time: '10:00',
      venue: details.eventType === 'Corporate Event' ? 'Ruang Acara Perusahaan' : 'Tempat Acara',
      address: 'Indonesia',
      gallery: [
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85',
      ],
    },
  };
};

export default function Templates({ templates, demos, categories = [] }) {
  const [qrTemplate, setQrTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [previewTemplate, setPreviewTemplate] = useState(() => readHashTemplate(templates));
  const availableCategories = [...new Set([
    ...categories,
    ...templates.map((template) => template.category).filter(Boolean),
  ])].filter((category) => templates.some((template) => template.active !== false && template.category === category));
  const familyOptions = ['Semua', 'Klasik Emas', 'Adat & Budaya', 'Modern Minimalis', 'Royal Sapphire', 'Dusty Rose'];
  const categoryOptions = familyOptions.filter((family) => family === 'Semua' || templates.some((template) => template.active !== false && templateFamily(template) === family));
  const visibleTemplates = templates.filter((template) => (
    template.active !== false && (selectedCategory === 'Semua' || templateFamily(template) === selectedCategory)
  ));

  useEffect(() => {
    const handleHashChange = () => {
      setPreviewTemplate(readHashTemplate(templates));
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [templates]);

  useEffect(() => {
    if (!previewTemplate) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setPreviewTemplate(null);
      if (window.location.hash.startsWith('#template-')) {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewTemplate]);

  const openPreview = (template) => {
    setPreviewTemplate(template);
    const hash = `#template-${slugify(template.name)}`;
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  const closePreview = () => {
    setPreviewTemplate(null);
    if (window.location.hash.startsWith('#template-')) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  return (
    <>
      <section id="categories" className="section-wrap muted-bg">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Kategori</p>
            <h2>Pilih kategori undangan</h2>
          </div>
          <div className="category-grid" aria-label="Filter kategori template undangan">
            {categoryOptions.map((category) => {
              const count = category === 'Semua'
                ? templates.filter((template) => template.active !== false).length
                : templates.filter((template) => template.active !== false && templateFamily(template) === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  className={`category-pill${selectedCategory === category ? ' selected' : ''}`}
                  aria-pressed={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} <span>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="templates" className="section-wrap">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Template</p>
            <h2>{selectedCategory === 'Semua' ? 'Desain undangan yang siap Anda gunakan' : `Template ${selectedCategory}`}</h2>
            <p>Menampilkan {visibleTemplates.length} dari {templates.filter((template) => template.active !== false).length} template.</p>
          </div>
          {visibleTemplates.length ? (
            <div className="template-grid">
              {visibleTemplates.map((template) => {
              const slug = slugify(template.name);
              const shareUrl = `${window.location.origin}/undangan-preview/${slug}`;
              const showQr = qrTemplate === template.name;
              const details = previewDetails(template.category);

              return (
                <article id={`template-${slug}`} key={template.name} className={`template-card template-showcase-card invitation-template template-${template.palette}`}>
                  <div className="template-thumb template-mockup-stage invitation-thumb">
                    <div
                      className="template-phone-mockup template-phone-frame"
                      style={{
                        '--template-primary': template.colors?.[0] || '#b88e44',
                        '--template-background': template.colors?.[1] || '#fffdf8',
                      }}
                      aria-hidden="true"
                    >
                      <span className="template-phone-kicker">UNDANGAN</span>
                      <span className="template-phone-ornament">✦</span>
                      <strong>{details.coupleNames || details.honoreeName || 'Acara Spesial'}</strong>
                      <span>12 Desember 2026</span>
                    </div>
                  </div>
                  <div className="template-card-body">
                    <span className="template-tag">{templateFamily(template)}</span>
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                    <div className="template-card-actions">
                      <button aria-expanded={showQr} onClick={() => setQrTemplate(showQr ? null : template.name)}>{showQr ? 'Tutup QR' : 'Lihat QR'}</button>
                      <button className="template-preview-link" type="button" onClick={() => openPreview(template)}>Coba Preview</button>
                      <a className="template-preview-link" href={shareUrl}>Preview Undangan</a>
                    </div>
                  </div>
                  {showQr ? (
                    <div className="template-qr-panel">
                      <QRCodeSVG value={shareUrl} size={112} level="M" title={`QR untuk template ${template.name}`} />
                      <span>Pindai untuk membuka template ini</span>
                      <button className="template-preview-link" type="button" onClick={() => openPreview(template)}>Lihat Preview</button>
                    </div>
                  ) : null}
                </article>
              );
              })}
            </div>
          ) : <p className="template-empty-state">Belum ada template aktif untuk kategori {selectedCategory}. Pilih kategori lain untuk melihat template.</p>}
        </div>
      </section>

      {previewTemplate ? (
        <div
          className="template-preview-modal-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}
        >
          <section className="template-preview-modal" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
            <header className="template-preview-modal-header">
              <div><p className="eyebrow">Preview template</p><h2 id="template-preview-title">{previewTemplate.name}</h2></div>
              <button type="button" className="template-preview-close" aria-label="Tutup preview" onClick={closePreview}>×</button>
            </header>
            <div className="template-preview-modal-viewport">
              <div className="template-preview-phone">
                <PublicInvitation
                  invitation={createPreviewInvitation(previewTemplate)}
                  slug={`demo-${slugify(previewTemplate.name)}`}
                  previewRecipientName=""
                  previewMode
                />
              </div>
            </div>
            <footer className="template-preview-modal-actions">
              <button type="button" className="secondary-btn" onClick={closePreview}>Tutup</button>
              <a className="primary-btn" href={`/undangan-dashboard?template=${encodeURIComponent(templateId(previewTemplate))}`}>Gunakan template ini</a>
            </footer>
          </section>
        </div>
      ) : null}

      <section className="section-wrap invitation-demos">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Lihat contoh undangan</p>
            <h2>Inspirasi untuk setiap momen</h2>
          </div>
          <div className="demo-grid">
            {demos.map((demo) => (
              <article key={demo.name} className="demo-card">
                <div className="demo-thumb" />
                <small>{demo.category}</small>
                <h3>{demo.name}</h3>
                <a href="#templates">{demo.label}</a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
