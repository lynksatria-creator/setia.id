export const createTicketCheckInMessage = (result) => {
  const entry = result?.entry;
  if (!entry) throw new Error('Respons check-in tidak memuat data tiket.');

  const timestamp = entry.checked_in_at || entry.created_at;
  const parsedTimestamp = timestamp ? new Date(timestamp) : null;
  const checkedInTime = parsedTimestamp && Number.isFinite(parsedTimestamp.getTime())
    ? parsedTimestamp.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : 'waktu check-in tidak tersedia';

  return result.already_checked_in
    ? `QR sudah discan. ${entry.name || 'Tamu'} check-in pada ${checkedInTime}.`
    : `Check-in berhasil: ${entry.name || 'Tamu'} · ${checkedInTime}. Tamu masuk ke buku tamu acara.`;
};
