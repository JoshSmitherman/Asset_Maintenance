import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetRepairs from './AssetRepairs';
import AttachmentList from './AttachmentList';

const auth = { user: { id: 'u-josh', email: 'josh.smitherman@adaro.net' } };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../hooks/useTeam', () => ({
  useTeam: () => [
    { id: 'u-colleague', email: 'colleague@adaro.net' },
    { id: 'u-josh', email: 'josh.smitherman@adaro.net' }
  ]
}));

const repair = {
  id: 'r-1',
  repaired_on: '2026-09-01',
  fault: 'Replaced battery and keyboard',
  parts: [{ part: 'Battery', cost: 45.5 }, { part: 'Keyboard', cost: 30 }],
  total_cost: 75.5,
  fixed_by: 'u-colleague',
  fixed_by_email: 'colleague@adaro.net',
  notes: null
};

function fakes(list = [repair]) {
  return {
    repairs: { repairs: list, loading: false, error: null, saveRepair: vi.fn().mockResolvedValue({}), deleteRepair: vi.fn().mockResolvedValue() },
    files: { attachments: [], loading: false, error: null, upload: vi.fn(), remove: vi.fn(), linkFor: vi.fn() }
  };
}

describe('AssetRepairs', () => {
  it('lists each repair with its parts, who fixed it and the total', () => {
    const { repairs, files } = fakes();
    render(<AssetRepairs repairs={repairs} files={files} isAdmin={false} />);

    expect(screen.getByText(/1 repair · £75\.50 spent on parts/)).toBeInTheDocument();
    expect(screen.getByText('Replaced battery and keyboard')).toBeInTheDocument();
    expect(screen.getByText(/fixed by colleague/i)).toBeInTheDocument();
    expect(screen.getByText('Battery')).toBeInTheDocument();
    expect(screen.getByText('£45.50')).toBeInTheDocument();
  });

  it('logs a repair: fixed by me unless changed, parts itemised, total kept up to date', async () => {
    const user = userEvent.setup();
    const { repairs, files } = fakes([]);
    render(<AssetRepairs repairs={repairs} files={files} isAdmin={false} />);

    await user.click(screen.getByRole('button', { name: /log a repair/i }));
    expect(screen.getByLabelText(/fixed by/i)).toHaveValue('u-josh');

    await user.type(screen.getByLabelText(/what was wrong/i), 'Cracked screen');
    await user.type(screen.getByLabelText(/^part 1$/i), 'Screen');
    await user.type(screen.getByLabelText(/cost of part 1/i), '89.99');
    await user.click(screen.getByRole('button', { name: /add a part/i }));
    await user.type(screen.getByLabelText(/^part 2$/i), 'Bezel');
    await user.type(screen.getByLabelText(/cost of part 2/i), '10.01');
    expect(screen.getByText('£100.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^log repair$/i }));
    expect(repairs.saveRepair).toHaveBeenCalledTimes(1);
    const [values, existing] = repairs.saveRepair.mock.calls[0];
    expect(existing).toBeNull();
    expect(values).toMatchObject({ fault: 'Cracked screen', fixed_by: 'u-josh' });
    expect(values.parts).toEqual([{ part: 'Screen', cost: '89.99' }, { part: 'Bezel', cost: '10.01' }]);
  });

  it('will not save a part with no cost, and says which one', async () => {
    const user = userEvent.setup();
    const { repairs, files } = fakes([]);
    render(<AssetRepairs repairs={repairs} files={files} isAdmin={false} />);

    await user.click(screen.getByRole('button', { name: /log a repair/i }));
    await user.type(screen.getByLabelText(/what was wrong/i), 'Fan noise');
    await user.type(screen.getByLabelText(/^part 1$/i), 'Fan');
    await user.click(screen.getByRole('button', { name: /^log repair$/i }));

    expect(screen.getByText(/enter a cost/i)).toBeInTheDocument();
    expect(repairs.saveRepair).not.toHaveBeenCalled();
  });

  it('only shows Delete to an admin, and asks first', async () => {
    const user = userEvent.setup();
    const { repairs, files } = fakes();
    const { rerender } = render(<AssetRepairs repairs={repairs} files={files} isAdmin={false} />);
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();

    rerender(<AssetRepairs repairs={repairs} files={files} isAdmin />);
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByText(/delete this repair and its files/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(repairs.deleteRepair).toHaveBeenCalledWith(repair);
  });

  it('is read-only for retired kit', () => {
    const { repairs, files } = fakes();
    render(<AssetRepairs repairs={repairs} files={files} isAdmin readOnly />);
    expect(screen.queryByRole('button', { name: /log a repair/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.getByText('Replaced battery and keyboard')).toBeInTheDocument();
  });
});

describe('AttachmentList', () => {
  const mine = {
    id: 'f-1', file_name: 'invoice.pdf', content_type: 'application/pdf', size_bytes: 2048,
    uploaded_at: '2026-09-01T10:00:00Z', uploaded_by: 'u-josh', uploaded_by_email: 'josh.smitherman@adaro.net'
  };
  const theirs = { ...mine, id: 'f-2', file_name: 'photo.jpg', content_type: 'image/jpeg', uploaded_by: 'u-colleague' };

  it('lets you remove your own files, but not someone else\'s', () => {
    render(<AttachmentList attachments={[mine, theirs]} onUpload={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByRole('button', { name: /remove invoice\.pdf/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove photo\.jpg/i })).not.toBeInTheDocument();
  });

  it('lets an admin remove anyone\'s', () => {
    render(<AttachmentList attachments={[theirs]} onUpload={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} isAdmin />);
    expect(screen.getByRole('button', { name: /remove photo\.jpg/i })).toBeInTheDocument();
  });

  it('turns away a file that is not a photo or a PDF before uploading anything', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onUpload = vi.fn();
    const { container } = render(<AttachmentList attachments={[]} onUpload={onUpload} onRemove={vi.fn()} onOpen={vi.fn()} />);

    const input = container.querySelector('input[type="file"]');
    await user.upload(input, new File(['MZ'], 'setup.exe', { type: 'application/x-msdownload' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/not a photo or a PDF/);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('uploads a PDF', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue();
    const { container } = render(<AttachmentList attachments={[]} onUpload={onUpload} onRemove={vi.fn()} onOpen={vi.fn()} />);

    const pdf = new File(['%PDF-1.4'], 'invoice.pdf', { type: 'application/pdf' });
    await user.upload(container.querySelector('input[type="file"]'), pdf);
    expect(onUpload).toHaveBeenCalledWith(pdf);
  });
});

describe('AssetRepairs and the details window', () => {
  it('says when the form is open, so the window can hide its own buttons', async () => {
    const user = userEvent.setup();
    const onEditingChange = vi.fn();
    const { repairs, files } = fakes([]);
    render(<AssetRepairs repairs={repairs} files={files} isAdmin={false} onEditingChange={onEditingChange} />);

    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    await user.click(screen.getByRole('button', { name: /log a repair/i }));
    expect(onEditingChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
  });
});
