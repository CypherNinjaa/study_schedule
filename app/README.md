# Productivity OS - Local-First Student Study Workspace

A private, offline-first study and productivity operating system designed for students. Built with React, TypeScript, TailwindCSS, and Zustand.

## Core Features

- **Daily Planning & Timeline**: Structure your day with class schedules, untimed tasks, and study blocks.
- **Enhanced Pomodoro Timer**:
  - Configurable focus and break durations with quick presets.
  - Multi-tone ascending chime, document title countdown, and desktop notifications.
  - **Save & Stop**: Accurately saves elapsed wall-clock focus time on early completion.
  - Minimizable floating widget with alert states that persist across navigation.
- **Exam Scheduler & Syllabus Checklist**:
  - Track upcoming exams with color-coded countdown days.
  - Automatic topic import from subjects into an interactive preparation checklist.
  - Dashboard next-exam preview widget.
- **Study Materials Library**:
  - Organize notes, PDFs, recorded lectures, and web links by subject.
  - Local-first file access via the File System Access API and IndexedDB.
- **Habits & Streaks**:
  - Daily, weekly, and custom frequency habits with completion heatmaps.
  - 6 distinct activity streaks with streak freeze protection and realistic time boundaries.
- **Gamification & Celebrations**:
  - XP progression, level milestones, and 35 unlockable achievements.
  - Particle celebrations on task completion, focus rounds, and level-ups.
- **Local Storage & Privacy**:
  - All data saved directly to your chosen local JSON file.
  - Zero cloud dependency, zero trackers, 100% offline capability.

## Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run test suite
npm test

# Build production bundle
npm run build
```
