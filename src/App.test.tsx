import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Smoke test - verifies App renders without crashing
test('renders app without crashing', () => {
  // Mock matchMedia for react-window
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  render(<App />);

  // Check for logo or main container
  const container = document.querySelector('.bg-neutral-950');
  expect(container).toBeInTheDocument();
});
