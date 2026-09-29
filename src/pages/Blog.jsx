export const articleSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Blog({ articles, onOpen }) {
  return (
    <section id="blog" className="section-wrap invitation-blog-section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Blog & artikel</p>
          <h2>Tips dan inspirasi untuk momen spesial</h2>
        </div>
        <div className="article-grid">
          {articles.map((article) => (
            <article key={article.title} className="article-card">
              <div className="article-thumb" />
              <small>{article.category}</small>
              <h3>{article.title}</h3>
              <button onClick={() => onOpen(articleSlug(article.title))}>Baca Artikel <span aria-hidden="true">↗</span></button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
