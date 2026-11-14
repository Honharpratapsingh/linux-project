import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBadge } from '../StatusBadge';
import { ProgressBar } from '../ProgressBar';
import { ConfirmDialog } from '../ConfirmDialog';
import { Pagination } from '../Pagination';
import { ProjectStatus } from '../../../types/api';

describe('Shared UI Components', () => {
  describe('StatusBadge', () => {
    const statuses: { status: ProjectStatus; expectedClass: string }[] = [
      { status: 'COMPLETED', expectedClass: 'bg-sage' },
      { status: 'PENDING_REVIEW', expectedClass: 'bg-lavender' },
      { status: 'IN_PROGRESS', expectedClass: 'bg-blue' },
      { status: 'CHANGES_REQUESTED', expectedClass: 'bg-peach' },
      { status: 'REJECTED', expectedClass: 'bg-error/20' },
      { status: 'DRAFT', expectedClass: 'bg-divider' },
    ];

    statuses.forEach(({ status, expectedClass }) => {
      it(`renders text and class for status ${status}`, () => {
        render(<StatusBadge status={status} />);
        const badge = screen.getByTestId(`badge-${status}`);
        expect(badge).toHaveTextContent(status);
        expect(badge.className).toContain(expectedClass);
      });
    });

    it('renders archived tag when isArchived is true', () => {
      render(<StatusBadge status="COMPLETED" isArchived />);
      expect(screen.getByTestId('badge-COMPLETED')).toBeInTheDocument();
      expect(screen.getByTestId('badge-archived')).toHaveTextContent('Archived');
    });
  });

  describe('ProgressBar', () => {
    it('renders correct progress value and accessibility attributes', () => {
      render(<ProgressBar progress={67} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '67');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('clamps negative and excessive values safely', () => {
      const { rerender } = render(<ProgressBar progress={-10} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

      rerender(<ProgressBar progress={150} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('ConfirmDialog', () => {
    it('closes when Escape key is pressed', () => {
      const onCancel = vi.fn();
      render(
        <ConfirmDialog
          isOpen
          title="Delete Project"
          description="Are you sure?"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('requires message when requireMessage is true', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen
          title="Reject Project"
          description="Give reason for rejection"
          showMessageInput
          requireMessage
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toBeDisabled();

      const textarea = screen.getByRole('textbox', { name: /message/i });
      await user.type(textarea, 'Scope is out of bounds');

      expect(confirmButton).toBeEnabled();
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith('Scope is out of bounds');
    });
  });

  describe('Pagination', () => {
    it('renders pagination details and triggers page change', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          page={2}
          pageSize={10}
          total={35}
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByText(/Page/i)).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();

      const prevBtn = screen.getByRole('button', { name: /prev/i });
      const nextBtn = screen.getByRole('button', { name: /next/i });

      expect(prevBtn).toBeEnabled();
      expect(nextBtn).toBeEnabled();

      await user.click(prevBtn);
      expect(onPageChange).toHaveBeenCalledWith(1);

      await user.click(nextBtn);
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('disables Prev on first page and Next on last page', () => {
      const { rerender } = render(
        <Pagination page={1} pageSize={10} total={15} onPageChange={vi.fn()} />
      );
      expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

      rerender(<Pagination page={2} pageSize={10} total={15} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /prev/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });
});
