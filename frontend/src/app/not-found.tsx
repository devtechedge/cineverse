import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h2 className="font-display text-6xl tracking-wider mb-2">404</h2>
      <p className="text-text-secondary mb-4">This frame doesn't exist.</p>
      <Link href="/" className="text-accent hover:underline">Back to home</Link>
    </div>
  );
}
