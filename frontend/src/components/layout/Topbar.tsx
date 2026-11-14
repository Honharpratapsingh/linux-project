import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../common/Button';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text hover:bg-sidebar transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sidebar border border-border flex items-center justify-center text-primary font-medium text-xs">
              <UserIcon className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-text leading-tight">
                {user.fullName}
              </span>
              <span className="block text-[10px] text-text-muted capitalize">
                {user.role.toLowerCase()}
              </span>
            </div>
          </div>
        )}

        <div className="h-5 w-px bg-divider" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          aria-label="Sign out"
          icon={<LogOut className="w-4 h-4" />}
          className="text-text-secondary hover:text-text"
        >
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
