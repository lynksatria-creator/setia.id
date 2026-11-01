export function withWhatsAppSource(message, website, menu) {
  const originalMessage = String(message || '').trim();
  const source = `Website: ${website}\nMenu: ${menu}`;
  return originalMessage ? `${originalMessage}\n\n${source}` : source;
}

export function createWhatsAppUrl(number, message, website, menu) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  const text = withWhatsAppSource(message, website, menu);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
