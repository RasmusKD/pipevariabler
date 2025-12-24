import React from 'react';
import { render } from '@testing-library/react';
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

  const { container } = render(<App />);

  // Check that the app rendered - using container which is allowed
  // eslint-disable-next-line testing-library/no-node-access
  expect(container.children.length).toBeGreaterThan(0);
});
