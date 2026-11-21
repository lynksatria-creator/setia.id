import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import Templates from './Templates';

const template = {
  name: 'Klasik Emas',
  category: 'Pernikahan',
  description: 'Klasik dan elegan',
  palette: 'gold',
  colors: ['#b88e44', '#fffdf8'],
  active: true,
};

test('shows an illustrated, theme-specific invitation mockup on each template card', () => {
  const { container } = render(<Templates templates={[template]} demos={[]} />);
  const mockup = container.querySelector('.template-phone-mockup');

  expect(mockup.querySelector('.template-phone-art')).not.toBeNull();
  expect(mockup.querySelector('.template-phone-copy strong').textContent).toBe('Aulia & Farhan');
  expect(mockup.querySelector('.template-phone-action').textContent).toBe('Buka Undangan');
  expect(mockup.style.getPropertyValue('--template-cover-image')).toContain('images.unsplash.com');
});

test('opens an accessible template preview modal with a link to use the template', () => {
  window.history.replaceState({}, '', '/templates');
  render(<Templates templates={[template]} demos={[]} />);

  fireEvent.click(screen.getByRole('button', { name: 'Coba Preview' }));

  const dialog = screen.getByRole('dialog', { name: 'Klasik Emas' });
  expect(dialog).toBeDefined();
  expect(screen.getByRole('link', { name: 'Gunakan template ini' }).getAttribute('href'))
    .toBe('/undangan-dashboard?template=classic-wedding');

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Klasik Emas' })).toBeNull();
});
