// Mock data for Gibrig Entertainment website
// This will be replaced with backend API data later

export const initialSiteConfig = {
  brand: {
    name: 'Gibrig',
    subtitle: 'Entertainment',
    tagline: 'Official Gibrig Entertainment',
    phone: '0855-2475-2102',
    phoneRaw: '6285524752102',
    address: 'Kp Baranangsiang, Ds Sukahurip, Kec Cigedug, Kab Garut',
  },
  social: {
    tiktok: '@neng_syelfi_oktora_2',
    youtube: '@nengsyelfioktora7310',
    instagram: '@nengsyelfiofficial',
  },
  footer: {
    description:
      'Gibrig Entertainment menghadirkan musik live spektakuler untuk pernikahan, khitanan, ulang tahun, dan hajatan Anda.',
    copyright: '© 2026 Official Gibrig Entertainment. All rights reserved.',
    quickLinks: [
      { label: 'Artis', href: '#artis' },
      { label: 'Paket', href: '#paket' },
      { label: 'Galeri', href: '#galeri' },
      { label: 'Testimoni', href: '#testimoni' },
      { label: 'Booking', href: '#booking' },
    ],
  },
  // Editable sections via admin panel
  hero: {
    headlineTop: 'Hiburan',
    headlineAccent: 'Berkualitas',
    headlineBottom: 'Momen',
    headlineBottomAccent: 'Tak Terlupakan',
    description:
      'Gibrig Musik Entertainment menghadirkan musik live spektakuler untuk pernikahan, khitanan, ulang tahun, dan hajatan Anda — formasi lengkap, tim profesional, harga ramah lokasi.',
    ctaLabel: 'Lihat Paket',
    ctaHref: '#paket',
    photo: '',
    stats: [
      { value: '100+', label: 'Acara Sukses' },
      { value: '3', label: 'Pilihan Paket' },
      { value: '5★', label: 'Rating Klien' },
    ],
  },
  packages: [],
  gallery: [],
  testimonials: [],
};

// initialize editable sections with existing mock arrays
initialSiteConfig.packages = [
  ...(
    [
      {
        id: 'paket-1',
        name: 'Paket 1',
        label: 'Esensial',
        badge: null,
        image:
          'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/5auam5gf_WhatsApp%20Image%202026-06-11%20at%2009.47.40.jpeg',
        description: 'Pilihan ekonomis dengan formasi musik standar untuk acara intim.',
        items: ['Kendang', 'Melodi', 'Keyboard', 'MC', 'Singer 2 Orang', 'Soundsistem'],
        price: 'Menyesuaikan Lokasi',
      },
      {
        id: 'paket-2',
        name: 'Paket 2',
        label: 'Populer',
        badge: 'Populer',
        image:
          'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/ltv7hoqj_WhatsApp%20Image%202026-06-11%20at%2009.48.02.jpeg',
        description: 'Formasi lengkap dengan kentrung & terompet untuk acara meriah.',
        items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'MC', 'Singer 2 Orang', 'Soundsistem'],
        price: 'Menyesuaikan Lokasi',
      },
      {
        id: 'paket-3',
        name: 'Paket 3',
        label: 'Premium',
        badge: null,
        image:
          'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/acnkfdp2_WhatsApp%20Image%202026-06-11%20at%2009.48.20.jpeg',
        description: 'Paket spesial — tampil bersama Neng Syelfi Oktora secara langsung.',
        items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'Neng Syelfi Oktora', 'Singer 2 Orang', 'Soundsistem'],
        price: 'Menyesuaikan Lokasi',
      },
    ]
  )
];

