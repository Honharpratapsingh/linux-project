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
        setSearchError('Error searching for student. Please verify the email and try again.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!searchResult) return;
    setAdding(true);
    try {
      await api.post(`/projects/${projectId}/members`, {
        studentId: searchResult.id,
      });
      setIsAddOpen(false);
      setSearchResult(null);
      setSearchEmail('');
      await onRefreshProject();
    } catch (err: any) {
      setSearchError(err.message || 'Failed to add student to project');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/projects/${projectId}/members/${removeTarget.studentId}`);
      setRemoveTarget(null);
      await onRefreshProject();
    } catch (err: any) {
      alert(err.message || 'Failed to remove team member');
    } finally {
      setRemoving(false);
    }
  };

  const isFull = members.length >= 3;

  return (
    <div className="card-hard-static bg-white p-5 mb-6">
      <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-violet-tint text-ink">
        TEAM ROSTER
      </span>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted stroke-[2.5]" /> Project Team ({members.length}/3)
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
        <p className="text-[11px] font-mono text-text-muted mb-3 italic">
          Team has reached the maximum cap of 3 students.
        </p>
      )}

      <ul className="divide-y-2 divide-ink text-xs font-sans">
        {members.map((member) => (
          <li
            key={member.studentId}
            className="py-2.5 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink truncate">
                  {member.fullName}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border-2 border-ink ${
                    member.membershipRole === 'LEAD'
                      ? 'bg-primary text-white shadow-[1px_1px_0_0_#000]'
                      : 'bg-paper-dark text-ink'
                  }`}
                >
                  {member.membershipRole}
                </span>
              </div>
              <span className="text-text-muted truncate block font-mono text-[11px] mt-0.5">
                {member.email}
                {member.registrationNumber ? ` • ${member.registrationNumber}` : ''}
              </span>
            </div>

            {/* Remove control is available only for non-LEAD members when canManageTeam */}
            {canManageTeam && member.membershipRole !== 'LEAD' && (
              <button
                type="button"
                onClick={() => setRemoveTarget(member)}
                className="text-error hover:bg-error/10 p-1.5 rounded-md border border-transparent hover:border-error transition-colors shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 animate-fade-in"
        >
          <div className="card-hard-static bg-white border-2 border-ink rounded-[12px] shadow-[7px_7px_0_0_#1B1410] max-w-md w-full p-6 text-left">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-marigold text-ink">
              TEAM MANAGEMENT
            </span>
            <h3 className="font-display font-black text-2xl text-ink mb-2">
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
                  className="flex-1 bg-white text-ink text-sm font-sans px-3.5 py-2.5 rounded-lg border-2 border-ink placeholder:text-text-muted/60 focus:outline-none focus:border-violet focus:ring-0 focus:shadow-[0_0_0_2px_#FFF1D6,0_0_0_5px_#7A4DE0]"
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
                <div className="p-3 rounded-lg bg-error/10 border-2 border-error text-xs font-mono font-bold text-error flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchResult && (
                <div className="p-3 rounded-lg bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1B1410] flex items-center justify-between gap-3 animate-fade-in">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-ink block truncate">
                      {searchResult.fullName}
                    </span>
                    <span className="font-mono text-xs text-text-secondary block truncate">
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

              <div className="pt-3 border-t-2 border-ink flex justify-end">
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
