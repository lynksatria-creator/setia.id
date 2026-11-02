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
    expect(url.pathname).toBe('/6281234567890');
    expect(url.searchParams.get('text')).toBe('Halo.\n\nWebsite: Entertainment Musik\nMenu: Paket > Silver');
  });

  it('normalizes Indonesian mobile numbers entered without a country prefix', () => {
    expect(new URL(createWhatsAppUrl('81234567890', 'Halo.', 'Aurora Media', 'Kontak')).pathname)
      .toBe('/6281234567890');
    expect(new URL(createWhatsAppUrl('0062 812-3456-7890', 'Halo.', 'Aurora Media', 'Kontak')).pathname)
      .toBe('/6281234567890');
    expect(new URL(createWhatsAppUrl('+62 812-3456-7890', 'Halo.', 'Aurora Media', 'Kontak')).pathname)
      .toBe('/6281234567890');
  });

  it('returns an empty URL when no phone number is configured', () => {
    expect(createWhatsAppUrl('', 'Halo.', 'Aurora Media', 'Kontak')).toBe('');
  });
});
