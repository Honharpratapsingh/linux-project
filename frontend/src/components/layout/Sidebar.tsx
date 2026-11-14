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
    <aside className="h-full flex flex-col bg-sidebar border-r border-border w-60 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-surface flex items-center justify-center font-serif text-lg font-semibold shadow-xs">
            P
          </div>
          <div>
            <span className="font-serif font-semibold text-lg text-text tracking-tight block leading-tight">
              ProjectHub
            </span>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-sans font-medium block">
              {isFaculty ? 'Faculty Portal' : 'Student Portal'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1 rounded-md text-text-muted hover:text-text hover:bg-divider transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-sans transition-colors duration-150 ${
                  isActive
                    ? 'bg-surface text-primary font-medium shadow-xs border border-border/60'
                    : 'text-text-secondary hover:text-text hover:bg-divider/60'
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
      <div className="p-3 border-t border-border/80 text-xs text-text-muted font-sans">
        <div className="flex items-center gap-2 px-3 py-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="truncate">SRM Capstone Tracking</span>
        </div>
      </div>
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
            className="fixed inset-0 bg-text/30 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 animate-slide-right h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
