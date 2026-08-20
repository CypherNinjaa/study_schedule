import type { Achievement } from '@/types';

export interface AchievementStats {
  totalStudyMinutes: number;
  totalCodingMinutes: number;
  totalExerciseMinutes: number;
  tasksCompleted: number;
  studySessions: number;
  pomodoros: number;
  bestStudyStreak: number;
  bestEarlyWakeStreak: number;
  bestTaskStreak: number;
  bestCodingStreak: number;
  bestExerciseStreak: number;
  bestHabitStreak: number;
  perfectDays: number;
  perfectWeeks: number;
  level: number;
  totalXP: number;
  daysLogged: number;
  goalsCompleted: number;
  topicsCompleted: number;
  reviewsWritten: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  metric: (stats: AchievementStats) => number;
  target: number;
}

const hours = (n: number) => n * 60;

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Streaks
  { id: 'streak_3', name: 'Getting Warm', description: 'Reach a 3-day study streak', icon: 'Flame', tier: 'bronze', metric: (s) => s.bestStudyStreak, target: 3 },
  { id: 'streak_7', name: 'One Week Strong', description: 'Reach a 7-day study streak', icon: 'Flame', tier: 'silver', metric: (s) => s.bestStudyStreak, target: 7 },
  { id: 'streak_14', name: 'Fortnight Focus', description: 'Reach a 14-day study streak', icon: 'Flame', tier: 'gold', metric: (s) => s.bestStudyStreak, target: 14 },
  { id: 'streak_30', name: 'Unbreakable', description: 'Reach a 30-day study streak', icon: 'Flame', tier: 'platinum', metric: (s) => s.bestStudyStreak, target: 30 },
  { id: 'streak_100', name: 'Century of Discipline', description: 'Reach a 100-day study streak', icon: 'Award', tier: 'platinum', metric: (s) => s.bestStudyStreak, target: 100 },

  // Study volume
  { id: 'study_10h', name: 'First 10 Hours', description: 'Study for 10 hours in total', icon: 'BookOpen', tier: 'bronze', metric: (s) => s.totalStudyMinutes, target: hours(10) },
  { id: 'study_50h', name: 'Fifty Deep', description: 'Study for 50 hours in total', icon: 'BookOpen', tier: 'silver', metric: (s) => s.totalStudyMinutes, target: hours(50) },
  { id: 'study_100h', name: 'Centurion', description: 'Study for 100 hours in total', icon: 'BookOpen', tier: 'gold', metric: (s) => s.totalStudyMinutes, target: hours(100) },
  { id: 'study_500h', name: 'Scholar', description: 'Study for 500 hours in total', icon: 'GraduationCap', tier: 'platinum', metric: (s) => s.totalStudyMinutes, target: hours(500) },

  // Coding
  { id: 'code_10h', name: 'Hello, World', description: 'Code for 10 hours in total', icon: 'Code2', tier: 'bronze', metric: (s) => s.totalCodingMinutes, target: hours(10) },
  { id: 'code_50h', name: 'Shipping Regularly', description: 'Code for 50 hours in total', icon: 'Code2', tier: 'silver', metric: (s) => s.totalCodingMinutes, target: hours(50) },
  { id: 'code_150h', name: 'Builder', description: 'Code for 150 hours in total', icon: 'Wrench', tier: 'gold', metric: (s) => s.totalCodingMinutes, target: hours(150) },
  { id: 'code_streak_7', name: 'Commit Habit', description: 'Reach a 7-day coding streak', icon: 'Code2', tier: 'silver', metric: (s) => s.bestCodingStreak, target: 7 },

  // Tasks
  { id: 'tasks_10', name: 'Off the Ground', description: 'Complete 10 tasks', icon: 'CheckSquare', tier: 'bronze', metric: (s) => s.tasksCompleted, target: 10 },
  { id: 'tasks_100', name: 'Task Machine', description: 'Complete 100 tasks', icon: 'Target', tier: 'silver', metric: (s) => s.tasksCompleted, target: 100 },
  { id: 'tasks_500', name: 'Relentless', description: 'Complete 500 tasks', icon: 'Target', tier: 'gold', metric: (s) => s.tasksCompleted, target: 500 },
  { id: 'task_streak_14', name: 'Nothing Left Undone', description: '14-day task completion streak', icon: 'CheckSquare', tier: 'gold', metric: (s) => s.bestTaskStreak, target: 14 },

  // Sessions & pomodoro
  { id: 'sessions_25', name: 'Session Regular', description: 'Log 25 study sessions', icon: 'FileText', tier: 'bronze', metric: (s) => s.studySessions, target: 25 },
  { id: 'pomo_10', name: 'Focus Starter', description: 'Complete 10 Pomodoros', icon: 'Timer', tier: 'bronze', metric: (s) => s.pomodoros, target: 10 },
  { id: 'pomo_100', name: 'Focus Engine', description: 'Complete 100 Pomodoros', icon: 'Timer', tier: 'gold', metric: (s) => s.pomodoros, target: 100 },

  // Routine
  { id: 'early_7', name: 'Sunrise Club', description: 'Wake early 7 days in a row', icon: 'Sun', tier: 'silver', metric: (s) => s.bestEarlyWakeStreak, target: 7 },
  { id: 'early_30', name: 'Dawn Patrol', description: 'Wake early 30 days in a row', icon: 'Sun', tier: 'gold', metric: (s) => s.bestEarlyWakeStreak, target: 30 },
  { id: 'exercise_7', name: 'Moving Daily', description: '7-day exercise streak', icon: 'Activity', tier: 'silver', metric: (s) => s.bestExerciseStreak, target: 7 },
  { id: 'habits_21', name: 'Habit Formed', description: '21-day habit streak', icon: 'Compass', tier: 'gold', metric: (s) => s.bestHabitStreak, target: 21 },

  // Quality
  { id: 'perfect_day', name: 'Perfect Day', description: 'Score 90+ productivity in a day', icon: 'Sparkles', tier: 'silver', metric: (s) => s.perfectDays, target: 1 },
  { id: 'perfect_day_10', name: 'Ten Perfect Days', description: 'Score 90+ on 10 days', icon: 'Sparkles', tier: 'gold', metric: (s) => s.perfectDays, target: 10 },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Average 85+ productivity across a full week', icon: 'Trophy', tier: 'gold', metric: (s) => s.perfectWeeks, target: 1 },

  // Progression
  { id: 'level_5', name: 'Level 5', description: 'Reach level 5', icon: 'Star', tier: 'bronze', metric: (s) => s.level, target: 5 },
  { id: 'level_10', name: 'Level 10', description: 'Reach level 10', icon: 'Star', tier: 'silver', metric: (s) => s.level, target: 10 },
  { id: 'level_25', name: 'Level 25', description: 'Reach level 25', icon: 'Star', tier: 'gold', metric: (s) => s.level, target: 25 },
  { id: 'level_50', name: 'Level 50', description: 'Reach level 50', icon: 'Crown', tier: 'platinum', metric: (s) => s.level, target: 50 },

  // Consistency & syllabus
  { id: 'logged_30', name: 'Month of Data', description: 'Log activity on 30 different days', icon: 'Calendar', tier: 'silver', metric: (s) => s.daysLogged, target: 30 },
  { id: 'goals_5', name: 'Goal Getter', description: 'Complete 5 goals', icon: 'Medal', tier: 'silver', metric: (s) => s.goalsCompleted, target: 5 },
  { id: 'topics_50', name: 'Syllabus Crusher', description: 'Complete 50 syllabus topics', icon: 'BookmarkCheck', tier: 'gold', metric: (s) => s.topicsCompleted, target: 50 },
  { id: 'reviews_7', name: 'Reflective', description: 'Write 7 daily reviews', icon: 'ClipboardCheck', tier: 'bronze', metric: (s) => s.reviewsWritten, target: 7 },
];

export function buildSeedAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    icon: d.icon,
    tier: d.tier,
    unlockedAt: null,
    progress: 0,
  }));
}
