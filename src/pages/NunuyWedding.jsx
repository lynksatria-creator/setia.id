import { useEffect, useMemo, useRef, useState } from 'react';
import { PublicTestimonials } from '../components/PublicTestimonials';
import SeoHead from '../components/SeoHead';
import { nunuyConsultationsApi } from '../lib/api';
import './NunuyWedding.css';

const whatsappLink = (number, message) => {
  const normalizedNumber = String(number || '').replace(/\D/g, '');
  return normalizedNumber ? `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}` : '';
};

const defaultWhatsAppMessage = 'Halo Nunuy Nadhifa Wedding, saya ingin berkonsultasi mengenai paket dan layanan pernikahan. Mohon informasi lebih lanjut.';
const nunuyBasePath = '/nunuy-nadhifa-wedding';
const nunuyMenuPaths = {
  '#home': nunuyBasePath,
  '#about': `${nunuyBasePath}/tentang-kami`,
  '#services': `${nunuyBasePath}/layanan`,
  '#packages': `${nunuyBasePath}/paket-wedding`,
  '#gallery': `${nunuyBasePath}/galeri`,
  '#journal': `${nunuyBasePath}/inspirasi`,
  '#testimonials': `${nunuyBasePath}/testimoni`,
  '#faq': `${nunuyBasePath}/faq`,
  '#contact': `${nunuyBasePath}/kontak`,
};
const nunuyMenuPages = Object.fromEntries(
  Object.entries(nunuyMenuPaths).map(([section, pagePath]) => [pagePath, section.slice(1)]),
);
const createSlug = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const NunuyWedding = ({ data, whatsappNumber = '', whatsappMessage = '', phoneNumber = '', path = nunuyBasePath }) => {
  const [activeCategory, setActiveCategory] = useState(data.gallery?.allCategoriesLabel || 'Semua');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [whatsappFallbackHref, setWhatsappFallbackHref] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const consultationFormRef = useRef(null);
  const galleryItems = (data.gallery?.items || []).filter((item) => item.active && item.title && item.image);
  const allCategoriesLabel = data.gallery?.allCategoriesLabel || 'Semua';
  const services = (data.serviceSection?.items || []).filter((item) => item.active && item.title);
  const packages = (data.packageSection?.items || []).filter((item) => item.active && item.name);
  const articles = (data.journal?.items || []).filter((item) => item.active && item.title);
  const faqs = (data.faq?.items || []).filter((item) => item.active && item.question);
  const testimonials = (data.testimonials?.items || []).filter((item) => item.active && item.name && item.text);
  const projects = (data.portfolio?.projects || []).filter((item) => item.active && item.name);
  const teamMembers = (data.about?.team || []).filter((item) => item.active && item.name && item.image);
  const galleryCategories = useMemo(
    () => data.gallery?.categories || [...new Set(galleryItems.map((item) => item.category).filter(Boolean))],
    [data.gallery?.categories, data.gallery?.items],
  );
  const visibleGallery = activeCategory === allCategoriesLabel
    ? galleryItems
    : galleryItems.filter((item) => item.category === activeCategory);
  const serviceSlug = path.match(/^\/nunuy-nadhifa-wedding\/layanan\/([^/]+)$/)?.[1];
  const articleSlug = path.match(/^\/nunuy-nadhifa-wedding\/inspirasi\/([^/]+)$/)?.[1];
  const selectedService = services.find((item) => createSlug(item.slug || item.title) === serviceSlug);
  const selectedArticle = articles.find((item) => createSlug(item.slug || item.title) === articleSlug);
  const selectedMenuPage = nunuyMenuPages[path] || 'home';
  const showMenuPage = (page) => path === nunuyBasePath || selectedMenuPage === page;
  const menuHref = (section) => nunuyMenuPaths[section] || (section.startsWith('#') ? `${nunuyBasePath}${section}` : section);
  const detailTitle = selectedService?.title || selectedArticle?.title;
  const detailDescription = selectedService?.description || selectedArticle?.summary || data.seo?.description || data.about?.description;
  const menuTitle = (data.navigation || []).find((item) => item.href === `#${selectedMenuPage}`)?.label;
  const seoTitle = detailTitle
    ? `${detailTitle} | ${data.siteName}`
    : selectedMenuPage !== 'home' && menuTitle
      ? `${menuTitle} | ${data.siteName}`
      : data.seo?.title || `${data.siteName} | Wedding Planner`;
  const contactMessage = whatsappMessage || defaultWhatsAppMessage;
  const contactLink = whatsappLink(whatsappNumber, contactMessage);
  const getPackageWhatsAppLink = (packageName) => whatsappLink(
    whatsappNumber,
    `${contactMessage}\n\nSaya ingin menanyakan harga paket ${packageName}. Mohon informasikan harga dan rincian fasilitas paket tersebut.`,
  );
  const serviceConsultationLink = selectedService
    ? whatsappLink(
      whatsappNumber,
      `${contactMessage}\n\nSaya ingin berkonsultasi mengenai layanan ${selectedService.title} (menu: Layanan > ${selectedService.title}). Mohon informasikan pilihan paket, rekomendasi paket yang sesuai, dan harganya.`,
    )
    : '';
  const colors = data.brandColors || {};
  const siteStyle = {
    '--nunuy-purple': colors.purple || '#8861A2',
    '--nunuy-pink': colors.pink || '#B58ACB',
    '--nunuy-gold': colors.gold || '#D6B779',
    '--nunuy-peach': colors.peach || '#F4ECF8',
    '--nunuy-paper': colors.paper || '#FFFCFF',
    '--nunuy-ink': colors.ink || '#392843',
  };

  useEffect(() => {
    const canonicalHref = new URL(path, window.location.origin).href;
    const structuredData = document.createElement('script');
    structuredData.type = 'application/ld+json';
    structuredData.dataset.nunuySeo = 'true';
    structuredData.textContent = JSON.stringify(selectedArticle ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: selectedArticle.title,
      description: selectedArticle.summary,
      image: selectedArticle.image,
      author: { '@type': 'Organization', name: data.siteName },
      publisher: { '@type': 'Organization', name: data.siteName },
      mainEntityOfPage: canonicalHref,
    } : {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: data.siteName,
      description: detailDescription,
      url: canonicalHref,
      telephone: phoneNumber || whatsappNumber,
      email: data.contact?.email || undefined,
      image: selectedService?.image || data.hero?.image,
    });
    document.head.appendChild(structuredData);

    return () => structuredData.remove();
  }, [data.contact?.email, data.siteName, detailDescription, path, phoneNumber, selectedArticle, selectedService, whatsappNumber]);

  useEffect(() => {
    if (!lightboxImage) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setLightboxImage(null);
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const index = visibleGallery.findIndex((item) => item.title === lightboxImage.title);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + direction + visibleGallery.length) % visibleGallery.length;
        if (visibleGallery[nextIndex]) setLightboxImage(visibleGallery[nextIndex]);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lightboxImage, visibleGallery]);

  useEffect(() => {
    if (path !== nunuyBasePath || !consultationFormRef.current) return;
    const service = window.sessionStorage.getItem('nunuy-selected-service');
    const serviceSelect = consultationFormRef.current.elements.namedItem('service');
    if (service && serviceSelect) serviceSelect.value = service;
    window.sessionStorage.removeItem('nunuy-selected-service');
  }, [path]);

  const handleConsultation = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFormMessage('');
    setWhatsappFallbackHref('');
    if (!contactLink) {
      setFormMessage(data.consultation?.missingWhatsApp || 'Nomor WhatsApp belum diatur. Silakan hubungi admin website.');
      return;
    }

    const values = new FormData(form);
    const details = [
      'Halo Nunuy Nadhifa Wedding, saya ingin berkonsultasi mengenai pernikahan.',
      `Nama calon pengantin: ${values.get('couple')}`,
      `Nomor WhatsApp: ${values.get('phone')}`,
      `Email: ${values.get('email') || '-'}`,
      `Tanggal pernikahan: ${values.get('date') || '-'}`,
      `Lokasi acara: ${values.get('location') || '-'}`,
      `Perkiraan jumlah tamu: ${values.get('guests') || '-'}`,
      `Layanan: ${values.get('service') || '-'}`,
      `Paket: ${values.get('package') || '-'}`,
      `Kisaran anggaran: ${values.get('budget') || '-'}`,
      `Catatan: ${values.get('notes') || '-'}`,
    ].join('\n');

    if (!window.confirm(data.consultation?.confirmation || 'Detail konsultasi akan dibuka di WhatsApp. Lanjutkan?')) return;
    const whatsappUrl = whatsappLink(whatsappNumber, details);
    const whatsappWindow = window.open('about:blank', '_blank');
    setFormMessage('Menyimpan permintaan konsultasi…');
    try {
      await nunuyConsultationsApi.createPublic({
        couple: values.get('couple')?.toString().trim(),
        phone: values.get('phone')?.toString().trim(),
        email: values.get('email')?.toString().trim() || null,
        wedding_date: values.get('date') || null,
        location: values.get('location')?.toString().trim() || null,
        guests: values.get('guests') ? Number(values.get('guests')) : null,
        service: values.get('service') || null,
        package: values.get('package') || null,
        budget: values.get('budget') || null,
        notes: values.get('notes')?.toString().trim() || null,
      });
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
        setFormMessage(data.consultation?.successMessage || 'Permintaan tersimpan. WhatsApp terbuka dengan detail konsultasi Anda.');
      } else {
        setWhatsappFallbackHref(whatsappUrl);
        setFormMessage('Permintaan tersimpan. Pop-up diblokir browser; gunakan tautan WhatsApp untuk melanjutkan.');
      }
      form.reset();
    } catch (error) {
      whatsappWindow?.close();
      setWhatsappFallbackHref(contactLink);
      setFormMessage(`Permintaan belum tersimpan: ${error.message}. Anda tetap dapat menghubungi kami melalui WhatsApp.`);
    }
  };

  const serviceHref = (service) => `${nunuyBasePath}/layanan/${createSlug(service.slug || service.title)}`;
  const articleHref = (article) => `${nunuyBasePath}/inspirasi/${createSlug(article.slug || article.title)}`;
  const selectedDetail = selectedService || selectedArticle;

  return (
    <div className="nunuy-site" style={siteStyle}>
      <SeoHead
        siteId="nunuy"
        siteBasePath={nunuyBasePath}
        title={seoTitle}
        description={detailDescription || data.seo?.description || data.about?.description || ''}
        keywords={data.seo?.keywords || ''}
        image={selectedService?.image || selectedArticle?.image || data.hero?.image || ''}
        siteName={data.siteName}
        type={selectedArticle ? 'article' : 'website'}
        noIndex={data.seo?.noIndex}
        canonicalUrl={data.seo?.canonicalUrl}
        isHomePage={!detailTitle && selectedMenuPage === 'home'}
        faviconUrl="/nunuy-nadhifa-favicon.png"
      />
      <header className="nunuy-header">
        <a className="nunuy-brand" href={path === nunuyBasePath ? '#home' : nunuyBasePath} aria-label={data.uiLabels?.brandHomeLabel}>
          {data.logoImage ? <img className="nunuy-logo-image" src={data.logoImage} alt="" /> : <span className="nunuy-brand-flower" aria-hidden="true">✿</span>}
          <span className="nunuy-brand-copy"><strong>{data.siteName || 'Nunuy Nadhifa Wedding'}</strong><small>{data.logo || 'WEDDING'}</small></span>
        </a>
        <button className="nunuy-menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} onClick={() => setMenuOpen((open) => !open)}>
          <span /><span />
        </button>
        <nav className={`nunuy-nav${menuOpen ? ' is-open' : ''}`} aria-label={data.uiLabels?.primaryNavigationLabel}>
          {(data.navigation || []).map((item, index) => {
            const href = menuHref(item.href);
            return <a href={href} key={`${item.href}-${index}`} aria-current={href === path ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{item.label}</a>;
          })}
          <a href="/" onClick={() => setMenuOpen(false)}>Aurora Media</a>
        </nav>
        <a
          className="nunuy-nav-cta"
          href={selectedService ? serviceConsultationLink : `${nunuyBasePath}/kontak#consultation`}
          target={selectedService ? '_blank' : undefined}
          rel={selectedService ? 'noopener noreferrer' : undefined}
        >
          {data.uiLabels?.navigationCta} <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        {selectedDetail ? (
          <section className="nunuy-detail-page">
            <nav className="nunuy-breadcrumb" aria-label="Breadcrumb"><a href={nunuyBasePath}>Beranda</a><span>/</span><a href={menuHref(selectedArticle ? '#journal' : '#services')}>{selectedArticle ? 'Inspirasi' : 'Layanan'}</a><span>/</span><span>{detailTitle}</span></nav>
            <div className="nunuy-detail-layout">
              <div className="nunuy-detail-copy">
                <p className="nunuy-section-label">{selectedArticle ? 'WEDDING JOURNAL' : 'LAYANAN WEDDING' } <span /></p>
                <h1>{detailTitle}</h1>
                <p className="nunuy-detail-lead">{detailDescription}</p>
                {selectedArticle ? <div className="nunuy-detail-body">{selectedArticle.body?.split('\n').filter(Boolean).map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}</div> : (
                  <>
                    <h2>Ruang lingkup yang dibicarakan</h2>
                    <ul>{(selectedService.features || [selectedService.description]).map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}</ul>
                    <p className="nunuy-detail-disclaimer">Ketersediaan, fasilitas, dan ruang lingkup akhir dikonfirmasi bersama sebelum pemesanan.</p>
                  </>
                )}
                <a
                  className="nunuy-button nunuy-button-primary"
                  href={selectedService ? serviceConsultationLink : `${nunuyBasePath}/kontak#consultation`}
                  target={selectedService ? '_blank' : undefined}
                  rel={selectedService ? 'noopener noreferrer' : undefined}
                >
                  Konsultasi Gratis <span aria-hidden="true">↗</span>
                </a>
              </div>
              {(selectedService?.image || selectedArticle?.image) ? <img className="nunuy-detail-image" src={selectedService?.image || selectedArticle?.image} alt={selectedArticle ? `Inspirasi: ${selectedArticle.title}` : `Inspirasi layanan ${selectedService.title}`} /> : null}
            </div>
          </section>
        ) : (
        <>
        {showMenuPage('home') ? <section className="nunuy-hero" id="home">
          <div className="nunuy-hero-image" role="img" aria-label={`${data.siteName} — ${data.hero?.title}`} style={{ backgroundImage: `url("${data.hero?.image}")` }} />
          <div className="nunuy-hero-overlay" />
          <span className="nunuy-sparkle nunuy-sparkle-one" aria-hidden="true">✦</span>
          <span className="nunuy-sparkle nunuy-sparkle-two" aria-hidden="true">✧</span>
          <span className="nunuy-petal nunuy-petal-one" aria-hidden="true" />
          <span className="nunuy-petal nunuy-petal-two" aria-hidden="true" />
          <span className="nunuy-petal nunuy-petal-three" aria-hidden="true" />
          <div className="nunuy-hero-content">
            <p className="nunuy-kicker"><span /> {data.hero?.eyebrow} <span /></p>
            <p className="nunuy-hero-brand">{data.siteName}</p>
            <h1>{(data.hero?.title || '').split(' ').slice(0, -1).join(' ')} <em>{(data.hero?.title || '').split(' ').slice(-1)[0]}</em></h1>
            <p className="nunuy-hero-description">{data.hero?.subtitle}</p>
            <div className="nunuy-hero-actions">
              <a className="nunuy-button nunuy-button-light" href={`${nunuyBasePath}/kontak#consultation`}>{data.hero?.cta} <span aria-hidden="true">↗</span></a>
              <a className="nunuy-button nunuy-button-glass" href={menuHref('#gallery')}>{data.hero?.secondaryCta} <span aria-hidden="true">↓</span></a>
            </div>
            <div className="nunuy-hero-note"><span aria-hidden="true">✿</span> {data.hero?.note}</div>
            <div className="nunuy-hero-stats" aria-label="Komitmen layanan">
              {(data.hero?.stats || []).map((stat, index) => <div key={`${stat.label}-${index}`}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
            </div>
          </div>
          <a className="nunuy-scroll-cue" href={menuHref('#about')} aria-label={data.uiLabels?.scrollLabel}><span /> {data.uiLabels?.scrollCue}</a>
          <div className="nunuy-hero-index">01 <span /> 04</div>
        </section> : null}

        {showMenuPage('about') ? <section className="nunuy-intro nunuy-section" id="about">
          <div className="nunuy-intro-art" aria-hidden="true"><span>✿</span><span>✧</span></div>
          <div className="nunuy-section-label">{data.about?.label} <span /></div>
          <div className="nunuy-intro-grid">
            <h2>{data.about?.title}</h2>
            <div>
              <p className="nunuy-lead">{data.about?.tagline}</p>
              <p>{data.about?.description}</p>
              <a className="nunuy-text-link" href={`${nunuyBasePath}/kontak#consultation`}>{data.about?.linkText} <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          {data.about?.image ? <figure className="nunuy-about-image"><img src={data.about.image} alt={data.about.imageAlt || 'Inspirasi suasana pernikahan Nunuy Nadhifa Wedding'} loading="lazy" /><figcaption>Inspirasi visual · foto tim dan dokumentasi aktual dapat dikelola melalui panel admin.</figcaption></figure> : null}
          <div className="nunuy-vision-mission">
            <article><span>{data.uiLabels?.visionLabel}</span><h3>{data.about?.visionTitle}</h3><p>{data.about?.visionDescription}</p></article>
            <article><span>{data.uiLabels?.missionLabel}</span><h3>{data.about?.missionTitle}</h3><p>{data.about?.missionDescription}</p></article>
            <article><span>{data.uiLabels?.teamLabel}</span><h3>{data.about?.teamTitle}</h3><p>{data.about?.teamDescription}</p></article>
          </div>
          {teamMembers.length ? <div className="nunuy-team-grid">{teamMembers.map((member, index) => <article className="nunuy-team-card" key={`${member.name}-${index}`}><img src={member.image} alt={member.name} loading="lazy" /><h3>{member.name}</h3><p>{member.role}</p>{member.bio ? <small>{member.bio}</small> : null}</article>)}</div> : null}
          <div className="nunuy-values">
            {(data.about?.values || []).map((value, index) => <article key={`${value.title}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><h3>{value.title}</h3><p>{value.description}</p></article>)}
          </div>
        </section> : null}

        {showMenuPage('services') ? <section className="nunuy-services nunuy-section" id="services">
          <div className="nunuy-section-heading">
            <div><div className="nunuy-section-label">{data.serviceSection?.label} <span /></div><h2>{data.serviceSection?.title}<br /><em>{data.serviceSection?.emphasis}</em></h2></div>
            <p>{data.serviceSection?.description}</p>
          </div>
          <div className="nunuy-service-grid">
            {services.map((service, index) => (
              <article className="nunuy-service-card" key={`${service.title}-${index}`}>
                <div className="nunuy-service-image"><img src={service.image} alt={service.title} loading="lazy" /><span>{String(index + 1).padStart(2, '0')}</span></div>
                <div className="nunuy-service-copy"><h3>{service.title}</h3><p>{service.description}</p><a className="nunuy-service-detail-link" href={serviceHref(service)}>{data.serviceSection?.cardCta} <span aria-hidden="true">↗</span></a></div>
              </article>
            ))}
          </div>
        </section> : null}

        {showMenuPage('packages') ? <section className="nunuy-packages nunuy-section" id="packages">
          <div className="nunuy-section-heading">
            <div><div className="nunuy-section-label">{data.packageSection?.label} <span /></div><h2>{data.packageSection?.title}<br /><em>{data.packageSection?.emphasis}</em></h2></div>
            <p>{data.packageSection?.description}</p>
          </div>
          <div className="nunuy-package-grid">
            {packages.map((item, index) => (
              <article className={`nunuy-package-card nunuy-package-${index + 1}${item.popular ? ' is-popular' : ''}`} key={`${item.name}-${index}`}>
                {item.popular ? <span className="nunuy-package-popular">PALING POPULER</span> : null}
                <span className="nunuy-package-number">0{index + 1} / {data.uiLabels?.packageCardLabel}</span>
                <div className="nunuy-package-flower" aria-hidden="true">{['✿', '❀', '✾'][index % 3]}</div>
                <p className="nunuy-package-mood">{item.mood}</p><h3>{item.name}</h3><p>{item.description}</p>
                <ul>{(item.features || []).map((feature, featureIndex) => <li key={`${feature}-${featureIndex}`}><span aria-hidden="true">✦</span>{feature}</li>)}</ul>
                <dl className="nunuy-package-details">
                  <div><dt>Kru</dt><dd>{item.crew || 'Dibicarakan saat konsultasi'}</dd></div>
                  <div><dt>Durasi</dt><dd>{item.duration || 'Dibicarakan saat konsultasi'}</dd></div>
                  <div><dt>Dokumentasi</dt><dd>{item.documentation || 'Dibicarakan saat konsultasi'}</dd></div>
                </dl>
                <strong className="nunuy-package-price">{item.price || data.packageSection?.priceLabel}</strong>
                <a
                  href={whatsappNumber ? getPackageWhatsAppLink(item.name) : `${nunuyBasePath}/kontak#consultation`}
                  className="nunuy-package-link"
                  target={whatsappNumber ? '_blank' : undefined}
                  rel={whatsappNumber ? 'noopener noreferrer' : undefined}
                  onClick={() => {
                    if (whatsappNumber) return;
                    const packageSelect = consultationFormRef.current?.elements.namedItem('package');
                    if (packageSelect) packageSelect.value = item.name;
                  }}
                >
                  {data.packageSection?.cta} <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section> : null}

        {showMenuPage('gallery') ? <section className="nunuy-gallery nunuy-section" id="gallery">
          <div className="nunuy-section-heading">
            <div><div className="nunuy-section-label">{data.gallery?.label} <span /></div><h2>{data.gallery?.title}<br /><em>{data.gallery?.emphasis}</em></h2></div>
            <p>{data.gallery?.description}</p>
          </div>
          <div className="nunuy-gallery-filters" aria-label={data.uiLabels?.galleryFilterLabel}>
            {[allCategoriesLabel, ...galleryCategories].filter(Boolean).map((category) => <button type="button" className={activeCategory === category ? 'is-active' : ''} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>
          <div className="nunuy-gallery-grid">
            {visibleGallery.map((item) => (
              <button className="nunuy-gallery-item" key={item.title} type="button" onClick={() => { setLightboxImage(item); setLightboxZoomed(false); }} aria-label={`Perbesar ${item.title}`}>
                <img src={item.image} alt={`${item.title} — ${data.uiLabels?.galleryImageAlt}`} loading="lazy" /><span className="nunuy-gallery-caption"><small>{item.category}</small><strong>{item.title}</strong><i aria-hidden="true">↗</i></span>
              </button>
            ))}
          </div>
          <p className="nunuy-disclaimer">{data.gallery?.disclaimer}</p>
        </section> : null}

        {showMenuPage('gallery') ? <section className="nunuy-portfolio nunuy-section">
          <div className="nunuy-portfolio-copy"><div className="nunuy-section-label">{data.portfolio?.label} <span /></div><h2>{data.portfolio?.title}<br /><em>{data.portfolio?.emphasis}</em></h2><p>{data.portfolio?.description}</p><a className="nunuy-button nunuy-button-light" href={`${nunuyBasePath}/kontak#consultation`}>{data.portfolio?.cta} <span aria-hidden="true">↗</span></a></div>
          {projects.length ? <div className="nunuy-project-grid">{projects.map((project, index) => <article className="nunuy-project-card" key={`${project.name}-${index}`}>{project.image ? <img src={project.image} alt={project.name} loading="lazy" /> : null}<h3>{project.name}</h3><p>{[project.theme, project.location].filter(Boolean).join(' · ')}</p><p>{project.description}</p></article>)}</div> : <div className="nunuy-portfolio-image"><img src={data.portfolio?.image} alt={data.portfolio?.imageAlt} loading="lazy" /><span>{data.portfolio?.caption}</span></div>}
        </section> : null}

        {showMenuPage('testimonials') ? <PublicTestimonials
          site="nunuy"
          initialItems={testimonials}
          eyebrow={data.testimonials?.label}
          title={`${data.testimonials?.title || 'Cerita dari keluarga dan klien'} ${data.testimonials?.emphasis || ''}`.trim()}
          description={data.testimonials?.description}
          className="nunuy-testimonials nunuy-section"
          carousel
          sectionId="testimonials"
        /> : null}

        {showMenuPage('journal') ? <section className="nunuy-journal nunuy-section" id="journal">
          <div className="nunuy-section-heading">
            <div><div className="nunuy-section-label">{data.journal?.label} <span /></div><h2>{data.journal?.title}<br /><em>{data.journal?.emphasis}</em></h2></div>
            <p>{data.journal?.description}</p>
          </div>
          <div className="nunuy-journal-grid">
            {articles.map((article, index) => (
              <article className="nunuy-article-card" key={`${article.title}-${index}`}>
                <img src={article.image} alt={`Inspirasi: ${article.title}`} loading="lazy" /><div><span>{data.uiLabels?.journalLabel} · 0{index + 1}</span><h3>{article.title}</h3><p>{article.summary}</p><a className="nunuy-article-link" href={articleHref(article)}>{data.journal?.readMore} <span aria-hidden="true">↗</span></a></div>
              </article>
            ))}
          </div>
        </section> : null}

        {showMenuPage('faq') ? <section className="nunuy-faq nunuy-section" id="faq">
          <div><div className="nunuy-section-label">{data.faq?.label} <span /></div><h2>{data.faq?.title}<br /><em>{data.faq?.emphasis}</em></h2><p>{data.faq?.description}</p><a href={`${nunuyBasePath}/kontak#consultation`} className="nunuy-text-link">{data.faq?.consultationCta} <span aria-hidden="true">↗</span></a></div>
          <div className="nunuy-faq-list">{faqs.map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>
        </section> : null}

        {showMenuPage('contact') ? <section className="nunuy-consultation nunuy-section" id="contact">
          <div className="nunuy-consult-copy"><div className="nunuy-section-label">{data.consultation?.label} <span /></div><h2>{data.consultation?.title}<br /><em>{data.consultation?.emphasis}</em></h2><p>{data.consultation?.description}</p>
            {contactLink ? <a className="nunuy-contact-direct" href={contactLink} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span> {data.consultation?.directLinkLabel}</a> : <p className="nunuy-contact-direct">{data.consultation?.missingWhatsApp}</p>}
          </div>
          <form className="nunuy-consult-form" id="consultation" onSubmit={handleConsultation} ref={consultationFormRef}>
            <div className="nunuy-form-heading"><span>{data.consultation?.formLabel}</span><p>{data.consultation?.formDescription}</p></div>
            <label>{data.consultation?.fields?.couple} <span>*</span><input name="couple" required placeholder={data.consultation?.fields?.couplePlaceholder} /></label>
            <label>{data.consultation?.fields?.phone} <span>*</span><input name="phone" type="tel" required inputMode="tel" placeholder={data.consultation?.fields?.phonePlaceholder} /></label>
            <label>{data.consultation?.fields?.email}<input name="email" type="email" placeholder={data.consultation?.fields?.emailPlaceholder} /></label>
            <div className="nunuy-form-row"><label>{data.consultation?.fields?.date}<input name="date" type="date" /></label><label>{data.consultation?.fields?.guests}<input name="guests" type="number" min="1" placeholder={data.consultation?.fields?.guestsPlaceholder} /></label></div>
            <label>{data.consultation?.fields?.location}<input name="location" placeholder={data.consultation?.fields?.locationPlaceholder} /></label>
            <div className="nunuy-form-row"><label>{data.consultation?.serviceLabel}<select name="service" defaultValue=""><option value="">{data.consultation?.fields?.servicePlaceholder}</option>{services.map((service, index) => <option key={`${service.title}-${index}`}>{service.title}</option>)}</select></label><label>{data.consultation?.packageLabel}<select name="package" defaultValue=""><option value="">{data.consultation?.fields?.packagePlaceholder}</option>{packages.map((item, index) => <option key={`${item.name}-${index}`}>{item.name}</option>)}</select></label></div>
            <label>{data.consultation?.budgetLabel}<select name="budget" defaultValue=""><option value="">{data.consultation?.budgetPlaceholder}</option>{(data.consultation?.budgetOptions || []).map((option, index) => <option key={`${option}-${index}`}>{option}</option>)}</select></label>
            <label>{data.consultation?.fields?.notes}<textarea name="notes" rows="3" placeholder={data.consultation?.fields?.notesPlaceholder} /></label>
            <button className="nunuy-button nunuy-button-primary" type="submit">{data.consultation?.submitLabel} <span aria-hidden="true">↗</span></button>
            {formMessage ? <p className="nunuy-form-message" role="status">{formMessage}</p> : null}
            {whatsappFallbackHref ? <a className="nunuy-form-fallback-link" href={whatsappFallbackHref} target="_blank" rel="noopener noreferrer">Lanjutkan ke WhatsApp</a> : null}
            <small>{data.consultation?.privacyNote}</small>
          </form>
        </section> : null}
        </>
        )}
      </main>

      <footer className="nunuy-footer">
        <a className="nunuy-brand" href={path === nunuyBasePath ? '#home' : nunuyBasePath} aria-label={data.uiLabels?.brandHomeLabel}>
          {data.logoImage ? <img className="nunuy-logo-image" src={data.logoImage} alt="" /> : <span className="nunuy-brand-flower" aria-hidden="true">✿</span>}
          <span className="nunuy-brand-copy"><strong>{data.siteName || 'Nunuy Nadhifa Wedding'}</strong><small>{data.logo || 'WEDDING'}</small></span>
        </a>
        <p>{data.footer?.tagline}</p>
        {phoneNumber ? <a href={`tel:${String(phoneNumber).replace(/[^\d+]/g, '')}`}>{phoneNumber}</a> : null}
        {data.contact?.email ? <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a> : null}
        {data.contact?.address ? <address>{data.contact.address}</address> : null}
        {data.contact?.instagram ? <a href={data.contact.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
        {data.contact?.facebook ? <a href={data.contact.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> : null}
        {data.contact?.tiktok ? <a href={data.contact.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a> : null}
        {whatsappNumber ? <a className="whatsapp-contact-link" href={contactLink} target="_blank" rel="noopener noreferrer">{whatsappNumber}</a> : null}
        <a href="/">Aurora Media</a>
        <a href={path === nunuyBasePath ? '#home' : nunuyBasePath}>{data.footer?.backToTop} ↑</a>
        <small>© {new Date().getFullYear()} {data.siteName}</small>
      </footer>

      {contactLink ? <a className="nunuy-floating-whatsapp" href={contactLink} target="_blank" rel="noopener noreferrer" aria-label={data.uiLabels?.whatsappLabel} title={data.uiLabels?.whatsappTitle}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.7 6L0 24l6.4-1.7a11.8 11.8 0 0 0 5.7 1.5h.1c6.5 0 11.8-5.3 11.8-11.8a11.7 11.7 0 0 0-3.5-8.5ZM12.2 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.3-.4a9.8 9.8 0 0 1-1.5-5.2C2.2 6.5 6.7 2 12.2 2a9.7 9.7 0 0 1 7 2.9 9.8 9.8 0 0 1 2.9 7c0 5.5-4.5 9.9-9.9 9.9Zm5.5-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.5.1-.7l.5-.5.3-.5c.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.9 5.2.8.3 1.4.5 1.9.6.8.2 1.5.2 2.1.1.7-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z" /></svg></a> : null}

      {lightboxImage ? (
        <div className="nunuy-lightbox" role="dialog" aria-modal="true" aria-label={lightboxImage.title} onClick={() => setLightboxImage(null)}>
          <button className="nunuy-lightbox-close" type="button" aria-label={data.uiLabels?.closeImageLabel} onClick={() => setLightboxImage(null)}>×</button>
          <button className="nunuy-lightbox-previous" type="button" aria-label="Foto sebelumnya" onClick={(event) => { event.stopPropagation(); const index = visibleGallery.findIndex((item) => item.title === lightboxImage.title); setLightboxImage(visibleGallery[(index - 1 + visibleGallery.length) % visibleGallery.length]); }}>‹</button>
          <button className="nunuy-lightbox-zoom" type="button" aria-pressed={lightboxZoomed} onClick={(event) => { event.stopPropagation(); setLightboxZoomed((zoomed) => !zoomed); }}>{lightboxZoomed ? 'Perkecil' : 'Perbesar'}</button>
          <img className={lightboxZoomed ? 'is-zoomed' : ''} src={lightboxImage.image} alt={`${lightboxImage.title} — inspirasi visual`} onClick={(event) => event.stopPropagation()} />
          <button className="nunuy-lightbox-next" type="button" aria-label="Foto berikutnya" onClick={(event) => { event.stopPropagation(); const index = visibleGallery.findIndex((item) => item.title === lightboxImage.title); setLightboxImage(visibleGallery[(index + 1) % visibleGallery.length]); }}>›</button>
          <p>{lightboxImage.category} <span>·</span> {lightboxImage.title}</p>
        </div>
      ) : null}
    </div>
  );
};

export default NunuyWedding;
