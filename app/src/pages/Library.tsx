/**
 * Library Page — Clean, productivity-focused library module.
 *
 * Fully integrated with Study Schedule's design system:
 * - Uses standard PageHeader, StatCard, Card, ProgressBar, Modal, and design tokens
 * - Grid and List views with standard card styles
 * - Reading hours directly integrated with study session tracking
 */
import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Box,
  CheckCircle2,
  Clock,
  Edit2,
  FolderOpen,
  Grid,
  LayoutList,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useBookshelfStore, type SortBy } from '@/store/useBookshelfStore';
import { useData } from '@/hooks/useMetrics';
import type { Book } from '@/types/bookshelf';
import { getBookCover } from '@/services/bookshelfDb';
import { Card, PageHeader, ProgressBar, StatCard } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
import { confirmAction } from '@/utils/confirm';
import { formatDateShort } from '@/utils/date';
import { cn } from '@/utils/misc';
import { ImportModal } from '@/components/bookshelf/ImportModal';
import { BookEditModal } from '@/components/bookshelf/BookEditModal';
import { BookshelfScene } from '@/components/bookshelf/BookshelfScene';
import { ReaderView } from '@/components/reader/ReaderView';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatHours(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = (mins / 60).toFixed(1);
  return `${h.endsWith('.0') ? h.slice(0, -2) : h}h`;
}

function sortBooks(books: Book[], sortBy: SortBy): Book[] {
  const sorted = [...books];
  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'author':
      return sorted.sort((a, b) => a.author.localeCompare(b.author));
    case 'recent':
      return sorted.sort((a, b) => (b.lastOpenedAt ?? b.importedAt).localeCompare(a.lastOpenedAt ?? a.importedAt));
    case 'progress':
      return sorted.sort((a, b) => b.progress - a.progress);
    case 'imported':
      return sorted.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    default:
      return sorted;
  }
}

function useCoverUrl(bookId: string, hasCover: boolean) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCover) return;
    let cancelled = false;
    getBookCover(bookId).then((blob) => {
      if (cancelled || !blob) return;
      setUrl(URL.createObjectURL(blob));
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bookId, hasCover]);

  return url;
}