initialSiteConfig.gallery = [
  { id: 1, src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Pertunjukan live di panggung' },
  { id: 2, src: 'https://images.pexels.com/photos/15865403/pexels-photo-15865403.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940', caption: 'Resepsi pernikahan elegan' },
  { id: 3, src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Vokalis tampil di panggung' },
  { id: 4, src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Pengantin merayakan momen' },
  { id: 5, src: 'https://images.unsplash.com/photo-1583939411023-14783179e581?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Tamu menari di acara' },
  { id: 6, src: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Suasana panggung outdoor' },
];

initialSiteConfig.testimonials = [
  {
    id: 1,
    name: 'Ibu Ratna',
    event: 'Pernikahan • Garut',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&w=200&q=80',
    quote: 'Suara Neng Syelfi merdu sekali, tamu undangan ikut joget semua. Tim sangat profesional dari awal sampai selesai.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Pak Asep',
    event: 'Khitanan • Cigedug',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80',
    quote: 'Sound system jernih, MC ramah, dan paket 2 sangat cocok untuk acara khitanan anak saya. Recommended!',
    rating: 5,
  },
  {
    id: 3,
    name: 'Teh Dewi',
    event: 'Hajatan • Sukahurip',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=srgb&fm=jpg&w=200&q=80',
    quote: 'Booking via WhatsApp gampang banget, hari H tampil tepat waktu, formasi lengkap. Pasti pakai lagi.',
    rating: 5,
  },
];




export const artist = {
  name: 'Neng Syelfi Oktora',
  role: 'Artis Utama',
  image:
    'https://customer-assets.emergentagent.com/job_a90515ef-0030-4204-8c84-537c287d5958/artifacts/qw36c2aw_WhatsApp%20Image%202026-06-11%20at%2020.08.13.jpeg',
  genres: ['Dangdut', 'Pop', 'Religi', 'Sunda'],
  bio: 'Neng Syelfi Oktora adalah jantung dari setiap penampilan Gibrig Entertainment. Dikenal lewat suara merdu dan interaksi hangat bersama tamu, ia mampu menghidupkan suasana setiap hajatan dari pembuka hingga puncak acara.',
};

export const packages = [
  {
    id: 'paket-1',
    name: 'Paket 1',
    label: 'Esensial',
    badge: null,
    image:
      'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/5auam5gf_WhatsApp%20Image%202026-06-11%20at%2009.47.40.jpeg',
    description: 'Pilihan ekonomis dengan formasi musik standar untuk acara intim.',
    items: ['Kendang', 'Melodi', 'Keyboard', 'MC', 'Singer 2 Orang', 'Soundsistem'],
    price: 'Menyesuaikan Lokasi',
  },
  {
    id: 'paket-2',
    name: 'Paket 2',
    label: 'Populer',
    badge: 'Populer',
    image:
      'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/ltv7hoqj_WhatsApp%20Image%202026-06-11%20at%2009.48.02.jpeg',
    description: 'Formasi lengkap dengan kentrung & terompet untuk acara meriah.',
    items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'MC', 'Singer 2 Orang', 'Soundsistem'],
    price: 'Menyesuaikan Lokasi',
  },
  {
    id: 'paket-3',
    name: 'Paket 3',
    label: 'Premium',
    badge: null,
    image:
      'https://customer-assets.emergentagent.com/job_29f66553-bd67-47fa-9f27-4de4e5a9c024/artifacts/acnkfdp2_WhatsApp%20Image%202026-06-11%20at%2009.48.20.jpeg',
    description: 'Paket spesial — tampil bersama Neng Syelfi Oktora secara langsung.',
    items: ['Kendang', 'Melodi', 'Keyboard', 'Kentrung', 'Terompet', 'Neng Syelfi Oktora', 'Singer 2 Orang', 'Soundsistem'],
    price: 'Menyesuaikan Lokasi',
  },
];

export const gallery = [
  { id: 1, src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Pertunjukan live di panggung' },
  { id: 2, src: 'https://images.pexels.com/photos/15865403/pexels-photo-15865403.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940', caption: 'Resepsi pernikahan elegan' },
  { id: 3, src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Vokalis tampil di panggung' },
  { id: 4, src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Pengantin merayakan momen' },
  { id: 5, src: 'https://images.unsplash.com/photo-1583939411023-14783179e581?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Tamu menari di acara' },
  { id: 6, src: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?crop=entropy&cs=srgb&fm=jpg&w=900&q=80', caption: 'Suasana panggung outdoor' },
];

export const testimonials = [
  {
    id: 1,
    name: 'Ibu Ratna',
    event: 'Pernikahan • Garut',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&w=200&q=80',
    quote: 'Suara Neng Syelfi merdu sekali, tamu undangan ikut joget semua. Tim sangat profesional dari awal sampai selesai.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Pak Asep',
    event: 'Khitanan • Cigedug',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80',
    quote: 'Sound system jernih, MC ramah, dan paket 2 sangat cocok untuk acara khitanan anak saya. Recommended!',
    rating: 5,
  },
  {
    id: 3,
    name: 'Teh Dewi',
    event: 'Hajatan • Sukahurip',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=srgb&fm=jpg&w=200&q=80',
    quote: 'Booking via WhatsApp gampang banget, hari H tampil tepat waktu, formasi lengkap. Pasti pakai lagi.',
    rating: 5,
  },
];
