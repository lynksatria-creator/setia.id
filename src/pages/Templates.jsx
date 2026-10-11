import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PublicInvitation from './PublicInvitation';

export const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const templateId = (template) => ({ gold: 'luxury-gold', pink: 'rose-gold-romance', emerald: 'emerald-royal', champagne: 'elegant-white-gold', navy: 'navy-royal', lilac: 'custom-premium' }[template.palette] || slugify(template.name));

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
  const categoryOptions = ['Semua', ...availableCategories];
  const visibleTemplates = templates.filter((template) => (
    template.active !== false && (selectedCategory === 'Semua' || template.category === selectedCategory)
  ));

  useEffect(() => {
    const handleHashChange = () => {
      const nextTemplate = readHashTemplate(templates);
      setPreviewTemplate(nextTemplate);
      if (nextTemplate) window.setTimeout(() => document.getElementById('template-preview')?.scrollIntoView({ behavior: 'smooth' }), 80);
    };
    window.addEventListener('hashchange', handleHashChange);
    if (previewTemplate) window.setTimeout(() => document.getElementById('template-preview')?.scrollIntoView({ behavior: 'smooth' }), 80);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [templates, previewTemplate]);

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
                : templates.filter((template) => template.active !== false && template.category === category).length;
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
              const previewUrl = shareUrl;
              const showQr = qrTemplate === template.name;

              return (
                <article id={`template-${slug}`} key={template.name} className={`template-card invitation-template template-${template.palette}`}>
                  <div className="template-thumb invitation-thumb" />
                  <span className="template-tag">{template.category}</span>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <div className="template-card-actions">
                    <button aria-expanded={showQr} onClick={() => setQrTemplate(showQr ? null : template.name)}>{showQr ? 'Tutup QR' : 'Lihat QR'}</button>
                    <a className="template-preview-link" href={previewUrl}>Preview Undangan</a>
                  </div>
                  {showQr ? (
                    <div className="template-qr-panel">
                      <QRCodeSVG value={shareUrl} size={112} level="M" title={`QR untuk template ${template.name}`} />
                      <span>Pindai untuk membuka template ini</span>
                      <a className="template-preview-link" href={previewUrl}>Lihat Preview</a>
                    </div>
                  ) : null}
                </article>
              );
              })}
            </div>
          ) : <p className="template-empty-state">Belum ada template aktif untuk kategori {selectedCategory}. Pilih kategori lain untuk melihat template.</p>}
          {previewTemplate ? <section id="template-preview" className="template-public-preview"><div className="template-public-preview-heading"><div><p className="eyebrow">Preview untuk calon undangan</p><h2>{previewTemplate.name}</h2></div><button onClick={() => setPreviewTemplate(null)}>Tutup Preview</button></div><div className="template-public-preview-viewport"><PublicInvitation invitation={createPreviewInvitation(previewTemplate)} slug={`demo-${slugify(previewTemplate.name)}`} /></div></section> : null}
        </div>
      </section>

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
