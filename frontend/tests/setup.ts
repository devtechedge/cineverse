import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement these; stub them so components don't crash
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  // @ts-expect-error
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  // @ts-expect-error
  window.HTMLMediaElement.prototype.pause = () => undefined;
  // @ts-expect-error
  window.HTMLElement.prototype.requestFullscreen = () => Promise.resolve();
}

// localStorage shim is provided by jsdom
