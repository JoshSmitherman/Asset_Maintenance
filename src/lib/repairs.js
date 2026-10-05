import { isValidIsoDate, todayIso } from './dates';

/**
 * In-house repairs: what was wrong, who fixed it, when, and each part
 * replaced with its cost. The rules mirror handle_repair_write() in
 * supabase/setup.sql, which has the final say - checking here as well means
 * a mistake is pointed out on the form, not after a round trip.
 */

export const MAX_PARTS = 30;
export const MAX_PART_COST = 100000;

/** A part's cost as typed ("45", "45.5", "£45.50") as a number, or null. */
export function parseCost(text) {
  const cleaned = String(text ?? '').replace(/[£,\s]/g, '');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

/** Sum of the parts, to the penny, ignoring rows not yet filled in. */
export function partsTotal(parts) {
  const pence = (parts ?? []).reduce((total, part) => {
    const cost = typeof part.cost === 'number' ? part.cost : parseCost(part.cost);
    return total + (cost === null ? 0 : Math.round(cost * 100));
  }, 0);
  return pence / 100;
}

/** A blank row in the parts list. */
export function blankPart() {
  return { part: '', cost: '' };
}

/** The form's starting values: a new repair, or an existing one to edit. */
export function repairFormValues(repair, { userId }) {
  if (!repair) {
    return {
      repaired_on: todayIso(),
      fault: '',
      fixed_by: userId ?? null,
      notes: '',
      parts: [blankPart()]
    };
  }
  return {
    repaired_on: repair.repaired_on,
    fault: repair.fault ?? '',
    fixed_by: repair.fixed_by ?? null,
    notes: repair.notes ?? '',
    parts: (repair.parts ?? []).map((part) => ({ part: part.part, cost: String(part.cost) }))
  };
}

/**
 * What is wrong with the form, keyed by field. Parts are keyed by row:
 * `part_<n>` and `cost_<n>`. A row left completely empty is ignored, so the
 * spare blank row never blocks saving.
 */
export function validateRepair(values) {
  const errors = {};

  if (!values.repaired_on || !isValidIsoDate(values.repaired_on)) {
    errors.repaired_on = 'Enter a valid date.';
  } else if (values.repaired_on > todayIso()) {
    errors.repaired_on = 'The repair date cannot be in the future.';
  }

  const fault = String(values.fault ?? '').trim();
  if (!fault) errors.fault = 'Say what was wrong, or what was done.';
  else if (fault.length > 500) errors.fault = 'Keep this to 500 characters.';

  if (!values.fixed_by) errors.fixed_by = 'Choose who fixed it.';
  if (String(values.notes ?? '').length > 2000) errors.notes = 'Notes must be 2000 characters or fewer.';

  const parts = values.parts ?? [];
  const filled = parts.filter((row) => !isEmptyRow(row));
  if (filled.length > MAX_PARTS) errors.parts = `A repair can list at most ${MAX_PARTS} parts.`;

  parts.forEach((row, index) => {
    if (isEmptyRow(row)) return;
    const name = String(row.part ?? '').trim();
    if (!name) errors[`part_${index}`] = 'Name the part.';
    else if (name.length > 80) errors[`part_${index}`] = 'Keep the part name to 80 characters.';

    const cost = parseCost(row.cost);
    if (cost === null) errors[`cost_${index}`] = 'Enter a cost (0 if it was free).';
    else if (cost < 0) errors[`cost_${index}`] = 'A cost cannot be negative.';
    else if (cost > MAX_PART_COST) errors[`cost_${index}`] = 'That cost looks too high.';
  });

  return errors;
}

/** The row to send to the database. The total is worked out there. */
export function repairPayload(values) {
  return {
    repaired_on: values.repaired_on,
    fault: String(values.fault ?? '').trim(),
    fixed_by: values.fixed_by,
    notes: String(values.notes ?? '').trim() || null,
    parts: (values.parts ?? [])
      .filter((row) => !isEmptyRow(row))
      .map((row) => ({ part: String(row.part).trim(), cost: parseCost(row.cost) }))
  };
}

function isEmptyRow(row) {
  return !String(row?.part ?? '').trim() && String(row?.cost ?? '').trim() === '';
}

/** Count and total spend for a list of repairs. */
export function repairSummary(repairs) {
  const list = repairs ?? [];
  return {
    count: list.length,
    total: list.reduce((sum, repair) => sum + Math.round(Number(repair.total_cost || 0) * 100), 0) / 100
  };
}
