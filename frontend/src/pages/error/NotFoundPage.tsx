import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center select-none">
      <div className="card-hard-static bg-white p-8 sm:p-12 max-w-md w-full">
        <div className="w-14 h-14 rounded-xl bg-paper-dark border-2 border-ink shadow-[3px_3px_0_0_#1B1410] text-ink flex items-center justify-center mx-auto mb-5">
          <FileQuestion className="w-7 h-7 stroke-[2.5]" />
        </div>
        <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-coral text-ink">
          404 ERROR
        </span>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink mb-2 tracking-tight">
          Page Not Found
        </h1>
        <p className="font-sans text-sm text-text-secondary mb-6 leading-relaxed">
          The page or resource you requested could not be found or may have been moved.
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
