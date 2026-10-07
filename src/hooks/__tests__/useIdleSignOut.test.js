import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIdleSignOut } from '../useIdleSignOut';
import { IDLE_LIMIT_MS, IDLE_WARNING_MS, isIdleExpired, markActive, rememberSignOutReason, takeSignOutReason } from '../../lib/idle';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 7, 9, 0));
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('signing out after a while with nothing done', () => {
  it('warns shortly before the limit, then signs out', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useIdleSignOut({ enabled: true, onExpire }));
    act(() => vi.advanceTimersByTime(IDLE_LIMIT_MS - IDLE_WARNING_MS + 5000));
    expect(result.current.secondsLeft).toBeGreaterThan(0);
    expect(result.current.secondsLeft).toBeLessThanOrEqual(IDLE_WARNING_MS / 1000);
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(IDLE_WARNING_MS));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('keeps going while someone is working', () => {
    const onExpire = vi.fn();
    renderHook(() => useIdleSignOut({ enabled: true, onExpire }));
    for (let minute = 0; minute < 90; minute += 5) {
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
        window.dispatchEvent(new Event('keydown'));
      });
    }
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('"Stay signed in" starts the clock again', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useIdleSignOut({ enabled: true, onExpire }));
    act(() => vi.advanceTimersByTime(IDLE_LIMIT_MS - 30000));
    expect(result.current.secondsLeft).not.toBeNull();
    act(() => result.current.stayActive());
    expect(result.current.secondsLeft).toBeNull();
    act(() => vi.advanceTimersByTime(IDLE_LIMIT_MS - IDLE_WARNING_MS - 60000));
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('counts work in another tab', () => {
    const onExpire = vi.fn();
    renderHook(() => useIdleSignOut({ enabled: true, onExpire }));
    act(() => vi.advanceTimersByTime(IDLE_LIMIT_MS - 5 * 60 * 1000));
    markActive(); // another tab
    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('knows on opening that the last activity was too long ago', () => {
    markActive(Date.now() - IDLE_LIMIT_MS - 1);
    expect(isIdleExpired()).toBe(true);
    markActive();
    expect(isIdleExpired()).toBe(false);
  });

  it('tells the sign-in page why, once', () => {
    rememberSignOutReason('idle');
    expect(takeSignOutReason()).toBe('idle');
    expect(takeSignOutReason()).toBeNull();
  });
});
