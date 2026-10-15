import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetToolbar from './AssetToolbar';
import { CLEANING_SORT, DEFAULT_SORT, EMPTY_FILTERS } from '../lib/assetQueries';

function renderToolbar(props) {
  return render(
    <AssetToolbar
      filters={{ ...EMPTY_FILTERS }}
      onChange={() => {}}
      departments={[]}
      resultCount={8}
      totalCount={8}
      showCleaningFilters={false}
      defaultSort={DEFAULT_SORT}
      {...props}
    />
  );
}

describe('the order in words above the table', () => {
  it('says the register starts in Asset Ref order, with nothing to reset', () => {
    renderToolbar({ sort: DEFAULT_SORT, onSortChange: () => {} });
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by Asset Ref (A to Z)');
    expect(screen.queryByRole('button', { name: 'Reset sort' })).not.toBeInTheDocument();
  });

  it('names a chosen column and puts the default back on Reset sort', async () => {
    const onSortChange = vi.fn();
    renderToolbar({ sort: { key: 'purchase_date', direction: 'desc' }, onSortChange });
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by Purchased (newest first)');
    await userEvent.click(screen.getByRole('button', { name: 'Reset sort' }));
    expect(onSortChange).toHaveBeenCalledWith(DEFAULT_SORT);
  });

  it('calls the cleaning queue\'s order "most urgent first"', () => {
    renderToolbar({ sort: CLEANING_SORT, defaultSort: CLEANING_SORT, onSortChange: () => {} });
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by urgency (most urgent first)');
  });
});
