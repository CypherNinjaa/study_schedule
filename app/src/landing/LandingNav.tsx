import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';

interface LandingNavProps {
  onLaunchStudyOS: () => void;
}

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#benefits', label: 'Compare' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNav({ onLaunchStudyOS }: LandingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="lp-nav-glass sticky top-0 z-50 border-b border-[#E6E3DC]">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8">
        {/* Brand Identity */}
        <a href="#top" className="flex items-center gap-2.5 text-[#141413]">
          <img src="/favicon.svg" alt="" className="h-6 w-6 rounded-[6px]" />
          <span className="text-[15px] font-medium tracking-[-0.01em]">Study Schedule</span>
        </a>

        {/* Minimal Desktop Navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7 text-[13.5px] text-[#5C5952]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#141413]"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/docs/index.html"
            className="transition-colors hover:text-[#141413]"
          >
            Docs
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/CypherNinjaa/study_schedule"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center text-[13px] font-medium text-[#5C5952] px-2.5 py-1.5 transition-colors hover:text-[#141413]"
          >
            GitHub
          </a>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLaunchStudyOS}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#141413] px-4 text-[13px] font-medium text-[#FBFBF9] transition-colors hover:bg-[#2A2825]"
          >
            <span>Get Started</span>
            <ArrowUpRight size={14} strokeWidth={1.75} />
          </motion.button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E3DC] bg-white text-[#141413] md:hidden"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
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
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 font-medium text-[#141413] hover:bg-[#F3F1EC]"
                >
                  {link.label}
                </a>
              ))}
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
