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
    <div className="card-hard-static bg-white p-5 sm:p-6 mb-6">
      <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-teal text-white">
        PROJECT MILESTONES
      </span>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-xl text-ink">Milestones</h3>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
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
        <div className="mb-4 p-3 rounded-lg bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1B1410] flex items-start gap-2.5 text-xs text-ink font-mono font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-ink mt-0.5" />
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
        <ul className="divide-y-2 divide-ink">
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
                  className={`mt-0.5 w-6 h-6 rounded-md border-2 border-ink shadow-[2px_2px_0_0_#1B1410] flex items-center justify-center shrink-0 transition-all ${
                    m.isCompleted
                      ? 'bg-lime text-ink'
                      : 'bg-white hover:bg-paper-dark'
                  } ${!canManage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  aria-label={m.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                >
                  {m.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                </button>

                <div className="min-w-0">
                  <span
                    className={`font-sans text-sm font-bold block text-ink ${
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
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted mt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due {formatDate(m.dueDate)}</span>
                      {m.completedAt && (
                        <span> &bull; Completed {formatDate(m.completedAt)}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(m)}
                    className="p-1.5 text-ink hover:bg-paper-dark rounded-md border border-transparent hover:border-ink transition-colors"
                    aria-label={`Edit milestone ${m.title}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(m.id)}
                    className="p-1.5 text-error hover:bg-error/10 rounded-md border border-transparent hover:border-error transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 animate-fade-in"
        >
          <div className="card-hard-static bg-white border-2 border-ink rounded-[12px] shadow-[7px_7px_0_0_#1B1410] max-w-md w-full p-6 text-left">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-teal text-white">
              MILESTONE EDITOR
            </span>
            <h3 className="font-display font-black text-2xl text-ink mb-4">
              {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 border-2 border-error text-xs font-mono font-bold text-error">
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-ink">
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
