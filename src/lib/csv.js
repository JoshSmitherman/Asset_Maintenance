/**
 * CSV export.
 *
 * Everything a table or report shows on screen can be downloaded exactly as
 * shown - same rows, same order, same filters - so any view is a report
 * without anyone having to build one.
 */

/** Anything that could be read as a formula by a spreadsheet is defused. */
function cell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // A leading =, +, - or @ makes Excel treat the cell as a formula, which is
  // both wrong and a well-known way to smuggle something nasty into a
  // spreadsheet. A leading apostrophe keeps it as text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /["\n\r,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * @param {Array<{key: string, label: string, format?: (row: any) => any}>} columns
 * @param {Array<object>} rows
 */
export function toCsv(columns, rows) {
  const header = columns.map((column) => cell(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => cell(column.format ? column.format(row) : row[column.key])).join(',')
  );
  return [header, ...body].join('\r\n');
}

/** Today's date in the filename, so downloads do not overwrite each other. */
export function csvFilename(name) {
  const today = new Date().toISOString().slice(0, 10);
  return `${name}-${today}.csv`;
}

export function downloadCsv(filename, csv) {
  // The BOM is what makes Excel read the file as UTF-8 rather than mangling
  // any accented name in it.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(name, columns, rows) {
  downloadCsv(csvFilename(name), toCsv(columns, rows));
}
