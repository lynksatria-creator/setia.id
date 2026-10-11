import { expect, test } from 'vitest';
import { createTicketCheckInMessage } from './ticketCheckInMessage';

test('shows the previous check-in time when a ticket QR was already scanned', () => {
  expect(createTicketCheckInMessage({
    already_checked_in: true,
    entry: {
      name: 'Alya',
      checked_in_at: '2026-10-11T10:25:00.000Z',
    },
  })).toBe(`QR sudah discan. Alya check-in pada ${new Date('2026-10-11T10:25:00.000Z').toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`);
});

test('shows the check-in time when a new ticket QR is accepted', () => {
  expect(createTicketCheckInMessage({
    already_checked_in: false,
    entry: {
      name: 'Alya',
      created_at: '2026-10-11T10:25:00.000Z',
    },
  })).toBe(`Check-in berhasil: Alya · ${new Date('2026-10-11T10:25:00.000Z').toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}. Tamu masuk ke buku tamu acara.`);
});
