import { describe, it, expect } from 'vitest';
import { buildCustody, buildTimeline } from '../assetHistory';

const created = {
  id: 'e1',
  event_type: 'created',
  details: { owner: 'Alice', department: 'IT', location: 'Office' },
  happened_at: '2026-01-01T09:00:00Z',
  actor_email: 'tech@example.com'
};
const toBob = {
  id: 'e2',
  event_type: 'owner',
  old_value: 'Alice',
  new_value: 'Bob',
  happened_at: '2026-04-01T09:00:00Z'
};
const toNobody = {
  id: 'e3',
  event_type: 'owner',
  old_value: 'Bob',
  new_value: null,
  happened_at: '2026-07-01T09:00:00Z'
};

describe('buildCustody', () => {
  it('splits the time between each holder, in order, up to now', () => {
    const segments = buildCustody([toNobody, created, toBob], new Date('2026-10-01T09:00:00Z'));
    expect(segments.map((segment) => segment.owner)).toEqual(['Alice', 'Bob', null]);
    expect(segments[0].share).toBeCloseTo(90 / 273, 2);
    expect(segments.reduce((sum, segment) => sum + segment.share, 0)).toBeCloseTo(1, 5);
  });

  it('starts from the tracking row for assets older than the history', () => {
    const start = {
      id: 's',
      event_type: 'tracking_started',
      details: { owner: 'Cara' },
      happened_at: '2026-10-01T09:00:00Z'
    };
    expect(buildCustody([start], new Date('2026-10-02T09:00:00Z'))).toEqual([
      expect.objectContaining({ owner: 'Cara', share: 1 })
    ]);
  });

  it('draws nothing when there is no starting point', () => {
    expect(buildCustody([toBob])).toEqual([]);
  });
});

describe('buildTimeline', () => {
  it('merges changes, cleans and the purchase, newest first', () => {
    const timeline = buildTimeline(
      { purchase_date: '2025-12-15' },
      [created, toBob],
      [{ id: 'c1', cleaned_on: '2026-05-10', cleaned_by: 'JS' }]
    );
    expect(timeline.map((entry) => entry.title)).toEqual([
      'Cleaned by JS',
      'Assigned to Bob',
      'Added to the register',
      'Purchased'
    ]);
    expect(timeline[1].detail).toBe('Previously with Alice');
    expect(timeline[2].detail).toBe('With Alice · IT · Office');
  });

  it('says plainly when an asset is unassigned', () => {
    const [entry] = buildTimeline({}, [toNobody], []);
    expect(entry.title).toBe('Unassigned');
    expect(entry.detail).toBe('Previously with Bob');
  });
});
