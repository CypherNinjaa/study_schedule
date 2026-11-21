import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown, Github, Minus, Star } from 'lucide-react';

interface BenefitsAndFaqProps {
  onLaunchStudyOS: () => void;
}

const COMPARISON_ROWS = [
  {
    capability: 'Local JSON file on your own disk',
    study: 'File System API',
    notion: null,
    gcal: null,
    forest: null,
    todoist: null,
  },
  {
    capability: 'Offline-first PWA without sign-up wall',
    study: 'Instant offline',
    notion: 'Limited',
    gcal: 'Read cache',
    forest: 'Mobile only',
    todoist: 'Cached',
  },
  {
    capability: 'College timetable & exam syllabus scope',
    study: 'Native engine',
    notion: 'Manual tables',
    gcal: 'Generic slots',
    forest: null,
    todoist: 'Flat lists',
  },
  {
    capability: '3D Flipbook PDF & EPUB reader',
    study: 'Three.js + Dexie',
    notion: null,
    gcal: null,
    forest: null,
    todoist: null,
  },
  {
    capability: 'Wall-clock PiP Pomodoro + Save early',
    study: 'Snake PiP',
    notion: null,
    gcal: null,
    forest: 'Resets on stop',
    todoist: null,
  },
  {
    capability: '24-hour time accounting & daily score',
    study: '0–100 index',
    notion: null,
    gcal: null,
    forest: null,
    todoist: null,
  },
  {
    capability: 'Free multi-device sync you control',
    study: 'Secret Gist',
    notion: 'Paid cloud',
    gcal: 'Google cloud',
    forest: 'Vendor cloud',
    todoist: 'Vendor cloud',
  },
];

const SUBSCRIPTIONS = [
  { id: 'notion', name: 'Notion Plus', yearly: 120 },
  { id: 'todoist', name: 'Todoist Pro', yearly: 60 },
  { id: 'forest', name: 'Focus & habit tracker', yearly: 96 },
  { id: 'reader', name: 'Cloud PDF markup & sync', yearly: 132 },
];

const FAQS = [
  {
    q: 'Does Study Schedule work completely offline without Wi-Fi?',
    a: 'Yes. After the first visit, the Progressive Web App precaches the entire interface and 31 documentation guides. Your data writes directly to your local JSON file and browser IndexedDB mirror, and optional GitHub Gist sync queues changes automatically until you reconnect.',
  },
  {
    q: 'Do I have to create an account or link GitHub to use it?',
    a: 'No. During onboarding you can choose a local JSON file on your computer, rely strictly on browser IndexedDB storage, or connect a Secret GitHub Gist for multi-device sync — or combine local file + Gist.',
  },
  {
    q: 'Where is my data stored, and can I export it anytime?',
    a: 'Everything lives inside a clean, human-readable JSON file (`productivity-data.json`) on your disk or in IndexedDB, plus your own Secret GitHub Gist if enabled. There are zero proprietary servers, zero accounts, and zero telemetry.',
  },
  {
    q: 'How does conflict resolution work across phone and laptop?',
    a: 'When syncing with your Secret GitHub Gist, Study Schedule merges collections deterministically by record ID and `updatedAt` timestamps so tasks, Pomodoro sessions, and habits logged on separate devices combine cleanly without overwriting one another.',
  },
  {
    q: 'Can I install it like a native app on desktop or mobile?',
    a: 'Yes. In Chrome, Edge, or Safari, use "Install App" or "Add to Home Screen" to launch StudyOS directly in standalone app mode at `/studyos`.',
  },
  {
    q: 'Is Study Schedule really free and open source?',
    a: 'Yes — 100% MIT licensed on GitHub (`CypherNinjaa/study_schedule`). You can inspect the source, run all 51 Vitest suites locally, fork it, or contribute pull requests.',
  },
];

/**
 * Sections 6 (Benefits & Comparison), 7 (Verified Open-Source Proof),
 * 8 (Cinematic Dark Final CTA), and 9 (FAQ Accordion & Footer).
 */
