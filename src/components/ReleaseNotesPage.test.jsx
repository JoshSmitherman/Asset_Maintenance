import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReleaseNotesPage from './ReleaseNotesPage';
import { RELEASES } from '../lib/releaseNotes';

describe('ReleaseNotesPage', () => {
  it('opens on the latest release and switches to an older one', async () => {
    const user = userEvent.setup();
    render(<ReleaseNotesPage />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(RELEASES[0].version);
    expect(screen.getByText(RELEASES[0].title)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Version'), '1.0.0');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('1.0.0');
    expect(screen.getByText('First Release')).toBeInTheDocument();
    expect(screen.getByText('11 September 2026')).toBeInTheDocument();
  });

  it('shows each change with its badge, and bold where marked', () => {
    render(<ReleaseNotesPage />);
    expect(screen.getAllByText('Added').length).toBeGreaterThan(0);
    // "**History**" in the notes renders as bold text, not asterisks.
    expect(screen.getAllByText('History', { selector: 'strong' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });
});
