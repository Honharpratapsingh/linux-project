import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders the ProjectHub heading and subtitle without SRM branding', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'ProjectHub', level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText('Student Project Tracking and Management System')
    ).toBeInTheDocument();
    expect(screen.queryByText(/SRM/i)).not.toBeInTheDocument();
  });

  it('renders the primary action button', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('renders all six status badges with corresponding color tokens', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    const expectedBadges = [
      'COMPLETED',
      'PENDING_REVIEW',
      'IN_PROGRESS',
      'CHANGES_REQUESTED',
      'REJECTED',
      'DRAFT',
    ];
    for (const badge of expectedBadges) {
      expect(screen.getByTestId(`badge-${badge}`)).toHaveTextContent(badge);
    }
  });
});
