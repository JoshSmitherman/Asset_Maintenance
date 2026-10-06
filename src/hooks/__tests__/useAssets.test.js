import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// Each read of the register is answered by hand, so the test decides the
// order replies arrive in.
const pending = [];
const updates = [];
let realtimeHandler = null;

vi.mock('../../lib/supabaseClient', () => {
  const view = () => {
    const builder = {
      select: () => builder,
      order: () => builder,
      range: () => new Promise((resolve) => pending.push(resolve))
    };
    return builder;
  };
  const table = () => {
    const state = {};
    const builder = {
      update: (payload) => Object.assign(state, { payload }) && builder,
      in: (column, ids) => Object.assign(state, { ids }) && builder,
      select: () => {
        updates.push({ ...state });
        return Promise.resolve({ data: state.ids.map((id) => ({ id })), error: null });
      }
    };
    return builder;
  };
  const channel = {
    on: (_type, _filter, handler) => {
      realtimeHandler = handler;
      return channel;
    },
    subscribe: () => channel
  };
  return {
    supabase: {
      from: (name) => (name === 'assets_with_status' ? view() : table()),
      channel: () => channel,
      removeChannel: () => {}
    }
  };
});

const { useAssets } = await import('../useAssets');

const row = (id, owner, version) => ({
  id, asset_ref: `AST-${id}`, device_type: 'Laptop', owner_name: owner, department: 'IT',
  version, status: 'OK', next_clean_due: '2027-01-01'
});

afterEach(() => {
  pending.length = 0;
  updates.length = 0;
  vi.useRealTimers();
});

describe('useAssets', () => {
  it('never lets an older reply overwrite a newer one', async () => {
    const { result } = renderHook(() => useAssets());
    // First load.
    await act(async () => pending.shift()({ data: [row('1', 'Ann', 1)], error: null }));
    await waitFor(() => expect(result.current.assets[0]?.owner_name).toBe('Ann'));

    // Two refreshes overlap; the newer one answers first.
    act(() => {
      result.current.refresh();
      result.current.refresh();
    });
    const [older, newer] = pending.splice(0, 2);
    await act(async () => newer({ data: [row('1', 'Carol', 3)], error: null }));
    await act(async () => older({ data: [row('1', 'Bob', 2)], error: null }));

    expect(result.current.assets[0].owner_name).toBe('Carol');
  });

  it('turns a burst of live changes into one reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderHook(() => useAssets());
    await act(async () => pending.shift()({ data: [], error: null }));

    act(() => {
      for (let i = 0; i < 50; i += 1) realtimeHandler({});
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(pending).toHaveLength(1);
  });

  it('sends a bulk change for thousands of assets in batches', async () => {
    const { result } = renderHook(() => useAssets());
    await act(async () => pending.shift()({ data: [], error: null }));

    const ids = Array.from({ length: 450 }, (_, i) => `id-${i}`);
    let count;
    await act(async () => {
      const done = result.current.bulkAssign(ids, 'Dana');
      // The reload after the writes.
      await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0));
      pending.shift()({ data: [], error: null });
      count = await done;
    });
    expect(updates.map((update) => update.ids.length)).toEqual([200, 200, 50]);
    expect(count).toBe(450);
  });
});
