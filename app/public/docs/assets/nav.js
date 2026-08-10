/* Navigation structure + search metadata. Plain global — works over file://. */
window.DOCS_NAV = [
  {
    title: 'Getting Started',
    pages: [
      { id: 'index',           title: 'Introduction',            file: 'index.html',            icon: 'home',     summary: 'What Productivity OS is, who it is for, and the ideas behind it.', keywords: 'overview intro what is productivity os local-first personal study app notion' },
      { id: 'why',             title: 'Why it exists',           file: 'why.html',              icon: 'compass',  summary: 'The purpose and philosophy: private, local-first, gamified productivity.', keywords: 'purpose philosophy privacy motivation goals reason vision' },
      { id: 'getting-started', title: 'Quick start',             file: 'getting-started.html',  icon: 'rocket',   summary: 'Open the app, choose where your data lives, and finish the 8-step setup.', keywords: 'setup onboarding first run install begin welcome wizard steps file' },
      { id: 'interface',       title: 'The interface',           file: 'interface.html',        icon: 'layout',   summary: 'A tour of the sidebar, top bar, save indicator, and mobile navigation.', keywords: 'ui tour sidebar topbar navigation layout mobile save indicator theme' },
    ],
  },
  {
    title: 'Core Concepts',
    pages: [
      { id: 'concept-storage', title: 'Storage & autosave',      file: 'concept-storage.html',  icon: 'database', summary: 'How your data is saved to a JSON file, autosave, and the in-browser fallback.', keywords: 'json file system access api autosave save saving indexeddb local browser disconnected reconnect' },
      { id: 'concept-privacy', title: 'Privacy & data safety',   file: 'concept-privacy.html',  icon: 'shield',   summary: 'No servers, no tracking, corruption protection, backups, import and export.', keywords: 'privacy security no server tracking backup export import corrupted reset offline' },
      { id: 'concept-xp',      title: 'XP & levels',             file: 'concept-xp.html',       icon: 'zap',      summary: 'How experience points are earned, the level curve, and anti-farming.', keywords: 'xp experience points levels level up curve rewards gamification farming ledger' },
      { id: 'concept-streaks', title: 'Streaks & freezes',       file: 'concept-streaks.html',  icon: 'flame',    summary: 'The six streaks, how they qualify, and how streak freezes protect them.', keywords: 'streak freeze flame study coding exercise early wake tasks habits daily' },
      { id: 'concept-score',   title: 'Productivity score',      file: 'concept-score.html',    icon: 'gauge',    summary: 'The weighted 0–100 daily score and exactly how each factor contributes.', keywords: 'productivity score 100 weighted study tasks habits coding sleep exercise adherence distraction' },
    ],
  },
  {
    title: 'Feature Guides',
    pages: [
      { id: 'guide-dashboard',    title: 'Dashboard',           file: 'guide-dashboard.html',    icon: 'gauge',        summary: 'Your daily home base: greeting, level, streaks, progress rings, next task.', keywords: 'dashboard home progress rings level streak next task greeting today overview' },
      { id: 'guide-today',        title: 'Today & planner',     file: 'guide-today.html',        icon: 'sun',          summary: 'Plan the day on a timeline, work tasks, and mark them complete.', keywords: 'today planner timeline daily schedule blocks plan day agenda' },
      { id: 'guide-tasks',        title: 'Tasks',               file: 'guide-tasks.html',        icon: 'check-square', summary: 'Create, edit, prioritise, categorise, and recur tasks.', keywords: 'tasks task manager priority category difficulty recurring status todo complete quick add' },
      { id: 'guide-study',        title: 'Study & Pomodoro',    file: 'guide-study.html',        icon: 'book',         summary: 'Log study sessions, run the Pomodoro timer, and track focus.', keywords: 'study tracker session pomodoro timer focus method subject concentration minutes' },
      { id: 'guide-habits',       title: 'Habits',              file: 'guide-habits.html',       icon: 'repeat',       summary: 'Build daily, weekly, or inverse habits with streaks and a heatmap.', keywords: 'habits habit tracker daily weekly inverse streak heatmap completion frequency' },
      { id: 'guide-goals',        title: 'Goals',               file: 'guide-goals.html',        icon: 'target',       summary: 'Set measurable goals with deadlines and automatic progress tracking.', keywords: 'goals goal target deadline progress auto manual unit hours streak' },
      { id: 'guide-subjects',     title: 'Subjects & exams',    file: 'guide-subjects.html',     icon: 'graduation',   summary: 'Manage subjects, syllabus topics, assignments, and exam dates.', keywords: 'subjects exam syllabus topics assignments credits teacher progress modules' },
      { id: 'guide-timetable',    title: 'Timetable',           file: 'guide-timetable.html',    icon: 'grid',         summary: 'Edit your weekly class schedule and manage semesters.', keywords: 'timetable classes schedule semester weekday teacher room lab lecture edit' },
      { id: 'guide-calendar',     title: 'Calendar',            file: 'guide-calendar.html',     icon: 'calendar',     summary: 'See classes, tasks, study, and events across month, week, and day.', keywords: 'calendar month week day events classes tasks view schedule' },
      { id: 'guide-analytics',    title: 'Analytics',           file: 'guide-analytics.html',    icon: 'chart',        summary: 'Charts, the productivity heatmap, and smart local insights.', keywords: 'analytics charts trends heatmap insights ranges 7d 30d 90d subject time allocation' },
      { id: 'guide-achievements', title: 'Achievements',        file: 'guide-achievements.html', icon: 'award',        summary: 'The 35 unlockable badges and how they are earned.', keywords: 'achievements badges unlock tiers bronze silver gold platinum perfect day week' },
      { id: 'guide-reviews',      title: 'Daily & weekly review',file: 'guide-reviews.html',     icon: 'clipboard',    summary: 'Reflect on the day and get an actionable weekly summary.', keywords: 'review daily weekly reflection wins missed notes summary insights recap' },
      { id: 'guide-settings',     title: 'Settings',            file: 'guide-settings.html',     icon: 'settings',     summary: 'Profile, theme, routine, targets, notifications, and data management.', keywords: 'settings profile theme dark light targets routine notifications data reset backup' },
      { id: 'guide-palette',      title: 'Command palette',     file: 'guide-palette.html',      icon: 'command',      summary: 'Jump anywhere and run any action with Ctrl+K.', keywords: 'command palette ctrl k keyboard shortcuts quick actions search navigate' },
    ],
  },
  {
    title: 'Using it well',
    pages: [
      { id: 'workflows', title: 'Everyday workflows',  file: 'workflows.html', icon: 'route',    summary: 'Morning plan, study block, evening review, and weekly reset, step by step.', keywords: 'workflow routine morning evening weekly example step by step how to daily loop' },
      { id: 'tips',      title: 'Tips & best practices',file: 'tips.html',     icon: 'sparkles', summary: 'Get the most out of the app and keep your data honest.', keywords: 'tips best practices advice recommendations habits accuracy honest data' },
      { id: 'faq',       title: 'FAQ',                 file: 'faq.html',       icon: 'help',     summary: 'Common questions about data, browsers, devices, and features.', keywords: 'faq questions answers help common device browser sync data mobile' },
      { id: 'troubleshooting', title: 'Troubleshooting',file: 'troubleshooting.html', icon: 'wrench', summary: 'Fixes for disconnected files, corrupted data, and lost changes.', keywords: 'troubleshooting problem fix disconnected corrupted lost data permission error recover' },
      { id: 'shortcuts', title: 'Keyboard shortcuts', file: 'shortcuts.html', icon: 'keyboard', summary: 'Every keyboard shortcut in one place.', keywords: 'keyboard shortcuts keys ctrl k s hotkeys reference' },
    ],
  },
];
