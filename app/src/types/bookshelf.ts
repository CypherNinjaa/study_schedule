/**
 * Types for the 3D Bookshelf & Ebook Reader module.
 */
import type { ISODate, ISOInstant } from './index';

/* ------------------------------------------------------------------ */
/* Book formats & status                                               */
/* ------------------------------------------------------------------ */

export type BookFormat = 'pdf' | 'epub' | 'mobi' | 'azw3' | 'txt';

export type ReadingStatus = 'unread' | 'reading' | 'completed' | 'abandoned';

/* ------------------------------------------------------------------ */
/* Book entity                                                         */
/* ------------------------------------------------------------------ */

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  format: BookFormat;
  /** original filename */
  fileName: string;
  fileSize: number;
  /** total pages (for PDF) or estimated pages (for EPUB/TXT) */
  totalPages: number;
  /** 0-1 reading progress */
  progress: number;
  /** current reading location — page number for PDF, CFI for EPUB, char offset for TXT */
  currentLocation: string;
  /** cover thumbnail stored as blob in Dexie covers table */
  hasCover: boolean;
  /** dominant color extracted from cover for 3D book spine */
  coverColor: string;
  status: ReadingStatus;
  favorite: boolean;
  /** user-assigned category id */
  categoryId: string | null;
  /** linked subject from the study schedule */
  subjectId: string | null;
  /** linked goal from the study schedule */
  goalId: string | null;
  tags: string[];
  /** total reading minutes across all sessions */
  totalReadMinutes: number;
  /** shelf position for 3D ordering */
  shelfOrder: number;
  importedAt: ISOInstant;
  lastOpenedAt: ISOInstant | null;
  completedAt: ISOInstant | null;
}

/* ------------------------------------------------------------------ */
/* Annotations                                                         */
/* ------------------------------------------------------------------ */

export type AnnotationType = 'highlight' | 'underline' | 'note';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface BookAnnotation {
  id: string;
  bookId: string;
  type: AnnotationType;
  /** page number (PDF) or CFI (EPUB) or char offset (TXT) */
  location: string;
  /** the highlighted / underlined text */
  selectedText: string;
  /** user's note text (for 'note' type or note attached to highlight) */
  noteText: string;
  color: HighlightColor;
  /** chapter name if available */
  chapter: string;
  createdAt: ISOInstant;
  updatedAt: ISOInstant;
}

/* ------------------------------------------------------------------ */
/* Bookmarks                                                           */
/* ------------------------------------------------------------------ */

export interface BookBookmark {
  id: string;
  bookId: string;
  /** page number (PDF) or CFI (EPUB) or char offset (TXT) */
  location: string;
  label: string;
  /** chapter name if available */
  chapter: string;
  createdAt: ISOInstant;
}

/* ------------------------------------------------------------------ */
/* Reading sessions                                                    */
/* ------------------------------------------------------------------ */

export interface ReadingSession {
  id: string;
  bookId: string;
  date: ISODate;
  startedAt: ISOInstant;
  endedAt: ISOInstant;
  /** minutes spent reading */
  minutes: number;
  /** pages read in this session */
  pagesRead: number;
  /** start progress 0-1 */
  startProgress: number;
  /** end progress 0-1 */
  endProgress: number;
  /** linked subject */
  subjectId: string | null;
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface BookCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

/* ------------------------------------------------------------------ */
/* Reader themes                                                       */
/* ------------------------------------------------------------------ */

export type ReaderTheme = 'day' | 'warm' | 'sepia' | 'dark' | 'amoled' | 'night';

export interface ReaderThemeConfig {
  name: string;
  bg: string;
  text: string;
  accent: string;
  /** CSS filter for the page content */
  filter: string;
}

export const READER_THEMES: Record<ReaderTheme, ReaderThemeConfig> = {
  day: {
    name: 'Day',
    bg: '#ffffff',
    text: '#1a1a2e',
    accent: '#4f46e5',
    filter: 'none',
  },
  warm: {
    name: 'Warm Paper',
    bg: '#fef9ef',
    text: '#3d3427',
    accent: '#b45309',
    filter: 'none',
  },
  sepia: {
    name: 'Sepia',
    bg: '#f4ecd8',
    text: '#5b4636',
    accent: '#92400e',
    filter: 'sepia(0.15)',
  },
  dark: {
    name: 'Dark',
    bg: '#1e1e2e',
    text: '#cdd6f4',
    accent: '#89b4fa',
    filter: 'none',
  },
  amoled: {
    name: 'AMOLED',
    bg: '#000000',
    text: '#e0e0e0',
    accent: '#818cf8',
    filter: 'none',
  },
  night: {
    name: 'Night Reading',
    bg: '#1a1520',
    text: '#c4a882',
    accent: '#d97706',
    filter: 'brightness(0.9)',
  },
};

/* ------------------------------------------------------------------ */
/* Reader settings                                                     */
/* ------------------------------------------------------------------ */

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  margins: 'narrow' | 'medium' | 'wide';
  readingWidth: number; // percentage 50-100
  theme: ReaderTheme;
  /** PDF-specific */
  pdfViewMode: 'scroll' | 'single' | 'double' | 'flip';
  pdfZoom: number; // percentage
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'Georgia',
  lineSpacing: 1.7,
  margins: 'medium',
  readingWidth: 75,
  theme: 'day',
  pdfViewMode: 'flip',
  pdfZoom: 100,
};

/* ------------------------------------------------------------------ */
/* Eye comfort                                                         */
/* ------------------------------------------------------------------ */

export interface EyeComfortSettings {
  blueLight: boolean;
  /** 0-100 intensity of blue light filter */
  blueLightIntensity: number;
  /** color temperature 2700K-6500K */
  colorTemperature: number;
  /** 0-100 brightness reduction overlay */
  brightnessReduction: number;
  focusMode: boolean;
  paperTexture: boolean;
  dyslexiaFont: boolean;
  /** 20-20-20 rule reminders */
  eyeCareReminders: boolean;
  /** minutes between break reminders */
  breakInterval: number;
  autoNightMode: boolean;
}

export const DEFAULT_EYE_COMFORT: EyeComfortSettings = {
  blueLight: false,
  blueLightIntensity: 40,
  colorTemperature: 4500,
  brightnessReduction: 0,
  focusMode: false,
  paperTexture: false,
  dyslexiaFont: false,
  eyeCareReminders: true,
  breakInterval: 20,
  autoNightMode: false,
};

/* ------------------------------------------------------------------ */
/* Bookshelf settings (persisted in main AppData)                      */
/* ------------------------------------------------------------------ */

export interface BookshelfSettings {
  readerSettings: ReaderSettings;
  eyeComfort: EyeComfortSettings;
  categories: BookCategory[];
  defaultViewMode: 'shelves' | 'grid' | 'list';
}

export const DEFAULT_BOOKSHELF_SETTINGS: BookshelfSettings = {
  readerSettings: { ...DEFAULT_READER_SETTINGS },
  eyeComfort: { ...DEFAULT_EYE_COMFORT },
  categories: [
    { id: 'cat-textbooks', name: 'Textbooks', color: '#4f46e5', icon: '📚', order: 0 },
    { id: 'cat-novels', name: 'Novels', color: '#ec4899', icon: '📖', order: 1 },
    { id: 'cat-reference', name: 'Reference', color: '#0ea5e9', icon: '📋', order: 2 },
    { id: 'cat-notes', name: 'Notes & PDFs', color: '#22c55e', icon: '📝', order: 3 },
  ],
  defaultViewMode: 'shelves',
};
