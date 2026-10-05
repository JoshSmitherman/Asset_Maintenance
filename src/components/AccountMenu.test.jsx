import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountMenu from './AccountMenu';

function setup(props = {}) {
  const handlers = { onChangePassword: vi.fn(), onSignOut: vi.fn() };
  render(<AccountMenu email="bruce.baldomero@adaro.net" isAdmin {...handlers} {...props} />);
  return handlers;
}

describe('AccountMenu', () => {
  it('shows initials, and opens to the name, email and role', async () => {
    const user = userEvent.setup();
    setup();
    const badge = screen.getByRole('button', { name: /account: bruce baldomero/i });
    expect(badge).toHaveTextContent('BB');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(badge);
    const menu = screen.getByRole('menu');
    expect(menu).toHaveTextContent('Bruce Baldomero');
    expect(menu).toHaveTextContent('bruce.baldomero@adaro.net');
    expect(menu).toHaveTextContent('Admin');
    // Focus moves into the menu, ready for the keyboard.
    expect(screen.getByRole('menuitem', { name: /change password/i })).toHaveFocus();
  });

  it('runs the chosen action and closes', async () => {
    const user = userEvent.setup();
    const { onChangePassword, onSignOut } = setup();
    await user.click(screen.getByRole('button', { name: /account/i }));
    await user.click(screen.getByRole('menuitem', { name: /change password/i }));
    expect(onChangePassword).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /account/i }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSignOut).toHaveBeenCalled();
  });

  it('closes on Escape and hands focus back to the badge', async () => {
    const user = userEvent.setup();
    setup({ isAdmin: false });
    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByRole('menu')).toHaveTextContent('User');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account/i })).toHaveFocus();
  });
});
