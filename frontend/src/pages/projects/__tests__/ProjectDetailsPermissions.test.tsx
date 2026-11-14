import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectDetailPage from '../ProjectDetailPage';
import { api } from '../../../lib/api';
import { ToastProvider } from '../../../components/common/Toast';
import { ProjectDetail, Permissions } from '../../../types/api';

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

function createFixture(overrides: Partial<ProjectDetail>): ProjectDetail {
  const basePermissions: Permissions = {
    canEdit: false,
    canChangeGuide: false,
    canManageTeam: false,
    canSubmit: false,
    canManageMilestones: false,
    canApprove: false,
    canReject: false,
    canRequestChanges: false,
    canComplete: false,
    canGiveFeedback: false,
    canArchive: false,
    canRestore: false,
    canDelete: false,
    completionBlockedReason: null,
  };

  return {
    id: 'proj-1234',
    title: 'Distributed Tracing Framework',
    description: 'Detailed description of the framework',
    status: 'DRAFT',
    guide: { id: 'guide-1', fullName: 'Dr. Sharma' },
    createdBy: { id: 'student-1', fullName: 'Alice Lead' },
    memberCount: 1,
    milestoneTotal: 0,
    milestoneCompleted: 0,
    progress: 0,
    submissionDate: null,
    completedAt: null,
    archivedAt: null,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    members: [
      {
        studentId: 'student-1',
        fullName: 'Alice Lead',
        email: 'alice@demo.projecthub.test',
        registrationNumber: 'RA001',
        membershipRole: 'LEAD',
        joinedAt: '2026-02-01T00:00:00Z',
      },
    ],
    permissions: {
      ...basePermissions,
      ...(overrides.permissions || {}),
    },
    ...overrides,
  };
}

describe('ProjectDetailPage Permission-Driven Action Rendering', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/projects/proj-1234']}>
        <ToastProvider>
          <Routes>
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('creator-in-DRAFT fixture renders edit, submit, archive, and team management', async () => {
    const fixture = createFixture({
      status: 'DRAFT',
      permissions: {
        canEdit: true,
        canChangeGuide: true,
        canManageTeam: true,
        canSubmit: true,
        canManageMilestones: true,
        canApprove: false,
        canReject: false,
        canRequestChanges: false,
        canComplete: false,
        canGiveFeedback: false,
        canArchive: true,
        canRestore: false,
        canDelete: false,
        completionBlockedReason: null,
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      if (url === '/faculty') return { items: [] };
      return {};
    });

    renderPage();

    expect(await screen.findByRole('button', { name: /edit scope/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();

    // Faculty-only actions should NOT be rendered
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revisions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete project/i })).not.toBeInTheDocument();
  });

  it('guide-in-PENDING_REVIEW fixture renders approve, request-changes, reject', async () => {
    const fixture = createFixture({
      status: 'PENDING_REVIEW',
      submissionDate: '2026-02-05T00:00:00Z',
      permissions: {
        canEdit: false,
        canChangeGuide: false,
        canManageTeam: false,
        canSubmit: false,
        canManageMilestones: false,
        canApprove: true,
        canReject: true,
        canRequestChanges: true,
        canComplete: false,
        canGiveFeedback: true,
        canArchive: false,
        canRestore: false,
        canDelete: false,
        completionBlockedReason: null,
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });

    renderPage();

    expect(await screen.findByRole('button', { name: /approve proposal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request revisions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject proposal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post comment/i })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /edit scope/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
  });

  it('guide-in-IN_PROGRESS fixture: shows NO_MILESTONES reason when completion blocked', async () => {
    const fixture = createFixture({
      status: 'IN_PROGRESS',
      permissions: {
        canEdit: false,
        canChangeGuide: false,
        canManageTeam: false,
        canSubmit: false,
        canManageMilestones: false,
        canApprove: false,
        canReject: false,
        canRequestChanges: false,
        canComplete: true,
        canGiveFeedback: true,
        canArchive: false,
        canRestore: false,
        canDelete: false,
        completionBlockedReason: 'NO_MILESTONES',
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });

    renderPage();

    const completeBtn = await screen.findByRole('button', { name: /complete project/i });
    expect(completeBtn).toBeDisabled();
    expect(screen.getByText('Add at least one milestone first')).toBeInTheDocument();
  });

  it('guide-in-IN_PROGRESS fixture: shows INCOMPLETE_MILESTONES reason when completion blocked', async () => {
    const fixture = createFixture({
      status: 'IN_PROGRESS',
      milestoneTotal: 2,
      milestoneCompleted: 1,
      permissions: {
        canEdit: false,
        canChangeGuide: false,
        canManageTeam: false,
        canSubmit: false,
        canManageMilestones: false,
        canApprove: false,
        canReject: false,
        canRequestChanges: false,
        canComplete: true,
        canGiveFeedback: true,
        canArchive: false,
        canRestore: false,
        canDelete: false,
        completionBlockedReason: 'INCOMPLETE_MILESTONES',
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });

    renderPage();

    const completeBtn = await screen.findByRole('button', { name: /complete project/i });
    expect(completeBtn).toBeDisabled();
    expect(screen.getByText('All milestones must be completed first')).toBeInTheDocument();
  });

  it('guide-in-IN_PROGRESS fixture: enables complete button when all milestones completed', async () => {
    const fixture = createFixture({
      status: 'IN_PROGRESS',
      milestoneTotal: 2,
      milestoneCompleted: 2,
      permissions: {
        canEdit: false,
        canChangeGuide: false,
        canManageTeam: false,
        canSubmit: false,
        canManageMilestones: false,
        canApprove: false,
        canReject: false,
        canRequestChanges: false,
        canComplete: true,
        canGiveFeedback: true,
        canArchive: false,
        canRestore: false,
        canDelete: false,
        completionBlockedReason: null,
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });

    renderPage();

    const completeBtn = await screen.findByRole('button', { name: /complete project/i });
    expect(completeBtn).toBeEnabled();
  });

  it('archived fixture renders restore and delete buttons', async () => {
    const fixture = createFixture({
      status: 'COMPLETED',
      archivedAt: '2026-03-01T00:00:00Z',
      permissions: {
        canEdit: false,
        canChangeGuide: false,
        canManageTeam: false,
        canSubmit: false,
        canManageMilestones: false,
        canApprove: false,
        canReject: false,
        canRequestChanges: false,
        canComplete: false,
        canGiveFeedback: false,
        canArchive: false,
        canRestore: true,
        canDelete: true,
        completionBlockedReason: null,
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });

    renderPage();

    expect(await screen.findByRole('button', { name: /restore project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete project/i })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /edit scope/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
  });

  it('read-only member fixture renders NO action buttons', async () => {
    const fixture = createFixture({
      status: 'PENDING_REVIEW',
      permissions: {
        canEdit: false,
        canChangeGuide: false,
        canManageTeam: false,
        canSubmit: false,
        canManageMilestones: false,
        canApprove: false,
        canReject: false,
        canRequestChanges: false,
        canComplete: false,
        canGiveFeedback: false,
        canArchive: false,
        canRestore: false,
        canDelete: false,
        completionBlockedReason: null,
      },
    });
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/projects/proj-1234') return fixture;
      if (url.includes('/milestones')) return { items: [] };
      if (url.includes('/feedback')) return { items: [] };
      if (url.includes('/history')) return { items: [] };
      return {};
    });

    renderPage();

    await screen.findByRole('heading', { name: 'Distributed Tracing Framework', level: 1 });

    expect(screen.queryByRole('button', { name: /edit scope/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revisions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
