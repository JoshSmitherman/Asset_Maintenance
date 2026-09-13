import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';
import { STATUS } from '../lib/constants';

describe('StatusBadge', () => {
  it('renders the status text with the matching modifier class', () => {
    const { container } = render(<StatusBadge status={STATUS.OVERDUE} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('badge', 'badge--overdue');
  });

  it('falls back to the base class for an unknown status', () => {
    const { container } = render(<StatusBadge status="Mystery" />);
    expect(container.firstChild).toHaveClass('badge');
    expect(container.firstChild.className).toBe('badge');
  });

  it('passes a title through for hover context', () => {
    render(<StatusBadge status={STATUS.OK} title="More than 30 days remaining" />);
    expect(screen.getByText('OK')).toHaveAttribute('title', 'More than 30 days remaining');
  });
});
