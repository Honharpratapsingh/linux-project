import { BookOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <BookOpen className="h-16 w-16 text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold text-secondary-900 mb-2">
          ProjectHub
        </h1>
        <p className="text-secondary-500 text-lg mb-1">
          Student Project Tracking &amp; Management
        </p>
        <p className="text-secondary-500 text-sm">
          SRM Institute of Science and Technology — 21CSE216P
        </p>
        <div className="mt-8 text-xs text-secondary-500">
          Phase 1: Foundation scaffold — authentication coming in Phase 2
        </div>
      </div>
    </div>
  );
}
