/**
 * Zustand store for Bookshelf UI state.
 *
 * This manages the in-memory book list, active reader state, and
 * reading settings. The actual file storage is in Dexie (bookshelfDb).
 */
import { create } from 'zustand';
import type {
  Book,
  BookFormat,
  EyeComfortSettings,
  ReaderSettings,
  ReaderTheme,
  ReadingStatus,
} from '@/types/bookshelf';
import {
  DEFAULT_EYE_COMFORT,
  DEFAULT_READER_SETTINGS,
} from '@/types/bookshelf';
import * as bookDb from '@/services/bookshelfDb';
import { importBookFromFile, type ImportResult } from '@/services/bookImporter';

/* ------------------------------------------------------------------ */
/* State shape                                                         */
/* ------------------------------------------------------------------ */

export type LibraryViewMode = 'shelves' | 'grid' | 'list';
export type SortBy = 'title' | 'author' | 'recent' | 'progress' | 'imported';

export interface BookFilters {
  subject: string;
  author: string;
  tag: string;
  status: ReadingStatus | '';
  format: BookFormat | '';
  category: string;
  search: string;
}

interface BookshelfState {
  /* library */
  books: Book[];
  loading: boolean;
  viewMode: LibraryViewMode;
  sortBy: SortBy;
  filters: BookFilters;
  importing: boolean;
  importProgress: number;

  /* reader */
  readerOpen: boolean;
  activeBookId: string | null;
  activeBook: Book | null;
  readerSettings: ReaderSettings;
  eyeComfort: EyeComfortSettings;

  /* reading session tracking */
  sessionStartTime: string | null;
  sessionStartProgress: number;
  sessionStartPage: number;

  /* actions */
  loadBooks: () => Promise<void>;
  importBooks: (files: File[]) => Promise<ImportResult[]>;
  openBook: (bookId: string) => Promise<void>;
  closeReader: () => void;
  deleteBook: (bookId: string) => Promise<void>;
  toggleFavorite: (bookId: string) => Promise<void>;
  updateBookProgress: (bookId: string, progress: number, location: string) => Promise<void>;
  setBookStatus: (bookId: string, status: ReadingStatus) => Promise<void>;
  setBookCategory: (bookId: string, categoryId: string | null) => Promise<void>;
  setBookSubject: (bookId: string, subjectId: string | null) => Promise<void>;
  setBookTags: (bookId: string, tags: string[]) => Promise<void>;
  updateBookMeta: (bookId: string, patch: Partial<Book>) => Promise<void>;

