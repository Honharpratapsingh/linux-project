import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../common/Button';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-paper select-none">
      <div className="h-16 border-b-2 border-ink flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg border-2 border-ink bg-white shadow-[2px_2px_0_0_#1B1410] text-ink hover:bg-paper-dark transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <div className="flex items-center gap-2.5 bg-white border-2 border-ink rounded-full px-3 py-1 shadow-[2px_2px_0_0_#1B1410]">
              <div className="w-6 h-6 rounded-full bg-marigold border border-ink flex items-center justify-center text-ink font-bold text-xs">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-ink leading-tight font-sans">
                  {user.fullName}
                </span>
                <span className="block text-[10px] font-mono capitalize tracking-wider text-text-muted font-bold">
                  {user.role.toLowerCase()}
                </span>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            aria-label="Sign out"
            icon={<LogOut className="w-4 h-4" />}
            className="text-ink"
          >
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* 8px checker or stripe band under topbar */}
      <div className="h-2 w-full pattern-stripes-primary border-b-2 border-ink" />
    </header>
  );
}
