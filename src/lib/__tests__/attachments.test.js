import { describe, it, expect } from 'vitest';
import { attachmentProblem, formatBytes, MAX_ATTACHMENT_BYTES, safeFileName, storagePathFor } from '../attachments';

const file = (name, type, size) => ({ name, type, size });

describe('attachmentProblem', () => {
  it('accepts photos and PDFs within the limit', () => {
    expect(attachmentProblem(file('invoice.pdf', 'application/pdf', 1000))).toBeNull();
    expect(attachmentProblem(file('crack.jpg', 'image/jpeg', MAX_ATTACHMENT_BYTES))).toBeNull();
  });

  it('turns away anything that is not a photo or a PDF', () => {
    expect(attachmentProblem(file('setup.exe', 'application/x-msdownload', 10))).toMatch(/not a photo or a PDF/);
    expect(attachmentProblem(file('notes.docx', 'application/vnd.openxmlformats', 10))).toMatch(/not a photo/);
  });

  it('turns away empty files and files over 10 MB', () => {
    expect(attachmentProblem(file('empty.pdf', 'application/pdf', 0))).toMatch(/empty/);
    expect(attachmentProblem(file('scan.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1))).toMatch(/limit is 10 MB/);
  });
});

describe('storagePathFor', () => {
  it('keeps every file under its own asset, and repair files under their repair', () => {
    expect(storagePathFor('asset-1', 'invoice.pdf', { unique: 'u1' })).toBe('asset-1/u1-invoice.pdf');
    expect(storagePathFor('asset-1', 'receipt.pdf', { repairId: 'r-9', unique: 'u2' }))
      .toBe('asset-1/repairs/r-9/u2-receipt.pdf');
  });
});

describe('safeFileName', () => {
  it('keeps names readable but safe for a storage path', () => {
    expect(safeFileName('Dell invoice (March).pdf')).toBe('Dell-invoice-March.pdf');
    expect(safeFileName('../../etc/passwd')).toBe('etcpasswd');
    expect(safeFileName('')).toBe('file');
  });
});

describe('formatBytes', () => {
  it('reads like a person would say it', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
