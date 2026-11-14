import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../ProfilePage';
import { api } from '../../../lib/api';
import { ToastProvider } from '../../../components/common/Toast';
import * as AuthContextModule from '../../../features/auth/AuthContext';
import { User } from '../../../types/api';

vi.mock('../../../lib/api', () => ({
  api: {
    patch: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

describe('ProfilePage', () => {
  const mockUser: User = {
    id: 'user-uuid-1',
    fullName: 'Diya Rao',
    email: 'rao@demo.projecthub.test',
    role: 'STUDENT',
    registrationNumber: 'RA211100301002',
    createdAt: '2026-01-15T00:00:00Z',
  };

  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: mockRefreshUser,
      setUser: vi.fn(),
    });
  });

  it('renders read-only email and role credentials', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ProfilePage />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('rao@demo.projecthub.test')).toBeInTheDocument();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
    expect(screen.getByText('RA211100301002')).toBeInTheDocument();
  });

  it('updates full name on valid input', async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValueOnce({
      user: { ...mockUser, fullName: 'Diya Rao Updated' },
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <ProfilePage />
        </ToastProvider>
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Diya Rao Updated');

    const saveBtn = screen.getByRole('button', { name: /save name/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/profile', {
        fullName: 'Diya Rao Updated',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  it('changes password on valid input and resets form', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <ToastProvider>
          <ProfilePage />
        </ToastProvider>
      </MemoryRouter>
    );

    const currentPass = screen.getByLabelText(/current password/i);
    const newPass = screen.getByLabelText(/new password/i);

    await user.type(currentPass, 'OldPassword123!');
    await user.type(newPass, 'NewStrongPassword456!');

    const updateBtn = screen.getByRole('button', { name: /update password/i });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/profile/password', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewStrongPassword456!',
      });
    });

    // Form should be reset
    expect(currentPass).toHaveValue('');
    expect(newPass).toHaveValue('');
  });
});
