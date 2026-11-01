export const SEO_DEFAULTS = {
  portal: {
    title: 'Portal.id | Rekomendasi Wedding, Musik & Undangan Digital',
    description: 'Temukan wedding organizer, hiburan musik, dan undangan digital pilihan untuk merencanakan momen istimewa bersama partner Portal.id.',
    keywords: 'wedding organizer, hiburan musik, undangan digital, partner pernikahan, rekomendasi vendor acara',
    canonicalUrl: '',
    ogImage: '',
    noIndex: false,
  },
  gibrig: {
    title: 'Gibrig Entertainment | Musik Live untuk Acara di Garut',
    description: 'Sewa musik live, penyanyi, MC, dan paket hiburan untuk wedding serta acara keluarga di Garut bersama Gibrig Entertainment.',
    keywords: 'Gibrig Entertainment, musik live Garut, hiburan wedding Garut, penyanyi acara, paket musik hajatan',
    canonicalUrl: '',
    ogImage: '',
    noIndex: false,
  },
  nunuy: {
    title: 'Nunuy Nadhifa Wedding | Wedding Planner & Organizer',
    description: 'Rencanakan pernikahan personal bersama Nunuy Nadhifa Wedding. Konsultasikan layanan, paket, dan kebutuhan acara Anda.',
    keywords: 'Nunuy Nadhifa Wedding, wedding organizer Bandung, wedding planner Bandung, dekorasi pernikahan, paket wedding',
    canonicalUrl: '',
    ogImage: '',
    noIndex: false,
  },
  invitation: {
    title: 'Nuansa Invite | Undangan Digital Pernikahan & Acara',
    description: 'Buat undangan digital pernikahan dan acara yang elegan, personal, mudah dibagikan, lengkap dengan RSVP dan buku tamu di Nuansa Invite.',
    keywords: 'undangan digital, undangan pernikahan online, website pernikahan, RSVP online, undangan acara digital',
    canonicalUrl: '',
    ogImage: '',
    noIndex: false,
  },
};

export const SEO_WEBSITES = [
  { id: 'portal', name: 'Portal.id', href: '/', cmsKey: 'portal-cms' },
  { id: 'gibrig', name: 'Gibrig Entertainment / Musik.id', href: '/gibrig', cmsKey: 'gibrig-cms' },
  { id: 'nunuy', name: 'Nunuy Nadhifa Wedding', href: '/nunuy-nadhifa-wedding', cmsKey: 'nunuy-cms' },
  { id: 'invitation', name: 'Nuansa Invite', href: '/undangan', cmsKey: 'invitation-cms' },
].map((website) => ({ ...website, defaults: SEO_DEFAULTS[website.id] }));
