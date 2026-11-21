import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';

interface LandingNavProps {
  onLaunchStudyOS: () => void;
  activeSection: string;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  onNavigateSection: (href: string) => void;
}

const NAV_LINKS = [
  { href: '#product', id: 'product', label: 'Product' },
  { href: '#features', id: 'features', label: 'Features' },
  { href: '#workflow', id: 'workflow', label: 'Workflow' },
  { href: '#benefits', id: 'benefits', label: 'Compare' },
  { href: '#faq', id: 'faq', label: 'FAQ' },
];

export function LandingNav({
  onLaunchStudyOS,
  activeSection,
  progressBarRef,
  onNavigateSection,
}: LandingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigateSection(href);
  };

  return (
    <header className="lp-nav-glass fixed top-0 left-0 right-0 z-50 border-b border-[#E6E3DC]">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8">
        {/* Brand Identity */}
        <a
          href="#top"
          onClick={(e) => handleLinkClick(e, '#top')}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[#141413]"
        >
          <img src="/favicon.svg" alt="" className="h-6 w-6 rounded-[6px]" />
          <span className="text-[15px] font-medium tracking-[-0.01em]">Study Schedule</span>
        </a>

        {/* Minimal Desktop Navigation with Scroll-Synced Active Indicator */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-4 lg:gap-7 whitespace-nowrap text-[13.5px] text-[#5C5952]"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => handleLinkClick(e, link.href)}
                className={`relative py-1 transition-colors hover:text-[#141413] ${
                  isActive ? 'font-medium text-[#141413]' : ''
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-dot"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute -bottom-[15px] left-0 right-0 h-[2px] rounded-full bg-[#D97706]"
                  />
                )}
              </a>
            );
          })}
          <a
            href="/guides/"
            className="py-1 transition-colors hover:text-[#141413]"
          >
            Guides
          </a>
          <a
            href="/docs/index.html"
            className="py-1 transition-colors hover:text-[#141413]"
          >
            Docs
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <a
            href="https://github.com/CypherNinjaa/study_schedule"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center text-[13px] font-medium text-[#5C5952] px-2.5 py-1.5 transition-colors hover:text-[#141413]"
          >
            GitHub
          </a>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLaunchStudyOS}
            className="group inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#141413] px-4 text-[13px] font-medium text-[#FBFBF9] transition-colors hover:bg-[#2A2825]"
          >
            <span>Get Started</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.75}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </motion.button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="lp-mobile-nav"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E3DC] bg-white text-[#141413] md:hidden"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Subtle 1.5px reading progress hairline driven without React re-renders */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden"
      >
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left bg-[#D97706]/80"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="lp-mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[#E6E3DC] bg-[#FBFBF9] md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4 text-sm">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className={`rounded-xl px-3 py-2.5 font-medium hover:bg-[#F3F1EC] ${
                    activeSection === link.id ? 'bg-[#F3F1EC] text-[#B45309]' : 'text-[#141413]'
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/guides/"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 font-medium text-[#141413] hover:bg-[#F3F1EC]"
              >
                Study guides
              </a>
              <a
                href="/docs/index.html"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 font-medium text-[#5C5952] hover:bg-[#F3F1EC]"
              >
                Offline documentation
              </a>
              <a
                href="https://github.com/CypherNinjaa/study_schedule"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-3 py-2.5 font-medium text-[#5C5952] hover:bg-[#F3F1EC]"
              >
                GitHub repository
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
