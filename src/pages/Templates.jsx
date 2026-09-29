import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PublicInvitation from './PublicInvitation';

export const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const templateId = (template) => ({ gold: 'luxury-gold', pink: 'rose-gold-romance', emerald: 'emerald-royal', champagne: 'elegant-white-gold', navy: 'navy-royal', lilac: 'custom-premium' }[template.palette] || slugify(template.name));

const readHashTemplate = (templates) => {
  const hash = window.location.hash.replace('#template-', '');
  return templates.find((template) => slugify(template.name) === hash) || null;
};

export const createPreviewInvitation = (template) => ({
  id: `template-demo-${slugify(template.name)}`,
  title: 'Aulia & Farhan',
  slug: `demo-${slugify(template.name)}`,
  content: {
    demo_template: true,
    template_id: templateId(template),
    event_type: template.category || 'Pernikahan',
    couple_names: 'Aulia & Farhan',
    event_date: '2026-12-12',
    event_time: '10:00',
    venue: 'The Grand Ballroom',
    address: 'Jakarta Selatan, Indonesia',
    gallery: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85',
    ],
  },
});

export default function Templates({ templates, demos }) {
  const [qrTemplate, setQrTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(() => readHashTemplate(templates));

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
      <section id="templates" className="section-wrap">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Template</p>
            <h2>Desain undangan yang siap Anda gunakan</h2>
          </div>
          <div className="template-grid">
            {templates.map((template) => {
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
