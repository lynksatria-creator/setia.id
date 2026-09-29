import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const renderApp = () => render(<AuthProvider><App /></AuthProvider>);

test('renders the main portal marketing homepage', () => {
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getAllByText(/portal iklan/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/gibrig entertainment/i)).toBeDefined();
});

test('shows a scannable QR code for an invitation template', () => {
  window.history.pushState({}, '', '/undangan');
  renderApp();

  fireEvent.click(screen.getAllByRole('button', { name: /bagikan qr/i })[0]);

  expect(screen.getByTitle(/qr untuk template/i)).toBeDefined();
});

test('renders the registration form on the register route', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-auth?mode=register');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Buat akun' })).toBeDefined();
  expect(screen.getByLabelText('Nama lengkap')).toBeDefined();
});

test('renders a blog detail route for a published article', () => {
  window.history.pushState({}, '', '/undangan-blog/tips-memilih-template-undangan-digital-yang-sesuai-tema-acara');
  renderApp();

  expect(screen.getByRole('heading', { name: /tips memilih template undangan digital/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /kembali ke artikel/i })).toBeDefined();
});

test('protects the user dashboard when no account is signed in', async () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-dashboard');
  renderApp();

  expect(await screen.findByRole('heading', { name: /masuk untuk mengelola undangan/i })).toBeDefined();
});

test('shows the server-authenticated admin login page', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/undangan-admin');
  renderApp();

  expect(screen.getByRole('heading', { name: 'Admin Undangan.id' })).toBeDefined();
  expect(screen.getByLabelText('Email admin')).toBeDefined();
});

test('renders the Gibrig public homepage and connects booking inquiry', () => {
  window.history.pushState({}, '', '/gibrig');
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<App />);

  expect(screen.getByRole('heading', { name: /artist performance & entertainment studio/i })).toBeDefined();
  fireEvent.click(screen.getAllByRole('button', { name: /booking inquiry/i })[0]);
  expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank', 'noopener,noreferrer');
  openSpy.mockRestore();
});

test('connects the invitation hero CTA to registration', () => {
  window.history.pushState({}, '', '/undangan');
  renderApp();

  fireEvent.click(screen.getAllByRole('button', { name: /buat undangan/i })[0]);
  expect(window.location.pathname).toBe('/undangan-auth');
  expect(window.location.search).toBe('?mode=register');
});
