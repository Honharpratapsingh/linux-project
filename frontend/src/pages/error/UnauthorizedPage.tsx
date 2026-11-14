import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
      <div className="bg-surface border border-border rounded-xl p-8 sm:p-12 max-w-md w-full shadow-xs">
        <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-text mb-2">
          Access Restricted
        </h1>
        <p className="font-sans text-sm text-text-secondary mb-6 leading-relaxed">
          You do not have the required permissions to access this page with your current role.
        </p>
        <Link to="/overview">
          <Button variant="primary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
