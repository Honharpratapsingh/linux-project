import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Feedback } from '../../types/api';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { formatDateTime } from '../../lib/dates';

interface FeedbackThreadProps {
  feedback: Feedback[];
  canGiveFeedback: boolean;
  onSubmitFeedback: (message: string) => Promise<void>;
}

export function FeedbackThread({
  feedback,
  canGiveFeedback,
  onSubmitFeedback,
}: FeedbackThreadProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Feedback message cannot be empty');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmitFeedback(message.trim());
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return 'bg-lime text-ink border-2 border-ink';
      case 'CHANGES_REQUESTED':
        return 'bg-marigold-tint text-ink border-2 border-ink';
      case 'REJECTION':
        return 'bg-coral text-ink border-2 border-ink';
      default:
        return 'bg-paper-dark text-ink border-2 border-ink';
    }
  };

  return (
    <div className="card-hard-static bg-white p-5 sm:p-6 mb-6">
      <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-sky-tint text-ink">
        FACULTY FEEDBACK
      </span>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-xl text-ink flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-text-muted stroke-[2.5]" /> Faculty Feedback & Review Notes
          </h3>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Guidance, evaluation comments, and status revision notes
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-ink bg-paper-dark border-2 border-ink px-2 py-0.5 rounded-full">
          {feedback.length} entries
        </span>
      </div>

      {/* Give Feedback Form (Faculty only) */}
      {canGiveFeedback && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-paper border-2 border-ink shadow-[3px_3px_0_0_#1B1410]">
          <Textarea
            label="Post Faculty Comment"
            placeholder="Share feedback, advice, or suggestions with the project team..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError('');
            }}
            error={error}
            rows={3}
            required
          />
          <div className="flex justify-end mt-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Post Comment
            </Button>
          </div>
        </form>
      )}

      {/* List (newest first) */}
      {feedback.length === 0 ? (
        <p className="text-sm font-sans text-text-muted py-6 text-center">
          No faculty feedback recorded on this project yet.
        </p>
      ) : (
        <ul className="divide-y-2 divide-ink">
          {feedback.map((fb) => (
            <li key={fb.id} className="py-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs font-bold text-ink">
                    {fb.author.fullName}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${getTypeBadgeClass(
                      fb.feedbackType
                    )}`}
                  >
                    {fb.feedbackType.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-text-muted font-mono tabular-nums shrink-0">
                  {formatDateTime(fb.createdAt)}
                </span>
              </div>
              <p className="font-sans text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {fb.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
