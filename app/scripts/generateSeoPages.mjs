import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://study.vikashin.tech';
const LAST_MOD = '2026-11-21';
const OG_IMAGE = `${SITE_URL}/landing/og-cover.png`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildGoogleIntegrationsSnippet() {
  const parts = [];
  const gsc = (process.env.VITE_GSC_VERIFICATION || '').trim();
  const gaId = (process.env.VITE_GA_MEASUREMENT_ID || '').trim();

  if (gsc) {
    parts.push(`<meta name="google-site-verification" content="${escapeHtml(gsc)}" />`);
  }
  if (gaId && /^G-[A-Z0-9]+$/i.test(gaId)) {
    parts.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(gaId)}"></script>`,
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${escapeHtml(gaId)}',{anonymize_ip:true});</script>`,
    );
  }
  return parts.join('\n    ');
}

const STATIC_PAGE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: #fbfbf9;
    color: #141413;
    font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }
  :is(a, button):focus-visible { outline: 2px solid #d97706; outline-offset: 2px; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .wrap-narrow { max-width: 780px; margin: 0 auto; padding: 0 24px; }

  /* Sticky Minimal Frosted Navigation */
  .site-header {
    position: sticky; top: 0; z-index: 40;
    background: rgba(251, 251, 249, 0.88);
    backdrop-filter: saturate(180%) blur(16px);
    -webkit-backdrop-filter: saturate(180%) blur(16px);
    border-bottom: 1px solid #e6e3dc;
  }
  .header-inner {
    max-width: 1280px; margin: 0 auto; height: 56px; padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px;
  }
  .brand {
    display: inline-flex; align-items: center; gap: 10px;
    font-size: 15px; font-weight: 500; text-decoration: none; white-space: nowrap;
  }
  .brand img { width: 24px; height: 24px; border-radius: 6px; }
  .nav-links {
    display: flex; align-items: center; gap: 22px; font-size: 13.5px; color: #5c5952;
  }
  .nav-links a { text-decoration: none; transition: color 0.18s ease; white-space: nowrap; }
  .nav-links a:hover, .nav-links a[aria-current="page"] { color: #141413; font-weight: 500; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 999px; background: #141413; color: #fbfbf9;
    font-size: 13.5px; font-weight: 500; text-decoration: none; white-space: nowrap;
    transition: background 0.18s ease, transform 0.18s ease;
  }
  .btn-primary:hover { background: #2a2825; transform: translateY(-1px); }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 999px; background: #ffffff; color: #141413;
    border: 1px solid #e6e3dc; font-size: 13.5px; font-weight: 500; text-decoration: none;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .btn-secondary:hover { background: #f3f1ec; border-color: #cfc9bd; }

  /* Breadcrumb & Editorial Hero */
  .crumb {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font-size: 13px; color: #6b665d; padding-top: 28px;
  }
  .crumb a { text-decoration: none; }
  .crumb a:hover { color: #141413; text-decoration: underline; }
  .hero {
    background: radial-gradient(65% 50% at 50% 0%, rgba(245, 166, 91, 0.14) 0%, rgba(251, 251, 249, 0) 70%), #fbfbf9;
    padding: 32px 0 64px; border-bottom: 1px solid #e6e3dc;
  }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase; color: #b45309;
  }
  h1 {
    margin: 12px 0 0; font-family: 'Newsreader', Georgia, serif; font-weight: 400;
    font-size: clamp(34px, 5vw, 56px); line-height: 1.06; letter-spacing: -0.03em; color: #141413;
  }
  h2 {
    margin: 0; font-family: 'Newsreader', Georgia, serif; font-weight: 400;
    font-size: clamp(26px, 3.2vw, 38px); line-height: 1.12; letter-spacing: -0.02em; color: #141413;
  }
  h3 {
    margin: 0; font-size: 18px; font-weight: 600; color: #141413; line-height: 1.3;
  }
  .lead {
    margin: 18px 0 0; font-size: 18px; line-height: 1.6; color: #5c5952; max-width: 720px;
  }
  .actions { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }

  .device-frame {
    margin-top: 40px; background: #ffffff; border: 1px solid #e6e3dc; border-radius: 22px;
    padding: 10px; box-shadow: 0 24px 60px -24px rgba(20, 20, 19, 0.15);
  }
  .device-frame img { width: 100%; height: auto; display: block; border-radius: 14px; }
  .device-caption {
    padding: 12px 10px 4px; font-size: 12.5px; color: #6b665d;
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  }

  .section { padding: 72px 0; }
  .section-stone { background: #f3f1ec; border-top: 1px solid #e6e3dc; border-bottom: 1px solid #e6e3dc; }
  .section-dark { background: #0c0d0f; color: #f4f2ec; }
  .section-dark h2, .section-dark h3 { color: #f4f2ec; }
  .section-dark p { color: #a5a096; }

  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; margin-top: 32px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-top: 32px; }
  .card {
    background: #ffffff; border: 1px solid #e6e3dc; border-radius: 18px; padding: 24px;
  }
  .card p { margin: 10px 0 0; font-size: 14.5px; color: #5c5952; line-height: 1.6; }
  .card-link {
    display: block; text-decoration: none;
    transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  }
  .card-link:hover {
    transform: translateY(-2px); border-color: #cfc9bd;
    box-shadow: 0 14px 32px -20px rgba(20, 20, 19, 0.18);
  }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Editorial Article Prose */
  .prose { padding: 56px 0 72px; }
  .prose h2 { margin-top: 44px; margin-bottom: 14px; font-size: 32px; }
  .prose h3 { margin-top: 28px; margin-bottom: 10px; font-size: 19px; }
  .prose p { margin: 0 0 18px; font-size: 16.5px; line-height: 1.72; color: #3f3d38; }
  .prose ul, .prose ol { margin: 0 0 20px; padding-left: 22px; color: #3f3d38; font-size: 16px; line-height: 1.7; }
  .prose li { margin-bottom: 8px; }
  .prose a { color: #b45309; text-decoration: underline; text-underline-offset: 3px; }
  .prose a:hover { color: #141413; }
  .callout {
    margin: 28px 0; padding: 20px 24px; border-radius: 16px;
    background: #f3f1ec; border-left: 3px solid #d97706;
  }
  .callout strong { color: #141413; }
  .cta-box {
    margin: 48px 0 0; padding: 36px; border-radius: 24px; background: #0c0d0f; color: #f4f2ec;
  }
  .cta-box h2 { color: #f4f2ec; font-size: 34px; }
  .cta-box p { color: #a5a096; margin: 12px 0 22px; font-size: 16px; }
  .btn-amber {
    display: inline-flex; align-items: center; gap: 6px; padding: 11px 22px; border-radius: 999px;
    background: #e58b4a; color: #131416; font-size: 14px; font-weight: 600; text-decoration: none;
  }
  .btn-amber:hover { filter: brightness(1.06); }

  /* Footer */
  .site-footer {
    border-top: 1px solid #e6e3dc; background: #fbfbf9; padding: 56px 0 44px;
    font-size: 13.5px; color: #5c5952;
  }
  .footer-grid {
    display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 32px;
  }
  .footer-title { font-size: 12px; font-weight: 600; color: #141413; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .footer-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .footer-list a { text-decoration: none; color: #5c5952; }
  .footer-list a:hover { color: #141413; }

  @media (max-width: 860px) {
    .nav-links { display: none; }
    .grid-2, .grid-3, .footer-grid { grid-template-columns: 1fr; }
    .section { padding: 52px 0; }
  }
`;

function renderShell({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  robots = 'index, follow',
  jsonLd,
  activeNav = '',
  bodyHtml,
  googleSnippet,
}) {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="theme-color" content="#FBFBF9" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="Study Schedule" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400&display=swap"
      rel="stylesheet"
    />
    ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
    ${googleSnippet}
    <style>${STATIC_PAGE_CSS}</style>
  </head>
  <body>
    <header class="site-header">
      <div class="header-inner">
        <a href="/?landing=1" class="brand">
          <img src="/favicon.svg" alt="" width="24" height="24" />
          <span>Study Schedule</span>
        </a>
        <nav aria-label="Main navigation" class="nav-links">
          <a href="/study-planner/" ${activeNav === 'study-planner' ? 'aria-current="page"' : ''}>Study Planner</a>
          <a href="/semester-planner/" ${activeNav === 'semester-planner' ? 'aria-current="page"' : ''}>Semester Planner</a>
          <a href="/timetable-maker/" ${activeNav === 'timetable-maker' ? 'aria-current="page"' : ''}>Timetable Maker</a>
          <a href="/exam-planner/" ${activeNav === 'exam-planner' ? 'aria-current="page"' : ''}>Exam Planner</a>
          <a href="/guides/" ${activeNav === 'guides' ? 'aria-current="page"' : ''}>Guides</a>
          <a href="/docs/index.html">Docs</a>
        </nav>
        <a href="/studyos/?launch=1" class="btn-primary">Launch StudyOS ↗</a>
      </div>
    </header>
    ${bodyHtml}
    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a href="/?landing=1" class="brand">
              <img src="/favicon.svg" alt="" width="22" height="22" />
              <span>Study Schedule</span>
            </a>
            <p style="margin-top:12px;font-size:13px;color:#6b665d;max-width:280px;">
              Free, open-source, local-first student productivity platform for semester planning, weekly timetables, exam prep, and focused study.
            </p>
          </div>
          <div>
            <div class="footer-title">Planners</div>
            <ul class="footer-list">
              <li><a href="/study-planner/">Study Planner</a></li>
              <li><a href="/semester-planner/">Semester Planner</a></li>
              <li><a href="/timetable-maker/">College Timetable Maker</a></li>
              <li><a href="/exam-planner/">Exam Planner</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-title">Study Guides</div>
            <ul class="footer-list">
              <li><a href="/guides/">All Study Guides</a></li>
              <li><a href="/guides/how-to-plan-a-semester/">Plan a Semester in 15 Min</a></li>
              <li><a href="/guides/active-recall-vs-passive-learning/">Active Recall vs. Passive</a></li>
              <li><a href="/guides/how-to-use-pomodoro-for-studying/">Pomodoro for Studying</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-title">Resources</div>
            <ul class="footer-list">
              <li><a href="/studyos/?launch=1">Launch StudyOS</a></li>
              <li><a href="/docs/index.html">Offline Documentation (31)</a></li>
              <li><a href="https://github.com/CypherNinjaa/study_schedule" target="_blank" rel="noreferrer">GitHub (MIT License)</a></li>
              <li><a href="/llms.txt">llms.txt</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  </body>
</html>`;
}

function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

function softwareNode(pagePath, name, description) {
  return {
    '@type': 'SoftwareApplication',
    name,
    url: `${SITE_URL}${pagePath}`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, Windows, macOS, Linux, Android, iOS (PWA)',
    isAccessibleForFree: true,
    license: 'https://opensource.org/licenses/MIT',
    description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

const FEATURE_PAGES = [
  {
    slug: 'study-planner',
    navKey: 'study-planner',
    title: 'Free Online Study Planner & 24-Hour Time Accounting | Study Schedule',
    description:
      'Plan daily study blocks, log exact focus sessions with a Picture-in-Picture Pomodoro timer, and inspect a transparent 0–100 daily productivity breakdown — offline and free.',
    eyebrow: 'Daily Study Planner',
    h1: 'A calm online study planner built around all 24 hours.',
    lead: 'Most to-do apps give you an endless list of checkboxes without showing whether your day is physically possible. Study Schedule combines your daily timeline, habits, Snake Pomodoro timer, and 24-hour time accounting in one private local workspace.',
    screenshot: '/landing/screen-today.webp',
    screenshotAlt:
      'Study Schedule Today view displaying daily agenda timeline, 0 to 100 daily productivity breakdown, and daily habit checkboxes',
    screenshotCaption: 'Live capture of the Today view inside Study Schedule',
    pillarsHeading: 'What makes Study Schedule different from generic to-do lists',
    pillars: [
      {
        title: '24-hour time accounting',
        body: 'See how classes, deep study, coding, sleep, exercise, and distractions fit inside 1,440 daily minutes instead of over-scheduling your day.',
      },
      {
        title: 'Transparent 0–100 daily score',
        body: 'Weighted openly across Study (30), Tasks (25), Habits (15), Coding (10), Sleep (10), Exercise (5), and Schedule (5) — zero black-box algorithms.',
      },
      {
        title: 'Honest Picture-in-Picture Pomodoro',
        body: 'Pop the wall-clock Snake Pomodoro into a floating window, adjust length live with -5m / +5m, or Save & Stop early without losing earned minutes.',
      },
      {
        title: 'Offline-first local JSON ownership',
        body: 'Autosaves straight to a readable JSON file on your computer with optional Secret GitHub Gist sync across phone and laptop.',
      },
    ],
    relatedLinks: [
      { href: '/semester-planner/', label: 'Explore the Semester Planner →' },
      { href: '/guides/how-to-use-pomodoro-for-studying/', label: 'Read: How to Use Pomodoro Without Breaking Flow →' },
      { href: '/docs/guide-today.html', label: 'Read Today View Documentation →' },
    ],
  },
  {
    slug: 'semester-planner',
    navKey: 'semester-planner',
    title: 'Free College Semester Planner — Classes, Credits & Exam Roadmap | Study Schedule',
    description:
      'Organize an entire college or university semester in one offline-ready workspace. Track credit-weighted subjects, recurring classes, exam milestones, and 90-day study analytics.',
    eyebrow: 'Semester Planner',
    h1: 'Plan your entire college semester without Notion setup fatigue.',
    lead: 'Instead of spending your first week of term wiring fragile database formulas, Study Schedule gives you a ready-made academic command center connecting subjects, recurring lectures, exam syllabi, textbooks, and study trends.',
    screenshot: '/landing/screen-dashboard.webp',
    screenshotAlt:
      'Study Schedule Dashboard showing semester study allocation, XP level progression, and 6-dimension consistency streaks',
    screenshotCaption: 'Live capture of the Study Schedule Semester Dashboard',
    pillarsHeading: 'Built specifically for university & college terms',
    pillars: [
      {
        title: 'Subject credit & difficulty structure',
        body: 'Track every course with credit weights, topic lists, linked PDF/EPUB textbooks, and cumulative hours studied over 7D, 30D, and 90D windows.',
      },
      {
        title: 'Automatic class & free-time math',
        body: 'Your recurring weekly timetable feeds straight into each day so your available study capacity stays realistic from week one to finals.',
      },
      {
        title: '3D local textbook library',
        body: 'Import PDF and EPUB textbooks directly into browser IndexedDB via Dexie.js and read offline with Three.js page turns — no cloud file limits.',
      },
      {
        title: 'Zero accounts, zero subscriptions',
        body: 'Keep your full academic history in one portable JSON file you own forever. Free and MIT open source.',
      },
    ],
    relatedLinks: [
      { href: '/timetable-maker/', label: 'Build Your Weekly College Timetable →' },
      { href: '/guides/how-to-plan-a-semester/', label: 'Read: Plan an Entire Semester in 15 Minutes →' },
      { href: '/exam-planner/', label: 'Scope Your Midterm & Final Exams →' },
    ],
  },
  {
    slug: 'timetable-maker',
    navKey: 'timetable-maker',
    title: 'Free College Timetable Maker — Weekly Lectures, Labs & Rooms | Study Schedule',
    description:
      'Create a clean recurring Monday–Sunday college timetable with room numbers, lab badges, and faculty names. Syncs automatically with your daily study planner — offline and free.',
    eyebrow: 'College Timetable Maker',
    h1: 'A free college timetable maker that connects directly to your study day.',
    lead: 'Static PDF timetables tell you where to sit, then sit untouched in a downloads folder. Study Schedule turns your Monday–Sunday lectures, labs, rooms, and instructors into a live engine that powers your daily timeline automatically.',
    screenshot: '/landing/screen-timetable.webp',
    screenshotAlt:
      'Study Schedule Weekly College Timetable displaying recurring Monday, Tuesday, and Wednesday classes with room numbers, lab tags, and instructor names',
    screenshotCaption: 'Live capture of Semester V recurring classes inside Study Schedule',
    pillarsHeading: 'Designed for real university class schedules',
    pillars: [
      {
        title: 'Recurring Monday–Sunday slots',
        body: 'Define semester start and end dates once. Every lecture and lab automatically appears on your daily agenda without manual copy-pasting.',
      },
      {
        title: 'Room numbers, labs & instructors',
        body: 'Tag lab sessions separately from lectures and keep building rooms and professor names visible at a glance on desktop or mobile.',
      },
      {
        title: 'Automatic weekly lecture totals',
        body: 'Instantly see how many hours per week you spend in class (for example, 27 classes across 20h 15m) so you can budget realistic self-study blocks.',
      },
      {
        title: 'Works offline in campus buildings',
        body: 'Install as a Progressive Web App on phone or laptop — check your next room number even in basement lecture halls with zero signal.',
      },
    ],
    relatedLinks: [
      { href: '/semester-planner/', label: 'Connect Timetable to Your Semester Planner →' },
      { href: '/study-planner/', label: 'See How Classes Feed Your 24-Hour Day →' },
      { href: '/docs/guide-timetable.html', label: 'Read Timetable Documentation →' },
    ],
  },
  {
    slug: 'exam-planner',
    navKey: 'exam-planner',
    title: 'Exam Planner & Syllabus Scope Tracker for Students | Study Schedule',
    description:
      'Organize upcoming midterms and finals, select only the exact syllabus modules being tested, and track real topic readiness percentages inside one free offline study workspace.',
    eyebrow: 'Exam Planner & Syllabus Scope',
    h1: 'Scope every midterm and final to the exact modules being tested.',
    lead: 'Exam stress spikes when a whole course feels like one blurry mountain. Study Schedule lets you link each exam to its subject, pick only the specific chapters on the paper, and watch your genuine readiness percentage climb as you study.',
    screenshot: '/landing/screen-study.webp',
    screenshotAlt:
      'Study Schedule Study and Subject Ledger view showing linked course topics, focus timer, and per-subject study hours',
    screenshotCaption: 'Track subject study sessions and topic mastery directly alongside exam countdowns',
    pillarsHeading: 'Turn exam prep into clear, measurable checkpoints',
    pillars: [
      {
        title: 'Selective module & topic scoping',
        body: 'Midterms rarely cover the whole textbook. Check only the units included on each paper so your countdown tracks what actually matters.',
      },
      {
        title: 'Honest readiness percentages',
        body: 'Mark syllabus topics complete as you verify them through active recall — no inflated progress bars or guesswork.',
      },
      {
        title: 'Direct link to focus & reading',
        body: 'Run subject-linked Pomodoro sessions and read imported PDF/EPUB handouts offline so every minute of revision is counted accurately.',
      },
      {
        title: 'Past exam archive',
        body: 'Completed papers stay neatly archived separately from upcoming countdowns so your active exam board stays calm and focused.',
      },
    ],
    relatedLinks: [
      { href: '/guides/active-recall-vs-passive-learning/', label: 'Read: Active Recall vs. Passive Learning →' },
      { href: '/study-planner/', label: 'Pair Exams with Daily Focus Blocks →' },
      { href: '/docs/guide-exams.html', label: 'Read Exam Planner Documentation →' },
    ],
  },
];

const GUIDE_ARTICLES = [
  {
    slug: 'how-to-plan-a-semester',
    title: 'How to Plan an Entire College Semester in 15 Minutes | Study Schedule Guides',
    headline: 'How to Plan an Entire College Semester in 15 Minutes',
    description:
      'A practical 3-layer semester planning method for college students: lock recurring lectures, scope midterm and final syllabi, and build a realistic 24-hour study budget.',
    readTime: '6 min read',
    category: 'Semester Planning',
    bodyHtml: `
      <p>At the start of every term, thousands of students spend an entire weekend building an intricate multi-table spreadsheet or workspace — only to abandon it by week three because maintaining the system takes longer than studying.</p>
      <p>Effective semester planning does not require complex templates. You only need <strong>15 minutes</strong> to establish three clear layers: fixed commitments, exam scope, and a realistic 24-hour daily budget.</p>

      <h2>Layer 1 (Minutes 0–5): Lock Your Fixed Recurring Classes</h2>
      <p>Before planning a single study session, put every non-negotiable weekly event on the board: lectures, labs, tutorials, and commute windows. Once your recurring Monday–Sunday schedule is visible, you immediately know your true weekly lecture load (for example, 18 to 22 hours of classes) and where genuine uninterrupted focus windows exist.</p>
      <div class="callout">
        <strong>Practical rule:</strong> Never schedule self-study inside 25-minute gaps between distant lecture halls. Protect contiguous 60–90 minute blocks for hard subjects instead.
      </div>
      <p>In <a href="/timetable-maker/">Study Schedule’s College Timetable Maker</a>, you enter semester dates, room numbers, lab badges, and instructors once, and the recurring schedule flows automatically into every day of the term.</p>

      <h2>Layer 2 (Minutes 5–10): Scope Every Midterm and Final to Exact Modules</h2>
      <p>Open each course syllabus PDF and extract only two facts per exam: the <strong>date</strong> and the <strong>specific units being tested</strong>. Most students fall behind because &ldquo;Midterm in 3 weeks&rdquo; feels abstract until 48 hours before the paper.</p>
      <ul>
        <li>List every testable module or chapter as a concrete checkable topic.</li>
        <li>Tag high-credit or high-difficulty courses so they receive priority study slots earlier in the week.</li>
        <li>Keep past exams archived once finished so your active board only displays what is ahead.</li>
      </ul>
      <p>You can track selective module readiness directly inside the <a href="/exam-planner/">Exam Planner</a> without maintaining duplicate spreadsheets.</p>

      <h2>Layer 3 (Minutes 10–15): Set a Realistic 24-Hour Daily Budget</h2>
      <p>A semester fails when daily goals ignore basic physics. Every day contains exactly 1,440 minutes. Subtract sleep (7–8 hours), classes, meals, and commute first — then assign sustainable daily targets for focused study, coding or problem sets, and exercise.</p>
      <h3>Why sustainable targets outperform heroic schedules</h3>
      <p>Three focused hours logged consistently five days a week beats one 11-hour cramming marathon followed by three burnt-out days. Using <a href="/study-planner/">24-hour time accounting</a> makes over-commitment obvious before burnout starts.</p>

      <h2>Weekly 10-Minute Maintenance Routine</h2>
      <ol>
        <li><strong>Sunday evening:</strong> Review the upcoming week’s exam countdowns and pick the top 3 syllabus topics that need attention.</li>
        <li><strong>Each study session:</strong> Link your focus timer to a specific subject so your 7-day and 30-day analytics show whether hard courses are actually getting time.</li>
        <li><strong>Keep your data portable:</strong> Store your plan offline in a format you own so spotty campus Wi-Fi never interrupts a study session.</li>
      </ol>
    `,
    ctaTitle: 'Build your 3-layer semester plan in StudyOS',
    ctaBody: 'Free, offline-first, and stored in one local JSON file — map your timetable, exam scopes, and 24-hour daily budget in minutes.',
  },
  {
    slug: 'active-recall-vs-passive-learning',
    title: 'Active Recall vs. Passive Learning: How to Study So Material Actually Sticks',
    headline: 'Active Recall vs. Passive Learning: Why Retrieval Beats Re-Reading',
    description:
      'Understand the recognition illusion behind highlighting and re-reading, what cognitive psychology research shows about retrieval practice, and a 3-step active recall workflow for exams.',
    readTime: '7 min read',
    category: 'Learning Science',
    bodyHtml: `
      <p>Almost every student has experienced the same frustrating moment: you spend four hours highlighting a textbook chapter, re-reading clean notes, and nodding along to recorded lectures — and then freeze on the first exam question.</p>
      <p>Cognitive psychologists call this the <strong>illusion of competence</strong> (or fluency illusion). When material looks familiar on the page, your brain mistakes <em>recognition</em> for <em>retrieval</em>.</p>

      <h2>What Cognitive Science Shows About Retrieval Practice</h2>
      <p>In a landmark study published in <em>Psychological Science</em>, Henry Roediger and Jeffrey Karpicke (2006) compared students who repeatedly studied passages against students who studied once and practiced recalling the material from memory. While repeated reading produced slightly higher confidence immediately, students who practiced active recall retained substantially more material one week later.</p>
      <p>Similarly, Dunlosky et al. (2013) reviewed ten widely used study techniques in <em>Psychological Science in the Public Interest</em> and rated <strong>practice testing (active recall)</strong> and <strong>distributed practice (spaced repetition)</strong> as highest utility, while highlighting and passive re-reading ranked low utility.</p>

      <h2>Passive Learning vs. Active Recall Side by Side</h2>
      <ul>
        <li><strong>Passive learning:</strong> Re-reading chapters verbatim, color-coding paragraphs, watching lectures at 2x speed without pausing, copying slides word for word. Feels smooth, produces fragile recall under exam conditions.</li>
        <li><strong>Active recall:</strong> Closing the book after a section and summarizing key concepts from memory, solving unseen problems without looking at worked solutions first, explaining a derivation aloud on a blank page. Feels harder in the moment, builds durable exam memory.</li>
      </ul>

      <h2>A Practical 3-Step Active Recall Loop for Any Course</h2>
      <h3>Step 1: Scope the exact testable topics first</h3>
      <p>Instead of opening chapter one blindly, break your upcoming paper into discrete modules inside your <a href="/exam-planner/">Exam Planner</a>. Retrieval works best when each session targets a clearly bounded concept.</p>

      <h3>Step 2: Read one section, close the page, write 3 checkpoints</h3>
      <p>When reading a PDF or EPUB textbook (for instance in Study Schedule’s offline 3D reader), pause at the end of every subsection. Look away and write down the core claim, equation, or edge case from memory before turning the page.</p>

      <h3>Step 3: Space your retrieval reps across Day 1, Day 3, and Day 7</h3>
      <p>One recall session fades; spaced checkpoints flatten the forgetting curve. Schedule short 25-minute review sprints in your <a href="/study-planner/">Study Planner</a> focused exclusively on topics where your recall hesitated.</p>

      <div class="callout">
        <strong>Rule of thumb:</strong> If a study session feels effortless, you are probably reviewing what you already recognize. Mild mental friction during retrieval is the signal that long-term memory is strengthening.
      </div>
    `,
    ctaTitle: 'Pair your 3D textbook reader with exam syllabus tracking',
    ctaBody: 'Import local PDF and EPUB textbooks into Study Schedule, track exact syllabus readiness, and log honest focus minutes — 100% offline.',
  },
  {
    slug: 'how-to-use-pomodoro-for-studying',
    title: 'How to Use the Pomodoro Technique for Studying Without Breaking Flow',
    headline: 'How to Use the Pomodoro Technique for Studying Without Breaking Flow',
    description:
      'Learn why many students abandon rigid 25-minute Pomodoro timers by day three and how to adapt focus sprints, interruptions, and breaks to real university coursework.',
    readTime: '6 min read',
    category: 'Focus Systems',
    bodyHtml: `
      <p>Developed by Francesco Cirillo in the late 1980s, the Pomodoro Technique breaks work into timed focus sprints separated by brief breaks (traditionally 25 minutes on, 5 minutes off, with a longer break after four rounds). Its real superpower is psychological: your brain resists a vague 3-hour study marathon, but easily starts a bounded 25-minute sprint.</p>
      <p>Yet many students quit Pomodoro within a week. Almost always, the failure comes from treating the timer as a rigid rule instead of a flexible focus scaffold.</p>

      <h2>Three Common Pomodoro Mistakes (and Practical Fixes)</h2>
      <h3>1. Treating interruptions as total resets</h3>
      <p>In real student life, a roommate knocks or a lab partner calls at minute 19. Traditional timers punish you by discarding the entire round, killing your motivation to restart. Instead, use a timer with <strong>Save &amp; Stop early</strong> so the exact 19 minutes you genuinely focused are still logged to your subject ledger.</p>

      <h3>2. Forcing 25 minutes on every kind of work</h3>
      <p>Different academic tasks carry different cognitive startup costs:</p>
      <ul>
        <li><strong>15–20 minutes:</strong> Best for high-procrastination tasks — outlining an essay, skimming a tough syllabus, or starting revision when tired.</li>
        <li><strong>25–30 minutes:</strong> Ideal for active recall, textbook reading, flashcards, and structured problem sets.</li>
        <li><strong>45–50 minutes:</strong> Better suited to deep coding assignments, lab builds, or multi-step proofs once you have entered flow.</li>
      </ul>
      <p>Being able to nudge a live session by <strong>−5m or +5m</strong> lets you finish a proof cleanly without fighting the clock.</p>

      <h3>3. Checking a hidden browser tab — or scrolling during breaks</h3>
      <p>Alt-tabbing every three minutes to check remaining time invites distraction. A floating <strong>Picture-in-Picture timer</strong> keeps the countdown quietly visible beside your IDE or PDF reader. Equally important: during your 5-minute reset, stand up, stretch, or look across the room instead of opening short-form video feeds that overload working memory.</p>

      <h2>Connecting Focus Sprints to Your Semester Goals</h2>
      <p>A timer alone tracks minutes; a study system tracks <em>where</em> those minutes went. Always attach each focus round to a specific course so your weekly analytics reveal whether difficult subjects are getting enough attention. Explore how Study Schedule integrates Picture-in-Picture focus directly into your <a href="/study-planner/">24-Hour Study Planner</a> and <a href="/semester-planner/">Semester Dashboard</a>.</p>
    `,
    ctaTitle: 'Try the floating Picture-in-Picture Snake Pomodoro',
    ctaBody: 'Adjust duration live with −5m/+5m, Save & Stop early without losing earned minutes, and track per-subject study totals offline.',
  },
];

const EDITORIAL_ROADMAP = [
  { num: '01', title: 'How to Plan an Entire College Semester in 15 Minutes', href: '/guides/how-to-plan-a-semester/', status: 'Published' },
  { num: '02', title: 'Active Recall vs. Passive Learning: Why Retrieval Beats Re-Reading', href: '/guides/active-recall-vs-passive-learning/', status: 'Published' },
  { num: '03', title: 'How to Use the Pomodoro Technique for Studying Without Breaking Flow', href: '/guides/how-to-use-pomodoro-for-studying/', status: 'Published' },
  { num: '04', title: 'How to Build a Conflict-Free College Timetable Around Labs & Commutes', href: '/timetable-maker/', status: 'Planned (see Timetable Maker)' },
  { num: '05', title: 'How to Scope a Midterm Syllabus When You Only Have 10 Days Left', href: '/exam-planner/', status: 'Planned (see Exam Planner)' },
  { num: '06', title: '24-Hour Time Accounting for Students: Fixing Over-Scheduled Days', href: '/study-planner/', status: 'Planned (see Study Planner)' },
  { num: '07', title: 'Organizing PDF & EPUB Course Textbooks Offline Without Cloud Limits', href: '/docs/guide-library.html', status: 'Planned (see Library Docs)' },
  { num: '08', title: 'Local-First Study Notes & Privacy: Why Your Academic Data Should Live in JSON', href: '/docs/concept-privacy.html', status: 'Planned (see Privacy Docs)' },
  { num: '09', title: 'Building Sustainable Study Streaks Without Burnout or Gamification Traps', href: '/docs/concept-streaks.html', status: 'Planned (see Streaks Docs)' },
  { num: '10', title: 'How to Run a 10-Minute Sunday Academic Review Every Week', href: '/docs/guide-reviews.html', status: 'Planned (see Reviews Docs)' },
];

const PUBLIC_DOCS_FOR_SITEMAP = [
  'index.html',
  'getting-started.html',
  'why.html',
  'workflows.html',
  'guide-timetable.html',
  'guide-exams.html',
  'guide-study.html',
  'guide-today.html',
  'guide-library.html',
  'guide-analytics.html',
  'concept-privacy.html',
  'concept-score.html',
  'concept-storage.html',
  'concept-streaks.html',
  'faq.html',
];

function writeFileEnsureDir(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Generates all static SEO assets in `dist/` after Vite finishes bundling:
 * - Cleans/injects optional Google Search Console & GA4 tags into `dist/index.html`
 * - Emits `dist/studyos/index.html` with strict `noindex, nofollow`
 * - Emits branded `dist/404.html` with `noindex, follow` and crawlable recovery links
 * - Emits dedicated static feature pages (`/study-planner/`, `/semester-planner/`, `/timetable-maker/`, `/exam-planner/`)
 * - Emits `/guides/` hub + 3 full cornerstone editorial articles with `Article` + `BreadcrumbList` JSON-LD
 * - Emits valid UTF-8 `dist/sitemap.xml` containing strictly HTTP 200 canonical indexable HTTPS URLs
 */
export function generateSeoPages(distDir) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) return;

  const googleSnippet = buildGoogleIntegrationsSnippet();
  const builtIndexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  // 1. Finalize dist/index.html (inject optional env-driven GSC/GA4 tags or remove placeholder cleanly)
  const finalIndexHtml = builtIndexHtml.replace('<!-- OPTIONAL_GOOGLE_INTEGRATIONS -->', googleSnippet);
  fs.writeFileSync(indexHtmlPath, finalIndexHtml, 'utf-8');

  // 2. Emit dist/studyos/index.html with strict noindex, nofollow so private student dashboards are never indexed
  const studyosHtml = finalIndexHtml
    .replace(
      /<title>[\s\S]*?<\/title>/,
      '<title>StudyOS — Private Local-First Workspace | Study Schedule</title>',
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/>/,
      '<meta name="robots" content="noindex, nofollow" />',
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${SITE_URL}/studyos/" />`,
    )
    .replace(
      /<meta name="theme-color" content="[^"]*"\s*\/>/,
      '<meta name="theme-color" content="#131416" />',
    )
    .replace(/<!-- Structured Data[\s\S]*?<\/script>/, '')
    .replace(
      /<div id="root">[\s\S]*?<\/div>\s*<script/,
      '<div id="root"></div>\n    <script',
    );
  writeFileEnsureDir(path.join(distDir, 'studyos', 'index.html'), studyosHtml);

  // 3. Emit branded HTTP 404 page (never a silent duplicate of index.html; crawlable recovery links)
  const notFoundHtml = renderShell({
    title: 'Page Not Found (404) | Study Schedule',
    description: 'The requested page could not be found on Study Schedule. Explore our free student planner, timetable maker, exam planner, or study guides.',
    canonicalPath: '/404.html',
    robots: 'noindex, follow',
    googleSnippet,
    bodyHtml: `
      <main class="section">
        <div class="wrap-narrow" style="text-align:center;padding:48px 0;">
          <div class="eyebrow">HTTP 404</div>
          <h1>We couldn&rsquo;t find that page.</h1>
          <p class="lead" style="margin:18px auto 0;">The link may have moved or been mistyped. Jump back to the homepage, open a planner guide, or launch StudyOS directly.</p>
          <div class="actions" style="justify-content:center;">
            <a href="/" class="btn-primary">Back to Homepage</a>
            <a href="/guides/" class="btn-secondary">Browse Study Guides</a>
            <a href="/studyos/?launch=1" class="btn-secondary">Launch StudyOS ↗</a>
          </div>
        </div>
      </main>
    `,
  });
  writeFileEnsureDir(path.join(distDir, '404.html'), notFoundHtml);

  const sitemapUrls = [`${SITE_URL}/`];

  // 4. Emit 4 dedicated static Feature Landing Pages
  for (const page of FEATURE_PAGES) {
    const canonicalPath = `/${page.slug}/`;
    sitemapUrls.push(`${SITE_URL}${canonicalPath}`);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        softwareNode(canonicalPath, `Study Schedule — ${page.eyebrow}`, page.description),
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: page.eyebrow, path: canonicalPath },
        ]),
      ],
    };

    const html = renderShell({
      title: page.title,
      description: page.description,
      canonicalPath,
      activeNav: page.navKey,
      jsonLd,
      googleSnippet,
      bodyHtml: `
        <main>
          <section class="hero">
            <div class="wrap">
              <nav aria-label="Breadcrumb" class="crumb">
                <a href="/?landing=1">Home</a>
                <span aria-hidden="true">/</span>
                <span>${escapeHtml(page.eyebrow)}</span>
              </nav>
              <div style="margin-top:22px;">
                <div class="eyebrow">${escapeHtml(page.eyebrow)}</div>
                <h1>${escapeHtml(page.h1)}</h1>
                <p class="lead">${escapeHtml(page.lead)}</p>
                <div class="actions">
                  <a href="/studyos/?launch=1" class="btn-primary">Launch Free in Browser ↗</a>
                  <a href="/guides/" class="btn-secondary">Read Study Guides</a>
                </div>
              </div>
              <div class="device-frame">
                <img src="${page.screenshot}" alt="${escapeHtml(page.screenshotAlt)}" width="1440" height="900" fetchpriority="high" />
                <div class="device-caption">
                  <span>${escapeHtml(page.screenshotCaption)}</span>
                  <span class="mono">Free · Offline PWA · Zero Accounts</span>
                </div>
              </div>
            </div>
          </section>

          <section class="section section-stone">
            <div class="wrap">
              <h2>${escapeHtml(page.pillarsHeading)}</h2>
              <div class="grid-2">
                ${page.pillars
                  .map(
                    (p) => `
                  <article class="card">
                    <h3>${escapeHtml(p.title)}</h3>
                    <p>${escapeHtml(p.body)}</p>
                  </article>
                `,
                  )
                  .join('')}
              </div>
            </div>
          </section>

          <section class="section">
            <div class="wrap">
              <h2>Continue exploring Study Schedule</h2>
              <div class="grid-3">
                ${page.relatedLinks
                  .map(
                    (link) => `
                  <a href="${link.href}" class="card card-link">
                    <div class="mono" style="font-size:12px;color:#b45309;">RELATED</div>
                    <h3 style="margin-top:8px;font-size:16px;">${escapeHtml(link.label)}</h3>
                  </a>
                `,
                  )
                  .join('')}
              </div>

              <div class="cta-box">
                <h2>Own your study system. Free forever.</h2>
                <p>No sign-up wall, no cloud lock-in, and no subscription fees. Launch StudyOS in your browser and autosave straight to a local JSON file.</p>
                <a href="/studyos/?launch=1" class="btn-amber">Launch StudyOS ↗</a>
              </div>
            </div>
          </section>
        </main>
      `,
    });

    writeFileEnsureDir(path.join(distDir, page.slug, 'index.html'), html);
  }

  // 5. Emit /guides/ Editorial Hub
  const guidesHubPath = '/guides/';
  sitemapUrls.push(`${SITE_URL}${guidesHubPath}`);
  const guidesHubHtml = renderShell({
    title: 'Student Study Guides & Productivity Systems | Study Schedule',
    description:
      'Practical, research-grounded guides for college students on semester planning, active recall vs. passive learning, Pomodoro focus workflows, and exam preparation.',
    canonicalPath: guidesHubPath,
    activeNav: 'guides',
    googleSnippet,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'Study Schedule Student Guides',
          url: `${SITE_URL}${guidesHubPath}`,
          description:
            'Practical student study guides covering semester planning, active recall, Pomodoro focus systems, and exam preparation.',
        },
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Study Guides', path: guidesHubPath },
        ]),
      ],
    },
    bodyHtml: `
      <main>
        <section class="hero">
          <div class="wrap">
            <nav aria-label="Breadcrumb" class="crumb">
              <a href="/?landing=1">Home</a>
              <span aria-hidden="true">/</span>
              <span>Study Guides</span>
            </nav>
            <div style="margin-top:22px;">
              <div class="eyebrow">Student Study Guides</div>
              <h1>Practical systems for calmer, sharper semesters.</h1>
              <p class="lead">Evidence-based guides on semester planning, active recall, exam preparation, and sustainable focus — written for real college schedules, with zero fluff.</p>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="wrap">
            <h2>Published Guides</h2>
            <div class="grid-3">
              ${GUIDE_ARTICLES.map(
                (a) => `
                <a href="/guides/${a.slug}/" class="card card-link">
                  <div class="mono" style="font-size:12px;color:#b45309;">${escapeHtml(a.category)} · ${escapeHtml(a.readTime)}</div>
                  <h3 style="margin-top:10px;font-family:'Newsreader',Georgia,serif;font-size:24px;font-weight:400;">${escapeHtml(a.headline)}</h3>
                  <p>${escapeHtml(a.description)}</p>
                </a>
              `,
              ).join('')}
            </div>
          </div>
        </section>

        <section class="section section-stone">
          <div class="wrap">
            <h2>Full 10-Guide Editorial Series</h2>
            <p class="lead" style="font-size:16px;">Core topics covering the complete student workflow from semester kickoff to finals week.</p>
            <div class="grid-2">
              ${EDITORIAL_ROADMAP.map(
                (item) => `
                <a href="${item.href}" class="card card-link" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
                  <div>
                    <div class="mono" style="font-size:12px;color:#b45309;">GUIDE ${item.num} · ${escapeHtml(item.status)}</div>
                    <h3 style="margin-top:6px;font-size:16px;">${escapeHtml(item.title)}</h3>
                  </div>
                </a>
              `,
              ).join('')}
            </div>
          </div>
        </section>
      </main>
    `,
  });
  writeFileEnsureDir(path.join(distDir, 'guides', 'index.html'), guidesHubHtml);

  // 6. Emit 3 Complete Cornerstone Editorial Guide Articles (Article + BreadcrumbList JSON-LD)
  for (const article of GUIDE_ARTICLES) {
    const canonicalPath = `/guides/${article.slug}/`;
    sitemapUrls.push(`${SITE_URL}${canonicalPath}`);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: article.headline,
          description: article.description,
          url: `${SITE_URL}${canonicalPath}`,
          image: OG_IMAGE,
          datePublished: LAST_MOD,
          dateModified: LAST_MOD,
          inLanguage: 'en',
          author: {
            '@type': 'Person',
            name: 'Vikash',
            url: 'https://github.com/CypherNinjaa',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Study Schedule',
            url: `${SITE_URL}/`,
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_URL}/favicon.svg`,
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${SITE_URL}${canonicalPath}`,
          },
        },
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Study Guides', path: '/guides/' },
          { name: article.headline, path: canonicalPath },
        ]),
      ],
    };

    const html = renderShell({
      title: article.title,
      description: article.description,
      canonicalPath,
      ogType: 'article',
      activeNav: 'guides',
      jsonLd,
      googleSnippet,
      bodyHtml: `
        <main>
          <article>
            <header class="hero">
              <div class="wrap-narrow">
                <nav aria-label="Breadcrumb" class="crumb">
                  <a href="/?landing=1">Home</a>
                  <span aria-hidden="true">/</span>
                  <a href="/guides/">Study Guides</a>
                  <span aria-hidden="true">/</span>
                  <span>${escapeHtml(article.category)}</span>
                </nav>
                <div style="margin-top:22px;">
                  <div class="eyebrow">${escapeHtml(article.category)} · ${escapeHtml(article.readTime)}</div>
                  <h1>${escapeHtml(article.headline)}</h1>
                  <p class="lead">${escapeHtml(article.description)}</p>
                  <p class="mono" style="margin-top:18px;font-size:12.5px;color:#6b665d;">
                    By Vikash · Updated <time datetime="${LAST_MOD}">${LAST_MOD}</time>
                  </p>
                </div>
              </div>
            </header>

            <div class="prose">
              <div class="wrap-narrow">
                ${article.bodyHtml}

                <div class="cta-box">
                  <h2>${escapeHtml(article.ctaTitle)}</h2>
                  <p>${escapeHtml(article.ctaBody)}</p>
                  <div class="actions">
                    <a href="/studyos/?launch=1" class="btn-amber">Launch StudyOS Free ↗</a>
                    <a href="/guides/" class="btn-secondary" style="background:#15171a;border-color:rgba(244,242,236,0.18);color:#f4f2ec;">More Study Guides</a>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </main>
      `,
    });

    writeFileEnsureDir(path.join(distDir, 'guides', article.slug, 'index.html'), html);
  }

  // 7. Add verified public offline documentation pages into sitemap.xml
  const docsDir = path.join(distDir, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const docFile of PUBLIC_DOCS_FOR_SITEMAP) {
      if (fs.existsSync(path.join(docsDir, docFile))) {
        sitemapUrls.push(`${SITE_URL}/docs/${docFile}`);
      }
    }
  }

  // 8. Emit clean UTF-8 sitemap.xml (no deprecated <priority>/<changefreq>, strictly 200 canonical HTTPS URLs)
  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map(
      (loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n  </url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
}
