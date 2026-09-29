import { articleSlug } from './Blog';

const articleCopy = {
  Design: 'Mulailah dari suasana acara: formal, garden, intimate, atau modern. Pilih warna dan tipografi yang selaras dengan dekorasi agar undangan digital menjadi bagian dari keseluruhan cerita.',
  Feature: 'Susun informasi dengan urutan yang jelas, lalu lengkapi dengan musik, galeri, peta lokasi, dan tombol RSVP. Pastikan semua fitur mudah digunakan dari layar ponsel.',
  Management: 'Kelompokkan daftar tamu, bagikan tautan personal, dan pantau konfirmasi kehadiran secara berkala. Informasi yang rapi membantu persiapan acara terasa lebih ringan.',
};

export default function BlogDetail({ articles, slug, onBack }) {
  const article = articles.find((item) => articleSlug(item.title) === slug);

  if (!article) {
    return (
      <main className="blog-detail-page container">
        <p className="eyebrow">Artikel tidak ditemukan</p>
        <button className="secondary-btn" onClick={onBack}>Kembali ke Undangan.id</button>
      </main>
    );
  }

  return (
    <main className="blog-detail-page container">
      <button className="blog-back-link" onClick={onBack}>← Kembali ke artikel</button>
      <article>
        <span className="eyebrow">{article.category}</span>
        <h1>{article.title}</h1>
        <div className="blog-detail-cover" />
        <p className="blog-detail-lead">{articleCopy[article.category] || 'Rencanakan detail acara dengan tenang dan pilih cara berbagi kabar yang terasa paling sesuai dengan cerita Anda.'}</p>
        <p>Undangan digital membantu semua informasi penting hadir dalam satu tautan yang mudah dibuka dan dibagikan. Pilih desain yang mencerminkan acara, lalu periksa kembali detail waktu, lokasi, serta nama sebelum tautan dikirim kepada keluarga dan sahabat.</p>
        <button className="primary-btn" onClick={onBack}>Jelajahi Undangan.id</button>
      </article>
    </main>
  );
}
