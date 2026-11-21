import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Cloud, Database, GitMerge, HardDrive, WifiOff } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInViewport } from './useInViewport';

const WORKFLOW_STEPS = [
  {
    id: 'plan',
    step: '01',
    title: 'Map your semester once',
    summary:
      'Enter your weekly lectures, rooms, and subjects once in Timetable. Study Schedule automatically accounts for college hours and travel time every day.',
    image: '/landing/screen-timetable.webp',
    caption: 'Timetable · Recurring Mon–Sun class engine',
  },
  {
    id: 'focus',
    step: '02',
    title: 'Focus with Picture-in-Picture',
    summary:
      'Pick a subject, start the Snake Pomodoro, and pop it into a floating PiP window while you code or read. Shorten, extend, or Save & Stop anytime without losing minutes.',
    image: '/landing/screen-study.webp',
    caption: 'Study · Wall-clock Pomodoro & subject time breakdown',
  },
  {
    id: 'review',
    step: '03',
    title: 'Review your 24-hour day',
    summary:
      'Check off daily habits, log sleep or coding blocks, and inspect your transparent 0–100 productivity breakdown on Today with zero opaque algorithms.',
    image: '/landing/screen-today.webp',
    caption: 'Today · Agenda timeline, score breakdown & habits',
  },
  {
    id: 'trends',
    step: '04',
    title: 'Spot real study patterns',
    summary:
      'Switch between 7D, 30D, 90D, and ALL views in Analytics to see your genuine study curves, Pomodoro volume, and active streaks over the semester.',
    image: '/landing/screen-analytics.webp',
    caption: 'Analytics · Score history, study hours & streak metrics',
  },
];

interface WorkflowShowcaseProps {
  onLaunchStudyOS: () => void;
}

/**
 * Section 5: Interactive Product Showcase demonstrating real Study Schedule workflows
 * plus a live interactive Local JSON <-> IndexedDB <-> Secret GitHub Gist sync simulator.
 */
