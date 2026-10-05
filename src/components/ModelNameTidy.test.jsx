import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelNameTidy from './ModelNameTidy';

const latitude = { key: 'dell latitude 5540', brand: 'Dell', model: 'Latitude 5540', label: 'Dell Latitude 5540', count: 3, refs: ['L1', 'L2', 'L3'], ids: ['1', '2', '3'] };
const typo = { key: 'dell lattitude 5540', brand: 'Dell', model: 'Lattitude 5540', label: 'Dell Lattitude 5540', count: 1, refs: ['L4'], ids: ['4'] };

beforeEach(() => window.localStorage.clear());

describe('ModelNameTidy', () => {
  it('renames the odd spelling to the most common one by default', async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn().mockResolvedValue(1);
    render(<ModelNameTidy specMemory={{ Laptop: [latitude, typo] }} onMerge={onMerge} onToast={() => {}} />);
    await user.click(screen.getByRole('button', { name: /rename 1 asset to dell latitude 5540/i }));
    expect(onMerge).toHaveBeenCalledWith(['4'], { brand: 'Dell', model: 'Latitude 5540' });
  });

  it('can keep the other spelling instead', async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn().mockResolvedValue(3);
    render(<ModelNameTidy specMemory={{ Laptop: [latitude, typo] }} onMerge={onMerge} onToast={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /dell lattitude 5540/i }));
    await user.click(screen.getByRole('button', { name: /rename 3 assets to dell lattitude 5540/i }));
    expect(onMerge).toHaveBeenCalledWith(['1', '2', '3'], { brand: 'Dell', model: 'Lattitude 5540' });
  });

  it('stops suggesting a pair marked as different models', async () => {
    const user = userEvent.setup();
    render(<ModelNameTidy specMemory={{ Laptop: [latitude, typo] }} onMerge={vi.fn()} onToast={() => {}} />);
    await user.click(screen.getByRole('button', { name: /these are different models/i }));
    expect(screen.getByText(/nothing to tidy/i)).toBeInTheDocument();
  });
});
