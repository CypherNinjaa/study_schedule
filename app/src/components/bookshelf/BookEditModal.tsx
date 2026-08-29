/**
 * BookEditModal — Native modal for editing book metadata & linking to subjects.
 */
import { useState } from 'react';
import type { Book, ReadingStatus } from '@/types/bookshelf';
import { useData } from '@/hooks/useMetrics';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { Modal } from '@/components/ui/Modal';
import { confirmAction } from '@/utils/confirm';

interface BookEditModalProps {
  book: Book;
  onClose: () => void;
  onOpenReader?: () => void;
}

export function BookEditModal({ book, onClose, onOpenReader }: BookEditModalProps) {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);
  const updateBookMeta = useBookshelfStore((s) => s.updateBookMeta);
  const deleteBook = useBookshelfStore((s) => s.deleteBook);

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [subjectId, setSubjectId] = useState(book.subjectId ?? '');
  const [status, setStatus] = useState<ReadingStatus>(book.status);
  const [tagsStr, setTagsStr] = useState(book.tags.join(', '));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    await updateBookMeta(book.id, {
      title: title.trim(),
      author: author.trim(),
      subjectId: subjectId || null,
      status,
      tags,
      completedAt: status === 'completed' ? (book.completedAt ?? new Date().toISOString()) : null,
    });

    toast({ kind: 'success', title: 'Book updated' });
    onClose();
  };

  const handleDelete = () => {
    confirmAction({
      title: 'Delete book?',
      message: `"${book.title}" will be permanently removed from your library.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await deleteBook(book.id);
        toast({ kind: 'info', title: 'Book deleted' });
        onClose();
      },
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Book Details"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            className="btn-danger btn-sm"
            onClick={handleDelete}
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block label">Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            data-autofocus
          />
        </div>

        <div>
          <label className="block label">Author</label>
          <input
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block label">Linked Subject</label>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">No subject linked</option>
              {data.subjects
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block label">Reading Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReadingStatus)}
            >
              <option value="unread">Unread</option>
              <option value="reading">Currently Reading</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block label">Tags (comma-separated)</label>
          <input
            className="input text-xs"
            placeholder="textbook, exam_prep, important"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
          />
        </div>

        {onOpenReader && (
          <div className="pt-2">
            <button
              type="button"
              className="btn-outline w-full gap-2 text-accent"
              onClick={() => {
                onClose();
                onOpenReader();
              }}
            >
              Open in Reader
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
