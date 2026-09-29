import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the main portal marketing homepage', () => {
  window.history.pushState({}, '', '/');
  render(<App />);

  expect(screen.getAllByText(/portal iklan/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/gibrig entertainment/i)).toBeDefined();
});
