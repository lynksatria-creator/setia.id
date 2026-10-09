import { useEffect, useRef, useState } from 'react';
import { apiRequest, guestbookApi } from '../lib/api';
import { getRegionalInvitationTemplate } from '../lib/regionalInvitationTemplates';

const defaultSchedule = [
  { time: '08.00 WIB', title: 'Akad Nikah' },
  { time: '10.00 WIB', title: 'Sesi Foto' },
  { time: '11.00 WIB', title: 'Resepsi' },
  { time: '14.00 WIB', title: 'Acara Selesai' },
];

const formatCountdown = (target) => {
  const distance = Math.max(0, target - Date.now());
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
};

const calendarUrl = (content, invitation) => {
  const eventDate = content.event_date;
  const start = `${eventDate.replaceAll('-', '')}T${(content.event_time || '10:00').replace(':', '')}00`;
  const title = encodeURIComponent(`${content.event_type || 'Acara'} ${content.couple_names || content.honoree_name || invitation.title}`);
  const details = encodeURIComponent(content.opening_text || `Undangan resmi ${content.event_type || 'acara'}`);
  const location = encodeURIComponent(`${content.venue || ''} ${content.address || ''}`.trim());
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${start}&details=${details}&location=${location}`;
};

const videoEmbedUrl = (url) => {
  if (!url) return '';
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/i);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
};
const isDirectVideoUrl = (url) => (
  /^data:video\/(?:mp4|webm|ogg);base64,/i.test(url)
  || /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(url)
);

const isDirectVideoUrl = (url) => /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(url || '');

const templateThemes = {
  'luxury-gold': { primary: '#4b3520', accent: '#b28745', background: '#fbf7ed', font: 'Cormorant Garamond, Georgia, serif', cover: 'linear-gradient(135deg, #241a13, #bb9453 48%, #594126)', ornament: '✦' },
  'royal-black-gold': { primary: '#f5dfaa', accent: '#d9ae55', background: '#171411', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #050505, #282116 58%, #a8792d)', ornament: '◆' },
  'luxury-maroon': { primary: '#671f2d', accent: '#b77a55', background: '#fff6f0', font: 'Palatino Linotype, Georgia, serif', cover: 'linear-gradient(135deg, #3e101b, #8d3041 56%, #d2a268)', ornament: '❦' },
  'classic-wedding': { primary: '#5d4937', accent: '#a88657', background: '#fffdf8', font: 'Cormorant Garamond, Georgia, serif', cover: 'linear-gradient(135deg, #8b7659, #f4e6c9 52%, #67503b)', ornament: '❧' },
  'elegant-white-gold': { primary: '#75603e', accent: '#c9a85f', background: '#ffffff', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #eee7d8, #fffefa 55%, #c3a15d)', ornament: '✧' },
  'rose-gold-romance': { primary: '#824752', accent: '#c88783', background: '#fff7f6', font: 'Palatino Linotype, Georgia, serif', cover: 'linear-gradient(135deg, #5f2936, #d99c98 56%, #f5d4c5)', ornament: '♡' },
  'emerald-royal': { primary: '#14543f', accent: '#b69252', background: '#f1faf5', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #092f28, #167056 55%, #c5a15d)', ornament: '✦' },
  'navy-royal': { primary: '#d9b96e', accent: '#e0bd6d', background: '#111c2d', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #081321, #1d3a5d 58%, #b28a43)', ornament: '◆' },
  'garden-luxury': { primary: '#3e604d', accent: '#9d8150', background: '#f4f8f2', font: 'Palatino Linotype, Georgia, serif', cover: 'linear-gradient(135deg, #294636, #789875 55%, #e1c993)', ornament: '❧' },
  'floral-elegant': { primary: '#744c43', accent: '#b88a62', background: '#fff8ed', font: 'Cormorant Garamond, Georgia, serif', cover: 'linear-gradient(135deg, #6b3b36, #d1a178 55%, #f6e2c3)', ornament: '❦' },
  'minimalist-luxury': { primary: '#4b5563', accent: '#a78b62', background: '#f9fafb', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #1f2937, #6b7280 55%, #d6b777)', ornament: '—' },
  'modern-black': { primary: '#f7e7b1', accent: '#e2bd63', background: '#111111', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #050505, #222 55%, #c09543)', ornament: '＋' },
  'islamic-gold': { primary: '#6b4d20', accent: '#bd9344', background: '#fffaf0', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #493016, #b78b3c 55%, #f0d38b)', ornament: '۞' },
  'islamic-emerald': { primary: '#145c42', accent: '#bd9b55', background: '#f0fdf4', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #062d23, #16724e 55%, #c5a65b)', ornament: '۞' },
  'islamic-white': { primary: '#52606d', accent: '#b39b68', background: '#ffffff', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #dce2e5, #ffffff 55%, #cdbd8f)', ornament: '☾' },
  'islamic-maroon': { primary: '#701d28', accent: '#be9254', background: '#fff7ed', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #3e0c18, #831f34 55%, #d1a35a)', ornament: '۞' },
  'traditional-sunda': { primary: '#24553d', accent: '#b98945', background: '#f5f6e8', font: 'Palatino Linotype, Georgia, serif', cover: 'linear-gradient(135deg, #173d30, #668b58 55%, #d2aa5c)', ornament: '✿' },
  'traditional-jawa': { primary: '#6c3e20', accent: '#bd8b45', background: '#fff8ed', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #3e2112, #9b6636 55%, #d8b56d)', ornament: '❋' },
  'traditional-nusantara': { primary: '#863b1f', accent: '#d09a46', background: '#fffbeb', font: 'Palatino Linotype, Georgia, serif', cover: 'linear-gradient(135deg, #5b2115, #b9572c 55%, #e2bd68)', ornament: '✽' },
  'khitanan-royal': { primary: '#075985', accent: '#f0b74d', background: '#f0f9ff', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #082f49, #0284c7 55%, #f4c95d)', ornament: '✦' },
  'aqiqah-elegant': { primary: '#115e59', accent: '#c29462', background: '#f0fdfa', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #083b3a, #2c8c83 55%, #e4c48a)', ornament: '❧' },
  'birthday-luxury': { primary: '#9d174d', accent: '#e5aa45', background: '#fdf2f8', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #4a102e, #be3f75 55%, #f0c35a)', ornament: '✦' },
  'birthday-kids': { primary: '#1d4ed8', accent: '#f59e0b', background: '#eff6ff', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #1e40af, #38bdf8 55%, #facc15)', ornament: '★' },
  'graduation-gold': { primary: '#713f12', accent: '#d19d32', background: '#fefce8', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #422006, #a16207 55%, #f2c45e)', ornament: '✦' },
  anniversary: { primary: '#881337', accent: '#c18b55', background: '#fff1f2', font: 'Cormorant Garamond, Georgia, serif', cover: 'linear-gradient(135deg, #4c0519, #9f1239 55%, #d7a36d)', ornament: '♡' },
  engagement: { primary: '#9d174d', accent: '#d39a75', background: '#fff7fb', font: 'Palatino Linotype, Georgia, serif', cover: 'linear-gradient(135deg, #581c39, #db8cac 55%, #f4d4a5)', ornament: '♡' },
  'baby-shower': { primary: '#155e75', accent: '#d89d67', background: '#ecfeff', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #164e63, #67c8d2 55%, #f1c98f)', ornament: '✿' },
  tasyakuran: { primary: '#78350f', accent: '#b98b4c', background: '#fffbeb', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #451a03, #a16207 55%, #e6c875)', ornament: '✦' },
  'corporate-event': { primary: '#334155', accent: '#b08b4c', background: '#f8fafc', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #0f172a, #475569 55%, #c5a258)', ornament: '◆' },
  'custom-premium': { primary: '#6d28d9', accent: '#c09a55', background: '#faf5ff', font: 'Georgia, serif', cover: 'linear-gradient(135deg, #2e1065, #7c3aed 55%, #d8b36a)', ornament: '✦' },
  'gen-z-editorial': { primary: '#32156b', accent: '#ff4fa3', background: '#fff3fa', font: 'Arial, sans-serif', cover: 'linear-gradient(135deg, #4c1d95, #e879f9 48%, #fb7185)', ornament: '✷' },
};

const templateFrames = {
  'luxury-gold': 'ornate-gold', 'royal-black-gold': 'black-corner', 'luxury-maroon': 'maroon', 'classic-wedding': 'classic',
  'elegant-white-gold': 'ivory', 'rose-gold-romance': 'rose', 'emerald-royal': 'emerald', 'navy-royal': 'navy',
  'garden-luxury': 'botanical', 'floral-elegant': 'floral', 'minimalist-luxury': 'minimal', 'modern-black': 'modern',
  'islamic-gold': 'islamic', 'islamic-emerald': 'islamic', 'islamic-white': 'islamic', 'islamic-maroon': 'islamic',
  'traditional-sunda': 'traditional', 'traditional-jawa': 'traditional', 'traditional-nusantara': 'traditional',
  'khitanan-royal': 'playful', 'aqiqah-elegant': 'soft', 'birthday-luxury': 'celebration', 'birthday-kids': 'playful',
  'graduation-gold': 'academic', anniversary: 'heart', engagement: 'heart', 'baby-shower': 'soft', tasyakuran: 'islamic',
  'corporate-event': 'geometric', 'custom-premium': 'custom',
  'gen-z-editorial': 'genz',
};

const templateCopy = {
  'luxury-gold': { kicker: 'A Golden Beginning', greeting: 'Dengan penuh cinta dan kehangatan, kami mengundang Anda menyaksikan awal perjalanan indah kami.', quote: 'Cinta adalah perhiasan paling indah yang tumbuh dari dua hati yang saling memilih.', source: 'A Golden Beginning', storyTitle: 'The Golden Chapter', storyText: 'Sebuah kisah yang dirangkai dengan doa, kehangatan, dan janji untuk saling menjaga.', closing: 'May our love shine brighter with your blessing.' },
  'royal-black-gold': { kicker: 'A Royal Celebration', greeting: 'Dengan kehormatan dan sukacita, kami mengundang Anda menjadi bagian dari perayaan agung kami.', quote: 'Two souls, one promise, a lifetime of grandeur.', source: 'The Royal Vow', storyTitle: 'A Timeless Vow', storyText: 'Di antara gemerlap malam dan doa keluarga, kami memilih untuk berjalan dalam satu arah.', closing: 'With honor, love, and a lifetime ahead.' },
  'luxury-maroon': { kicker: 'A Love in Burgundy', greeting: 'Dengan hati yang penuh syukur, kami mengundang Anda merayakan cinta yang tumbuh semakin dalam.', quote: 'Cinta yang dewasa tidak selalu riuh, tetapi selalu tinggal.', source: 'The Burgundy Promise', storyTitle: 'Deeply, Truly, Always', storyText: 'Dari percakapan sederhana, tumbuh rasa yang akhirnya menemukan rumahnya.', closing: 'Our forever begins in the warmth of your prayers.' },
  'classic-wedding': { kicker: 'The Classic Union', greeting: 'Dengan hormat dan bahagia, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di hari pernikahan kami.', quote: 'The best things in life are better when shared.', source: 'A Classic Promise', storyTitle: 'Our Beginnings', storyText: 'Sebuah perjalanan sederhana yang membawa kami pada keputusan paling berarti.', closing: 'Forever starts with a single promise.' },
  'elegant-white-gold': { kicker: 'Purely, With Love', greeting: 'Dengan kesederhanaan dan ketulusan, kami mengundang Anda berbagi kebahagiaan bersama kami.', quote: 'In the quietest moments, love speaks the loudest.', source: 'The Quiet Vow', storyTitle: 'A Gentle Story', storyText: 'Kami menemukan bahwa rumah bukanlah tempat, melainkan seseorang untuk pulang.', closing: 'Thank you for making our day complete.' },
  'rose-gold-romance': { kicker: 'A Romantic Soirée', greeting: 'Dengan kasih yang lembut, kami mengundang Anda merayakan cerita cinta kami yang penuh warna.', quote: 'Love is the poetry written by two hearts.', source: 'Rose Gold Romance', storyTitle: 'Written in Romance', storyText: 'Setiap detik bersama terasa seperti halaman baru dari kisah yang ingin kami simpan selamanya.', closing: 'With a little romance and a lot of love.' },
  'emerald-royal': { kicker: 'Evergreen Love', greeting: 'Dengan penuh syukur, kami mengundang Anda menyaksikan janji yang ingin kami jaga sepanjang usia.', quote: 'Like an evergreen garden, true love grows through every season.', source: 'Evergreen Promise', storyTitle: 'Growing Together', storyText: 'Kami belajar bahwa cinta yang baik selalu memberi ruang untuk tumbuh bersama.', closing: 'May our love keep growing, always.' },
  'navy-royal': { kicker: 'The Midnight Vow', greeting: 'Dengan sukacita yang mendalam, kami mengundang Anda menyaksikan janji yang akan kami bawa sepanjang hidup.', quote: 'Under every sky, I will choose you again.', source: 'The Midnight Vow', storyTitle: 'Written in the Stars', storyText: 'Semesta mempertemukan kami, lalu doa membuat kami berani menetap.', closing: 'A lifetime of midnight promises begins.' },
  'garden-luxury': { kicker: 'A Garden of Love', greeting: 'Di antara doa dan keindahan alam, kami mengundang Anda merayakan hari bahagia kami.', quote: 'Love blooms where two hearts choose to nurture it.', source: 'Garden of Love', storyTitle: 'Where Love Blooms', storyText: 'Cerita kami tumbuh pelan, seperti taman yang dirawat dengan sabar dan penuh perhatian.', closing: 'Let love bloom in every season.' },
  'floral-elegant': { kicker: 'In Full Bloom', greeting: 'Dengan hati yang sedang berbunga, kami mengundang Anda hadir dan memberikan doa terbaik.', quote: 'Every love story is a flower waiting to bloom.', source: 'In Full Bloom', storyTitle: 'Petals of Our Story', storyText: 'Pertemuan kecil, perhatian sederhana, dan cinta yang mekar tanpa banyak suara.', closing: 'Our happiest chapter is finally in bloom.' },
  'minimalist-luxury': { kicker: 'Less, But Forever', greeting: 'Dengan penuh kebahagiaan, kami mengundang Anda dalam perayaan kecil yang bermakna bagi kami.', quote: 'All we need is love, and a lifetime to live it.', source: 'A Minimal Promise', storyTitle: 'Simply Us', storyText: 'Tidak perlu banyak kata. Cukup dua hati yang tahu ke mana harus pulang.', closing: 'Simple. Sincere. Forever.' },
  'modern-black': { kicker: 'The Modern Union', greeting: 'Dengan bahagia, kami mengundang Anda menjadi bagian dari perayaan cinta dengan gaya kami.', quote: 'No perfect story, just a perfect choice: us.', source: 'Modern Love', storyTitle: 'The Next Chapter', storyText: 'Kami memilih untuk menulis masa depan dengan cara kami sendiri, bersama-sama.', closing: 'This is our now. This is our forever.' },
  'islamic-gold': { kicker: 'Bismillah, Our Nikah', greeting: 'Bismillahirrahmanirrahim. Dengan memohon rahmat Allah SWT, kami mengundang Anda untuk hadir dalam akad nikah kami.', quote: 'Dan Dia menjadikan di antara kamu rasa kasih dan sayang. QS. Ar-Rum: 21', source: 'QS. Ar-Rum: 21', storyTitle: 'A Sacred Journey', storyText: 'Dengan bismillah kami melangkah, mengikat janji dalam ridho dan doa keluarga.', closing: 'Barakallahu laka wa baraka alaika.' },
  'islamic-emerald': { kicker: 'A Blessed Beginning', greeting: 'Assalamu’alaikum Warahmatullahi Wabarakatuh. Dengan penuh syukur, kami mengundang Anda dalam hari penuh keberkahan.', quote: 'Maka nikmat Tuhanmu yang manakah yang kamu dustakan?', source: 'QS. Ar-Rahman', storyTitle: 'In Allah’s Blessing', storyText: 'Setiap langkah kami titipkan kepada Allah, setiap kebahagiaan kami syukuri bersama.', closing: 'Semoga Allah menyatukan kami dalam sakinah, mawaddah, warahmah.' },
  'islamic-white': { kicker: 'A Sacred White Day', greeting: 'Dengan memohon ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk memberikan doa restu.', quote: 'Dan segala sesuatu Kami ciptakan berpasang-pasangan.', source: 'QS. Adz-Dzariyat: 49', storyTitle: 'A Pure Intention', storyText: 'Niat yang baik, doa yang panjang, dan satu langkah menuju ibadah terindah.', closing: 'Mohon doa restu untuk keluarga kecil kami.' },
  'islamic-maroon': { kicker: 'The Nikah Celebration', greeting: 'Dengan penuh harap dan doa, kami mengundang Anda untuk menyaksikan ikatan suci kami.', quote: 'Cinta yang berlabuh dalam doa akan menemukan jalannya.', source: 'A Nikah Prayer', storyTitle: 'Bound by Faith', storyText: 'Kami dipertemukan dalam takdir, dikuatkan dalam doa, dan disatukan dalam akad.', closing: 'Jazakumullahu khairan atas doa dan kehadiran.' },
  'traditional-sunda': { kicker: 'Wilujeng Sumping', greeting: 'Kalayan bingah sareng asih, sim kuring ngulem Bapa/Ibu/Sadaya kanggo ngiringan kabagjaan urang.', quote: 'Silih asah, silih asih, silih asuh.', source: 'Filosofi Sunda', storyTitle: 'Carita Urang', storyText: 'Dua hati bertemu dalam hangatnya keluarga dan kearifan tanah Sunda.', closing: 'Hatur nuhun parantos janten bagian tina kabagjaan urang.' },
  'traditional-jawa': { kicker: 'The Javanese Grace', greeting: 'Dengan penuh hormat, kami mengundang panjenengan untuk rawuh dan memberikan pangestu.', quote: 'Tresna iku tuwuh saka ati kang tulus.', source: 'Filosofi Jawa', storyTitle: 'Saklawase', storyText: 'Laku kami dimulai dengan restu, dijaga kesabaran, dan disempurnakan kebersamaan.', closing: 'Matur nuwun sanget atas doa dan pangestu.' },
  'traditional-nusantara': { kicker: 'A Nusantara Celebration', greeting: 'Dengan penuh sukacita, kami mengundang keluarga dan sahabat untuk merayakan hari istimewa kami.', quote: 'Berbeda langkah, satu tujuan; berbeda cerita, satu bahagia.', source: 'Nusantara Spirit', storyTitle: 'Dari Dua Keluarga', storyText: 'Sebuah pertemuan dua cerita, dua keluarga, dan satu masa depan yang kami pilih.', closing: 'Salam hangat dari keluarga kami.' },
  'khitanan-royal': { kicker: 'A Royal Milestone', greeting: 'Dengan sukacita, kami mengundang Anda merayakan langkah besar dan penuh berkah ini bersama keluarga kami.', quote: 'Tumbuh berani, tumbuh baik, tumbuh dalam doa.', source: 'A Family Celebration', storyTitle: 'A Brave New Step', storyText: 'Hari ini menjadi tanda tumbuhnya seorang jagoan kecil menuju langkah berikutnya.', closing: 'Terima kasih telah ikut membuat hari ini istimewa.' },
  'aqiqah-elegant': { kicker: 'A Little Blessing', greeting: 'Dengan penuh rasa syukur, kami mengundang Anda menyambut amanah dan kebahagiaan baru dalam keluarga kami.', quote: 'Kehadiran kecil, cinta yang tak terkira.', source: 'Aqiqah Blessing', storyTitle: 'Our Little Miracle', storyText: 'Satu tangis kecil membawa seribu doa dan kebahagiaan besar ke dalam rumah kami.', closing: 'Mohon doa terbaik untuk tumbuh kembang buah hati kami.' },
  'birthday-luxury': { kicker: 'A Night to Remember', greeting: 'Mari rayakan satu tahun lagi kehidupan, tawa, dan cerita yang semakin berharga.', quote: 'A year older, a life more beautiful.', source: 'Birthday Luxe', storyTitle: 'Another Beautiful Year', storyText: 'Setiap tahun adalah hadiah, dan setiap sahabat adalah bagian dari ceritanya.', closing: 'Let’s make this birthday unforgettable.' },
  'birthday-kids': { kicker: 'Let’s Make a Wish', greeting: 'Ayo datang dan rayakan hari paling seru bersama teman-teman kesayangan kami!', quote: 'Big smiles, bright dreams, and a little more fun.', source: 'Birthday Kids', storyTitle: 'The Birthday Adventure', storyText: 'Siapkan tawa, permainan, dan kejutan karena pesta seru akan segera dimulai.', closing: 'See you at the happiest party!' },
  'graduation-gold': { kicker: 'A New Achievement', greeting: 'Dengan penuh kebanggaan, kami mengundang Anda merayakan pencapaian dan langkah baru kami.', quote: 'The future belongs to those who believe in their dreams.', source: 'Graduation Day', storyTitle: 'The Next Horizon', storyText: 'Perjalanan panjang, kerja keras, dan doa akhirnya membawa kami ke hari yang membanggakan.', closing: 'One chapter ends. The best is yet to come.' },
  anniversary: { kicker: 'Still, Always, Us', greeting: 'Dengan cinta yang terus tumbuh, kami mengundang Anda merayakan perjalanan bersama kami.', quote: 'I choose you. Still. Always.', source: 'Anniversary Vow', storyTitle: 'Years of Us', storyText: 'Waktu boleh berjalan, tetapi rasa syukur memiliki satu sama lain selalu tinggal.', closing: 'Here’s to every year, every laugh, and every tomorrow.' },
  engagement: { kicker: 'The Beginning of Forever', greeting: 'Dengan bahagia, kami mengundang Anda merayakan langkah awal menuju selamanya.', quote: 'Before forever, there was this beautiful yes.', source: 'Our Engagement', storyTitle: 'The Yes Moment', storyText: 'Satu pertanyaan, satu jawaban, dan sejuta alasan untuk menantikan hari besar kami.', closing: 'From this yes, our forever begins.' },
  'baby-shower': { kicker: 'A Little Wonder', greeting: 'Mari berkumpul menyambut kehadiran kecil yang telah memenuhi hati kami dengan cinta.', quote: 'Sometimes the smallest things take up the most room in your heart.', source: 'Baby Shower', storyTitle: 'Waiting for You', storyText: 'Kami menghitung hari dengan penuh harap untuk bertemu dengan keajaiban kecil kami.', closing: 'Our tiny love is almost here.' },
  tasyakuran: { kicker: 'A Celebration of Gratitude', greeting: 'Dengan penuh syukur, kami mengundang Anda untuk berbagi doa dan kebahagiaan bersama keluarga kami.', quote: 'Syukur membuat yang sederhana terasa istimewa.', source: 'Tasyakuran', storyTitle: 'A Grateful Heart', storyText: 'Hari ini kami rayakan bukan hanya pencapaian, tetapi juga semua doa yang menyertai.', closing: 'Terima kasih telah hadir dalam syukur kami.' },
  'corporate-event': { kicker: 'A Signature Event', greeting: 'Dengan hormat, kami mengundang Anda untuk hadir dalam agenda penting dan berkesan ini.', quote: 'Ideas become impact when we build them together.', source: 'Corporate Event', storyTitle: 'The Agenda Ahead', storyText: 'Mari bertemu, bertukar gagasan, dan menciptakan momentum baru bersama.', closing: 'We look forward to welcoming you.' },
  'custom-premium': { kicker: 'Your Story, Your Signature', greeting: 'Setiap cerita memiliki warna sendiri. Mari mulai merancang momen yang sepenuhnya milik Anda.', quote: 'The most beautiful design is the one that feels like you.', source: 'Custom Premium', storyTitle: 'Made Especially for You', storyText: 'Tidak ada batas untuk membuat undangan yang mencerminkan cerita, rasa, dan karakter Anda.', closing: 'Your moment deserves a signature.' },
  'gen-z-editorial': { kicker: 'Main Character Energy', greeting: 'Save the date! Hari spesial kami bakal makin seru kalau kamu ikut hadir. See you there!', quote: 'Make memories, take pictures, stay a little longer.', source: 'The Moodboard', storyTitle: 'Our Plot Twist', storyText: 'Dari satu momen random, sekarang jadi cerita favorit yang mau kami rayakan bareng kamu.', closing: 'Outfit ready, camera ready, let’s celebrate!' },
};

export default function PublicInvitation({ slug, invitation: initialInvitation = null }) {
  const [invitation, setInvitation] = useState(initialInvitation);
  const [error, setError] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeLoading, setInviteeLoading] = useState(false);
  const [inviteeError, setInviteeError] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicPlaybackMessage, setMusicPlaybackMessage] = useState('');
  const [guestbook, setGuestbook] = useState([]);
  const [guestForm, setGuestForm] = useState({ name: '', message: '', attendance: 'attending', guests: 1 });
  const [guestMessage, setGuestMessage] = useState('');
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const musicRef = useRef(null);
  const contentRef = useRef(null);
  const ticketToken = initialInvitation ? '' : new URLSearchParams(window.location.search).get('ticket') || '';

  useEffect(() => {
    if (initialInvitation) {
      setInvitation(initialInvitation);
      return undefined;
    }
    let active = true;
    apiRequest(`/public/invitations/${encodeURIComponent(slug)}`)
      .then((result) => { if (active) setInvitation(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [initialInvitation, slug]);

  useEffect(() => {
    const musicUrl = invitation?.content?.music_url;
    if (!musicUrl || !musicRef.current) return undefined;
    let active = true;
    musicRef.current.play()
      .then(() => {
        if (!active) return;
        setIsMusicPlaying(true);
        setMusicPlaybackMessage('');
      })
      .catch(() => {
        if (!active) return;
        setIsMusicPlaying(false);
        setMusicPlaybackMessage('Browser menahan putar otomatis. Tekan “Putar musik” setelah membuka undangan.');
      });
    return () => { active = false; };
  }, [invitation?.content?.music_url]);

  useEffect(() => {
    if (!ticketToken) {
      setInviteeName('');
      setInviteeError('');
      setInviteeLoading(false);
      return undefined;
    }
    let active = true;
    setInviteeLoading(true);
    setInviteeError('');
    guestbookApi.getTicket(ticketToken)
      .then((ticket) => { if (active) setInviteeName(ticket.name); })
      .catch((requestError) => {
        if (!active) return;
        setInviteeName('');
        setInviteeError(requestError.message);
      })
      .finally(() => { if (active) setInviteeLoading(false); });
    return () => { active = false; };
  }, [ticketToken]);

  useEffect(() => {
    if (!invitation) return undefined;
    const content = invitation.content || {};
    const target = new Date(`${content.event_date || new Date().toISOString().slice(0, 10)}T${content.event_time || '10:00'}`).getTime();
    const update = () => setCountdown(formatCountdown(target));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [invitation]);

  useEffect(() => {
    if (!invitation || window.location.hash !== '#rsvp') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [invitation]);

  useEffect(() => {
    if (!invitation || initialInvitation) return undefined;
    guestbookApi.listPublic(invitation.slug)
      .then((entries) => setGuestbook(entries))
      .catch(() => {});
    return undefined;
  }, [initialInvitation, invitation]);

  if (error) return <main className="public-invitation-state"><p className="eyebrow">Undangan tidak tersedia</p><h1>Link ini belum aktif atau sudah berakhir.</h1><a href="/undangan">Kunjungi Undangan.id</a></main>;
  if (!invitation) return <main className="public-invitation-state"><p>Memuat undangan…</p></main>;

  const content = invitation.content || {};
  const digitalEnvelope = content.digital_envelope || {};
  const hasDigitalEnvelope = Boolean(
    (digitalEnvelope.bank?.enabled && digitalEnvelope.bank.name && digitalEnvelope.bank.account_name && digitalEnvelope.bank.account_number)
    || (digitalEnvelope.e_wallet?.enabled && digitalEnvelope.e_wallet.provider && digitalEnvelope.e_wallet.account_name && digitalEnvelope.e_wallet.account_number)
    || (digitalEnvelope.qris?.enabled && digitalEnvelope.qris.image_url),
  );
  const gallery = Array.isArray(content.gallery) ? content.gallery : [];
  const story = Array.isArray(content.love_story) ? content.love_story : [];
  const schedule = Array.isArray(content.schedule) ? content.schedule : (content.demo_template ? defaultSchedule : []);
  const coupleNames = (content.couple_names || '').trim();
  const [groomName, brideName] = coupleNames.split(/\s*&\s*/);
  const recipientName = new URLSearchParams(window.location.search).get('to')?.trim() || '';
  const prefersReducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoupleEvent = Boolean(content.couple_names)
    || ['Pernikahan', 'Akad Nikah', 'Resepsi', 'Akad & Resepsi', 'Lamaran', 'Tunangan', 'Walimatul Ursy'].includes(content.event_type);
  const honoreeName = content.honoree_name || invitation.title;
  const eventLabel = content.event_type || 'Acara istimewa';
  const defaultEvents = content.event_type === 'Akad & Resepsi'
    ? [
      { title: 'AKAD NIKAH', date: content.event_date, time: content.event_time, venue: content.venue, address: content.address, maps_url: content.maps_url },
      { title: 'RESEPSI', date: content.reception_date || content.event_date, time: content.reception_time || content.event_time, venue: content.reception_venue || content.venue, address: content.reception_address || content.address, maps_url: content.reception_maps_url || content.maps_url },
    ]
    : [{ title: (content.event_type || 'ACARA PERNIKAHAN').toUpperCase(), date: content.event_date, time: content.event_time, venue: content.venue, address: content.address, maps_url: content.maps_url }];
  const eventItems = (Array.isArray(content.events) ? content.events : defaultEvents).filter((event) => (
    [event.date, event.time, event.venue, event.address, event.maps_url].some((value) => typeof value === 'string' && value.trim())
  ));
  const templateClass = content.custom_design ? 'custom' : content.template_id || 'luxury-gold';
  const isTemplateDemo = Boolean(content.demo_template);
  const regionTemplate = getRegionalInvitationTemplate(templateClass);
  const copy = templateCopy[templateClass] || (regionTemplate ? {
    kicker: `Nusantara · ${regionTemplate.province}`,
    greeting: `Dengan hormat dan penuh kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara ${content.event_type || 'istimewa'} kami.`,
    quote: 'Beragam cerita, satu ruang untuk merayakan kebersamaan.',
    source: `Inspirasi ${regionTemplate.inspiration}`,
    storyTitle: 'Cerita dari Nusantara',
    storyText: `Sebuah perayaan yang kami rancang dengan sentuhan visual terinspirasi dari ${regionTemplate.inspiration}, ${regionTemplate.province}.`,
    closing: 'Sampai bertemu di hari istimewa kami.',
  } : templateCopy['luxury-gold']);
  const storyItems = typeof content.story === 'string' && content.story.trim()
      ? [{ title: eventLabel, date: content.event_date || '', text: content.story }]
      : isTemplateDemo
        ? [{ title: copy.storyTitle, date: 'Our chapter', text: copy.storyText }]
        : story;
  const coupleProfileItems = [
    {
      name: groomName,
      photo: content.groom_photo || content.cover_image,
      parents: content.groom_parents,
      instagram: content.groom_instagram,
      relationship: 'Putra',
      alt: 'Mempelai pria',
    },
    {
      name: brideName,
      photo: content.bride_photo || content.cover_image,
      parents: content.bride_parents,
      instagram: content.bride_instagram,
      relationship: 'Putri',
      alt: 'Mempelai wanita',
    },
  ].filter((person) => person.name || person.photo || person.parents || person.instagram);
  const storySectionTitle = isCoupleEvent ? copy.storyTitle : `Cerita ${eventLabel.toLowerCase()}`;
  const defaultGreeting = isCoupleEvent
    ? copy.greeting
    : `Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam acara ${eventLabel.toLowerCase()}${honoreeName ? ` untuk ${honoreeName}` : ''}. Kehadiran dan doa Anda merupakan kebahagiaan bagi kami.`;
  const greeting = content.opening_text || (isTemplateDemo && isCoupleEvent ? copy.greeting : defaultGreeting);
  const theme = templateThemes[templateClass] || (regionTemplate ? {
    primary: regionTemplate.colors[0],
    accent: regionTemplate.colors[1],
    background: regionTemplate.colors[2],
    font: 'Arial, sans-serif',
    cover: `linear-gradient(135deg, ${regionTemplate.colors[0]}, ${regionTemplate.colors[0]} 48%, ${regionTemplate.colors[1]})`,
    ornament: regionTemplate.ornament,
  } : templateThemes['luxury-gold']);
  const frameClass = content.custom_design ? 'custom' : regionTemplate ? 'regional' : templateFrames[templateClass] || 'classic';
  const coverVideo = content.video_url && isDirectVideoUrl(content.video_url) ? content.video_url : '';
  const customStyle = {
    '--public-primary': content.custom_design ? content.custom_primary || '#294b3e' : theme.primary,
    '--public-accent': content.custom_design ? content.custom_accent || '#995c49' : theme.accent,
    '--public-background': content.custom_design ? content.custom_background || '#f8f5ee' : theme.background,
    '--public-font': 'DM Sans, Avenir Next, Segoe UI, sans-serif',
    '--public-display-font': theme.font,
    '--public-cover': theme.cover,
  };

  const openInvitation = () => {
    setIsOpened(true);
    const musicPromise = musicRef.current?.play();
    musicPromise?.then(() => {
      setIsMusicPlaying(true);
      setMusicPlaybackMessage('');
    }).catch(() => {
      setIsMusicPlaying(false);
      setMusicPlaybackMessage('Tekan “Putar musik” untuk memulai musik undangan.');
    });
    window.setTimeout(() => {
      if (typeof contentRef.current?.scrollIntoView === 'function') {
        contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const toggleMusic = () => {
    if (!musicRef.current) return;
    if (isMusicPlaying) {
      musicRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      musicRef.current.play().then(() => {
        setIsMusicPlaying(true);
        setMusicPlaybackMessage('');
      }).catch(() => {
        setIsMusicPlaying(false);
        setMusicPlaybackMessage('Musik belum dapat diputar. Periksa tautan atau format file musik.');
      });
    }
  };

  const submitGuestbook = async (event) => {
    event.preventDefault();
    if (initialInvitation) {
      setGuestMessage('Form aktif setelah undangan dipublish.');
      return;
    }
    setIsGuestSubmitting(true);
    setGuestMessage('');
    try {
      const entry = await guestbookApi.createPublic(invitation.slug, guestForm);
      setGuestbook((current) => [entry, ...current]);
      setGuestForm({ name: '', message: '', attendance: 'attending', guests: 1 });
      setGuestMessage('Terima kasih, RSVP dan ucapan Anda sudah terkirim.');
    } catch (requestError) {
      setGuestMessage(requestError.message);
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  return (
    <main className={`public-invitation-page public-template-${templateClass} wedding-frame-${frameClass} ${isOpened ? 'is-opened' : ''}`} style={customStyle}>
      <section className={`wedding-cover${coverVideo ? ' has-cover-video' : ''}`} style={content.cover_image && !coverVideo ? { backgroundImage: `linear-gradient(180deg, rgba(24, 22, 18, 0.08), rgba(24, 22, 18, 0.58)), url("${content.cover_image}")` } : undefined}>
        {coverVideo ? <video className="wedding-cover-video" src={coverVideo} autoPlay={!prefersReducedMotion} muted loop playsInline aria-label="Video latar undangan" /> : null}
        <div className="wedding-cover-shimmer" aria-hidden="true" />
        <div className="wedding-ornament wedding-ornament-top">{theme.ornament}</div>
        <div className="wedding-cover-inner">
          <p className="wedding-kicker">UNDANGAN RESMI</p>
          {recipientName || inviteeName ? <p className="wedding-recipient-name"><span>Kepada Yth.</span><strong>{recipientName || inviteeName}</strong></p> : null}
          {inviteeError ? <p className="wedding-recipient-error" role="alert">Nama penerima tiket tidak dapat diverifikasi.</p> : null}
          <p className="wedding-event-label">{copy.kicker}</p>
          <h1>{isCoupleEvent ? coupleNames ? <>{groomName || coupleNames}{brideName ? <><span>&amp;</span>{brideName}</> : null}</> : invitation.title : honoreeName}</h1>
          <p className="wedding-cover-date">{content.event_date ? new Date(content.event_date).toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Save the date'}{content.event_time ? ` · ${content.event_time}` : ''}</p>
          {regionTemplate ? <p className="wedding-region-label">{regionTemplate.province} · Inspirasi {regionTemplate.inspiration}</p> : null}
          <button className="wedding-open-button" disabled={inviteeLoading || Boolean(ticketToken && inviteeError)} onClick={openInvitation}>{inviteeLoading ? 'MEMUAT NAMA TAMU…' : 'BUKA UNDANGAN'}</button>
        </div>
        <div className="wedding-ornament wedding-ornament-bottom">{theme.ornament}</div>
      </section>

      <audio ref={musicRef} className="wedding-audio" loop preload="metadata" autoPlay={Boolean(content.music_url)} src={content.music_url || undefined} controls={isOpened} onPlay={() => { setIsMusicPlaying(true); setMusicPlaybackMessage(''); }} onPause={() => setIsMusicPlaying(false)}>Browser Anda belum mendukung audio.</audio>
      {content.music_url && isOpened ? <><button className="wedding-music-toggle" onClick={toggleMusic}>{isMusicPlaying ? 'Jeda musik' : 'Putar musik'}</button>{musicPlaybackMessage ? <p className="wedding-music-message" role="status">{musicPlaybackMessage}</p> : null}</> : null}

      <div ref={contentRef} className="wedding-content" aria-hidden={!isOpened}>
        <section className="wedding-section wedding-greeting"><p className="wedding-eyebrow">{content.event_type || copy.kicker}</p><p>{greeting}</p><span className="gold-divider">{theme.ornament}</span></section>

        {isCoupleEvent ? <section className="wedding-section wedding-quote"><p>“{copy.quote}”</p><strong>{copy.source}</strong></section> : null}

        {isCoupleEvent ? coupleProfileItems.length ? <section className="wedding-section wedding-couple"><p className="wedding-eyebrow">THE HAPPY COUPLE</p><h2>Mempelai</h2><div className="wedding-couple-grid">{coupleProfileItems.map((person, index) => <div className="wedding-person" key={`${person.relationship}-${index}`}>{person.photo ? <img src={person.photo} alt={person.name || person.alt} /> : null}{person.name ? <h3>{person.name}</h3> : null}{person.parents ? <p>{person.relationship} dari<br />{person.parents}</p> : null}{person.instagram ? <a href={`https://instagram.com/${person.instagram.replace('@', '')}`} target="_blank" rel="noreferrer">{person.instagram}</a> : null}</div>)}</div></section> : null : content.honoree_name || content.story ? <section className="wedding-section wedding-honoree"><p className="wedding-eyebrow">ACARA SPESIAL</p>{content.honoree_name ? <h2>{content.honoree_name}</h2> : null}{content.story ? <p>{content.story}</p> : null}</section> : null}

        {content.event_date ? <section className="wedding-section wedding-countdown"><p className="wedding-eyebrow">{isCoupleEvent ? 'MENUJU HARI BAHAGIA' : 'MENUJU ACARA'}</p><h2>{isCoupleEvent ? 'Our special day' : 'Hitung mundur acara'}</h2><div className="countdown-grid">{Object.entries(countdown).map(([label, value]) => <div key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}</div><a className="wedding-calendar-button" href={calendarUrl(content, invitation)} target="_blank" rel="noreferrer">TAMBAHKAN KE KALENDER</a></section> : null}

        {storyItems.length ? <section className="wedding-section wedding-story"><p className="wedding-eyebrow">{storySectionTitle}</p><h2>{storySectionTitle}</h2><div className="love-story-timeline">{storyItems.map((item, index) => <article key={`${item.title}-${index}`}>{item.date ? <span>{item.date}</span> : null}<div>{item.title ? <h3>{item.title}</h3> : null}{item.text ? <p>{item.text}</p> : null}{item.image ? <img src={item.image} alt={item.title || 'Cerita acara'} loading="lazy" /> : null}</div></article>)}</div></section> : null}

        {eventItems.length ? <section className="wedding-section wedding-events"><p className="wedding-eyebrow">SAVE THE DATE</p><h2>Detail acara</h2><div className="wedding-event-grid">{eventItems.map((event, index) => <article className="wedding-event-card" key={`${event.title || 'acara'}-${index}`}>{event.title ? <p className="wedding-eyebrow">{event.title}</p> : null}{event.date ? <h3>{new Date(event.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</h3> : null}{event.time ? <strong>{event.time} WIB</strong> : null}{event.venue || event.address ? <p>{event.venue ? <>{event.venue}<br /></> : null}{event.address || null}</p> : null}{event.maps_url ? <a href={event.maps_url} target="_blank" rel="noreferrer">LIHAT LOKASI ↗</a> : null}</article>)}</div></section> : null}

        {hasDigitalEnvelope ? <section className="wedding-section wedding-digital-envelope"><p className="wedding-eyebrow">HADIAH DIGITAL</p><h2>Kirim tanda kasih</h2><p>Doa dan kehadiran Anda adalah hadiah terindah. Jika berkenan, Anda dapat mengirim tanda kasih melalui pilihan berikut.</p><div className="wedding-envelope-options">
          {digitalEnvelope.bank?.enabled && digitalEnvelope.bank.name && digitalEnvelope.bank.account_name && digitalEnvelope.bank.account_number ? <article><h3>Transfer bank · {digitalEnvelope.bank.name}</h3><p>Atas nama <strong>{digitalEnvelope.bank.account_name}</strong></p><p>Nomor rekening <strong>{digitalEnvelope.bank.account_number}</strong></p></article> : null}
          {digitalEnvelope.e_wallet?.enabled && digitalEnvelope.e_wallet.provider && digitalEnvelope.e_wallet.account_name && digitalEnvelope.e_wallet.account_number ? <article><h3>{digitalEnvelope.e_wallet.provider}</h3><p>Atas nama <strong>{digitalEnvelope.e_wallet.account_name}</strong></p><p>Nomor akun <strong>{digitalEnvelope.e_wallet.account_number}</strong></p></article> : null}
          {digitalEnvelope.qris?.enabled && digitalEnvelope.qris.image_url ? <article><h3>QRIS</h3><img src={digitalEnvelope.qris.image_url} alt="Kode QRIS untuk hadiah digital" loading="lazy" />{digitalEnvelope.qris.instructions ? <p>{digitalEnvelope.qris.instructions}</p> : null}</article> : null}
        </div></section> : null}

        {schedule.length ? <section className="wedding-section wedding-schedule"><p className="wedding-eyebrow">SUSUNAN ACARA</p><h2>Rangkaian momen</h2><div className="schedule-list">{schedule.map((item, index) => <div key={`${item.time || ''}-${item.title || index}`}>{item.time ? <strong>{item.time}</strong> : null}{item.title ? <span>{item.title}</span> : null}</div>)}</div></section> : null}

        {gallery.length ? <section className="wedding-section wedding-gallery"><p className="wedding-eyebrow">MOMENTS</p><h2>Our beautiful moments</h2><div className="wedding-gallery-grid">{gallery.map((image, index) => <button key={`${image}-${index}`} onClick={() => setSelectedImage(image)}><img src={image} alt={`Momen acara ${index + 1}`} loading="lazy" /></button>)}</div></section> : null}

        {content.video_url && !coverVideo ? <section className="wedding-section wedding-video"><p className="wedding-eyebrow">OUR BEAUTIFUL MOMENTS</p><h2>{isCoupleEvent ? 'Film kisah kami' : 'Video acara'}</h2>{isDirectVideoUrl(content.video_url) ? <video src={content.video_url} controls playsInline preload="metadata" /> : <iframe src={videoEmbedUrl(content.video_url)} title="Video undangan" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}</section> : null}

        <section id="rsvp" className="wedding-section wedding-rsvp"><p className="wedding-eyebrow">UNDANGAN RESMI</p><h2>Konfirmasi kehadiran</h2><p>{isCoupleEvent ? 'Mohon konfirmasi kehadiran dan titipkan doa terbaik untuk perjalanan kami.' : `Mohon konfirmasi kehadiran Anda di acara ${eventLabel.toLowerCase()}.`}</p>{content.rsvp_url ? <a className="wedding-calendar-button" href={content.rsvp_url} target="_blank" rel="noreferrer">KONFIRMASI RSVP</a> : null}<form className="wedding-guest-form" onSubmit={submitGuestbook}><input value={guestForm.name} onChange={(event) => setGuestForm({ ...guestForm, name: event.target.value })} placeholder="Nama Anda" required minLength={2} /><select value={guestForm.attendance} onChange={(event) => setGuestForm({ ...guestForm, attendance: event.target.value })}><option value="attending">Saya akan hadir</option><option value="not_attending">Maaf, belum bisa hadir</option><option value="maybe">Masih tentatif</option></select><input type="number" min="1" max="10" value={guestForm.guests} onChange={(event) => setGuestForm({ ...guestForm, guests: Number(event.target.value) })} aria-label="Jumlah tamu" /><textarea value={guestForm.message} onChange={(event) => setGuestForm({ ...guestForm, message: event.target.value })} placeholder="Tulis ucapan dan doa..." required minLength={2} /><button className="wedding-calendar-button" disabled={isGuestSubmitting}>{isGuestSubmitting ? 'MENGIRIM...' : 'KIRIM RSVP & UCAPAN'}</button>{guestMessage ? <span className="wedding-guest-message" role="status">{guestMessage}</span> : null}</form></section>
        <section className="wedding-section wedding-guestbook"><p className="wedding-eyebrow">BUKU TAMU</p><h2>Ucapan untuk kami</h2><div className="wedding-guestbook-list">{guestbook.length ? guestbook.map((entry) => <article key={entry.id}><strong>{entry.name}</strong><span>{entry.attendance === 'attending' ? 'Akan hadir' : entry.attendance === 'maybe' ? 'Masih tentatif' : 'Belum bisa hadir'}{entry.guests > 1 ? ` · ${entry.guests} tamu` : ''}</span><p>{entry.message}</p></article>) : <p>Jadilah yang pertama meninggalkan ucapan.</p>}</div></section>
        <section className="wedding-section wedding-closing"><p>{isTemplateDemo ? copy.closing : isCoupleEvent ? 'Terima kasih atas doa dan kasih yang mengiringi langkah kami.' : 'Terima kasih atas perhatian dan kesediaan Anda untuk hadir.'}</p>{isCoupleEvent ? coupleNames ? <h2>{coupleNames}</h2> : null : honoreeName ? <h2>{honoreeName}</h2> : null}<span>{copy.kicker}</span></section>
      </div>

      {selectedImage ? <div className="wedding-lightbox" role="dialog" aria-label="Preview foto" onClick={() => setSelectedImage(null)}><button onClick={() => setSelectedImage(null)} aria-label="Tutup preview">×</button><img src={selectedImage} alt="Preview momen acara" /></div> : null}
    </main>
  );
}
