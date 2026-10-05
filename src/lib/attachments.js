/**
 * Files attached to an asset or one of its repairs: invoices, receipts and
 * photos. They live in a private Supabase Storage bucket - nobody can open
 * one without being signed in - and the attachments table says what each
 * file is and what it belongs to.
 *
 * The types and size limit mirror the bucket and attachments_file_valid in
 * supabase/setup.sql; checking here as well means a wrong file is turned away
 * before anything is uploaded.
 */

export const ATTACHMENTS_BUCKET = 'asset-files';

export const ATTACHMENT_TYPES = {
  'image/jpeg': 'JPEG image',
  'image/png': 'PNG image',
  'image/webp': 'WebP image',
  'image/gif': 'GIF image',
  'application/pdf': 'PDF'
};

/** What the file picker offers. */
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).join(',');

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Why a file cannot be attached, or null if it can. */
export function attachmentProblem(file) {
  if (!file) return 'Choose a file.';
  if (!ATTACHMENT_TYPES[file.type]) {
    return `${file.name} is not a photo or a PDF. Attach JPEG, PNG, WebP, GIF or PDF files.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  }
  return null;
}

/**
 * Where a file is stored: always under its asset's own folder, which the
 * database checks, so a record can only ever point at its own asset's files.
 * A random prefix keeps two files with the same name apart.
 */
export function storagePathFor(assetId, fileName, { repairId = null, unique = randomId() } = {}) {
  const safeName = safeFileName(fileName);
  return repairId
    ? `${assetId}/repairs/${repairId}/${unique}-${safeName}`
    : `${assetId}/${unique}-${safeName}`;
}

/** Storage paths cannot hold just any character; names stay readable. */
export function safeFileName(fileName) {
  const cleaned = String(fileName ?? '')
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(-120);
  return cleaned || 'file';
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

export function isImage(contentType) {
  return String(contentType ?? '').startsWith('image/');
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
