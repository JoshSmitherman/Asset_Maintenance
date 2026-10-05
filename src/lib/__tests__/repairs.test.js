import { describe, it, expect } from 'vitest';
import { parseCost, partsTotal, repairPayload, repairSummary, validateRepair } from '../repairs';
import { todayIso } from '../dates';

const valid = {
  repaired_on: '2026-09-01',
  fault: 'Battery would not hold charge',
  fixed_by: 'user-1',
  notes: '',
  parts: [{ part: 'Battery', cost: '45.50' }]
};

describe('parseCost', () => {
  it('reads costs the way people type them', () => {
    expect(parseCost('45')).toBe(45);
    expect(parseCost('£45.5')).toBe(45.5);
    expect(parseCost('1,250.00')).toBe(1250);
    expect(parseCost('0')).toBe(0);
  });

  it('gives null for nothing, or for words', () => {
    expect(parseCost('')).toBeNull();
    expect(parseCost('lots')).toBeNull();
  });
});

describe('partsTotal', () => {
  it('adds to the penny, without floating-point drift', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in plain JavaScript.
    expect(partsTotal([{ cost: '0.10' }, { cost: '0.20' }])).toBe(0.3);
  });

  it('ignores rows not filled in yet', () => {
    expect(partsTotal([{ part: 'Battery', cost: '45' }, { part: '', cost: '' }])).toBe(45);
  });
});

describe('validateRepair', () => {
  it('accepts a complete repair', () => {
    expect(validateRepair(valid)).toEqual({});
  });

  it('accepts a repair with no parts - not every fix needs one', () => {
    expect(validateRepair({ ...valid, parts: [{ part: '', cost: '' }] })).toEqual({});
  });

  it('needs a description, a date and who fixed it', () => {
    const errors = validateRepair({ ...valid, fault: '  ', repaired_on: '', fixed_by: null });
    expect(errors.fault).toBeTruthy();
    expect(errors.repaired_on).toBeTruthy();
    expect(errors.fixed_by).toBeTruthy();
  });

  it('refuses a date in the future', () => {
    expect(validateRepair({ ...valid, repaired_on: '2999-01-01' }).repaired_on).toMatch(/future/);
    expect(validateRepair({ ...valid, repaired_on: todayIso() }).repaired_on).toBeUndefined();
  });

  it('points at the exact part row that is wrong', () => {
    const errors = validateRepair({
      ...valid,
      parts: [
        { part: 'Battery', cost: '45' },
        { part: '', cost: '10' },
        { part: 'Screen', cost: '-5' },
        { part: 'Hinge', cost: '' }
      ]
    });
    expect(errors.part_0).toBeUndefined();
    expect(errors.part_1).toMatch(/name the part/i);
    expect(errors.cost_2).toMatch(/negative/i);
    expect(errors.cost_3).toMatch(/enter a cost/i);
  });
});

describe('repairPayload', () => {
  it('sends trimmed parts with numeric costs, and drops empty rows', () => {
    const payload = repairPayload({
      ...valid,
      fault: '  Replaced battery ',
      parts: [{ part: ' Battery ', cost: '£45.50' }, { part: '', cost: '' }]
    });
    expect(payload.fault).toBe('Replaced battery');
    expect(payload.parts).toEqual([{ part: 'Battery', cost: 45.5 }]);
    expect(payload.notes).toBeNull();
    // The database works out the total; the browser never sends one.
    expect(payload).not.toHaveProperty('total_cost');
  });
});

describe('repairSummary', () => {
  it('counts repairs and totals what they cost', () => {
    expect(repairSummary([{ total_cost: '45.50' }, { total_cost: 30 }])).toEqual({ count: 2, total: 75.5 });
    expect(repairSummary([])).toEqual({ count: 0, total: 0 });
  });
});