  /* UI actions */
  setViewMode: (mode: LibraryViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setFilters: (filters: Partial<BookFilters>) => void;
  clearFilters: () => void;

  /* reader settings */
  setReaderSettings: (patch: Partial<ReaderSettings>) => void;
  setReaderTheme: (theme: ReaderTheme) => void;
  setEyeComfort: (patch: Partial<EyeComfortSettings>) => void;

  /* session */
  startReadingSession: (progress: number, page: number) => void;
  endReadingSession: (bookId: string, progress: number, pagesRead: number) => Promise<void>;
}

const EMPTY_FILTERS: BookFilters = {
  subject: '',
  author: '',
  tag: '',
  status: '',
  format: '',
  category: '',
  search: '',
};

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useBookshelfStore = create<BookshelfState>((set, get) => ({
  books: [],
  loading: false,
  viewMode: 'shelves',
  sortBy: 'recent',
  filters: { ...EMPTY_FILTERS },
  importing: false,
  importProgress: 0,

  readerOpen: false,
  activeBookId: null,
  activeBook: null,
  readerSettings: { ...DEFAULT_READER_SETTINGS },
  eyeComfort: { ...DEFAULT_EYE_COMFORT },

  sessionStartTime: null,
  sessionStartProgress: 0,
  sessionStartPage: 0,

  /* ── Library actions ─────────────────────────────────────────────── */

  loadBooks: async () => {
    set({ loading: true });
    try {
      const books = await bookDb.getAllBooks();
      set({ books, loading: false });
    } catch (err) {
      console.error('Failed to load books:', err);
      set({ loading: false });
    }
  },

  importBooks: async (files) => {
    set({ importing: true, importProgress: 0 });
    const results: ImportResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await importBookFromFile(files[i]);
      results.push(result);
      set({ importProgress: ((i + 1) / files.length) * 100 });
    }

    // Reload books from DB
    const books = await bookDb.getAllBooks();
    set({ books, importing: false, importProgress: 100 });
    return results;
  },

  openBook: async (bookId) => {
    const book = await bookDb.getBook(bookId);
    if (!book) return;

    const now = new Date().toISOString();
    await bookDb.updateBook(bookId, {
      lastOpenedAt: now,
      status: book.status === 'unread' ? 'reading' : book.status,
    });

    const updatedBook = { ...book, lastOpenedAt: now, status: book.status === 'unread' ? 'reading' as const : book.status };

    set({
      readerOpen: true,
      activeBookId: bookId,
      activeBook: updatedBook,
    });

    // Update the book in the list
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? updatedBook : b)),
    }));
  },

  closeReader: () => {
    const { activeBookId, sessionStartTime } = get();
    if (activeBookId && sessionStartTime) {
      // Auto-end session
      void get().endReadingSession(activeBookId, get().activeBook?.progress ?? 0, 0);
    }
    set({
      readerOpen: false,
      activeBookId: null,
      activeBook: null,
      sessionStartTime: null,
    });
  },

  deleteBook: async (bookId) => {
    await bookDb.deleteBook(bookId);
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
    }));
  },

  toggleFavorite: async (bookId) => {
    const book = get().books.find((b) => b.id === bookId);
    if (!book) return;
    const newFav = !book.favorite;
    await bookDb.updateBook(bookId, { favorite: newFav });
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, favorite: newFav } : b,
      ),
    }));
  },

  updateBookProgress: async (bookId, progress, location) => {
    await bookDb.updateBook(bookId, { progress, currentLocation: location });
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, progress, currentLocation: location } : b,
      ),
      activeBook: state.activeBook?.id === bookId
        ? { ...state.activeBook, progress, currentLocation: location }
        : state.activeBook,
    }));
  },

  setBookStatus: async (bookId, status) => {
    const patch: Partial<Book> = { status };
    if (status === 'completed') patch.completedAt = new Date().toISOString();
    await bookDb.updateBook(bookId, patch);
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? { ...b, ...patch } : b)),
    }));
  },

  setBookCategory: async (bookId, categoryId) => {
    await bookDb.updateBook(bookId, { categoryId });
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? { ...b, categoryId } : b)),
    }));
  },

  setBookSubject: async (bookId, subjectId) => {
    await bookDb.updateBook(bookId, { subjectId });
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? { ...b, subjectId } : b)),
    }));
  },

  setBookTags: async (bookId, tags) => {
    await bookDb.updateBook(bookId, { tags });
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? { ...b, tags } : b)),
    }));
  },

  updateBookMeta: async (bookId, patch) => {
    await bookDb.updateBook(bookId, patch);
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? { ...b, ...patch } : b)),
    }));
  },

  /* ── UI actions ──────────────────────────────────────────────────── */

  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  clearFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

  /* ── Reader settings ─────────────────────────────────────────────── */

  setReaderSettings: (patch) =>
    set((state) => ({
      readerSettings: { ...state.readerSettings, ...patch },
    })),

  setReaderTheme: (theme) =>
    set((state) => ({
      readerSettings: { ...state.readerSettings, theme },
    })),

  setEyeComfort: (patch) =>
    set((state) => ({
      eyeComfort: { ...state.eyeComfort, ...patch },
    })),

  /* ── Reading session ─────────────────────────────────────────────── */

  startReadingSession: (progress, page) => {
    set({
      sessionStartTime: new Date().toISOString(),
      sessionStartProgress: progress,
      sessionStartPage: page,
    });
  },

  endReadingSession: async (bookId, endProgress, pagesRead) => {
    const { sessionStartTime, sessionStartProgress } = get();
    if (!sessionStartTime) return;

    const endedAt = new Date().toISOString();
    const startMs = new Date(sessionStartTime).getTime();
    const endMs = new Date(endedAt).getTime();
    const minutes = Math.round((endMs - startMs) / 60000);

    if (minutes < 1) {
      set({ sessionStartTime: null });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const session = {
      id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId,
      date: today,
      startedAt: sessionStartTime,
      endedAt,
      minutes,
      pagesRead,
      startProgress: sessionStartProgress,
      endProgress,
      subjectId: get().activeBook?.subjectId ?? null,
    };

    await bookDb.logReadingSession(session);

    // Automatically log reading session as a study session in Productivity OS
    const activeBook = get().activeBook;
    if (activeBook) {
      const { logReadingAsStudySession } = await import('@/store/bookshelfActions');
      logReadingAsStudySession(bookId, activeBook.title, minutes, activeBook.subjectId);
    }

    set({ sessionStartTime: null });
  },
}));
