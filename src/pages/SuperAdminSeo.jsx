import { useEffect, useMemo, useState } from 'react';
import SeoHead from '../components/SeoHead';
import SuperAdminNav from '../components/SuperAdminNav';
import { adminApi } from '../lib/api';
import { SUPER_ADMIN_SESSION_KEY } from '../lib/adminSession';
import { SEO_WEBSITES } from '../lib/seoSites';

const scoreSeo = (seo) => {
  const titleLength = seo.title.trim().length;
  const descriptionLength = seo.description.trim().length;
  const targetKeywords = seo.keywords.split(',').map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
  const titleHasKeyword = targetKeywords.some((keyword) => seo.title.toLowerCase().includes(keyword));
  const descriptionHasKeyword = targetKeywords.some((keyword) => seo.description.toLowerCase().includes(keyword));
  return [
    titleLength >= 30 && titleLength <= 60,
    descriptionLength >= 120 && descriptionLength <= 160,
    targetKeywords.length >= 3 && (titleHasKeyword || descriptionHasKeyword),
    Boolean(seo.ogImage),
  ].filter(Boolean).length;
};

const readLocalSeo = (website) => {
  const stored = localStorage.getItem(website.cmsKey);
  if (!stored) return website.defaults;
  const data = JSON.parse(stored);
  return { ...website.defaults, ...(data.seo || {}) };
};

