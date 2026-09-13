import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('calls onConfirm when the confirm button is pressed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDialog title="Delete asset" message="This cannot be undone." onConfirm={onConfirm} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel and never onConfirm when cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Delete asset" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the error when onConfirm rejects (e.g. RLS denial)', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('You do not have permission to do that.'));
    render(<ConfirmDialog title="Delete asset" message="Sure?" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not have permission/i);
  });
});
