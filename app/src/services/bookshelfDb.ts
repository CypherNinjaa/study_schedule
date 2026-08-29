/**
 * Dexie (IndexedDB) database for bookshelf binary data and metadata.
 *
 * Book files, covers, annotations, bookmarks and reading sessions
 * are stored here — separate from the main JSON app data — because
 * binary blobs can be hundreds of MB and would bloat the main store.
 */
import Dexie, { type Table } from 'dexie';
import type {
  Book,
  BookAnnotation,
  BookBookmark,
  ReadingSession,
} from '@/types/bookshelf';

/* ------------------------------------------------------------------ */
/* Database schema                                                     */
/* ------------------------------------------------------------------ */

class BookshelfDatabase extends Dexie {
  books!: Table<Book, string>;
  bookFiles!: Table<{ id: string; data: ArrayBuffer }, string>;
  covers!: Table<{ id: string; data: Blob }, string>;
  annotations!: Table<BookAnnotation, string>;
  bookmarks!: Table<BookBookmark, string>;
  readingSessions!: Table<ReadingSession, string>;

  constructor() {
    super('BookshelfDB');
    this.version(1).stores({
      books: 'id, title, author, format, status, categoryId, subjectId, lastOpenedAt',
      bookFiles: 'id',
      covers: 'id',
      annotations: 'id, bookId, type, createdAt',
      bookmarks: 'id, bookId, createdAt',
      readingSessions: 'id, bookId, date, startedAt',
    });
  }
}

export const db = new BookshelfDatabase();

/* ------------------------------------------------------------------ */
/* Books CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function addBook(book: Book, fileData: ArrayBuffer, cover?: Blob): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.books.put(book);
  await db.bookFiles.put({ id: book.id, data: fileData });
  if (cover) {
    try {
      await db.covers.put({ id: book.id, data: cover });
    } catch (e) {
      console.warn('Could not store cover thumbnail:', e);
    }
  }
}

export async function getBook(id: string): Promise<Book | undefined> {
  if (!db.isOpen()) await db.open();
  return db.books.get(id);
}

export async function getAllBooks(): Promise<Book[]> {
  if (!db.isOpen()) await db.open();
  return db.books.toArray();
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.books.update(id, patch);
}

export async function deleteBook(id: string): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.books.delete(id);
  await db.bookFiles.delete(id);
  await db.covers.delete(id);
  await db.annotations.where('bookId').equals(id).delete();
  await db.bookmarks.where('bookId').equals(id).delete();
  await db.readingSessions.where('bookId').equals(id).delete();
}

export async function getBookFile(id: string): Promise<ArrayBuffer | undefined> {
  if (!db.isOpen()) await db.open();
  const record = await db.bookFiles.get(id);
  return record?.data;
}

export async function getBookCover(id: string): Promise<Blob | undefined> {
  if (!db.isOpen()) await db.open();
  const record = await db.covers.get(id);
  return record?.data;
}

export async function updateBookCover(id: string, cover: Blob): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.covers.put({ id: id, data: cover });
  await db.books.update(id, { hasCover: true });
}

/* ------------------------------------------------------------------ */
/* Annotations CRUD                                                    */
/* ------------------------------------------------------------------ */

export async function saveAnnotation(annotation: BookAnnotation): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.annotations.put(annotation);
}

export async function getAnnotations(bookId: string): Promise<BookAnnotation[]> {
  if (!db.isOpen()) await db.open();
  return db.annotations.where('bookId').equals(bookId).toArray();
}

export async function deleteAnnotation(id: string): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.annotations.delete(id);
}

export async function updateAnnotation(id: string, patch: Partial<BookAnnotation>): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.annotations.update(id, patch);
}

/* ------------------------------------------------------------------ */
/* Bookmarks CRUD                                                      */
/* ------------------------------------------------------------------ */

export async function saveBookmark(bookmark: BookBookmark): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.bookmarks.put(bookmark);
}

export async function getBookmarks(bookId: string): Promise<BookBookmark[]> {
  if (!db.isOpen()) await db.open();
  return db.bookmarks.where('bookId').equals(bookId).toArray();
}

export async function deleteBookmark(id: string): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.bookmarks.delete(id);
}

/* ------------------------------------------------------------------ */
/* Reading sessions                                                    */
/* ------------------------------------------------------------------ */

export async function logReadingSession(session: ReadingSession): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.readingSessions.put(session);

  // Update book's total reading minutes
  const book = await db.books.get(session.bookId);
  if (book) {
    await db.books.update(session.bookId, {
      totalReadMinutes: (book.totalReadMinutes || 0) + session.minutes,
    });
  }
}

export async function getReadingSessions(bookId?: string): Promise<ReadingSession[]> {
  if (!db.isOpen()) await db.open();
  if (bookId) {
    return db.readingSessions.where('bookId').equals(bookId).toArray();
  }
  return db.readingSessions.toArray();
}

export async function getReadingSessionsByDate(date: string): Promise<ReadingSession[]> {
  if (!db.isOpen()) await db.open();
  return db.readingSessions.where('date').equals(date).toArray();
}

/* ------------------------------------------------------------------ */
/* Utility                                                             */
/* ------------------------------------------------------------------ */

export async function getBookCount(): Promise<number> {
  if (!db.isOpen()) await db.open();
  return db.books.count();
}

export async function getRecentBooks(limit = 5): Promise<Book[]> {
  if (!db.isOpen()) await db.open();
  return db.books
    .orderBy('lastOpenedAt')
    .reverse()
    .filter((b) => b.lastOpenedAt !== null)
    .limit(limit)
    .toArray();
}

export async function getFavoriteBooks(): Promise<Book[]> {
  if (!db.isOpen()) await db.open();
  return db.books.filter((b) => Boolean(b.favorite)).toArray();
}

export async function getBooksByCategory(categoryId: string): Promise<Book[]> {
  if (!db.isOpen()) await db.open();
  return db.books.where('categoryId').equals(categoryId).toArray();
}

export async function getInProgressBooks(): Promise<Book[]> {
  if (!db.isOpen()) await db.open();
  return db.books.where('status').equals('reading').toArray();
}
