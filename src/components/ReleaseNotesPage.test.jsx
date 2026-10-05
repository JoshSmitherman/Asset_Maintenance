import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReleaseNotesPage from './ReleaseNotesPage';
import { CHANGE_TYPES, RELEASES } from '../lib/releaseNotes';

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
    const firstType = RELEASES[0].sections[0].groups[0].items[0].type;
    expect(screen.getAllByText(CHANGE_TYPES[firstType]).length).toBeGreaterThan(0);
    // Text marked **like this** in the notes renders bold, not with asterisks.
    const marked = RELEASES[0].sections
      .flatMap((section) => section.groups.flatMap((group) => group.items))
      .map((item) => item.text.match(/\*\*(.+?)\*\*/)?.[1])
      .find(Boolean);
    expect(screen.getAllByText(marked, { selector: 'strong' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });
});
