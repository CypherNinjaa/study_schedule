import { useMemo, useState } from 'react';
import {
  Copy,
  Download,
  Edit2,
  ExternalLink,
  File,
  FileText,
  Folder,
  FolderOpen,
  Grid,
  Image as ImageIcon,
  LayoutList,
  Link as LinkIcon,
  Music,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import type { MaterialType, StudyMaterial } from '@/types';
import { addMaterial, deleteMaterial, recordMaterialOpened, updateMaterial } from '@/store/actions';
import { useData } from '@/hooks/useMetrics';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { Card, PageHeader, StatCard } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import { confirmAction } from '@/utils/confirm';
import { formatDateShort } from '@/utils/date';
import { cn } from '@/utils/misc';
import {
  deleteMaterialHandle,
  getMaterialHandle,
  openMaterialFileHandle,
  pickMaterialFile,
  saveMaterialHandle,
} from '@/services/fileStorage';

const TYPE_CONFIG: Record<MaterialType, { label: string; icon: typeof FileText; color: string }> = {
  pdf: { label: 'PDF Document', icon: FileText, color: '#ef4444' },
  video: { label: 'Video Lecture', icon: Video, color: '#6366f1' },
  audio: { label: 'Audio / Podcast', icon: Music, color: '#a855f7' },
  image: { label: 'Diagram / Image', icon: ImageIcon, color: '#0ea5e9' },
  link: { label: 'Web Link', icon: LinkIcon, color: '#10b981' },
  folder: { label: 'Folder Path', icon: Folder, color: '#f59e0b' },
  other: { label: 'Other File', icon: File, color: '#64748b' },
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Materials() {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);
  const materials = data.studyMaterials || [];

  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StudyMaterial | null>(null);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (selectedSubject && m.subjectId !== selectedSubject) return false;
      if (selectedType !== 'all' && m.type !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inDesc = m.description.toLowerCase().includes(q);
        const inTags = m.tags.some((t) => t.toLowerCase().includes(q));
        const inFileName = (m.fileName || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inTags && !inFileName) return false;
      }
      return true;
    });
  }, [materials, selectedSubject, selectedType, search]);

  const handleOpenMaterial = async (m: StudyMaterial) => {
    recordMaterialOpened(m.id);

    if (m.type === 'link' && m.url) {
      window.open(m.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (m.fileHandleKey) {
      const handle = await getMaterialHandle(m.fileHandleKey);
      if (handle) {
        const success = await openMaterialFileHandle(handle);
        if (success) return;
      }
    }

    if (m.filePath) {
      try {
        await navigator.clipboard.writeText(m.filePath);
        toast({
          kind: 'info',
          title: 'Path copied to clipboard',
          message: m.filePath,
        });
      } catch {
        toast({
          kind: 'info',
          title: 'File location',
          message: m.filePath,
        });
      }
      return;
    }

    toast({
      kind: 'warning',
      title: 'Cannot open file directly',
      message: 'Re-attach the file using the File System picker to enable direct opening.',
    });
  };

  const handleCopy = (m: StudyMaterial) => {
    const text = m.url || m.filePath || m.fileName || m.title;
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ kind: 'success', title: 'Copied to clipboard' });
  };

  const handleDelete = (m: StudyMaterial) => {
    confirmAction({
      title: 'Remove material?',
      message: `"${m.title}" will be removed from your study library. The actual file on your computer will not be deleted.`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        if (m.fileHandleKey) {
          await deleteMaterialHandle(m.fileHandleKey);
        }
        deleteMaterial(m.id);
      },
    });
  };

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Study Materials"
        subtitle={`${materials.length} resources across your subjects`}
        action={
          <button
            type="button"
            className="btn-primary btn-sm gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus size={15} /> Add material
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Total materials"
          value={materials.length}
          hint="Notes, PDFs, videos, links"
        />
        <StatCard
          icon={<FileText size={18} />}
          label="PDFs & documents"
          value={materials.filter((m) => m.type === 'pdf' || m.type === 'other').length}
          hint="Readings & slides"
          tone="var(--c-study)"
        />
        <StatCard
          icon={<Video size={18} />}
          label="Media & links"
          value={materials.filter((m) => m.type === 'video' || m.type === 'link').length}
          hint="Lectures & bookmarks"
          tone="var(--c-code)"
        />
      </div>

      {/* Filter and search bar */}
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
                placeholder="Search materials, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-sm pl-8 text-xs"
              />
            </div>

            <select
              className="input input-sm text-xs w-auto"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
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
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="pdf">PDFs</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="image">Images</option>
              <option value="link">Web Links</option>
              <option value="folder">Folders</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0 border-t border-line pt-2 md:border-t-0 md:pt-0">
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

      {/* Materials display */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <FolderOpen size={24} />
            </div>
            <p className="mt-3 text-base font-semibold text-ink">
              {materials.length === 0 ? 'No study materials yet' : 'No matching materials found'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              {materials.length === 0
                ? 'Attach your lecture notes, reference PDFs, video playlists, and book links to organize your study assets.'
                : 'Try adjusting your search query or subject filters.'}
            </p>
            {materials.length === 0 && (
              <button
                type="button"
                className="btn-primary btn-sm mt-4 gap-1.5"
                onClick={() => setCreating(true)}
              >
                <Plus size={15} /> Add first material
              </button>
            )}
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mat) => (
            <MaterialGridCard
              key={mat.id}
              material={mat}
              onOpen={() => handleOpenMaterial(mat)}
              onCopy={() => handleCopy(mat)}
              onEdit={() => setEditing(mat)}
              onDelete={() => handleDelete(mat)}
            />
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {filtered.map((mat) => (
            <MaterialListRow
              key={mat.id}
              material={mat}
              onOpen={() => handleOpenMaterial(mat)}
              onCopy={() => handleCopy(mat)}
              onEdit={() => setEditing(mat)}
              onDelete={() => handleDelete(mat)}
            />
          ))}
        </Card>
      )}

      {(creating || editing) && (
        <MaterialDialog
          material={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Grid Card
------------------------------------------------------------------ */

function MaterialGridCard({
  material: m,
  onOpen,
  onCopy,
  onEdit,
  onDelete,
}: {
  material: StudyMaterial;
  onOpen: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const data = useData();
  const subject = data.subjects.find((s) => s.id === m.subjectId);
  const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other;
  const Icon = cfg.icon;

  return (
    <Card className="flex flex-col justify-between p-4 transition-all hover:border-accent/40">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${cfg.color}18`, color: cfg.color }}
          >
            <Icon size={20} />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-ink"
              onClick={onCopy}
              title="Copy location / link"
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-ink"
              onClick={onEdit}
              title="Edit material"
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

        <div>
          <h4 className="text-sm font-semibold text-ink line-clamp-1" title={m.title}>
            {m.title}
          </h4>
          {m.description && (
            <p className="mt-0.5 text-xs text-muted line-clamp-2">{m.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {subject && (
            <span
              className="chip text-[10px] font-medium"
              style={{
                borderColor: `${subject.color}40`,
                background: `${subject.color}15`,
                color: subject.color,
              }}
            >
              {subject.code}
            </span>
          )}
          <span className="chip text-[10px]">{cfg.label}</span>
          {m.fileSize && m.fileSize > 0 && (
            <span className="chip text-[10px] tabular">{formatBytes(m.fileSize)}</span>
          )}
        </div>

        {m.tags && m.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {m.tags.map((tag) => (
              <span key={tag} className="text-[10px] text-muted bg-elevated px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
        <span className="text-[10px] text-faint">
          {m.lastOpenedAt ? `Opened ${formatDateShort(m.lastOpenedAt.slice(0, 10))}` : 'Not opened yet'}
        </span>
        <button
          type="button"
          className="btn-outline btn-xs gap-1 font-medium text-accent border-accent/40 hover:bg-accent-soft"
          onClick={onOpen}
        >
          {m.type === 'link' ? <ExternalLink size={12} /> : <Download size={12} />}
          Open
        </button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------
   List Row
------------------------------------------------------------------ */

function MaterialListRow({
  material: m,
  onOpen,
  onCopy,
  onEdit,
  onDelete,
}: {
  material: StudyMaterial;
  onOpen: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const data = useData();
  const subject = data.subjects.find((s) => s.id === m.subjectId);
  const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center justify-between gap-3 p-3 hover:bg-elevated/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${cfg.color}18`, color: cfg.color }}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink truncate">{m.title}</p>
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
            <span>{cfg.label}</span>
            {m.fileSize && <span>{formatBytes(m.fileSize)}</span>}
            {m.tags && m.tags.length > 0 && (
              <span>{m.tags.map((t) => `#${t}`).join(' ')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className="btn-outline btn-xs gap-1 text-accent border-accent/40"
          onClick={onOpen}
        >
          <ExternalLink size={12} /> Open
        </button>
        <button
          type="button"
          className="btn-ghost btn-xs h-7 w-7 p-0 text-muted"
          onClick={onCopy}
          title="Copy"
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          className="btn-ghost btn-xs h-7 w-7 p-0 text-muted"
          onClick={onEdit}
          title="Edit"
        >
          <Edit2 size={13} />
        </button>
        <button
          type="button"
          className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-danger"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Add / Edit Material Modal
------------------------------------------------------------------ */

function MaterialDialog({
  material,
  onClose,
}: {
  material: StudyMaterial | null;
  onClose: () => void;
}) {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);

  const [inputMode, setInputMode] = useState<'file' | 'link' | 'path'>(
    material?.url ? 'link' : material?.filePath ? 'path' : 'file',
  );

  const [title, setTitle] = useState(material?.title ?? '');
  const [description, setDescription] = useState(material?.description ?? '');
  const [type, setType] = useState<MaterialType>(material?.type ?? 'pdf');
  const [subjectId, setSubjectId] = useState(material?.subjectId ?? '');
  const [tagsStr, setTagsStr] = useState((material?.tags ?? []).join(', '));
  const [url, setUrl] = useState(material?.url ?? '');
  const [filePath, setFilePath] = useState(material?.filePath ?? '');
  const [fileName, setFileName] = useState(material?.fileName ?? '');
  const [fileSize, setFileSize] = useState<number | undefined>(material?.fileSize);
  const [fileHandleKey, setFileHandleKey] = useState<string | undefined>(
    material?.fileHandleKey,
  );

  const handlePickLocalFile = async () => {
    const res = await pickMaterialFile();
    if (!res) return;
    const { handle, file } = res;
    const key = `mat-${Date.now()}`;
    await saveMaterialHandle(key, handle);

    setFileHandleKey(key);
    setFileName(file.name);
    setFileSize(file.size);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));

    // Auto-detect type from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setType('pdf');
    else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')) setType('video');
    else if (['mp3', 'wav', 'm4a', 'aac'].includes(ext || '')) setType('audio');
    else if (['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif'].includes(ext || '')) setType('image');
    else setType('other');

    toast({
      kind: 'success',
      title: 'File attached',
      message: `${file.name} (${formatBytes(file.size)})`,
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      type,
      subjectId: subjectId || null,
      topicId: null,
      tags,
      url: inputMode === 'link' ? url.trim() : undefined,
      filePath: inputMode === 'path' ? filePath.trim() : undefined,
      fileHandleKey: inputMode === 'file' ? fileHandleKey : undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
    };

    if (material) {
      updateMaterial(material.id, payload);
      toast({ kind: 'success', title: 'Material updated' });
    } else {
      addMaterial(payload);
      toast({ kind: 'success', title: 'Material added to library' });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={material ? 'Edit Material' : 'Add Study Material'}>
      <form onSubmit={submit} className="space-y-4 p-4">
        {/* Source tab selector */}
        <div>
          <span className="label">Resource Type</span>
          <div className="grid grid-cols-3 gap-1.5 rounded-ctl border border-line bg-surface p-1 text-xs">
            <button
              type="button"
              className={cn(
                'rounded py-1.5 text-center font-medium transition-colors',
                inputMode === 'file'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
              onClick={() => {
                setInputMode('file');
                setType('pdf');
              }}
            >
              Local File
            </button>
            <button
              type="button"
              className={cn(
                'rounded py-1.5 text-center font-medium transition-colors',
                inputMode === 'link'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
              onClick={() => {
                setInputMode('link');
                setType('link');
              }}
            >
              Web Link
            </button>
            <button
              type="button"
              className={cn(
                'rounded py-1.5 text-center font-medium transition-colors',
                inputMode === 'path'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
              onClick={() => {
                setInputMode('path');
                setType('folder');
              }}
            >
              Path String
            </button>
          </div>
        </div>

        {/* Dynamic Source Input */}
        {inputMode === 'file' && (
          <div className="rounded-lg border border-line bg-surface/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink">File on Computer</span>
              <button
                type="button"
                className="btn-outline btn-xs gap-1.5 text-accent"
                onClick={handlePickLocalFile}
              >
                <Upload size={13} />
                {fileName ? 'Change file' : 'Choose file'}
              </button>
            </div>
            {fileName ? (
              <div className="flex items-center gap-2 text-xs text-muted truncate">
                <FileText size={14} className="text-accent shrink-0" />
                <span className="truncate font-mono">{fileName}</span>
                {fileSize && <span className="tabular">({formatBytes(fileSize)})</span>}
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                Select a PDF, video, audio or document from your local storage.
              </p>
            )}
          </div>
        )}

        {inputMode === 'link' && (
          <div>
            <label className="block label">URL Link *</label>
            <input
              type="url"
              className="input text-xs"
              placeholder="https://drive.google.com/... or https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required={inputMode === 'link'}
            />
          </div>
        )}

        {inputMode === 'path' && (
          <div>
            <label className="block label">File / Folder Path *</label>
            <input
              type="text"
              className="input text-xs font-mono"
              placeholder="C:\Users\...\Documents\Notes\Unit1.pdf"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              required={inputMode === 'path'}
            />
          </div>
        )}

        <div>
          <label className="block label">Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Unit 3 — Java Multithreading Slides"
            required
            data-autofocus
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block label">Subject</label>
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
            <label className="block label">Category</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as MaterialType)}
            >
              <option value="pdf">PDF Document</option>
              <option value="video">Video Lecture</option>
              <option value="audio">Audio / Podcast</option>
              <option value="image">Diagram / Image</option>
              <option value="link">Web Link</option>
              <option value="folder">Folder</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block label">Tags (comma-separated)</label>
          <input
            className="input text-xs"
            placeholder="unit3, exam_prep, important, pyq"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
          />
        </div>

        <div>
          <label className="block label">Notes / Summary</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key concepts covered or preparation notes..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {material ? 'Save changes' : 'Add material'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