export function BenefitsAndFaq({ onLaunchStudyOS }: BenefitsAndFaqProps) {
  const [selectedSubs, setSelectedSubs] = useState<Record<string, boolean>>({
    notion: true,
    todoist: true,
    forest: true,
    reader: true,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const yearlySaved = SUBSCRIPTIONS.reduce(
    (sum, item) => sum + (selectedSubs[item.id] ? item.yearly : 0),
    0,
  );

  return (
    <>
      {/* =================================================================
          SECTION 6 (LIGHT #FBFBF9): Benefits & Honest Stack Comparison
          ================================================================= */}
      <section id="benefits" className="border-t border-[#E6E3DC] bg-[#FBFBF9] py-24 sm:py-32">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-medium text-[#D97706]">Why switch</div>
            <h2 className="mt-3 font-serif text-[34px] sm:text-[48px] font-normal leading-[1.08] tracking-[-0.025em] text-[#141413]">
              Built for students who want focus, not five subscriptions
            </h2>
            <p className="mt-4 text-base sm:text-[17px] leading-[1.6] text-[#5C5952]">
              Compare Study Schedule side by side against the cloud tools students typically stitch
              together.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] items-start">
            {/* Comparison Table */}
            <div className="overflow-hidden rounded-[20px] border border-[#E6E3DC] bg-white">
              <div className="overflow-x-auto">
                <div className="min-w-[660px]">
                  <div className="grid grid-cols-[minmax(210px,1.7fr)_1.15fr_0.85fr_0.9fr_0.85fr_0.85fr] items-center border-b border-[#E6E3DC] px-5 py-3.5 text-xs font-medium text-[#5C5952]">
                    <div>Capability</div>
                    <div className="rounded-lg bg-[#FEF3C7] px-2.5 py-1 text-[#92400E]">
                      Study Schedule
                    </div>
                    <div className="px-2">Notion</div>
                    <div className="px-2">G-Calendar</div>
                    <div className="px-2">Forest</div>
                    <div className="px-2">Todoist</div>
                  </div>
                  <div className="divide-y divide-[#E6E3DC]">
                    {COMPARISON_ROWS.map((row) => (
                      <div
                        key={row.capability}
                        className="grid grid-cols-[minmax(210px,1.7fr)_1.15fr_0.85fr_0.9fr_0.85fr_0.85fr] items-center px-5 py-3.5 text-sm transition-colors hover:bg-[#FBFBF9]"
                      >
                        <div className="pr-3 font-medium text-[#141413]">{row.capability}</div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#FEF3C7]/45 px-2.5 py-1.5 text-xs font-medium text-[#141413]">
                          <Check size={14} strokeWidth={2.2} className="text-[#15803D] shrink-0" />
                          <span>{row.study}</span>
                        </div>
                        {[row.notion, row.gcal, row.forest, row.todoist].map((val, idx) => (
                          <div key={idx} className="px-2 text-xs text-[#5C5952]">
                            {val ?? <Minus size={13} className="text-[#C7C2B8]" />}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Annual Savings Calculator */}
            <div className="rounded-[20px] border border-[#E6E3DC] bg-white p-6 space-y-5">
              <div>
                <h3 className="text-base font-medium text-[#141413]">Annual subscription cost</h3>
                <p className="mt-1 text-xs text-[#5C5952]">
                  Toggle the paid apps you use today to see yearly savings.
                </p>
              </div>

              <div className="space-y-2 border-b border-[#E6E3DC] pb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#141413]">Study Schedule (MIT)</span>
                  <span className="font-mono font-medium lp-tabular text-[#D97706]">$0 / yr</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F3F1EC] overflow-hidden">
                  <div className="h-full w-2.5 rounded-full bg-[#D97706]" />
                </div>
              </div>

              <div className="space-y-3">
                {SUBSCRIPTIONS.map((sub) => {
                  const active = !!selectedSubs[sub.id];
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubs((prev) => ({ ...prev, [sub.id]: !prev[sub.id] }))
                      }
                      aria-pressed={active}
                      className="block w-full text-left"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors ${
                              active
                                ? 'border-[#141413] bg-[#141413] text-white'
                                : 'border-[#D6D2C9] bg-[#F3F1EC] text-transparent'
                            }`}
                          >
                            <Check size={11} strokeWidth={2.5} />
                          </span>
                          <span className={active ? 'text-[#141413]' : 'text-[#8A857B] line-through'}>
                            {sub.name}
                          </span>
                        </span>
                        <span className="font-mono lp-tabular text-[#5C5952]">
                          ${sub.yearly} / yr
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#F3F1EC] overflow-hidden">
                        <div
                          className="h-full w-full origin-left rounded-full bg-[#A8A297] transition-transform duration-300"
                          style={{ transform: `scaleX(${active ? sub.yearly / 140 : 0.04})` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-baseline justify-between border-t border-[#E6E3DC] pt-4">
                <div>
                  <div className="text-xs font-medium text-[#141413]">Yearly spend avoided</div>
                  <div className="text-[11px] text-[#8A857B]">Free forever · open source</div>
                </div>
                <div className="font-mono text-3xl font-medium lp-tabular text-[#141413]">
                  ${yearlySaved}
                  <span className="ml-1 text-xs font-normal text-[#8A857B]">/ yr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 7 (WARM STONE #F3F1EC): Verified Open-Source Proof
          ================================================================= */}
      <section className="border-t border-[#E6E3DC] bg-[#F3F1EC] py-20 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="max-w-xl">
            <div className="text-xs font-medium text-[#D97706]">Verified engineering facts</div>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#141413]">
              Transparent code, zero inflated claims
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                figure: 'MIT',
                label: 'Open-source license',
                detail: 'Inspect, fork, or self-host every line on GitHub',
              },
              {
                figure: '51 / 51',
                label: 'Passing Vitest suites',
                detail: 'Automated tests for XP ledger, streaks, Pomodoro & merge',
              },
              {
                figure: '31',
                label: 'Offline HTML guides',
                detail: 'Full searchable documentation bundled right inside the app',
              },
              {
                figure: '0',
                label: 'Tracking scripts',
                detail: 'No analytics beacons, no ads, no third-party database',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#E6E3DC] bg-white p-6"
              >
                <div className="font-mono text-3xl font-medium lp-tabular text-[#141413]">
                  {stat.figure}
                </div>
                <div className="mt-2 text-sm font-medium text-[#141413]">{stat.label}</div>
                <p className="mt-1 text-xs leading-relaxed text-[#5C5952]">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 8 (CINEMATIC DARK #0C0D0F): Final Apple-Style CTA
          ================================================================= */}
      <section className="bg-[#0C0D0F] py-28 sm:py-36 text-[#F4F2EC]">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <h2 className="font-serif text-[38px] sm:text-[58px] font-normal leading-[1.04] tracking-[-0.03em] text-[#F4F2EC]">
            Own your study system. Free forever.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg leading-[1.6] text-[#9A968D]">
            Launch StudyOS in your browser in seconds. Connect a local JSON file, enable optional
            Secret GitHub Gist sync, or start offline immediately.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLaunchStudyOS}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#E58B4A] px-7 text-sm font-medium text-[#131416] transition-opacity hover:opacity-95"
            >
              <span>Launch StudyOS</span>
              <ArrowUpRight size={16} strokeWidth={1.8} />
            </motion.button>
            <a
              href="https://github.com/CypherNinjaa/study_schedule"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-[#15171A] px-6 text-sm font-medium text-[#F4F2EC] transition-colors hover:border-white/30"
            >
              <Star size={15} className="text-[#E58B4A]" />
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 9 (LIGHT #FBFBF9): FAQ Accordion & Minimal Footer
          ================================================================= */}
      <section id="faq" className="bg-[#FBFBF9] py-24 sm:py-28 border-t border-[#E6E3DC]">
        <div className="mx-auto max-w-[920px] px-5 sm:px-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl sm:text-[42px] font-normal tracking-[-0.02em] text-[#141413]">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-base text-[#5C5952]">
              Practical details on local ownership, offline support, and syncing.
            </p>
          </div>

          <div className="mt-12 divide-y divide-[#E6E3DC] rounded-2xl border border-[#E6E3DC] bg-white">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 py-1 text-left text-[15px] font-medium text-[#141413]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={17}
                      className={`shrink-0 text-[#8A857B] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#141413]' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pt-2.5 pb-1 text-sm leading-relaxed text-[#5C5952]">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E6E3DC] bg-[#FBFBF9] py-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 text-xs text-[#5C5952]">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-5 w-5 rounded-[5px]" />
            <span className="font-medium text-[#141413]">Study Schedule</span>
            <span className="text-[#8A857B]">· Built by Vikash (@CypherNinjaa)</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={onLaunchStudyOS}
              className="transition-colors hover:text-[#141413]"
            >
              Open StudyOS
            </button>
            <a href="/docs/index.html" className="transition-colors hover:text-[#141413]">
              Offline docs
            </a>
            <a href="/launch.html" className="transition-colors hover:text-[#141413]">
              Launch film
            </a>
            <a
              href="https://github.com/CypherNinjaa/study_schedule"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#141413]"
            >
              <Github size={14} />
              GitHub (MIT)
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
