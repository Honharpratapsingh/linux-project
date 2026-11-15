import { useState } from 'react';
import { Check, Plus, Trash2, Edit2, Calendar, AlertCircle } from 'lucide-react';
import { Milestone, ProjectStatus } from '../../types/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatDate } from '../../lib/dates';

interface MilestoneListProps {
  milestones: Milestone[];
  canManage: boolean;
  status?: ProjectStatus;
  isArchived?: boolean;
  onToggleComplete: (milestone: Milestone) => Promise<void>;
  onCreateMilestone: (data: { title: string; description?: string; dueDate?: string }) => Promise<void>;
  onUpdateMilestone: (id: string, data: { title?: string; description?: string; dueDate?: string }) => Promise<void>;
  onDeleteMilestone: (id: string) => Promise<void>;
}

export function MilestoneList({
  milestones,
  canManage,
  status,
  isArchived,
  onToggleComplete,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
}: MilestoneListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getLockedMessage = () => {
    if (isArchived) {
      return 'Milestones are locked because the project is archived.';
    }
    if (status === 'PENDING_REVIEW') {
      return 'Milestones are locked while the project is pending review.';
    }
    if (status === 'COMPLETED') {
      return 'Milestones are locked because the project is completed.';
    }
    return 'Only team members can edit milestones.';
  };

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (m: Milestone) => {
    setEditingMilestone(m);
    setTitle(m.title);
    setDescription(m.description || '');
    setDueDate(m.dueDate || '');
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateMilestone({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      await onUpdateMilestone(editingMilestone.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      setEditingMilestone(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update milestone');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-serif text-lg font-medium text-text">Milestones</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Deliverables and checkpoints ({milestones.filter((m) => m.isCompleted).length}/{milestones.length} completed)
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Milestone
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="mb-4 p-2.5 rounded-md bg-sidebar border border-border/60 flex items-start gap-2 text-xs text-text-muted">
          <AlertCircle className="w-4 h-4 shrink-0 text-text-muted mt-0.5" />
          <span>
            {getLockedMessage()}
          </span>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="text-sm font-sans text-text-muted py-6 text-center">
          No milestones defined yet. {canManage ? 'Add milestones to track project progress.' : ''}
        </p>
      ) : (
        <ul className="divide-y divide-divider">
          {milestones.map((m) => (
            <li
              key={m.id}
              className={`py-3.5 flex items-start justify-between gap-3 transition-colors ${
                m.isCompleted ? 'opacity-85' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => onToggleComplete(m)}
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    m.isCompleted
                      ? 'bg-primary border-primary text-surface'
                      : 'border-border bg-surface hover:border-primary'
                  } ${!canManage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  aria-label={m.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                >
                  {m.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="min-w-0">
                  <span
                    className={`font-sans text-sm font-medium block text-text ${
                      m.isCompleted ? 'line-through text-text-secondary' : ''
                    }`}
                  >
                    {m.title}
                  </span>
                  {m.description && (
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                  {m.dueDate && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted mt-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>Due {formatDate(m.dueDate)}</span>
                      {m.completedAt && (
                        <span> &bull; Completed {formatDate(m.completedAt)}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(m)}
                    className="p-1.5 text-text-muted hover:text-text rounded hover:bg-sidebar transition-colors"
                    aria-label={`Edit milestone ${m.title}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(m.id)}
                    className="p-1.5 text-text-muted hover:text-error rounded hover:bg-error/10 transition-colors"
                    aria-label={`Delete milestone ${m.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit Milestone Modal */}
      {(isCreateOpen || editingMilestone) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full p-6 text-left">
            <h3 className="font-serif text-xl font-semibold text-text mb-4">
              {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </h3>

            {formError && (
              <div className="mb-4 p-2.5 rounded bg-error/10 text-xs text-error">
                {formError}
              </div>
            )}

            <form
              onSubmit={editingMilestone ? handleEditSubmit : handleCreateSubmit}
              className="space-y-4"
            >
              <Input
                label="Milestone Title"
                placeholder="e.g. System Architecture Design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label="Due Date (Optional)"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              <Textarea
                label="Description (Optional)"
                rows={3}
                placeholder="What deliverables will be verified for this milestone?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingMilestone(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" loading={submitting}>
                  {editingMilestone ? 'Save Changes' : 'Add Milestone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Milestone"
        description="Are you sure you want to remove this milestone? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (deleteTargetId) {
            await onDeleteMilestone(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
