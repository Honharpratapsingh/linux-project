import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
      <div className="card-hard-static bg-white p-8 sm:p-12 max-w-md w-full">
        <div className="w-14 h-14 rounded-xl bg-error/15 border-2 border-error shadow-[3px_3px_0_0_#B3261E] text-error flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-7 h-7 stroke-[2.5]" />
        </div>
        <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-coral text-ink">
          403 FORBIDDEN
        </span>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink mb-2 tracking-tight">
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
