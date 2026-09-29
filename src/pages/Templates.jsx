import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Templates({ templates, demos }) {
  const [qrTemplate, setQrTemplate] = useState(null);

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
              const shareUrl = `${window.location.origin}/undangan#template-${slug}`;
              const showQr = qrTemplate === template.name;

              return (
                <article id={`template-${slug}`} key={template.name} className={`template-card invitation-template template-${template.palette}`}>
                  <div className="template-thumb invitation-thumb" />
                  <span className="template-tag">{template.category}</span>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <button aria-expanded={showQr} onClick={() => setQrTemplate(showQr ? null : template.name)}>
                    {showQr ? 'Tutup QR' : 'Bagikan QR'}
                  </button>
                  {showQr ? (
                    <div className="template-qr-panel">
                      <QRCodeSVG value={shareUrl} size={112} level="M" title={`QR untuk template ${template.name}`} />
                      <span>Pindai untuk membuka template ini</span>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
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
