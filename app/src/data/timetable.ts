import type { ClassSlot, Semester, Weekday } from '@/types';
import { uid } from '@/utils/misc';
import { SUBJECT_IDS } from './subjects';

interface SlotSeed {
  day: Weekday;
  start: string;
  end: string;
  code: keyof typeof SUBJECT_IDS | string;
  teacher: string;
  room: string;
  type: ClassSlot['type'];
}

const NAMES: Record<string, string> = {
  STAT311: 'Time Series Analysis',
  CSIT379: 'Data Science — An Introduction',
  CSIT394: 'Analytical Data Visualization',
  QAM303: 'Computational Quantitative Techniques',
  BC308: 'Campus to Corporate',
  FREN316: 'Communicative French',
};

/** BCA-V (A) 2024-2028, Amity Institute of Information Technology, Amity University Patna. */
const SEED: SlotSeed[] = [
  // Monday
  { day: 1, start: '08:30', end: '09:15', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: 'LAB-3', type: 'lab' },
  { day: 1, start: '09:20', end: '10:05', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: 'LAB-2', type: 'lab' },
  { day: 1, start: '10:10', end: '10:55', code: 'CSIT394', teacher: 'Ms. Khushboo', room: '201', type: 'lecture' },
  { day: 1, start: '11:00', end: '11:45', code: 'CSIT394', teacher: 'Ms. Khushboo', room: 'LAB-3', type: 'lab' },
  { day: 1, start: '11:50', end: '12:35', code: 'FREN316', teacher: 'Dr. Sushant Kumar Dubey', room: '201', type: 'lecture' },
  { day: 1, start: '13:00', end: '13:45', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: 'LAB', type: 'lab' },

  // Tuesday
  { day: 2, start: '08:30', end: '09:15', code: 'QAM303', teacher: 'Mr. Suman Kumar Mishra', room: '201', type: 'lecture' },
  { day: 2, start: '09:20', end: '10:05', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: '201', type: 'lecture' },
  { day: 2, start: '10:10', end: '10:55', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: '201', type: 'lecture' },
  { day: 2, start: '11:00', end: '11:45', code: 'CSIT394', teacher: 'Ms. Khushboo', room: 'LAB-3', type: 'lab' },
  { day: 2, start: '11:50', end: '12:35', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: '201', type: 'lecture' },
  { day: 2, start: '13:00', end: '13:45', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: 'LAB-2', type: 'lab' },

  // Wednesday
  { day: 3, start: '08:30', end: '09:15', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: '201', type: 'lecture' },
  { day: 3, start: '09:20', end: '10:05', code: 'FREN316', teacher: 'Dr. Sushant Kumar Dubey', room: '201', type: 'lecture' },
  { day: 3, start: '10:10', end: '10:55', code: 'BC308', teacher: 'Dr. Abhijeet Ghosh', room: '201', type: 'lecture' },
  { day: 3, start: '11:00', end: '11:45', code: 'CSIT394', teacher: 'Ms. Khushboo', room: 'LAB-3', type: 'lab' },
  { day: 3, start: '11:50', end: '12:35', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: '201', type: 'lecture' },

  // Thursday
  { day: 4, start: '08:30', end: '09:15', code: 'QAM303', teacher: 'Mr. Suman Kumar Mishra', room: '201', type: 'lecture' },
  { day: 4, start: '09:20', end: '10:05', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: 'LAB-3', type: 'lab' },
  { day: 4, start: '10:10', end: '10:55', code: 'CSIT394', teacher: 'Ms. Khushboo', room: '201', type: 'lecture' },
  { day: 4, start: '11:00', end: '11:45', code: 'CSIT394', teacher: 'Ms. Khushboo', room: 'LAB-3', type: 'lab' },
  { day: 4, start: '11:50', end: '12:35', code: 'BC308', teacher: 'Dr. Abhijeet Ghosh', room: '201', type: 'lecture' },

  // Friday
  { day: 5, start: '08:30', end: '09:15', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: 'LAB-2', type: 'lab' },
  { day: 5, start: '09:20', end: '10:05', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: 'LAB-3', type: 'lab' },
  { day: 5, start: '10:10', end: '10:55', code: 'CSIT394', teacher: 'Ms. Khushboo', room: '201', type: 'lecture' },
  { day: 5, start: '11:00', end: '11:45', code: 'CSIT379', teacher: 'Mr. Ranjit Choudhary', room: '201', type: 'lecture' },
  { day: 5, start: '11:50', end: '12:35', code: 'STAT311', teacher: 'Dr. Priyadarshni', room: 'LAB-2', type: 'lab' },
];

export function buildSeedSemester(): Semester {
  const slots: ClassSlot[] = SEED.map((s) => ({
    id: uid('slot'),
    day: s.day,
    start: s.start,
    end: s.end,
    subjectId: SUBJECT_IDS[s.code] ?? null,
    title: NAMES[s.code] ?? s.code,
    teacher: s.teacher,
    room: s.room,
    type: s.type,
  }));

  return {
    id: 'sem_5',
    name: 'Semester V (2026)',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    slots,
  };
}
