import { getSiteUrl } from './siteDomains';

export const SEO_DEFAULTS = {
  portal: {
    title: 'Aurora Media | Wedding, Musik & Undangan Digital',
    description: 'Temukan wedding organizer, hiburan musik, dan undangan digital pilihan bersama Aurora Media.',
    keywords: 'wedding organizer, hiburan musik, undangan digital, partner pernikahan, rekomendasi vendor acara',
    canonicalUrl: '',
    ogImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&h=630&q=85',
    noIndex: false,
  },
  gibrig: {
    title: 'Gibrig Entertainment | Musik Live untuk Acara di Garut',
    description: 'Sewa musik live, penyanyi, MC, dan paket hiburan untuk wedding serta acara keluarga di Garut bersama Gibrig Entertainment.',
    keywords: 'Gibrig Entertainment, musik live Garut, hiburan wedding Garut, penyanyi acara, paket musik hajatan',
    canonicalUrl: '',
    ogImage: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&h=630&q=85',
    noIndex: false,
  },
  nunuy: {
    title: 'Nunuy Nadhifa Wedding | Wedding Planner & Organizer',
    description: 'Rencanakan pernikahan personal bersama Nunuy Nadhifa Wedding. Konsultasikan layanan, paket, dan kebutuhan acara Anda.',
    keywords: 'Nunuy Nadhifa Wedding, wedding organizer Garut, wedding planner Garut, dekorasi pernikahan, paket wedding',
    canonicalUrl: '',
    ogImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=630&q=85',
    noIndex: false,
  },
  invitation: {
    title: 'Nuansa Invite | Undangan Digital Pernikahan & Acara',
    description: 'Buat undangan digital pernikahan dan acara yang elegan, personal, mudah dibagikan, lengkap dengan RSVP dan buku tamu di Nuansa Invite.',
    keywords: 'undangan digital, undangan pernikahan online, website pernikahan, RSVP online, undangan acara digital',
    canonicalUrl: '',
    ogImage: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&h=630&q=85',
    noIndex: false,
  },
};

export const SEO_WEBSITES = [
  { id: 'portal', name: 'Aurora Media', href: getSiteUrl('aurora'), sitemapUrl: getSiteUrl('aurora', '/sitemap-aurora-media.xml'), cmsKey: 'portal-cms' },
  { id: 'gibrig', name: 'Gibrig Entertainment / Entertainment Musik', href: getSiteUrl('entertainment', '/gibrig'), sitemapUrl: getSiteUrl('entertainment', '/sitemap-gibrig.xml'), cmsKey: 'gibrig-cms' },
  { id: 'nunuy', name: 'Nunuy Nadhifa Wedding', href: getSiteUrl('nunuy', '/nunuy-nadhifa-wedding'), sitemapUrl: getSiteUrl('nunuy', '/sitemap-nunuy.xml'), cmsKey: 'nunuy-cms' },
  { id: 'invitation', name: 'Nuansa Invite', href: getSiteUrl('invitation', '/undangan'), sitemapUrl: getSiteUrl('invitation', '/sitemap-nuansa-invite.xml'), cmsKey: 'invitation-cms' },
].map((website) => ({ ...website, defaults: SEO_DEFAULTS[website.id] }));
