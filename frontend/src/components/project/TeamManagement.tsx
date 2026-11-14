import { useState } from 'react';
import { Users, UserPlus, Trash2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Member, DirectoryUser } from '../../types/api';
import { api, ApiError } from '../../lib/api';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface TeamManagementProps {
  projectId: string;
  members: Member[];
  canManageTeam: boolean;
  onRefreshProject: () => Promise<void>;
}

export function TeamManagement({
  projectId,
  members,
  canManageTeam,
  onRefreshProject,
}: TeamManagementProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<DirectoryUser | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchEmail.trim();
    if (!query) {
      setSearchError('Please enter an email address');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const res = await api.get<{ items: DirectoryUser[] }>(
        `/students/search?email=${encodeURIComponent(query)}`
      );
      if (res.items.length === 0) {
        setSearchError(`No eligible student found with email "${query}".`);
      } else {
        const student = res.items[0];
        // Check if already member
        const already = members.some((m) => m.studentId === student.id || m.email.toLowerCase() === student.email.toLowerCase());
        if (already) {
          setSearchError(`${student.fullName} is already a member of this team.`);
        } else {
          setSearchResult(student);
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
        setSearchError('Search rate limit reached. Please wait a minute and try again.');
      } else {
        setSearchError(err.message || 'Error searching for student');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!searchResult) return;
    setAdding(true);
    try {
      await api.post(`/projects/${projectId}/members`, { studentId: searchResult.id });
      await onRefreshProject();
      setIsAddOpen(false);
      setSearchEmail('');
      setSearchResult(null);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to add member to team');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/projects/${projectId}/members/${removeTarget.studentId}`);
      await onRefreshProject();
      setRemoveTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const isFull = members.length >= 3;

  return (
    <div className="bg-surface border border-border rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-serif text-base font-semibold text-text flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted" /> Project Team ({members.length}/3)
        </h4>
        {canManageTeam && !isFull && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAddOpen(true);
              setSearchEmail('');
              setSearchResult(null);
              setSearchError(null);
            }}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Add Member
          </Button>
        )}
      </div>

      {isFull && canManageTeam && (
        <p className="text-[11px] text-text-muted mb-3 italic">
          Team has reached the maximum cap of 3 students.
        </p>
      )}

      <ul className="divide-y divide-divider text-xs font-sans">
        {members.map((member) => (
          <li
            key={member.studentId}
            className="py-2.5 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-text truncate">
                  {member.fullName}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    member.membershipRole === 'LEAD'
                      ? 'bg-primary text-surface'
                      : 'bg-sidebar text-text-secondary border border-border'
                  }`}
                >
                  {member.membershipRole}
                </span>
              </div>
              <span className="text-text-muted truncate block">
                {member.email}
                {member.registrationNumber ? ` • ${member.registrationNumber}` : ''}
              </span>
            </div>

            {/* Remove control is available only for non-LEAD members when canManageTeam */}
            {canManageTeam && member.membershipRole !== 'LEAD' && (
              <button
                type="button"
                onClick={() => setRemoveTarget(member)}
                className="text-text-muted hover:text-error p-1 rounded hover:bg-error/10 transition-colors shrink-0"
                aria-label={`Remove ${member.fullName} from team`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Add Member Dialog */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full p-6 text-left">
            <h3 className="font-serif text-xl font-semibold text-text mb-2">
              Add Student to Team
            </h3>
            <p className="font-sans text-xs text-text-secondary mb-4 leading-relaxed">
              Search by exact student email address. Capstone teams are limited to a maximum of 3 students.
            </p>

            <form onSubmit={handleSearchStudent} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="student@demo.projecthub.test"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1 bg-surface text-text text-sm font-sans px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={searching}
                  icon={<Search className="w-4 h-4" />}
                >
                  Search
                </Button>
              </div>

              {searchError && (
                <div className="p-2.5 rounded bg-error/10 border border-error/20 text-xs text-error flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchResult && (
                <div className="p-3 rounded-lg bg-sidebar border border-border flex items-center justify-between gap-3 animate-fade-in">
                  <div className="min-w-0">
                    <span className="font-medium text-sm text-text block truncate">
                      {searchResult.fullName}
                    </span>
                    <span className="text-xs text-text-secondary block truncate">
                      {searchResult.email}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={adding}
                    onClick={handleAddMember}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Add
                  </Button>
                </div>
              )}

              <div className="pt-3 border-t border-divider flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                >
                  Close
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(removeTarget)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${removeTarget?.fullName} from the project team?`}
        confirmLabel="Remove Member"
        variant="danger"
        loading={removing}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
