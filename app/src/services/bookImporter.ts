/**
 * Book Import & Metadata Extraction Engine.
 *
 * Handles importing PDF, EPUB, MOBI, AZW3, and TXT files.
 * Extracts metadata (title, author, page count) and generates cover thumbnails.
 * MOBI/AZW3 are converted to a readable format via basic header parsing.
 */
import * as pdfjsLib from 'pdfjs-dist';
import type { Book, BookFormat } from '@/types/bookshelf';
import { addBook } from '@/services/bookshelfDb';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectFormat(fileName: string): BookFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'epub') return 'epub';
  if (ext === 'mobi') return 'mobi';
  if (ext === 'azw3' || ext === 'azw') return 'azw3';
  return 'txt';
}

/** Render a canvas to a Blob thumbnail. */
async function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? new Blob()),
      'image/jpeg',
      quality,
    );
  });
}

/** Extract a dominant color from a canvas for the book spine. */
function extractDominantColor(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#4f46e5';
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let r = 0, g = 0, b = 0, count = 0;
  // Sample every 20th pixel for speed
  for (let i = 0; i < data.length; i += 80) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return '#4f46e5';
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Generate a procedural cover for books without one. */
function generateProceduralCover(title: string, author: string): { canvas: HTMLCanvasElement; color: string } {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  // Generate a color from the title
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 45%, 35%)`;
  const bgLight = `hsl(${hue}, 50%, 55%)`;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 200, 300);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, bgLight);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 200, 300);

  // Decorative line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 60);
  ctx.lineTo(180, 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, 240);
  ctx.lineTo(180, 240);
  ctx.stroke();

  // Title text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const words = title.split(' ');
  let line = '';
  let y = 100;
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > 160) {
      ctx.fillText(line, 100, y);
      line = word;
      y += 22;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 100, y);

  // Author
  if (author) {
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(author, 100, 260);
  }

  // Format badge
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('📖', 100, 280);

  return { canvas, color: bg };
}

/* ------------------------------------------------------------------ */
/* PDF Metadata & Cover Extraction                                     */
/* ------------------------------------------------------------------ */

interface ExtractedMetadata {
  title: string;
  author: string;
  totalPages: number;
  cover: Blob | null;
  coverColor: string;
}

async function extractPdfMetadata(data: ArrayBuffer, fileName: string): Promise<ExtractedMetadata> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  const metadata = await pdf.getMetadata();

  const info = metadata?.info as Record<string, string> | undefined;
  const title = info?.Title || fileName.replace(/\.pdf$/i, '');
  const author = info?.Author || '';

  // Render first page as cover
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(viewport.width, 200);
  canvas.height = Math.min(viewport.height, 300);
  const scale = Math.min(200 / viewport.width, 300 / viewport.height);
  const scaledViewport = page.getViewport({ scale: scale * 0.5 });

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport: scaledViewport, canvas } as any).promise;

  const coverColor = extractDominantColor(canvas);
  const coverBlob = await canvasToBlob(canvas);

  return {
    title,
    author,
    totalPages: pdf.numPages,
    cover: coverBlob,
    coverColor,
  };
}

/* ------------------------------------------------------------------ */
/* EPUB Metadata & Cover Extraction                                    */
/* ------------------------------------------------------------------ */

async function extractEpubMetadata(data: ArrayBuffer, fileName: string): Promise<ExtractedMetadata> {
  // Dynamically import epub.js to keep the initial bundle small
  const ePub = (await import('epubjs')).default;
  const book = ePub(data);
  await book.ready;

  const meta = book.packaging?.metadata;
  const title = meta?.title || fileName.replace(/\.epub$/i, '');
  const author = meta?.creator || '';

  // Try to extract cover
  let cover: Blob | null = null;
  let coverColor = '#4f46e5';

  try {
    const coverUrl = await book.coverUrl();
    if (coverUrl) {
      const resp = await fetch(coverUrl);
      cover = await resp.blob();

      // Extract dominant color from cover
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = coverUrl;
      });
      if (img.width > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 200);
        canvas.height = Math.min(img.height, 300);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        coverColor = extractDominantColor(canvas);
      }
    }
  } catch {
    // Cover extraction failed — use procedural cover
  }

  // Estimate total pages (epub doesn't have fixed pages)
  const spine = book.spine;
  const estimatedPages = spine ? (spine as unknown as { length: number }).length * 15 : 100;

  book.destroy();

  if (!cover) {
    const proc = generateProceduralCover(title, author);
    cover = await canvasToBlob(proc.canvas);
    coverColor = proc.color;
  }

  return {
    title,
    author,
    totalPages: estimatedPages,
    cover,
    coverColor,
  };
}

/* ------------------------------------------------------------------ */
/* TXT Metadata                                                        */
/* ------------------------------------------------------------------ */

async function extractTxtMetadata(data: ArrayBuffer, fileName: string): Promise<ExtractedMetadata> {
  const text = new TextDecoder().decode(data);
  const title = fileName.replace(/\.txt$/i, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 250)); // ~250 words per page

  const proc = generateProceduralCover(title, '');
  const cover = await canvasToBlob(proc.canvas);

  return {
    title,
    author: '',
    totalPages: estimatedPages,
    cover,
    coverColor: proc.color,
  };
}

/* ------------------------------------------------------------------ */
/* MOBI / AZW3 — basic header parsing                                  */
/* ------------------------------------------------------------------ */

async function extractMobiMetadata(data: ArrayBuffer, fileName: string): Promise<ExtractedMetadata> {
  // MOBI/AZW3 format: Parse PDB header to get title
  let title = '';

  try {
    // PDB header: first 32 bytes are the title (null-padded)
    const decoder = new TextDecoder('ascii');
    const titleBytes = new Uint8Array(data, 0, 32);
    title = decoder.decode(titleBytes).replace(/\0/g, '').trim();
  } catch {
    // Fall back to filename
  }

  if (!title) {
    title = fileName.replace(/\.(mobi|azw3|azw)$/i, '');
  }

  // Estimate pages from file size (~2KB per page for text content)
  const estimatedPages = Math.max(1, Math.ceil(data.byteLength / 2048));

  const proc = generateProceduralCover(title, '');
  const cover = await canvasToBlob(proc.canvas);

  return {
    title,
    author: '',
    totalPages: estimatedPages,
    cover,
    coverColor: proc.color,
  };
}

/* ------------------------------------------------------------------ */
/* Public import API                                                   */
/* ------------------------------------------------------------------ */

export interface ImportResult {
  success: boolean;
  book?: Book;
  error?: string;
}

export async function importBookFromFile(file: File): Promise<ImportResult> {
  try {
    const format = detectFormat(file.name);
    const data = await file.arrayBuffer();

    let metadata: ExtractedMetadata;

    switch (format) {
      case 'pdf':
        metadata = await extractPdfMetadata(data.slice(0), file.name);
        break;
      case 'epub':
        metadata = await extractEpubMetadata(data.slice(0), file.name);
        break;
      case 'mobi':
      case 'azw3':
        metadata = await extractMobiMetadata(data.slice(0), file.name);
        break;
      case 'txt':
      default:
        metadata = await extractTxtMetadata(data.slice(0), file.name);
        break;
    }

    const now = new Date().toISOString();
    const book: Book = {
      id: uid('book'),
      title: metadata.title,
      author: metadata.author,
      description: '',
      format,
      fileName: file.name,
      fileSize: file.size,
      totalPages: metadata.totalPages,
      progress: 0,
      currentLocation: '',
      hasCover: metadata.cover !== null,
      coverColor: metadata.coverColor,
      status: 'unread',
      favorite: false,
      categoryId: null,
      subjectId: null,
      goalId: null,
      tags: [],
      totalReadMinutes: 0,
      shelfOrder: Date.now(),
      importedAt: now,
      lastOpenedAt: null,
      completedAt: null,
    };

    await addBook(book, data, metadata.cover ?? undefined);

    return { success: true, book };
  } catch (err) {
    console.error('Book import failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown import error',
    };
  }
}

export async function importBookFromUrl(url: string, fileName?: string): Promise<ImportResult> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch: ${resp.statusText}`);
    const blob = await resp.blob();
    const name = fileName || url.split('/').pop() || 'download.pdf';
    const file = new File([blob], name, { type: blob.type });
    return importBookFromFile(file);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to download file',
    };
  }
}

/** Supported file extensions for the file picker. */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw3', '.azw', '.txt'];

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'text/plain',
  'application/x-mobipocket-ebook',
];
