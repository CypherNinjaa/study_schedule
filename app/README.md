# 🌌 Study Schedule (Productivity OS)

<div align="center">

![Productivity OS Banner](https://img.shields.io/badge/Productivity%20OS-Local--First%20Workspace-6366f1?style=for-the-badge&logo=rocket&logoColor=white)

**The private, local-first academic command center & productivity operating system for students and developers.**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Flipbook-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![Zustand](https://img.shields.io/badge/Zustand-State%20Engine-4338ca?style=flat-square)](https://github.com/pmndrs/zustand)
[![Vitest](https://img.shields.io/badge/Vitest-37%20Passed-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#-key-features) • [Why Productivity OS?](#-why-productivity-os) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Shortcuts](#-keyboard-shortcuts) • [Philosophy](#-local-first-philosophy)

</div>

---

## 💡 Why Productivity OS?

Most student productivity apps fail in one of two ways:
1. **They treat you like a subscriber**: Your notes, schedules, and study stats are trapped in proprietary cloud databases behind subscription paywalls. When their servers go down, you can't study.
2. **They are fragmented**: You juggle Notion for notes, Google Calendar for lectures, Forest for timers, Excel for syllabus checklists, and a separate habit tracker.

**Productivity OS** unites your entire student life into a single, cohesive, distraction-free environment that runs **100% locally on your computer**:

> 🛡️ **Zero accounts. Zero cloud dependencies. Zero telemetry.**  
> Everything autosaves directly into a human-readable **JSON file** on your machine via the modern **File System Access API**, backed by an instant-load IndexedDB mirror.

---

## ⚡ Feature Comparison

| Capability | Notion / Excel | Google Calendar | Standard Habit Apps | **Study Schedule** |
| :--- | :---: | :---: | :---: | :---: |
| **Data Ownership** | Cloud / Proprietary | Google Cloud | Vendor Locked | **100% Local JSON on your disk** |
| **Offline Performance** | Partial / Clunky | Read-only cache | Varies | **Instant offline-first (PWA)** |
| **College Timetable Engine** | Manual tables | Generic slots | ❌ | **Native recurring class planner** |
| **Exam Syllabus Scope** | Manual checkboxes | Generic events | ❌ | **Modular syllabus picker & checklists** |
| **3D Bookshelf & E-Reader** | ❌ | ❌ | ❌ | **Three.js 3D Flipbook, EPUB & PDF** |
| **Wall-Clock Focus Save** | ❌ | ❌ | Reset on cancel | **Pomodoro with Save & Stop + PiP** |
| **24-Hour Time Accounting** | ❌ | ❌ | ❌ | **Real-time 24h budget breakdown** |
| **Fair Gamification & XP** | ❌ | ❌ | Basic badges | **Quadratic curve + Anti-farming ledger** |

---

## 🌟 Key Features

### 🎓 1. Academic & Syllabus Command Center
- **Selective Exam Syllabus Scope**: Link an exam to any subject and selectively pick which modules and topics are tested. Keep midterms and finals scoped to exactly the chapters you need without cluttering your checklist.
- **Urgency Countdowns**: Dynamic color-coded urgency badges (*Exam day*, *3 days left*, *Upcoming*) that automatically calculate days remaining.
- **Subject Mastery Matrix**: Track credit weights, difficulty ratings, semester study targets, and assignment deadlines with overdue alerts.
- **Weekly College Timetable**: Build recurring Monday–Sunday schedules with class slots, rooms, lecture types, and instructors.

### 📚 2. 3D Interactive Library & Reader Engine
- **Three.js Realistic 3D Flipbook**: Experience tactile, interactive book-reading directly in the browser with page-turn physics, dynamic shadows, and viewport auto-fit.
- **Dual Engine Reader**: Seamlessly open both **EPUB** and **PDF** textbooks with chapter navigation, reading progress, and custom fonts.
- **Binary Persistence**: Upload study materials, course handouts, and textbooks stored safely in local browser storage via **Dexie.js**.

### ⏱️ 3. Deep Focus & Wall-Clock Pomodoro Engine
- **Picture-in-Picture (PiP) Floating Widget**: Keep your countdown timer pinned on screen while coding, reading, or researching in other windows.
- **"Save & Stop" Guarantee**: Interrupted during a study block? Hit *Save & Stop* and your actual elapsed wall-clock minutes are automatically recorded as verified study time—no lost progress.
- **Multi-Tone Audio Chimes**: Gentle Web Audio harmonic chimes and browser notifications signal round transitions without jarring alarms.
- **Method Breakdown**: Log study sessions by cognitive type (*Reading*, *Practice*, *Revision*, *Problem Solving*, *Coding*, *Mock Test*, *Flashcards*).

### 🎮 4. RPG Progression & Anti-Farming XP Ledger
- **Quadratic Level Curve**: Smooth level progression tuned so early levels reward initial momentum, while higher levels demand consistent dedication.
- **Anti-Exploit Bidirectional Ledger**: Completing habits or tasks awards XP; unchecking, skipping, or deleting them automatically **deducts and revokes** the credited XP with visual floating feedback. No infinite XP farming loops.
- **Streak Protection**: Maintain 6 distinct streak dimensions (*Study*, *Coding*, *Exercise*, *Early Wake*, *Tasks*, *Habits*) with streak freezes for sick days or emergencies.
- **35 Unlockable Achievements**: Tiered badges from Bronze to Platinum with confetti celebrations on milestone completions.

### 📊 5. 24-Hour Time Budget & Productivity Score
- **True 24-Hour Accounting**: Understand where your day goes across Study, Coding, College, Sleep, Exercise, Social Media, and Relationships.
- **Composite Productivity Algorithm**: A unified 0–100 daily productivity index combining target adherence, sleep consistency, and distraction penalties.
- **Visual Analytics**: Interactive Recharts graphs visualize study distribution, weekly pace, and habit compliance heatmaps.

### 💾 6. Dual-Mode Local Storage
- **File System Access API**: Connect any `.json` file on your hard drive (e.g., `Documents/productivity-data.json`). Every change autosaves seamlessly with debounce protection.
- **Browser-Only Mode with Instant Load**: Works in any modern browser using an IndexedDB mirror.
- **Top Bar Controls**: Dedicated status badge with 1-click **Create file** and **Load file** buttons for switching or restoring backups anytime.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 8](https://vitejs.dev/) + [Rolldown](https://rolldown.rs/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) + Custom HSL Design Tokens
- **3D Graphics**: [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [@react-three/drei](https://github.com/pmndrs/drei)
- **Document Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/) + [ePub.js](https://github.com/futurepress/epub.js/)
- **State Architecture**: [Zustand 5](https://github.com/pmndrs/zustand) with structured immutable drafting
- **Local Databases**: [Dexie.js](https://dexie.org/) (IndexedDB) + [idb-keyval](https://github.com/jakearchibald/idb-keyval)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit and integration suites)
- **Packaging**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) (Service Worker offline caching)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/CypherNinjaa/study_schedule.git
   cd study_schedule/app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173/study_schedule/](http://localhost:5173/study_schedule/) in your browser.

4. **Run the test suite**:
   ```bash
   npm run test
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## ⌨️ Keyboard Shortcuts

Speed up your daily workflow with built-in hotkeys:

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Global Command Palette & Navigation Search |
| <kbd>Escape</kbd> | Close active modal, dialog, or search drawer |
| <kbd>Space</kbd> | Toggle play / pause in Pomodoro focus mode |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | Turn pages in the 3D Library Reader |
| <kbd>Alt</kbd> + <kbd>N</kbd> | Quick add new task |

---

## 📁 Repository Structure

```
study_schedule/
├── app/                          # Core web application
│   ├── public/                   # Static assets, web manifests & documentation
│   │   └── docs/                 # Built-in searchable documentation guides
│   ├── src/
│   │   ├── components/           # Reusable UI primitives & layouts
│   │   │   ├── layout/           # Sidebar, TopBar, Mobile navigation
│   │   │   ├── library/          # 3D Flipbook canvas, EPUB/PDF readers
│   │   │   ├── pomodoro/         # Floating timer, PiP, controls
│   │   │   └── ui/               # Cards, Modals, Toasts, Badges
│   │   ├── data/                 # Seed defaults, timetable schemas, presets
│   │   ├── hooks/                # React hooks (metrics, audio, keyboard)
│   │   ├── pages/                # Main OS views
│   │   │   ├── Dashboard.tsx     # Overview metrics & daily countdown
│   │   │   ├── Today.tsx         # 24h timeline & daily log
│   │   │   ├── Exams.tsx         # Exam scheduler with topic scope selector
│   │   │   ├── Library.tsx       # 3D Bookshelf & reading workspace
│   │   │   ├── Habits.tsx        # Consistency heatmaps & frequency tracking
│   │   │   ├── Tasks.tsx         # Prioritized task lists & kanban
│   │   │   ├── Analytics.tsx     # Productivity score & time distributions
│   │   │   └── Settings.tsx      # File system sync, themes, targets & backups
│   │   ├── services/             # Core engines
│   │   │   ├── xp.ts             # XP awarding, revocation & anti-farm ledger
│   │   │   ├── rollup.ts         # Mutation rollup & streak evaluator
│   │   │   ├── metrics.ts        # Productivity score calculation
│   │   │   └── fileStorage.ts    # File System Access API & IndexedDB
│   │   ├── store/                # Zustand global state stores
│   │   └── types/                # TypeScript domain models
│   ├── tailwind.config.js        # Design tokens & animations
│   ├── vite.config.ts            # Vite & PWA build configuration
│   └── package.json
└── README.md                     # Master GitHub representation
```

---

## 🔒 Local-First Philosophy

Productivity OS is built on the principle that **your thoughts, schedule, habits, and study materials belong exclusively to you**.

1. **No Cloud Lock-in**: Your entire history is saved in a standard JSON format. You can inspect it, back it up to a flash drive, commit it to a private Git repo, or parse it with Python anytime.
2. **Offline Always**: No internet connection is needed after the first load. Study on planes, in libraries without Wi-Fi, or during campus network outages.
3. **Longevity**: Even if this project stops receiving updates ten years from now, your data file remains open, portable, and completely yours.

---

## 🤝 Contributing

Contributions, feedback, and feature suggestions are warmly welcomed!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">

Made with ❤️ for students, lifelong learners, and developers.

</div>
