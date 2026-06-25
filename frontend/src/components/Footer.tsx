import Link from 'next/link';
import { Film, Github, FileText, ExternalLink } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      role="contentinfo"
      className="mt-24 border-t border-border-subtle bg-bg-base/60 backdrop-blur-sm"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 text-text-primary mb-3">
            <Film className="text-accent" size={20} />
            <span className="font-display text-xl tracking-wider">CINEVERSE</span>
          </Link>
          <p className="text-text-secondary text-xs leading-relaxed">
            Your moments, framed. A personal 4K video archive,
            journal & streaming platform.
          </p>
        </div>

        <div>
          <h4 className="text-text-primary font-medium mb-3 uppercase tracking-widest text-xs">App</h4>
          <ul className="space-y-2 text-text-secondary">
            <li><Link href="/library" className="hover:text-accent transition-colors">Library</Link></li>
            <li><Link href="/upload" className="hover:text-accent transition-colors">Upload</Link></li>
            <li><Link href="/" className="hover:text-accent transition-colors">Home</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-text-primary font-medium mb-3 uppercase tracking-widest text-xs">Project</h4>
          <ul className="space-y-2 text-text-secondary">
            <li>
              <a
                href="https://github.com/devtechedge/cineverse"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-accent transition-colors"
              >
                <Github size={12} /> Source code
              </a>
            </li>
            <li>
              <a
                href="https://github.com/devtechedge/cineverse/blob/main/docs/ARCHITECTURE.md"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-accent transition-colors"
              >
                <FileText size={12} /> Architecture
              </a>
            </li>
            <li>
              <a
                href="https://github.com/devtechedge/cineverse/blob/main/CHANGELOG.md"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-accent transition-colors"
              >
                <FileText size={12} /> Changelog
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-text-primary font-medium mb-3 uppercase tracking-widest text-xs">Tech</h4>
          <ul className="space-y-1.5 text-text-secondary text-xs">
            <li>Next.js 14 · TypeScript · Tailwind</li>
            <li>FastAPI · PostgreSQL · Redis</li>
            <li>ffmpeg HLS · Docker · nginx</li>
            <li>Prometheus · OpenTelemetry</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border-subtle">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
          <p>© {year} Cineverse · MIT License</p>
          <p className="flex items-center gap-1">
            Built as a portfolio project ·
            <a
              href="https://github.com/devtechedge"
              target="_blank" rel="noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              devtechedge <ExternalLink size={10} />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
