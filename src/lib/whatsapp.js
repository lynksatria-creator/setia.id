export function withWhatsAppSource(message, website, menu) {
  const originalMessage = String(message || '').trim();
  const source = `Website: ${website}\nMenu: ${menu}`;
  return originalMessage ? `${originalMessage}\n\n${source}` : source;
}

export function createWhatsAppUrl(number, message, website, menu) {
  let digits = String(number || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  if (!digits) return '';
  const text = withWhatsAppSource(message, website, menu);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
