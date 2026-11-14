import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import RegisterPage from '../RegisterPage';
import * as AuthContextModule from '../../../features/auth/AuthContext';
import { ApiError } from '../../../lib/api';

describe('Auth Forms Validation and Submission', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });
  });

  describe('LoginPage', () => {
    it('validates required fields and email format', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);

      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'notanemail');
      await user.click(submitBtn);

      expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    });

    it('submits valid credentials and handles API authentication failure', async () => {
      const user = userEvent.setup();
      const mockLogin = vi
        .fn()
        .mockRejectedValueOnce(
          new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password')
        );

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: null,
        loading: false,
        login: mockLogin,
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/email address/i), 'user@demo.projecthub.test');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@demo.projecthub.test',
          password: 'wrongpassword',
        });
      });

      expect(
        await screen.findByText(/invalid email or password/i)
      ).toBeInTheDocument();
    });
  });

  describe('RegisterPage', () => {
    it('validates fullName, email, and password length', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      const submitBtn = screen.getByRole('button', { name: /create account/i });
      await user.click(submitBtn);

      expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument();
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();

      // Type password < 8 chars
      await user.type(screen.getByLabelText(/^password/i), 'short');
      await user.click(submitBtn);
      expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    });

    it('submits valid registration and displays API error on duplicate email', async () => {
      const user = userEvent.setup();
      const mockRegister = vi
        .fn()
        .mockRejectedValueOnce(
          new ApiError(409, 'EMAIL_TAKEN', 'Email already taken')
        );

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/full name/i), 'Diya Rao');
      await user.type(screen.getByLabelText(/email address/i), 'rao@demo.projecthub.test');
      await user.type(screen.getByLabelText(/^password/i), 'ValidPass123!');
      await user.type(screen.getByLabelText(/registration number/i), 'RA211100301002');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: 'Diya Rao',
          email: 'rao@demo.projecthub.test',
          password: 'ValidPass123!',
          registrationNumber: 'RA211100301002',
        });
      });

      expect(
        await screen.findByText(/already exists/i)
      ).toBeInTheDocument();
    });
  });
});
