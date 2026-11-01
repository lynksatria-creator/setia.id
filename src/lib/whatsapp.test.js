import { describe, expect, it } from 'vitest';
import { createWhatsAppUrl, withWhatsAppSource } from './whatsapp';

describe('WhatsApp source attribution', () => {
  it('adds the website and originating menu after the supplied message', () => {
    expect(withWhatsAppSource('Halo, saya ingin bertanya.', 'Nuansa Invite', 'FAQ > Tanya melalui WhatsApp'))
      .toBe('Halo, saya ingin bertanya.\n\nWebsite: Nuansa Invite\nMenu: FAQ > Tanya melalui WhatsApp');
  });

  it('encodes the source and menu in a valid WhatsApp URL', () => {
    const url = new URL(createWhatsAppUrl('081234567890', 'Halo.', 'Entertainment Musik', 'Paket > Silver'));
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe('/081234567890');
    expect(url.searchParams.get('text')).toBe('Halo.\n\nWebsite: Entertainment Musik\nMenu: Paket > Silver');
  });

  it('returns an empty URL when no phone number is configured', () => {
    expect(createWhatsAppUrl('', 'Halo.', 'Aurora Media', 'Kontak')).toBe('');
  });
});
