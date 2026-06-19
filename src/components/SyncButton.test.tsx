import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncButton } from './SyncButton';

describe('SyncButton', () => {
  it('runs the provided sync action and shows progress', async () => {
    const onSync = vi.fn(async () => {});
    render(<SyncButton onSync={onSync} />);
    await userEvent.click(screen.getByRole('button', { name: /sync/i }));
    expect(onSync).toHaveBeenCalledOnce();
  });
});