export default function SuperAdminSeo() {
  const [token] = useState(() => sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY));
  const [activeSiteId, setActiveSiteId] = useState(SEO_WEBSITES[0].id);
  const [configs, setConfigs] = useState(() => Object.fromEntries(SEO_WEBSITES.map((website) => {
    try {
      return [website.id, readLocalSeo(website)];
    } catch {
      return [website.id, website.defaults];
    }
  })));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const activeSite = SEO_WEBSITES.find((website) => website.id === activeSiteId) || SEO_WEBSITES[0];
  const activeSeo = configs[activeSite.id];
  const targetPreview = activeSeo.canonicalUrl || `${window.location.origin}${activeSite.href}`;

  useEffect(() => {
    let active = true;
    Promise.all(SEO_WEBSITES.map(async (website) => ({
      website,
      response: await adminApi.seoConfig(token, website.id),
    })))
      .then((results) => {
        if (!active) return;
        setConfigs((current) => Object.fromEntries(results.map(({ website, response }) => [
          website.id,
          response.seo ? { ...website.defaults, ...response.seo } : current[website.id],
        ])));
      })
      .catch((requestError) => {
        if (active) setError(`Konfigurasi SEO dari server gagal dimuat: ${requestError.message}`);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const checks = useMemo(() => {
    const titleLength = activeSeo.title.trim().length;
    const descriptionLength = activeSeo.description.trim().length;
    const targetKeywords = activeSeo.keywords.split(',').map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
    const keywordInContent = targetKeywords.some((keyword) => (
      activeSeo.title.toLowerCase().includes(keyword) || activeSeo.description.toLowerCase().includes(keyword)
    ));
    return [
      { label: 'Judul antara 30–60 karakter', complete: titleLength >= 30 && titleLength <= 60 },
      { label: 'Deskripsi antara 120–160 karakter', complete: descriptionLength >= 120 && descriptionLength <= 160 },
      { label: 'Minimal 3 frasa pencarian, salah satunya ada di judul/deskripsi', complete: targetKeywords.length >= 3 && keywordInContent },
      { label: 'Gambar pratinjau sosial tersedia', complete: Boolean(activeSeo.ogImage) },
    ];
  }, [activeSeo]);

  const updateField = (field, value) => {
    setConfigs((current) => ({
      ...current,
      [activeSite.id]: { ...current[activeSite.id], [field]: value },
    }));
    setError('');
    setMessage('');
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!activeSeo.title.trim() || !activeSeo.description.trim()) {
      setError('Judul dan deskripsi SEO wajib diisi.');
      return;
    }
    for (const [label, value] of [['URL canonical', activeSeo.canonicalUrl], ['Gambar Open Graph', activeSeo.ogImage]]) {
      if (!value) continue;
      try {
        if (new URL(value).protocol !== 'https:') throw new Error();
      } catch {
        setError(`${label} harus berupa URL HTTPS yang valid.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const saved = await adminApi.updateSeoConfig(token, activeSite.id, activeSeo);
      setConfigs((current) => ({ ...current, [activeSite.id]: { ...activeSite.defaults, ...saved.seo } }));
      setMessage(`SEO ${activeSite.name} berhasil disimpan dan tersedia untuk semua pengunjung website.`);
    } catch (requestError) {
      setError(`SEO belum tersimpan: ${requestError.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="super-admin-home">
      <SeoHead title="SEO Control Center | Super Admin" description="Pengelolaan metadata SEO semua website." siteName="Setia Creative" noIndex />
      <header className="billing-admin-header">
        <a className="brand" href="/setia-creative-admin"><span className="logo-mark">S</span>Super Admin</a>
        <div><span>SEO Control Center</span><a href="/setia-creative-admin">Dashboard</a></div>
      </header>
      <SuperAdminNav />
      <div className="super-admin-content">
        <section className="super-admin-intro">
          <p className="eyebrow">Super Admin · SEO</p>
          <h1>Kelola pencarian untuk setiap website.</h1>
          <p>Atur judul, deskripsi, frasa pencarian, dan pratinjau sosial terpisah. Pengaturan disimpan ke backend dan diterapkan pada website publik.</p>
        </section>

        <section className="seo-site-grid" aria-label="Status SEO website">
          {SEO_WEBSITES.map((website) => {
            const score = scoreSeo(configs[website.id]);
            return (
              <button
                type="button"
                key={website.id}
                className={`seo-site-card${activeSite.id === website.id ? ' is-selected' : ''}`}
                onClick={() => { setActiveSiteId(website.id); setError(''); setMessage(''); }}
                aria-pressed={activeSite.id === website.id}
              >
                <span>{website.name}</span>
                <strong>{score}/4</strong>
                <small>indikator SEO</small>
              </button>
            );
          })}
        </section>

        <section className="super-admin-section seo-editor-section">
          <div className="super-admin-section-heading">
            <div><p className="eyebrow">Pengaturan situs</p><h2>{activeSite.name}</h2></div>
            <a href={activeSite.href} target="_blank" rel="noreferrer">Buka website ↗</a>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="admin-editor-message" role="status">{message}</p> : null}
          {isLoading ? <p role="status">Memuat konfigurasi SEO…</p> : (
            <form className="seo-editor-card" onSubmit={save}>
              <label>
                SEO title
                <input maxLength={100} value={activeSeo.title} onChange={(event) => updateField('title', event.target.value)} required />
                <small>{activeSeo.title.length}/60 karakter disarankan. Utamakan nama brand dan frasa pencarian utama.</small>
              </label>
              <label>
                Meta description
                <textarea maxLength={320} rows={4} value={activeSeo.description} onChange={(event) => updateField('description', event.target.value)} required />
                <small>{activeSeo.description.length}/160 karakter disarankan. Tulis manfaat dan ajakan yang relevan.</small>
              </label>
              <label>
                Frasa pencarian target
                <textarea maxLength={500} rows={3} value={activeSeo.keywords} onChange={(event) => updateField('keywords', event.target.value)} placeholder="pisahkan setiap frasa dengan koma" />
                <small>Gunakan frasa yang relevan dan alami pada judul, heading, serta isi halaman. Meta keywords tidak digunakan Google untuk menentukan peringkat.</small>
              </label>
              <label>
                URL canonical (opsional)
                <input type="url" value={activeSeo.canonicalUrl} onChange={(event) => updateField('canonicalUrl', event.target.value)} placeholder="https://domain-website.com/halaman" />
                <small>Opsional: URL dasar HTTPS domain produksi (contoh https://portal.id/gibrig). Path halaman akan ditambahkan otomatis.</small>
              </label>
              <label>
                Gambar Open Graph (HTTPS)
                <input type="url" value={activeSeo.ogImage} onChange={(event) => updateField('ogImage', event.target.value)} placeholder="https://domain.com/gambar-share.jpg" />
              </label>
              <label className="seo-index-toggle">
                <input type="checkbox" checked={!activeSeo.noIndex} onChange={(event) => updateField('noIndex', !event.target.checked)} />
                Izinkan mesin pencari mengindeks website ini
              </label>

              <div className="seo-live-preview" aria-label="Pratinjau hasil pencarian">
                <p className="eyebrow">Pratinjau hasil pencarian</p>
                <strong>{activeSeo.title || 'Judul halaman'}</strong>
                <span>{targetPreview}</span>
                <p>{activeSeo.description || 'Deskripsi halaman akan tampil di sini.'}</p>
              </div>
              <ul className="seo-checklist" aria-label="Checklist optimasi SEO">
                {checks.map((check) => <li className={check.complete ? 'is-complete' : ''} key={check.label}>{check.complete ? '✓' : '○'} {check.label}</li>)}
              </ul>
              <button className="primary-btn" type="submit" disabled={isSaving || isLoading}>
                {isSaving ? 'Menyimpan…' : `Simpan SEO ${activeSite.name}`}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
