import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { getEventTitlePlaceholder, GuestShareGenerator } from './Dashboard';

test.each([
  ['Pernikahan', 'Contoh: Pernikahan Aulia & Farhan'],
  ['Aqiqah', 'Contoh: Aqiqah Aisyah Putri'],
  ['Wisuda', 'Contoh: Wisuda Naira Putri'],
  ['Seminar', 'Contoh: Seminar Digital Marketing 2026'],
])('uses a %s-specific event title example', (eventType, placeholder) => {
  expect(getEventTitlePlaceholder(eventType)).toBe(placeholder);
});

const invitation = {
  id: 'invitation-1',
  slug: 'hari-bahagia',
  title: 'Aulia & Farhan',
  status: 'published',
};

test('creates a personalized invitation URL and WhatsApp message for a guest', () => {
  render(<GuestShareGenerator invitation={invitation} isActive isPublished />);

  fireEvent.change(screen.getByLabelText('Nama tamu undangan'), {
    target: { value: 'Bpk. Andi & Keluarga' },
  });

  const personalUrl = new URL(screen.getByLabelText('Link undangan personal').textContent);
  expect(personalUrl.pathname).toBe('/undangan/hari-bahagia');
  expect(personalUrl.searchParams.get('to')).toBe('Bpk. Andi & Keluarga');

  const whatsappUrl = new URL(screen.getByRole('link', { name: 'Kirim via WhatsApp' }).href);
  const message = whatsappUrl.searchParams.get('text');
  expect(message).toContain('*Bpk. Andi & Keluarga*');
  expect(message).toContain(personalUrl.href);
});

test('does not enable sharing before an invitation is published', () => {
  render(<GuestShareGenerator invitation={{ ...invitation, status: 'active' }} isActive />);

  expect(screen.getByRole('button', { name: 'Salin link tamu' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Kirim via WhatsApp' }).disabled).toBe(true);
});
