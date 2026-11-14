import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateProjectPage from '../CreateProjectPage';
import { api } from '../../../lib/api';
import { ToastProvider } from '../../../components/common/Toast';

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
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

describe('CreateProjectPage Validation and Submission', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: 'faculty-1',
          fullName: 'Dr. Rajesh Sharma',
          email: 'sharma@demo.projecthub.test',
        },
      ],
    });
  });

  it('validates title length and required guide selection', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <CreateProjectPage />
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for faculty to load
    expect(await screen.findByLabelText(/project title/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /create capstone project/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/please select a faculty guide/i)).toBeInTheDocument();

    // Title too short (< 3 chars)
    const titleInput = screen.getByLabelText(/project title/i);
    await user.type(titleInput, 'AB');
    await user.click(submitBtn);

    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
  });

  it('submits valid form and calls api.post with correct payload', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'new-project-uuid-1234',
      title: 'Autonomous Drone Navigation',
      description: 'Testing quadrotor trajectory in ROS',
      status: 'DRAFT',
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <CreateProjectPage />
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for faculty to load
    const titleInput = await screen.findByLabelText(/project title/i);
    await user.type(titleInput, 'Autonomous Drone Navigation');

    const guideSelect = screen.getByLabelText(/faculty guide/i);
    await user.selectOptions(guideSelect, 'faculty-1');

    const descInput = screen.getByLabelText(/project scope & description/i);
    await user.type(descInput, 'Testing quadrotor trajectory in ROS');

    const submitBtn = screen.getByRole('button', { name: /create capstone project/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/projects', {
        title: 'Autonomous Drone Navigation',
        description: 'Testing quadrotor trajectory in ROS',
        guideId: 'faculty-1',
      });
    });
  });
});
