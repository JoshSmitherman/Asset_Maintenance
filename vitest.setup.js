import '@testing-library/jest-dom/vitest';

// jsdom draws nothing, so it cannot scroll; the app's scroll-to-top is a no-op here.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