export function WorkflowShowcase({ onLaunchStudyOS }: WorkflowShowcaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeId, setActiveId] = useState(WORKFLOW_STEPS[0].id);
  const currentStep = WORKFLOW_STEPS.find((s) => s.id === activeId) ?? WORKFLOW_STEPS[0];

  // Preload all 4 workflow WebP captures as soon as the section nears the viewport
  const { hasEntered } = useInViewport(sectionRef, '350px 0px');
  useEffect(() => {
    if (!hasEntered) return;
    WORKFLOW_STEPS.forEach((step) => {
      const img = new Image();
      img.src = step.image;
    });
  }, [hasEntered]);

  // Interactive Local-First Sync Simulator
  const simRef = useRef<HTMLDivElement | null>(null);
  const packetARef = useRef<SVGCircleElement | null>(null);
  const packetBRef = useRef<SVGCircleElement | null>(null);
  const [simMode, setSimMode] = useState<'idle' | 'offline' | 'merge'>('idle');
  const [activeNode, setActiveNode] = useState<'none' | 'idb' | 'json' | 'gist' | 'all'>('none');
  const [simLog, setSimLog] = useState<string[]>([
    'Ready · IndexedDB mirror synced with local productivity-data.json',
    'Optional Secret GitHub Gist enabled · zero third-party backend servers',
  ]);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, (ctx) => {
        if (ctx.conditions?.reduceMotion) return;

        // Bidirectional entrance for header, tabs, and sync workbench
        gsap.utils.toArray<HTMLElement>('.lp-wf-reveal').forEach((el) => {
          gsap.from(el, {
            y: 28,
            autoAlpha: 0,
            duration: 0.72,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          });
        });

        // Continuous scrubbed parallax depth on the live-capture product frame
        gsap.fromTo(
          '.lp-wf-stage',
          { y: 44, scale: 0.955 },
          {
            y: -22,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '.lp-wf-stage',
              start: 'top 95%',
              end: 'bottom 20%',
              scrub: 0.85,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  const simulateOffline = contextSafe(() => {
    setSimMode('offline');
    setActiveNode('idb');
    setSimLog([
      '00:00.000  Campus Wi-Fi dropped — offline PWA continues uninterrupted',
      '00:00.002  Focus session saved to browser IndexedDB mirror (2 ms)',
      '00:00.014  Debounced snapshot written to local productivity-data.json',
      '00:00.020  Cloud Gist push queued safely until network reconnects',
    ]);
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !packetARef.current ||
      !packetBRef.current
    ) {
      setActiveNode('json');
      return;
    }
    const tl = gsap.timeline();
    tl.set([packetARef.current, packetBRef.current], { autoAlpha: 0, attr: { cx: 140 } })
      .to(packetARef.current, { autoAlpha: 1, duration: 0.12 })
      .to(packetARef.current, {
        attr: { cx: 340 },
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => setActiveNode('json'),
      })
      .to(packetARef.current, { autoAlpha: 0, duration: 0.18 });
  });

  const simulateMerge = contextSafe(() => {
    setSimMode('merge');
    setActiveNode('gist');
    setSimLog([
      '00:00.000  Fetching latest snapshot from your Secret GitHub Gist',
      '00:00.165  Running deterministic syncMerge by record ID + updatedAt',
      '00:00.172  Merged phone tasks + laptop Pomodoro round with zero data loss',
      '00:00.310  Reconciled JSON written back to disk, IndexedDB, and Gist',
    ]);
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !packetARef.current ||
      !packetBRef.current
    ) {
      setActiveNode('all');
      return;
    }
    const tl = gsap.timeline();
    tl.set(packetBRef.current, { autoAlpha: 0, attr: { cx: 560 } })
      .set(packetARef.current, { autoAlpha: 0, attr: { cx: 360 } })
      .to(packetBRef.current, { autoAlpha: 1, duration: 0.1 })
      .to(packetBRef.current, {
        attr: { cx: 360 },
        duration: 0.55,
        ease: 'power2.inOut',
        onComplete: () => setActiveNode('json'),
      })
      .to(packetBRef.current, { autoAlpha: 0, duration: 0.1 })
      .to([packetARef.current, packetBRef.current], { autoAlpha: 1, duration: 0.1 })
      .to(packetARef.current, { attr: { cx: 140 }, duration: 0.55, ease: 'power2.inOut' }, '<')
      .to(
        packetBRef.current,
        {
          attr: { cx: 560 },
          duration: 0.55,
          ease: 'power2.inOut',
          onComplete: () => setActiveNode('all'),
        },
        '<',
      )
      .to([packetARef.current, packetBRef.current], { autoAlpha: 0, duration: 0.16 });
  });

  const nodeHighlight = (id: 'idb' | 'json' | 'gist') => {
    if (activeNode === 'all' || activeNode === id) {
      return id === 'gist'
        ? 'border-[#0D9488] shadow-md ring-1 ring-[#0D9488]/20'
        : 'border-[#D97706] shadow-md ring-1 ring-[#D97706]/20';
    }
    return id === 'json'
      ? 'border-[#D97706]/40 shadow-sm'
      : 'border-[#E6E3DC]';
  };

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="scroll-mt-14 bg-[#FBFBF9] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="lp-wf-reveal max-w-2xl">
          <div className="text-xs font-medium text-[#B45309]">Real product workflow</div>
          <h2 className="mt-3 font-serif text-[34px] sm:text-[48px] font-normal leading-[1.08] tracking-[-0.025em] text-[#141413]">
            One calm rhythm from first lecture to nightly review
          </h2>
          <p className="mt-4 text-base sm:text-[17px] leading-[1.6] text-[#5C5952]">
            Explore the actual screens inside StudyOS. No fictional dashboards — every frame below
            comes directly from the live application.
          </p>
        </div>

        {/* Stepped Interactive Workflow Switcher */}
        <div className="lp-wf-reveal mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start">
          <div role="tablist" aria-label="StudyOS workflow stages" className="space-y-2.5">
            {WORKFLOW_STEPS.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  id={`wf-tab-${item.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`wf-panel-${item.id}`}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`relative block w-full rounded-2xl border p-5 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-[#141413]/20 bg-white shadow-sm'
                      : 'border-transparent bg-[#F3F1EC]/75 hover:bg-[#F3F1EC]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="workflow-active-bar"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[#D97706]"
                    />
                  )}
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-[#B45309]">{item.step}</span>
                    <span className="text-[15px] font-medium text-[#141413]">{item.title}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C5952]">{item.summary}</p>
                </button>
              );
            })}
          </div>

          <div
            id={`wf-panel-${currentStep.id}`}
            role="tabpanel"
            aria-labelledby={`wf-tab-${currentStep.id}`}
            className="lp-wf-stage lp-parallax-frame lp-device-frame-light overflow-hidden p-2.5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="overflow-hidden rounded-[16px] bg-[#131416] aspect-[16/9]">
                  <img
                    src={currentStep.image}
                    alt={currentStep.caption}
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-1 text-xs text-[#5C5952]">
                  <span className="font-medium text-[#141413]">{currentStep.caption}</span>
                  <span className="font-mono text-[#6B665D]">Live capture · study.vikashin.tech</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Interactive Local-First + Secret GitHub Gist Sync Simulator */}
        <div
          ref={simRef}
          className="lp-wf-reveal lp-dot-grid mt-16 rounded-[24px] border border-[#E6E3DC] bg-[#F3F1EC]/70 p-6 sm:p-9"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#141413]">
                Local-first by default. Multi-device sync when you want it.
              </h3>
              <p className="mt-2 text-sm text-[#5C5952]">
                Test how Study Schedule writes instantly to disk offline and reconciles edits across
                devices through your own Secret GitHub Gist.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={simMode === 'offline'}
                onClick={simulateOffline}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                  simMode === 'offline'
                    ? 'border-[#D97706] bg-[#FEF3C7] text-[#92400E] shadow-sm'
                    : 'border-[#E6E3DC] bg-white text-[#141413] hover:border-[#C8C3B8] hover:bg-[#FBFBF9]'
                }`}
              >
                <WifiOff size={13} />
                Simulate offline edit
              </button>
              <button
                type="button"
                aria-pressed={simMode === 'merge'}
                onClick={simulateMerge}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                  simMode === 'merge'
                    ? 'border-[#0D9488] bg-[#CCFBF1] text-[#115E59] shadow-sm'
                    : 'border-[#E6E3DC] bg-white text-[#141413] hover:border-[#C8C3B8] hover:bg-[#FBFBF9]'
                }`}
              >
                <GitMerge size={13} />
                Simulate multi-device merge
              </button>
            </div>
          </div>

          <div className="relative mt-8 grid gap-5 md:grid-cols-3 items-center">
            <svg
              viewBox="0 0 700 40"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none hidden md:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 w-full z-0"
            >
              <line
                x1="140"
                y1="20"
                x2="340"
                y2="20"
                stroke="#D6D2C9"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <line
                x1="360"
                y1="20"
                x2="560"
                y2="20"
                stroke="#D6D2C9"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <circle ref={packetARef} cx="140" cy="20" r="6" fill="#D97706" style={{ opacity: 0 }} />
              <circle ref={packetBRef} cx="560" cy="20" r="6" fill="#0D9488" style={{ opacity: 0 }} />
            </svg>

            <div
              className={`lp-card-hover relative z-10 rounded-2xl border bg-white p-5 ${nodeHighlight('idb')}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-[#141413]">
                <Database size={16} className="text-[#5C5952]" />
                IndexedDB mirror
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C5952]">
                Instant cold-boot cache &amp; local Dexie.js binary store for PDF/EPUB textbooks.
              </p>
            </div>

            <div
              className={`lp-card-hover relative z-10 rounded-2xl border bg-white p-5 ${nodeHighlight('json')}`}
            >
              <div className="flex items-center justify-between text-sm font-medium text-[#141413]">
                <span className="inline-flex items-center gap-2">
                  <HardDrive size={16} className="text-[#D97706]" />
                  Local JSON file
                </span>
                <span className="font-mono text-[11px] text-[#B45309]">Primary</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C5952]">
                File System Access API autosaves readable JSON straight to your chosen folder.
              </p>
            </div>

            <div
              className={`lp-card-hover relative z-10 rounded-2xl border bg-white p-5 ${nodeHighlight('gist')}`}
            >
              <div className="flex items-center justify-between text-sm font-medium text-[#141413]">
                <span className="inline-flex items-center gap-2">
                  <Cloud size={16} className="text-[#0D9488]" />
                  Secret GitHub Gist
                </span>
                <span className="font-mono text-[11px] text-[#6B665D]">Optional</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C5952]">
                Encrypted PAT stored only in your browser; record-level merge syncs all devices.
              </p>
            </div>
          </div>

          <div
            aria-live="polite"
            className="mt-6 rounded-xl border border-[#E6E3DC] bg-[#141413] p-4 font-mono text-xs text-[#9A968D] space-y-1.5"
          >
            {simLog.map((line, i) => (
              <div key={i} className={i === simLog.length - 1 ? 'text-[#F4F2EC]' : undefined}>
                {line}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5C5952]">
            <span>No sign-up wall — pick local storage or Gist sync in 15 seconds.</span>
            <button
              type="button"
              onClick={onLaunchStudyOS}
              className="group inline-flex items-center gap-1 font-medium text-[#141413] transition-colors hover:text-[#B45309]"
            >
              <span>Launch StudyOS workspace</span>
              <ArrowUpRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
