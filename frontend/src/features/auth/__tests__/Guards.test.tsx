import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole, RedirectIfAuth } from '../Guards';
import * as AuthContextModule from '../AuthContext';
import { User } from '../../../types/api';

describe('Auth Guards', () => {
  const mockUser: User = {
    id: 'u1',
    fullName: 'Aarav Student',
    email: 'patel@demo.projecthub.test',
    role: 'STUDENT',
    registrationNumber: 'RA001',
    createdAt: '2026-01-01T00:00:00Z',
  };

  it('RequireAuth redirects unauthenticated users to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <div>Protected Content</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('RequireAuth allows authenticated users', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <div>Protected Content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('RequireRole redirects wrong role to /unauthorized', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser, // role is STUDENT
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/faculty-only']}>
        <Routes>
          <Route
            path="/faculty-only"
            element={
              <RequireRole role="FACULTY">
                <div>Faculty Secret Portal</div>
              </RequireRole>
            }
          />
          <Route path="/unauthorized" element={<div>403 Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Faculty Secret Portal')).not.toBeInTheDocument();
    expect(screen.getByText('403 Unauthorized Page')).toBeInTheDocument();
  });

  it('RedirectIfAuth redirects signed-in users away from /login to /overview', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuth>
                <div>Login Form</div>
              </RedirectIfAuth>
            }
          />
          <Route path="/overview" element={<div>Overview Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
    expect(screen.getByText('Overview Dashboard')).toBeInTheDocument();
  });
});
