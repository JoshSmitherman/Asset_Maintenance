import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from './ReportsPage';

const auth = { user: { id: 'u-ann', email: 'ann@adaro.net' } };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const assets = [
  { id: 'a1', asset_ref: 'LAP-1', device_type: 'Laptop', owner_name: 'Ann', department: 'IT', purchase_cost: 900, status: 'OK' }
];

function renderPage() {
  return render(<ReportsPage assets={assets} log={[]} repairs={[]} />);
}

const menu = () => screen.getByRole('navigation', { name: 'Reports' });
const starFor = (label) => within(menu()).getAllByRole('button', { name: new RegExp(`‘${label}’`, 'i') })[0];

beforeEach(() => {
  window.localStorage.clear();
  auth.user = { id: 'u-ann', email: 'ann@adaro.net' };
});

describe('favourite reports', () => {
  it('turns a report\'s star gold and lists it under Favourites', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(within(menu()).queryByRole('heading', { name: 'Favourites' })).not.toBeInTheDocument();

    const star = starFor('Due this month');
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);

    expect(starFor('Due this month')).toHaveAttribute('aria-pressed', 'true');
    expect(starFor('Due this month')).toHaveClass('star-toggle--on');
    const favourites = within(menu()).getByRole('heading', { name: 'Favourites' }).closest('.reports__group');
    expect(within(favourites).getByRole('button', { name: /^due this month/i })).toBeInTheDocument();
  });

  it('remembers favourites, and opens on the first one next time', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(starFor('Never cleaned'));
    unmount();

    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Never cleaned' })).toBeInTheDocument();
    expect(within(menu()).getByRole('heading', { name: 'Favourites' })).toBeInTheDocument();
  });

  it('keeps one person\'s favourites from another on the same computer', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(starFor('Never cleaned'));
    unmount();

    auth.user = { id: 'u-bo', email: 'bo@adaro.net' };
    renderPage();
    expect(within(menu()).queryByRole('heading', { name: 'Favourites' })).not.toBeInTheDocument();
  });

  it('unstarring takes it out of Favourites, and the group goes once empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(starFor('Fleet age'));
    expect(within(menu()).getByRole('heading', { name: 'Favourites' })).toBeInTheDocument();

    await user.click(starFor('Fleet age'));
    expect(within(menu()).queryByRole('heading', { name: 'Favourites' })).not.toBeInTheDocument();
  });

  it('can be starred from beside the report\'s title, which is what a phone shows', async () => {
    const user = userEvent.setup();
    renderPage();
    const title = screen.getByRole('heading', { level: 2, name: 'Assets by group' }).parentElement;
    await user.click(within(title).getByRole('button', { name: /add ‘assets by group’ to favourites/i }));

    expect(within(title).getByRole('button', { name: /remove ‘assets by group’/i })).toHaveAttribute('aria-pressed', 'true');
    // The phone's report list puts it first.
    const picker = screen.getByLabelText(/^report$/i);
    expect(within(picker).getByRole('group', { name: /favourites/i })).toBeInTheDocument();
    expect(within(picker).getByRole('option', { name: '★ Assets by group' })).toBeInTheDocument();
  });
});
