import { useEffect, useState } from 'react';
import { seoApi } from '../lib/api';

const setMetaContent = (selector, attribute, name, content) => {
  let element = document.head.querySelector(selector);
  const existed = Boolean(element);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  const previousContent = element.getAttribute('content');
  element.setAttribute('content', content);
  return () => {
    if (existed) element.setAttribute('content', previousContent || '');
    else element.remove();
  };
};

export default function SeoHead({
  title,
  description,
  keywords = '',
  image = '',
  siteName = '',
  type = 'website',
  noIndex = false,
  canonicalUrl = '',
  siteId,
  isHomePage = true,
  siteBasePath = '/',
  faviconUrl = '',
}) {
  const [serverConfig, setServerConfig] = useState(null);

  useEffect(() => {
    if (!siteId) return undefined;
    let active = true;
    seoApi.publicConfig(siteId)
      .then((result) => {
        if (active && result?.seo) setServerConfig(result.seo);
      })
      .catch((error) => {
        if (active) console.error(`Konfigurasi SEO publik ${siteId} gagal dimuat:`, error);
      });
    return () => { active = false; };
  }, [siteId]);

  const seo = {
    title,
    description,
    keywords,
    image,
    noIndex,
    canonicalUrl,
    ...serverConfig,
    title: isHomePage ? serverConfig?.title || title : title,
    description: isHomePage ? serverConfig?.description || description : description,
  };

  useEffect(() => {
    const previousTitle = document.title;
    document.title = seo.title;
    let favicon = document.head.querySelector('link[rel="icon"]');
    const existedFavicon = Boolean(favicon);
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    const previousFaviconHref = favicon.getAttribute('href');
    const previousFaviconType = favicon.getAttribute('type');
    if (faviconUrl) {
      favicon.href = faviconUrl;
      favicon.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    }
    const routeCanonical = `${window.location.origin}${window.location.pathname}`;
    let canonicalHref = routeCanonical;
    if (seo.canonicalUrl) {
      try {
        const configuredCanonical = new URL(seo.canonicalUrl);
        if (configuredCanonical.protocol === 'https:') {
          const currentPath = window.location.pathname;
          const basePath = siteBasePath === '/' ? '' : siteBasePath.replace(/\/+$/, '');
          const routeSuffix = basePath && currentPath.startsWith(basePath)
            ? currentPath.slice(basePath.length)
            : currentPath;
          const canonicalBasePath = configuredCanonical.pathname.replace(/\/+$/, '');
          canonicalHref = new URL(`${canonicalBasePath}${routeSuffix || '/'}`, configuredCanonical.origin).href;
        }
      } catch {
        canonicalHref = routeCanonical;
      }
    }
    let canonical = document.head.querySelector('link[rel="canonical"]');
    const existedCanonical = Boolean(canonical);
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.getAttribute('href');
    canonical.setAttribute('href', canonicalHref);

    const restoreMeta = [
      setMetaContent('meta[name="description"]', 'name', 'description', seo.description),
      setMetaContent('meta[name="keywords"]', 'name', 'keywords', seo.keywords),
      setMetaContent('meta[name="robots"]', 'name', 'robots', seo.noIndex ? 'noindex,nofollow' : 'index,follow'),
      setMetaContent('meta[property="og:title"]', 'property', 'og:title', seo.title),
      setMetaContent('meta[property="og:description"]', 'property', 'og:description', seo.description),
      setMetaContent('meta[property="og:type"]', 'property', 'og:type', type),
      setMetaContent('meta[property="og:site_name"]', 'property', 'og:site_name', siteName),
      setMetaContent('meta[property="og:image"]', 'property', 'og:image', seo.ogImage || seo.image),
      setMetaContent('meta[name="twitter:card"]', 'name', 'twitter:card', seo.ogImage || seo.image ? 'summary_large_image' : 'summary'),
      setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title),
      setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description),
      setMetaContent('meta[name="twitter:image"]', 'name', 'twitter:image', seo.ogImage || seo.image),
    ];

    return () => {
      document.title = previousTitle;
      restoreMeta.reverse().forEach((restore) => restore());
      if (existedCanonical) canonical.setAttribute('href', previousCanonical || '');
      else canonical.remove();
      if (existedFavicon) {
        favicon.setAttribute('href', previousFaviconHref || '');
        if (previousFaviconType === null) favicon.removeAttribute('type');
        else favicon.setAttribute('type', previousFaviconType);
      } else {
        favicon.remove();
      }
    };
  }, [faviconUrl, isHomePage, seo.canonicalUrl, seo.description, seo.image, seo.keywords, seo.noIndex, seo.ogImage, seo.title, siteBasePath, siteName, type]);

  return null;
}
