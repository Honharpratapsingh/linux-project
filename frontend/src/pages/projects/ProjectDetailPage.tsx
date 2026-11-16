import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Archive,
  RotateCcw,
  Trash2,
  Edit3,
  UserCheck,
  ArrowLeft,
  Award,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import {
  ProjectDetail,
  Milestone,
  Feedback,
  HistoryEntry,
  DirectoryUser,
} from '../../types/api';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { useToast } from '../../components/common/Toast';
import { formatDateTime, formatDate } from '../../lib/dates';
import { MilestoneList } from '../../components/project/MilestoneList';
import { FeedbackThread } from '../../components/project/FeedbackThread';
import { ProjectHistory } from '../../components/project/ProjectHistory';
import { TeamManagement } from '../../components/project/TeamManagement';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Project Title/Description modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editGuideId, setEditGuideId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Faculty list for guide change
  const [facultyList, setFacultyList] = useState<DirectoryUser[]>([]);

  // Action dialog states
  const [activeDialog, setActiveDialog] = useState<
    'SUBMIT' | 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | 'COMPLETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE' | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!id) return;
    try {
      const [projRes, mileRes, fbRes, histRes] = await Promise.all([
        api.get<ProjectDetail>(`/projects/${id}`),
        api.get<{ items: Milestone[] }>(`/projects/${id}/milestones`),
        api.get<{ items: Feedback[] }>(`/projects/${id}/feedback`),
        api.get<{ items: HistoryEntry[] }>(`/projects/${id}/history`),
      ]);
      setProject(projRes);
      setMilestones(mileRes.items);
      setFeedback(fbRes.items);
      setHistory(histRes.items);
      setErrorStatus(null);
      setErrorMessage(null);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load project details');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Handle Edit Scope Modal opening
  const openEditModal = async () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDesc(project.description || '');
    setEditGuideId(project.guide.id);
    setEditError(null);

    // Fetch faculty list if allowed to change guide
    if (project.permissions.canChangeGuide) {
      try {
        const res = await api.get<{ items: DirectoryUser[] }>('/faculty');
        setFacultyList(res.items);
      } catch (err) {
        console.error('Failed to load faculty options', err);
      }
    }
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const payload: Record<string, string | undefined> = {
        title: editTitle.trim(),
        description: editDesc.trim(),
      };
      if (project.permissions.canChangeGuide && editGuideId !== project.guide.id) {
        payload.guideId = editGuideId;
      }
      await api.patch(`/projects/${id}`, payload);
      setIsEditOpen(false);
      await fetchProjectData();
      success('Project scope updated');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update project details');
    } finally {
      setSavingEdit(false);
    }
  };

  // Milestone action handlers
  const handleToggleComplete = async (milestone: Milestone) => {
    if (!id) return;
    try {
      await api.patch(`/projects/${id}/milestones/${milestone.id}`, {
        isCompleted: !milestone.isCompleted,
      });
      await fetchProjectData();
    } catch (err: any) {
      toastError(err.message || 'Failed to toggle milestone');
    }
  };

  const handleCreateMilestone = async (data: { title: string; description?: string; dueDate?: string }) => {
    if (!id) return;
    await api.post(`/projects/${id}/milestones`, data);
    await fetchProjectData();
    success('Milestone created');
  };

  const handleUpdateMilestone = async (
    milestoneId: string,
    data: { title?: string; description?: string; dueDate?: string }
  ) => {
    if (!id) return;
    await api.patch(`/projects/${id}/milestones/${milestoneId}`, data);
    await fetchProjectData();
    success('Milestone updated');
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!id) return;
    try {
      await api.delete(`/projects/${id}/milestones/${milestoneId}`);
      await fetchProjectData();
      success('Milestone removed');
    } catch (err: any) {
      toastError(err.message || 'Failed to delete milestone');
    }
  };

  // Workflow action execution
  const handleWorkflowAction = async (message?: string) => {
    if (!id || !activeDialog) return;
    setActionLoading(true);
    try {
      switch (activeDialog) {
        case 'SUBMIT':
          await api.post(`/projects/${id}/submit`);
          success('Project submitted for review');
          break;
        case 'APPROVE':
          await api.post(`/projects/${id}/approve`, { message: message || undefined });
          success('Project proposal approved');
          break;
        case 'REQUEST_CHANGES':
          await api.post(`/projects/${id}/request-changes`, { message });
          success('Revisions requested from team');
          break;
        case 'REJECT':
          await api.post(`/projects/${id}/reject`, { message });
          success('Project proposal rejected');
          break;
        case 'COMPLETE':
          await api.post(`/projects/${id}/complete`, { message: message || undefined });
          success('Capstone project successfully completed!');
          break;
        case 'ARCHIVE':
          await api.patch(`/projects/${id}/archive`);
          success('Project archived');
          break;
        case 'RESTORE':
          await api.patch(`/projects/${id}/restore`);
          success('Project restored');
          break;
        case 'DELETE':
          await api.delete(`/projects/${id}`);
          success('Project deleted permanently');
          navigate('/projects');
          return;
      }
      setActiveDialog(null);
      await fetchProjectData();
    } catch (err: any) {
      toastError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Feedback handler
  const handlePostFeedback = async (message: string) => {
    if (!id) return;
    await api.post(`/projects/${id}/feedback`, { message });
    await fetchProjectData();
    success('Feedback comment posted');
  };

  if (loading) {
    return <LoadingState message="Loading project details..." />;
  }

  if (errorStatus === 404) {
    return (
      <div className="text-center py-12">
        <ErrorState
          title="Project Not Found"
          message="The requested capstone project does not exist or has been deleted."
        />
        <Button
          variant="outline"
          size="md"
          onClick={() => navigate('/projects')}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="mt-4"
        >
          Back to Projects Directory
        </Button>
      </div>
    );
  }

  if (errorMessage || !project) {
    return (
      <ErrorState
        title="Could not load project"
        message={errorMessage || 'An error occurred'}
        onRetry={fetchProjectData}
      />
    );
  }

  const { permissions } = project;

  // Compute completion blocked message if present
  let completionBlockedMsg = '';
  if (permissions.completionBlockedReason === 'NO_MILESTONES') {
    completionBlockedMsg = 'Add at least one milestone first';
  } else if (permissions.completionBlockedReason === 'INCOMPLETE_MILESTONES') {
    completionBlockedMsg = 'All milestones must be completed first';
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs and Top Actions */}
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.title },
        ]}
      />

      {/* Main Container: 2 columns on desktop, 1 on small screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* LEFT / MAIN COLUMN (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Scope Card */}
          <div className="card-hard-static bg-white p-6 sm:p-7 relative">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-marigold text-ink">
              PROJECT SCOPE
            </span>

            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-ink leading-tight tracking-tight">
                {project.title}
              </h1>
              {permissions.canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEditModal}
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  className="shrink-0"
                >
                  Edit Scope
                </Button>
              )}
            </div>

            <p className="font-sans text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-wrap mb-5">
              {project.description || 'No description provided.'}
            </p>

            <div className="pt-4 border-t-2 border-ink">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
                <span className="font-bold uppercase tracking-wider">Milestone Progress</span>
                <span className="font-bold text-ink tabular-nums">
                  {project.milestoneCompleted} of {project.milestoneTotal} completed
                </span>
              </div>
              <ProgressBar progress={project.progress} />
            </div>
          </div>

          {/* Milestones Section */}
          <MilestoneList
            milestones={milestones}
            canManage={permissions.canManageMilestones}
            status={project.status}
            isArchived={Boolean(project.archivedAt)}
            onToggleComplete={handleToggleComplete}
            onCreateMilestone={handleCreateMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />

          {/* Feedback Thread */}
          <FeedbackThread
            feedback={feedback}
            canGiveFeedback={permissions.canGiveFeedback}
            onSubmitFeedback={handlePostFeedback}
          />

          {/* Status History */}
          <ProjectHistory history={history} />
        </div>

        {/* RIGHT / SIDE COLUMN (1 col) */}
        <div className="space-y-6">
          {/* Status and Action Buttons Card */}
          <div className="card-hard-static bg-white p-5">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-lime text-ink">
              WORKFLOW ACTIONS
            </span>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                Workflow Status
              </span>
              <StatusBadge
                status={project.status}
                isArchived={!!project.archivedAt}
              />
            </div>

            {/* Permission-Driven Actions */}
            <div className="space-y-2.5 pt-3 border-t-2 border-ink">
              {/* canSubmit: Submit / Resubmit */}
              {permissions.canSubmit && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full uppercase font-bold tracking-wider text-xs"
                  onClick={() => setActiveDialog('SUBMIT')}
                  icon={<Send className="w-4 h-4" />}
                >
                  {project.status === 'REJECTED' ? 'Resubmit Project' : 'Submit for Review'}
                </Button>
              )}

              {/* canApprove: Approve */}
              {permissions.canApprove && (
                <Button
                  variant="approve"
                  size="md"
                  className="w-full uppercase font-bold tracking-wider text-xs"
                  onClick={() => setActiveDialog('APPROVE')}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve Proposal
                </Button>
              )}

              {/* canRequestChanges: Request Changes */}
              {permissions.canRequestChanges && (
                <Button
                  variant="outline"
                  size="md"
                  className="w-full border-marigold bg-marigold-tint/40 text-ink hover:bg-marigold-tint uppercase font-bold tracking-wider text-xs"
                  onClick={() => setActiveDialog('REQUEST_CHANGES')}
                  icon={<AlertTriangle className="w-4 h-4 text-ink" />}
                >
                  Request Revisions
                </Button>
              )}

              {/* canReject: Reject */}
              {permissions.canReject && (
                <Button
                  variant="danger"
                  size="md"
                  className="w-full uppercase font-bold tracking-wider text-xs"
                  onClick={() => setActiveDialog('REJECT')}
                  icon={<XCircle className="w-4 h-4 text-error" />}
                >
                  Reject Proposal
                </Button>
              )}

              {/* canComplete: Complete */}
              {permissions.canComplete && (
                <div className="space-y-1.5">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full uppercase font-bold tracking-wider text-xs"
                    onClick={() => setActiveDialog('COMPLETE')}
                    disabled={Boolean(permissions.completionBlockedReason)}
                    icon={<Award className="w-4 h-4" />}
                  >
                    Complete Project
                  </Button>
                  {completionBlockedMsg && (
                    <p className="text-xs text-error font-mono font-bold text-center">
                      {completionBlockedMsg}
                    </p>
                  )}
                </div>
              )}

              {/* canArchive: Archive */}
              {permissions.canArchive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveDialog('ARCHIVE')}
                  icon={<Archive className="w-3.5 h-3.5" />}
                >
                  Archive Project
                </Button>
              )}

              {/* canRestore: Restore */}
              {permissions.canRestore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveDialog('RESTORE')}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Restore Project
                </Button>
              )}

              {/* canDelete: Delete */}
              {permissions.canDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveDialog('DELETE')}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Project
                </Button>
              )}
            </div>
          </div>

          {/* Assigned Faculty Guide */}
          <div className="card-hard-static bg-white p-5 text-xs font-sans">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-paper-dark text-ink">
              FACULTY GUIDE
            </span>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-text-muted stroke-[2.5]" /> Faculty Guide
              </span>
              {permissions.canChangeGuide && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="text-primary font-mono font-bold hover:underline text-xs uppercase"
                >
                  Change
                </button>
              )}
            </div>
            <p className="font-bold text-sm text-ink">{project.guide.fullName}</p>
            {project.guide.email && (
              <p className="text-text-secondary font-mono mt-0.5">{project.guide.email}</p>
            )}
          </div>

          {/* Team Members Section */}
          <TeamManagement
            projectId={project.id}
            members={project.members}
            canManageTeam={permissions.canManageTeam}
            onRefreshProject={fetchProjectData}
          />

          {/* Project Details / Dates */}
          <div className="card-hard-static bg-white p-5 text-xs font-sans space-y-2.5">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-1 bg-paper-dark text-ink">
              METADATA
            </span>
            <span className="font-display text-sm font-bold text-ink block mb-1">
              Metadata
            </span>
            <div className="flex items-center justify-between">
              <span className="text-text-muted font-mono text-[11px]">Lead / Creator</span>
              <span className="font-bold text-ink">{project.createdBy.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted font-mono text-[11px]">Created</span>
              <span className="text-ink font-mono">{formatDate(project.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted font-mono text-[11px]">Last Updated</span>
              <span className="text-ink font-mono">{formatDateTime(project.updatedAt)}</span>
            </div>
            {project.submissionDate && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-mono text-[11px]">Submitted</span>
                <span className="text-ink font-mono">{formatDateTime(project.submissionDate)}</span>
              </div>
            )}
            {project.completedAt && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-mono text-[11px]">Completed</span>
                <span className="text-primary font-mono font-bold">{formatDate(project.completedAt)}</span>
              </div>
            )}
            {project.archivedAt && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-mono text-[11px]">Archived</span>
                <span className="text-text-muted font-mono">{formatDateTime(project.archivedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Scope Modal */}
      {isEditOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 animate-fade-in"
        >
          <div className="card-hard-static bg-white border-2 border-ink rounded-[12px] shadow-[7px_7px_0_0_#1B1410] max-w-lg w-full p-6 text-left">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-marigold text-ink">
              SCOPE EDITOR
            </span>
            <h3 className="font-display font-black text-2xl text-ink mb-4">
              Edit Project Details
            </h3>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 border-2 border-error text-xs font-mono font-bold text-error">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Input
                label="Project Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />

              {permissions.canChangeGuide && (
                <Select
                  label="Faculty Guide"
                  value={editGuideId}
                  onChange={(e) => setEditGuideId(e.target.value)}
                  options={facultyList.map((f) => ({
                    value: f.id,
                    label: `${f.fullName} (${f.email})`,
                  }))}
                />
              )}

              <Textarea
                label="Project Scope & Description"
                rows={5}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-ink">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditOpen(false)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" loading={savingEdit}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'SUBMIT'}
        title={project.status === 'REJECTED' ? 'Resubmit Project' : 'Submit Project for Review'}
        description="Submitting your project proposal sends it directly to your assigned faculty guide for evaluation. Milestones will be locked while under review."
        confirmLabel="Submit Project"
        loading={actionLoading}
        onConfirm={() => handleWorkflowAction()}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Approve Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'APPROVE'}
        title="Approve Project Proposal"
        description="Approving this proposal advances the project to In Progress, allowing students to update milestones."
        confirmLabel="Approve"
        loading={actionLoading}
        showMessageInput
        messageLabel="Approval Note (Optional)"
        messagePlaceholder="Add comments or instructions for the team..."
        onConfirm={(msg) => handleWorkflowAction(msg)}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Request Changes Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'REQUEST_CHANGES'}
        title="Request Project Revisions"
        description="Please provide detailed feedback explaining what changes the student team needs to make before approval."
        confirmLabel="Request Changes"
        variant="primary"
        loading={actionLoading}
        showMessageInput
        requireMessage
        messageLabel="Revision Requirements"
        messagePlaceholder="Explain what needs revision (methodology, scope, etc.)..."
        onConfirm={(msg) => handleWorkflowAction(msg)}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'REJECT'}
        title="Reject Project Proposal"
        description="Rejecting the proposal marks it as REJECTED. You must provide a clear reason for the rejection."
        confirmLabel="Reject Project"
        variant="danger"
        loading={actionLoading}
        showMessageInput
        requireMessage
        messageLabel="Reason for Rejection"
        messagePlaceholder="Explain why this capstone proposal cannot proceed..."
        onConfirm={(msg) => handleWorkflowAction(msg)}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Complete Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'COMPLETE'}
        title="Complete Capstone Project"
        description="Final sign-off marking this capstone project as COMPLETED. This status is terminal and certifies that all requirements have been satisfied."
        confirmLabel="Mark Completed"
        loading={actionLoading}
        showMessageInput
        messageLabel="Completion Note (Optional)"
        messagePlaceholder="e.g. Final defense successfully verified..."
        onConfirm={(msg) => handleWorkflowAction(msg)}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Archive Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'ARCHIVE'}
        title="Archive Project"
        description="Archiving this project removes it from active views and locks all edits. It can be restored later."
        confirmLabel="Archive"
        loading={actionLoading}
        onConfirm={() => handleWorkflowAction()}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Restore Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'RESTORE'}
        title="Restore Project"
        description="Restoring this project returns it to active listings and re-enables allowed workflow actions."
        confirmLabel="Restore"
        loading={actionLoading}
        onConfirm={() => handleWorkflowAction()}
        onCancel={() => setActiveDialog(null)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={activeDialog === 'DELETE'}
        title="Permanently Delete Project"
        description="This action soft-deletes the project from ProjectHub. The project will no longer be visible or accessible to any student or faculty member. This action is permanent from the UI."
        confirmLabel="Delete Permanently"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => handleWorkflowAction()}
        onCancel={() => setActiveDialog(null)}
      />
    </div>
  );
}
