export const createOwnerGuestbookUrl = (slug, origin = window.location.origin) => {
  const url = new URL('/undangan-dashboard', origin);
  url.searchParams.set('guestbook', slug);
  return url.toString();
};