export function Library() {
  const data = useData();
  const {
    books,
    viewMode,
    sortBy,
    filters,
    readerOpen,
    activeBook,
    loadBooks,
    openBook,
    closeReader,
    deleteBook,
    toggleFavorite,
    setViewMode,
    setSortBy,
    setFilters,
  } = useBookshelfStore();

  const [importing, setImporting] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Reading statistics directly from study sessions + books
  const totalReadingMinutes = useMemo(() => {
    const fromSessions = data.studySessions
      .filter((s) => s.method === 'reading')
      .reduce((sum, s) => sum + s.minutes, 0);
    const fromBooks = books.reduce((sum, b) => sum + (b.totalReadMinutes || 0), 0);
    return Math.max(fromSessions, fromBooks);
  }, [data.studySessions, books]);

  const currentlyReadingCount = useMemo(
    () => books.filter((b) => b.status === 'reading').length,
    [books],
  );

  const completedCount = useMemo(
    () => books.filter((b) => b.status === 'completed').length,
    [books],
  );

  // Filter and sort books
  const filtered = useMemo(() => {
    let list = [...books];

    if (filters.subject) {
      list = list.filter((b) => b.subjectId === filters.subject);
    }
    if (filters.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters.format) {
      list = list.filter((b) => b.format === filters.format);
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return sortBooks(list, sortBy);
  }, [books, filters, sortBy]);

  const handleDelete = (b: Book) => {
    confirmAction({
      title: 'Remove book?',
      message: `"${b.title}" will be removed from your library.`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        await deleteBook(b.id);
      },
    });
  };

  // If reader is open, show the reader view
  if (readerOpen && activeBook) {
    return <ReaderView book={activeBook} onClose={closeReader} />;
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Library"
        subtitle="Manage books, notes and study resources."
        action={
          <button
            type="button"
            className="btn-primary btn-sm gap-1.5"
            onClick={() => setImporting(true)}
          >
            <Plus size={15} /> Import book
          </button>
        }
      />

      {/* Statistics row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Total books"
          value={books.length}
          hint="In your collection"
        />
        <StatCard
          icon={<BookOpen size={18} />}
          label="Currently reading"
          value={currentlyReadingCount}
          hint="Active books"
          tone="var(--c-study)"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Completed"
          value={completedCount}
          hint="Finished books"
          tone="var(--c-ok)"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Reading hours"
          value={formatHours(totalReadingMinutes)}
          hint="Logged study time"
          tone="var(--c-code)"
        />
      </div>

      {/* Filter and search toolbar */}
      <Card className="p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                placeholder="Search books, authors, tags..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="input input-sm pl-8 text-xs"
              />
            </div>

            <select
              className="input input-sm text-xs w-auto"
              value={filters.subject}
              onChange={(e) => setFilters({ subject: e.target.value })}
            >
              <option value="">All Subjects</option>
              {data.subjects
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
            </select>

            <select
              className="input input-sm text-xs w-auto"
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  status: e.target.value as '' | 'unread' | 'reading' | 'completed' | 'abandoned',
                })
              }
            >
              <option value="">All Status</option>
              <option value="reading">Currently Reading</option>
              <option value="unread">Unread</option>
              <option value="completed">Completed</option>
            </select>

            <select
              className="input input-sm text-xs w-auto"
              value={filters.format}
              onChange={(e) =>
                setFilters({
                  format: e.target.value as '' | 'pdf' | 'epub' | 'txt' | 'mobi' | 'azw3',
                })
              }
            >
              <option value="">All Formats</option>
              <option value="pdf">PDF</option>
              <option value="epub">EPUB</option>
              <option value="txt">TXT</option>
              <option value="mobi">MOBI / AZW3</option>
            </select>

            <select
              className="input input-sm text-xs w-auto"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="recent">Recently Opened</option>
              <option value="title">Title A-Z</option>
              <option value="author">Author A-Z</option>
              <option value="progress">Progress</option>
              <option value="imported">Date Added</option>
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0 border-t border-line pt-2 md:border-t-0 md:pt-0">
            <button
              type="button"
              className={cn(
                'btn-icon h-8 w-8',
                viewMode === 'shelves' ? 'bg-accent-soft text-accent' : 'text-muted',
              )}
              onClick={() => setViewMode('shelves')}
              title="3D Bookshelf view"
            >
              <Box size={15} />
            </button>
            <button
              type="button"
              className={cn(
                'btn-icon h-8 w-8',
                viewMode === 'grid' ? 'bg-accent-soft text-accent' : 'text-muted',
              )}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid size={15} />
            </button>
            <button
              type="button"
              className={cn(
                'btn-icon h-8 w-8',
                viewMode === 'list' ? 'bg-accent-soft text-accent' : 'text-muted',
              )}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <LayoutList size={15} />
            </button>
          </div>
        </div>
      </Card>

      {/* Main content display */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen size={22} />}
            title={books.length === 0 ? 'Your library is empty' : 'No matching books found'}
            message={
              books.length === 0
                ? 'Import your first book to start reading. We support PDF, EPUB, MOBI, AZW3, and TXT files.'
                : 'Try adjusting your search query or subject filters.'
            }
            action={
              books.length === 0 && (
                <button
                  type="button"
                  className="btn-primary btn-sm mt-2 gap-1.5"
                  onClick={() => setImporting(true)}
                >
                  <Plus size={15} /> Import book
                </button>
              )
            }
          />
        </Card>
      ) : viewMode === 'shelves' ? (
        <Card className="h-[550px] overflow-hidden p-0 border border-line bg-surface">
          <BookshelfScene
            books={filtered}
            onBookClick={(bookId) => {
              const b = books.find((x) => x.id === bookId);
              if (b) openBook(b.id);
            }}
            sections={[
              { label: '📖 Continue Reading', books: filtered.filter((b) => b.status === 'reading') },
              { label: '⭐ Favorites', books: filtered.filter((b) => b.favorite && b.status !== 'reading') },
              { label: '📚 All Books', books: filtered.filter((b) => b.status !== 'reading' && !b.favorite) },
            ].filter((s) => s.books.length > 0)}
          />
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="divide-y divide-line overflow-hidden">
          {filtered.map((book) => (
            <BookListRow
              key={book.id}
              book={book}
              onOpen={() => openBook(book.id)}
              onEdit={() => setEditingBook(book)}
              onDelete={() => handleDelete(book)}
              onToggleFavorite={() => toggleFavorite(book.id)}
            />
          ))}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((book) => (
            <BookGridCard
              key={book.id}
              book={book}
              onOpen={() => openBook(book.id)}
              onEdit={() => setEditingBook(book)}
              onDelete={() => handleDelete(book)}
              onToggleFavorite={() => toggleFavorite(book.id)}
            />
          ))}
        </div>
      )}

      {/* Import Modal */}
      {importing && (
        <ImportModal open onClose={() => setImporting(false)} />
      )}

      {/* Edit / Details Modal */}
      {editingBook && (
        <BookEditModal
          book={editingBook}
          onClose={() => setEditingBook(null)}
          onOpenReader={() => {
            openBook(editingBook.id);
            setEditingBook(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Grid Card
------------------------------------------------------------------ */

function BookGridCard({
  book,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  book: Book;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const data = useData();
  const subject = data.subjects.find((s) => s.id === book.subjectId);
  const coverUrl = useCoverUrl(book.id, book.hasCover);

  return (
    <Card className="flex flex-col justify-between p-3.5 transition-all hover:border-accent/40">
      <div className="space-y-3">
        {/* Cover + Header actions */}
        <div className="flex gap-3">
          {/* Cover thumbnail */}
          <div
            onClick={onOpen}
            className="group relative h-28 w-20 shrink-0 cursor-pointer overflow-hidden rounded-ctl border border-line bg-elevated shadow-sm"
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center p-1 text-center"
                style={{
                  background: `linear-gradient(135deg, ${book.coverColor || '#4f46e5'}20, ${book.coverColor || '#4f46e5'}40)`,
                }}
              >
                <BookOpen size={20} className="text-accent" />
                <span className="mt-1 text-[9px] font-semibold uppercase text-ink line-clamp-2">
                  {book.title}
                </span>
              </div>
            )}
            {book.progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${book.progress * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <h4
                onClick={onOpen}
                className="cursor-pointer text-sm font-semibold text-ink line-clamp-2 hover:text-accent transition-colors"
                title={book.title}
              >
                {book.title}
              </h4>
              <button
                type="button"
                onClick={onToggleFavorite}
                className="btn-ghost btn-xs h-6 w-6 p-0 text-muted hover:text-amber-400 shrink-0"
                title={book.favorite ? 'Favorited' : 'Favorite'}
              >
                <Star
                  size={13}
                  className={book.favorite ? 'text-amber-400' : ''}
                  fill={book.favorite ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            {book.author && (
              <p className="mt-0.5 text-xs text-muted line-clamp-1">{book.author}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1">
              {subject && (
                <span
                  className="chip text-[10px]"
                  style={{
                    borderColor: `${subject.color}40`,
                    background: `${subject.color}15`,
                    color: subject.color,
                  }}
                >
                  {subject.code}
                </span>
              )}
              <span className="chip text-[10px] uppercase font-mono">{book.format}</span>
            </div>
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Progress</span>
            <span className="tabular font-medium text-ink">
              {Math.round(book.progress * 100)}%
            </span>
          </div>
          <ProgressBar value={book.progress} tone="study" />
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-2.5">
        <span className="text-[10px] text-faint">
          {book.lastOpenedAt
            ? `Opened ${formatDateShort(book.lastOpenedAt.slice(0, 10))}`
            : 'Not opened yet'}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-ink"
            onClick={onEdit}
            title="Edit details"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-danger"
            onClick={onDelete}
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            className="btn-outline btn-xs gap-1 font-medium text-accent border-accent/40 hover:bg-accent-soft"
            onClick={onOpen}
          >
            <BookOpen size={12} /> Read
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------
   List Row
------------------------------------------------------------------ */

function BookListRow({
  book,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  book: Book;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const data = useData();
  const subject = data.subjects.find((s) => s.id === book.subjectId);
  const coverUrl = useCoverUrl(book.id, book.hasCover);

  return (
    <div className="flex items-center justify-between gap-3 p-3 hover:bg-elevated/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Thumbnail */}
        <div
          onClick={onOpen}
          className="h-11 w-8 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-line bg-elevated"
        >
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs">📖</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              onClick={onOpen}
              className="cursor-pointer text-sm font-semibold text-ink truncate hover:text-accent transition-colors"
            >
              {book.title}
            </p>
            <button
              type="button"
              onClick={onToggleFavorite}
              className="btn-ghost btn-xs h-5 w-5 p-0 text-muted hover:text-amber-400 shrink-0"
              title={book.favorite ? 'Favorited' : 'Favorite'}
            >
              <Star
                size={12}
                className={book.favorite ? 'text-amber-400' : ''}
                fill={book.favorite ? 'currentColor' : 'none'}
              />
            </button>
            {subject && (
              <span
                className="chip text-[10px] shrink-0"
                style={{
                  borderColor: `${subject.color}40`,
                  background: `${subject.color}15`,
                  color: subject.color,
                }}
              >
                {subject.code}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted">
            {book.author && <span>{book.author}</span>}
            <span className="uppercase font-mono">{book.format}</span>
            {book.fileSize > 0 && <span>{formatBytes(book.fileSize)}</span>}
            <span className="tabular">{Math.round(book.progress * 100)}% read</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          className="btn-outline btn-xs gap-1 text-accent border-accent/40 hover:bg-accent-soft"
          onClick={onOpen}
        >
          <BookOpen size={12} /> Read
        </button>
        <button
          type="button"
          className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-ink"
          onClick={onEdit}
          title="Edit"
        >
          <Edit2 size={13} />
        </button>
        <button
          type="button"
          className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-danger"
          onClick={onDelete}
          title="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default Library;
