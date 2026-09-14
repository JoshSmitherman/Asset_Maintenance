import { describe, it, expect } from 'vitest';
import { csvFilename, toCsv } from '../csv';

const columns = [
  { key: 'asset_ref', label: 'Asset Ref' },
  { key: 'owner_name', label: 'User', format: (row) => row.owner_name ?? '' }
];

describe('toCsv', () => {
  it('writes a header and one line per row', () => {
    const csv = toCsv(columns, [{ asset_ref: 'LAP-1', owner_name: 'Alice' }]);
    expect(csv).toBe('Asset Ref,User\r\nLAP-1,Alice');
  });

  it('quotes anything containing a comma, a quote or a newline', () => {
    const csv = toCsv(columns, [{ asset_ref: 'LAP,1', owner_name: 'A "B"\nC' }]);
    expect(csv).toBe('Asset Ref,User\r\n"LAP,1","A ""B""\nC"');
  });

  it('defuses a value a spreadsheet would treat as a formula', () => {
    const csv = toCsv(columns, [{ asset_ref: '=1+1', owner_name: '+44 7700 900000' }]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+44 7700 900000");
  });

  it('writes nothing for a missing value rather than "undefined"', () => {
    const csv = toCsv(columns, [{ asset_ref: 'LAP-2' }]);
    expect(csv).toBe('Asset Ref,User\r\nLAP-2,');
  });
});

describe('csvFilename', () => {
  it('dates the file so downloads do not overwrite each other', () => {
    expect(csvFilename('asset-register')).toMatch(/^asset-register-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
