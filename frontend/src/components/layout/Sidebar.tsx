import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Archive,
  User as UserIcon,
  Clock,
  X,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY';

  const navItems = isFaculty
    ? [
        { label: 'Overview', href: '/overview', icon: LayoutDashboard },
        { label: 'All Projects', href: '/projects', icon: FolderKanban },
        { label: 'Pending Reviews', href: '/pending-reviews', icon: Clock },
        { label: 'Archived', href: '/archived', icon: Archive },
        { label: 'Profile', href: '/profile', icon: UserIcon },
      ]
    : [
        { label: 'Overview', href: '/overview', icon: LayoutDashboard },
        { label: 'My Projects', href: '/projects', icon: FolderKanban },
        { label: 'Create Project', href: '/projects/new', icon: PlusCircle },
        { label: 'Archived', href: '/archived', icon: Archive },
        { label: 'Profile', href: '/profile', icon: UserIcon },
      ];

  const sidebarContent = (
    <aside className="h-full flex flex-col bg-ink text-paper border-r-2 border-ink w-60 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b-2 border-paper/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary text-white border-2 border-paper flex items-center justify-center font-display text-lg font-black shadow-[2px_2px_0_0_#FFF1D6]">
            P
          </div>
          <div>
            <span className="font-display font-black text-lg text-paper tracking-tight block leading-tight">
              ProjectHub
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-paper/70 font-bold block">
              {isFaculty ? 'Faculty Portal' : 'Student Portal'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md text-paper/70 hover:text-paper hover:bg-paper/20 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-sans transition-all duration-120 ${
                  isActive
                    ? 'bg-marigold text-ink font-bold shadow-[2px_2px_0_0_#000] border-2 border-ink'
                    : 'text-paper/85 hover:text-paper hover:bg-paper/10 font-medium'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t-2 border-paper/20 font-mono text-xs text-paper/70">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="truncate uppercase tracking-wider text-[11px] font-bold">Capstone Tracking</span>
        </div>
      </div>

      {/* Stripe pattern strip at the bottom */}
      <div className="h-4 w-full pattern-stripes-marigold border-t-2 border-paper/30 shrink-0" />
    </aside>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <div className="hidden lg:block w-60 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-ink/70 transition-opacity animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
