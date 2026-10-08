const palettes = [
  ['#14532d', '#d4af63', '#f6f3e8'],
  ['#7c2d12', '#e7b96a', '#fff8eb'],
  ['#1e3a8a', '#f0b74d', '#f5f7ff'],
  ['#7f1d3f', '#df9b8e', '#fff4f3'],
  ['#115e59', '#d6b36a', '#f0faf7'],
  ['#4c1d95', '#e2b4ca', '#faf5ff'],
  ['#78350f', '#c7a45b', '#fff9ed'],
  ['#164e63', '#e4a878', '#effbfc'],
  ['#365314', '#d3a44f', '#f7f8e9'],
  ['#334155', '#c89b5a', '#f8fafc'],
];

const provinces = [
  ['aceh', 'Aceh', 'Sumatra', 'Pintu Aceh'],
  ['sumatera-utara', 'Sumatera Utara', 'Sumatra', 'Ulos'],
  ['sumatera-barat', 'Sumatera Barat', 'Sumatra', 'Rumah Gadang'],
  ['riau', 'Riau', 'Sumatra', 'Melayu Riau'],
  ['kepulauan-riau', 'Kepulauan Riau', 'Sumatra', 'Bahari Kepulauan'],
  ['jambi', 'Jambi', 'Sumatra', 'Batik Jambi'],
  ['sumatera-selatan', 'Sumatera Selatan', 'Sumatra', 'Songket Palembang'],
  ['kepulauan-bangka-belitung', 'Kepulauan Bangka Belitung', 'Sumatra', 'Lempah Kuning'],
  ['bengkulu', 'Bengkulu', 'Sumatra', 'Batik Besurek'],
  ['lampung', 'Lampung', 'Sumatra', 'Kain Tapis'],
  ['banten', 'Banten', 'Jawa', 'Batik Banten'],
  ['dki-jakarta', 'DKI Jakarta', 'Jawa', 'Ondel-ondel Betawi'],
  ['jawa-barat', 'Jawa Barat', 'Jawa', 'Mega Mendung'],
  ['jawa-tengah', 'Jawa Tengah', 'Jawa', 'Kawung'],
  ['di-yogyakarta', 'DI Yogyakarta', 'Jawa', 'Parang Yogyakarta'],
  ['jawa-timur', 'Jawa Timur', 'Jawa', 'Batik Jawa Timur'],
  ['bali', 'Bali', 'Bali & Nusa Tenggara', 'Endek Bali'],
  ['nusa-tenggara-barat', 'Nusa Tenggara Barat', 'Bali & Nusa Tenggara', 'Tenun Sasak'],
  ['nusa-tenggara-timur', 'Nusa Tenggara Timur', 'Bali & Nusa Tenggara', 'Tenun Ikat'],
  ['kalimantan-barat', 'Kalimantan Barat', 'Kalimantan', 'Tenun Dayak'],
  ['kalimantan-tengah', 'Kalimantan Tengah', 'Kalimantan', 'Motif Batang Garing'],
  ['kalimantan-selatan', 'Kalimantan Selatan', 'Kalimantan', 'Kain Sasirangan'],
  ['kalimantan-timur', 'Kalimantan Timur', 'Kalimantan', 'Ulap Doyo'],
  ['kalimantan-utara', 'Kalimantan Utara', 'Kalimantan', 'Tenun Lundayeh'],
  ['sulawesi-utara', 'Sulawesi Utara', 'Sulawesi', 'Tenun Bentenan'],
  ['gorontalo', 'Gorontalo', 'Sulawesi', 'Sulaman Karawo'],
  ['sulawesi-tengah', 'Sulawesi Tengah', 'Sulawesi', 'Tenun Donggala'],
  ['sulawesi-barat', 'Sulawesi Barat', 'Sulawesi', 'Tenun Mandar'],
  ['sulawesi-selatan', 'Sulawesi Selatan', 'Sulawesi', 'Lontara Bugis'],
  ['sulawesi-tenggara', 'Sulawesi Tenggara', 'Sulawesi', 'Tenun Tolaki'],
  ['maluku', 'Maluku', 'Maluku', 'Pala dan Cengkih'],
  ['maluku-utara', 'Maluku Utara', 'Maluku', 'Rempah Ternate'],
  ['papua-barat', 'Papua Barat', 'Papua', 'Pesisir Cenderawasih'],
  ['papua-barat-daya', 'Papua Barat Daya', 'Papua', 'Gelombang Raja Ampat'],
  ['papua', 'Papua', 'Papua', 'Ukiran Asmat'],
  ['papua-selatan', 'Papua Selatan', 'Papua', 'Motif Asmat'],
  ['papua-tengah', 'Papua Tengah', 'Papua', 'Anyaman Noken'],
  ['papua-pegunungan', 'Papua Pegunungan', 'Papua', 'Geometri Lembah Baliem'],
];

export const regionalInvitationTemplates = provinces.map(([slug, name, islandGroup, inspiration], index) => {
  const [primary, accent, background] = palettes[index % palettes.length];
  return {
    id: `regional-${slug}`,
    name: `${name} · ${inspiration}`,
    province: name,
    islandGroup,
    inspiration,
    category: 'Nusantara',
    description: `Gaya undangan modern dengan palet dan ornamen abstrak yang terinspirasi dari ${inspiration}, ${name}.`,
    colors: [primary, accent, background],
    ornament: ['✦', '❋', '◇', '✿', '⌁', '✧'][index % 6],
  };
});

export const getRegionalInvitationTemplate = (templateId) => (
  regionalInvitationTemplates.find((template) => template.id === templateId)
);
