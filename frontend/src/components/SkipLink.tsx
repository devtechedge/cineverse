/** WCAG: visible only on keyboard focus, jumps to main content. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-accent focus:text-white focus:shadow-elevated"
    >
      Skip to main content
    </a>
  );
}
